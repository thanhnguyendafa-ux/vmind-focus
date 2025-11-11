import { create } from 'zustand';
import { Note } from '../types';
import { useUIStore } from './useUIStore';
import { useUserStore } from './useUserStore';
import { supabase } from '../services/supabaseClient';

interface NoteState {
  notes: Note[];
  createNote: () => Promise<void>;
  updateNote: (updatedNote: Note) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  handleSaveToJournal: (source: string, content: string) => void;
  setNotes: (notes: Note[]) => void;
}

export const useNoteStore = create<NoteState>()(
    (set, get) => ({
      notes: [],
      createNote: async () => {
        const { session, isGuest } = useUserStore.getState();
        const newNote: Note = { id: crypto.randomUUID(), title: 'New Note', content: 'Start writing...', createdAt: Date.now() };
        
        // Optimistic update
        set(state => ({ notes: [...state.notes, newNote] }));
        
        if (isGuest || !session) return;
        
        try {
            const { createdAt, ...restOfNote } = newNote;
            const noteForDb = {
                ...restOfNote,
                created_at: new Date(createdAt).toISOString(),
                user_id: session.user.id
            };
            const { error } = await supabase.from('notes').insert(noteForDb);
            if (error) throw error;
        } catch(error: any) {
            console.error("Failed to create note:", error.message || error);
            set(state => ({ notes: state.notes.filter(n => n.id !== newNote.id) }));
            useUIStore.getState().showToast("Failed to create note.", "error");
        }
      },
      updateNote: async (updatedNote) => {
        const { session, isGuest } = useUserStore.getState();
        const originalNotes = get().notes;

        // Optimistic update
        set(state => ({ notes: state.notes.map(n => n.id === updatedNote.id ? updatedNote : n) }));
        
        if (isGuest || !session) return;

        try {
            const { createdAt, ...restOfNote } = updatedNote;
            const noteForDb = {
                ...restOfNote,
                created_at: new Date(createdAt).toISOString(),
            };
            const { error } = await supabase.from('notes').update(noteForDb).eq('id', updatedNote.id);
            if (error) throw error;
        } catch (error: any) {
            console.error("Failed to update note:", error.message || error);
            set({ notes: originalNotes });
            useUIStore.getState().showToast("Failed to save note.", "error");
        }
      },
      deleteNote: async (noteId) => {
        const { session, isGuest } = useUserStore.getState();
        const originalNotes = get().notes;
        
        // Optimistic update
        set(state => ({ notes: state.notes.filter(n => n.id !== noteId) }));

        if (isGuest || !session) return;
        
        try {
            const { error } = await supabase.from('notes').delete().eq('id', noteId);
            if (error) throw error;
        } catch (error: any) {
            console.error("Failed to delete note:", error.message || error);
            set({ notes: originalNotes });
            useUIStore.getState().showToast("Failed to delete note.", "error");
        }
      },
      handleSaveToJournal: (source, content) => {
        const today = new Date().toISOString().split('T')[0];
        const journalTitle = `Journal - ${today}`;
        const existingNotes = get().notes;
        let todayNote = existingNotes.find(n => n.title === journalTitle);
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const contentToPrepend = `\n\n---\n**${source}** (${time})\n${content}`;

        if (todayNote) {
            const updatedNote = { ...todayNote, content: `${todayNote.content}${contentToPrepend}`};
            get().updateNote(updatedNote);
        } else {
            const newNote: Note = { id: crypto.randomUUID(), title: journalTitle, content: `Journal entry for ${today}.${contentToPrepend}`, createdAt: Date.now() };
            // Since createNote is now async, we await it.
            get().createNote().then(() => {
                // The note is created with default title/content first, then we update it.
                // This is a simplification; a better way would be to pass initial data to createNote.
                get().updateNote(newNote); 
            });
        }
        useUIStore.getState().showToast("Saved to Journal", "success");
      },
      setNotes: (notes) => set({ notes }),
    })
);