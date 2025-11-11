import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { UserStats, AppSettings, Screen, Badge } from '../types';
import { useUIStore } from './useUIStore';
import { BADGES } from '../constants';
import { vmindStorage, resetStores, clearLocalStorage } from './appStorage';

const defaultStats: UserStats = { xp: 0, level: 1, studyStreak: 0, lastSessionDate: null, activity: {}, totalStudyTimeSeconds: 0, unlockedBadges: [] };
const defaultSettings: AppSettings = { journalMode: 'manual', folderOrder: [], tagColors: {}, searchShortcut: 'Ctrl+K' };

const XP_PER_LEVEL = 1000;

interface UserState {
  session: Session | null;
  isGuest: boolean;
  loading: boolean;
  stats: UserStats;
  settings: AppSettings;
  
  setSession: (session: Session | null) => void;
  setIsGuest: (isGuest: boolean) => void;
  setLoading: (loading: boolean) => void;
  setStats: (stats: UserStats | ((prev: UserStats) => UserStats)) => void;
  setSettings: (settings: AppSettings) => void;
  setTagColor: (tagName: string, color: string) => void;
  
  handleGuestLogin: () => void;
  handleLogout: () => Promise<void>;
  
  updateStatsFromSession: (durationSeconds: number, xpGained: number, penalty: number) => void;
  saveUserProfile: () => Promise<void>;

  init: () => () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      session: null,
      isGuest: false,
      loading: true,
      stats: defaultStats,
      settings: defaultSettings,

      setSession: (session) => set({ session }),
      setIsGuest: (isGuest) => set({ isGuest }),
      setLoading: (loading) => set({ loading }),
      setStats: (updater) => set(state => ({ stats: typeof updater === 'function' ? updater(state.stats) : updater })),
      setSettings: (settings) => {
        set({ settings });
        // Trigger save when settings change.
        get().saveUserProfile();
      },
      setTagColor: (tagName, color) => {
        const { settings, setSettings } = get();
        const newTagColors = { ...(settings.tagColors || {}), [tagName]: color };
        setSettings({ ...settings, tagColors: newTagColors });
      },
      
      handleGuestLogin: () => {
        set({ isGuest: true, loading: false });
        useUIStore.getState().setCurrentScreen(Screen.Home);
      },
      
      handleLogout: async () => {
        await supabase.auth.signOut();
        // The onAuthStateChange listener will handle resetting the state.
      },
      
      updateStatsFromSession: (durationSeconds, xpGained, penalty) => {
        set(state => {
          const oldStats = state.stats;
          const newXp = Math.max(0, oldStats.xp + xpGained - penalty);
          const todayStr = new Date().toISOString().split('T')[0];
          const newTotalTime = oldStats.totalStudyTimeSeconds + durationSeconds;
          
          const newlyUnlockedBadges = BADGES.filter(badge => 
              !oldStats.unlockedBadges.includes(badge.id) && 
              newTotalTime >= badge.value
          );

          if(newlyUnlockedBadges.length > 0) {
              // Sort by value to award the earliest unlocked badge first in case of multiple unlocks
              newlyUnlockedBadges.sort((a, b) => a.value - b.value);
              useUIStore.getState().setUnlockedBadgeNotification(newlyUnlockedBadges[0]);
          }
          
          const newStats: UserStats = {
              ...oldStats,
              xp: newXp,
              level: Math.floor(newXp / XP_PER_LEVEL) + 1,
              studyStreak: new Date(oldStats.lastSessionDate || 0).toDateString() === new Date(Date.now() - 86400000).toDateString() ? oldStats.studyStreak + 1 : 1,
              lastSessionDate: todayStr,
              activity: { ...oldStats.activity, [todayStr]: (oldStats.activity[todayStr] || 0) + durationSeconds },
              totalStudyTimeSeconds: newTotalTime,
              unlockedBadges: [...oldStats.unlockedBadges, ...newlyUnlockedBadges.map(b => b.id)],
          };
          
          return { stats: newStats };
        });
        // Important: After stats are updated, trigger a save.
        get().saveUserProfile();
      },

      saveUserProfile: async () => {
        const { session, isGuest, stats, settings } = get();
        if (isGuest || !session) return;
    
        const user_profile = { stats, settings };
        try {
            const { error } = await supabase.from('profiles').update({ user_profile }).eq('id', session.user.id);
            if (error) throw error;
        } catch (error) {
            console.error("Failed to save user profile:", error);
            useUIStore.getState().showToast("Failed to save progress.", "error");
        }
      },

      init: () => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          const { setLoading, setSession, setIsGuest } = get();

          if (session) {
            // User is logged in. Clear any guest data from localStorage.
            clearLocalStorage();
            setSession(session);
            setIsGuest(false);
            if (useUIStore.getState().currentScreen === Screen.Auth) {
              useUIStore.getState().setCurrentScreen(Screen.Home);
            }
            setLoading(false); // Key Change: Unlock UI as soon as session is confirmed.
          } else {
            // User is logged out.
            clearLocalStorage(); // Clear any logged-in user data that was persisted.
            resetStores(); // Clear all data from stores' memory.
            setSession(null);
            setIsGuest(true); // Default to guest mode.
            setLoading(false);
            useUIStore.getState().setCurrentScreen(Screen.Auth);
          }
        });
        
        return () => subscription.unsubscribe();
      },
    }),
    {
      name: 'vmind-user-data',
      storage: createJSONStorage(() => vmindStorage),
      partialize: (state) => ({ stats: state.stats, settings: state.settings }),
      onRehydrateStorage: (state) => {
        return (newState, error) => {
          if (newState) {
            // This is primarily for rehydrating guest data from localStorage.
          }
        }
      },
    }
  )
);

// Initialize the store and its listeners
useUserStore.getState().init();