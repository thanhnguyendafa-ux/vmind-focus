import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Screen, Theme, SyncStatus, Badge, Table } from '../types';

type ToastData = { message: string; type: 'success' | 'error' | 'info'; actionText?: string; onAction?: () => void; };

interface UIState {
  theme: Theme;
  currentScreen: Screen;
  syncStatus: SyncStatus;
  toast: ToastData | null;
  unlockedBadgeNotification: Badge | null;
  galleryViewData: { table: Table; initialRowId?: string } | null;
  isSearchOpen: boolean;
  
  toggleTheme: () => void;
  setCurrentScreen: (screen: Screen) => void;
  setSyncStatus: (status: SyncStatus) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info', actionText?: string, onAction?: () => void) => void;
  setToast: (toast: ToastData | null) => void;
  setUnlockedBadgeNotification: (badge: Badge | null) => void;
  setGalleryViewData: (data: { table: Table; initialRowId?: string } | null) => void;
  setIsSearchOpen: (isOpen: boolean) => void;
  handleNavigation: (screen: keyof typeof Screen) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      currentScreen: Screen.Home,
      syncStatus: 'idle',
      toast: null,
      unlockedBadgeNotification: null,
      galleryViewData: null,
      isSearchOpen: false,

      toggleTheme: () => set(state => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setCurrentScreen: (screen) => set({ currentScreen: screen }),
      setSyncStatus: (status) => set({ syncStatus: status }),
      showToast: (message, type = 'success', actionText, onAction) => set({ toast: { message, type, actionText, onAction } }),
      setToast: (toast) => set({ toast }),
      setUnlockedBadgeNotification: (badge) => set({ unlockedBadgeNotification: badge }),
      setGalleryViewData: (data) => set({ galleryViewData: data }),
      setIsSearchOpen: (isOpen) => set({ isSearchOpen: isOpen }),
      handleNavigation: (screen) => {
        const screenEnum = Screen[screen];
        if (screenEnum !== undefined) {
          set({ currentScreen: screenEnum });
        }
      },
    }),
    {
      name: 'vmind-theme', // name of the item in the storage
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
      partialize: (state) => ({ theme: state.theme }), // only persist the theme
    }
  )
);