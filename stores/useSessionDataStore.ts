import { create } from 'zustand';
import { FlashcardProgress } from '../types';
import { useUserStore } from './useUserStore';
import { supabase } from '../services/supabaseClient';
import { useUIStore } from './useUIStore';

interface SessionDataState {
  flashcardProgresses: FlashcardProgress[];
  
  // A single setter that also handles persistence
  setFlashcardProgresses: (updater: (prev: FlashcardProgress[]) => FlashcardProgress[]) => Promise<void>;
  
  setInitialData: (data: { flashcardProgresses?: FlashcardProgress[] }) => void;
}

export const useSessionDataStore = create<SessionDataState>()(
    (set, get) => ({
      flashcardProgresses: [],
      
      setFlashcardProgresses: async (updater) => {
        const newProgresses = updater(get().flashcardProgresses);
        // Optimistic update
        set({ flashcardProgresses: newProgresses });
        
        const { session, isGuest } = useUserStore.getState();
        if (isGuest || !session) return;
        
        try {
            const { error } = await supabase.from('session_data').upsert({ 
                user_id: session.user.id, 
                flashcard_progresses: newProgresses 
            }, { onConflict: 'user_id' });
            if (error) throw error;
        } catch (error) {
            console.error("Failed to save session data:", error);
            useUIStore.getState().showToast("Failed to save flashcard progress.", "error");
            // Revert could be complex, for now we leave the optimistic state
        }
      },
      
      setInitialData: (data) => set({ flashcardProgresses: data.flashcardProgresses || [] }),
    })
);