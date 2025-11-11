import { create } from 'zustand';
import { DictationNote } from '../types';
import { useUserStore } from './useUserStore';
import { supabase } from '../services/supabaseClient';
import { useUIStore } from './useUIStore';

interface DictationNoteState {
  dictationNotes: DictationNote[];
  createDictationNote: (title: string) => Promise<string>;
  updateDictationNote: (updatedNote: DictationNote) => Promise<void>;
  deleteDictationNote: (noteId: string) => Promise<void>;
  setDictationNotes: (notes: DictationNote[]) => void;
}

export const useDictationNoteStore = create<DictationNoteState>()(
    (set, get) => ({
      dictationNotes: [],
      createDictationNote: async (title) => {
        const { session, isGuest } = useUserStore.getState();
        const newNote: DictationNote = { id: crypto.randomUUID(), title, youtubeUrl: '', transcript: [], practiceHistory: [] };
        
        // Optimistic update
        set(state => ({ dictationNotes: [...state.dictationNotes, newNote] }));
        
        if (isGuest || !session) return newNote.id;

        try {
            const { youtubeUrl, practiceHistory, ...rest } = newNote;
            const noteForDb = { ...rest, youtube_url: youtubeUrl, practice_history: practiceHistory, user_id: session.user.id };
            const { error } = await supabase.from('dictation_notes').insert(noteForDb);
            if (error) throw error;
        } catch (error: any) {
            console.error("Failed to create dictation note:", error.message || error);
            set(state => ({ dictationNotes: state.dictationNotes.filter(n => n.id !== newNote.id) }));
            useUIStore.getState().showToast("Failed to create dictation note.", "error");
        }
        return newNote.id;
      },
      updateDictationNote: async (updatedNote) => {
        const { session, isGuest } = useUserStore.getState();
        const originalNotes = get().dictationNotes;

        // Optimistic update
        set(state => ({
          dictationNotes: state.dictationNotes.map(n => n.id === updatedNote.id ? updatedNote : n)
        }));

        if (isGuest || !session) return;
        
        try {
            const { youtubeUrl, practiceHistory, ...rest } = updatedNote;
            const noteForDb = { ...rest, youtube_url: youtubeUrl, practice_history: practiceHistory };
            const { error } = await supabase.from('dictation_notes').update(noteForDb).eq('id', updatedNote.id);
            if (error) throw error;
        } catch (error: any) {
            console.error("Failed to update dictation note:", error.message || error);
            set({ dictationNotes: originalNotes });
            useUIStore.getState().showToast("Failed to save dictation note.", "error");
        }
      },
      deleteDictationNote: async (noteId) => {
        const { session, isGuest } = useUserStore.getState();
        const originalNotes = get().dictationNotes;
        
        // Optimistic update
        set(state => ({
          dictationNotes: state.dictationNotes.filter(n => n.id !== noteId)
        }));

        if (isGuest || !session) return;

        try {
            const { error } = await supabase.from('dictation_notes').delete().eq('id', noteId);
            if (error) throw error;
        } catch (error: any) {
            console.error("Failed to delete dictation note:", error.message || error);
            set({ dictationNotes: originalNotes });
            useUIStore.getState().showToast("Failed to delete dictation note.", "error");
        }
      },
      setDictationNotes: (notes) => set({ dictationNotes: notes }),
    })
);