import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { AppState, Table, VocabRow, Folder, Note, DictationNote, FlashcardProgress } from '../../types';

import { useUserStore } from '../../stores/useUserStore';
import { useUIStore } from '../../stores/useUIStore';

import { hydrateStores, resetStores } from '../../stores/appStorage';

// --- Type Definitions ---
type FetchedNormalizedData = {
    user_profile: Partial<Pick<AppState, 'stats' | 'settings'>> | null;
    tables: (Omit<Table, 'rows'> & { vocab_rows: { count: number }[] })[];
    folders: Folder[];
    notes: { id: string, title: string, created_at: string }[];
    dictation_notes: Pick<DictationNote, 'id' | 'title' | 'youtubeUrl' | 'practiceHistory'>[];
    session_data: { flashcard_progresses: FlashcardProgress[] } | null;
};

// --- API Functions ---
const fetchAllUserData = async (userId: string): Promise<FetchedNormalizedData | null> => {
    // We assume the following tables exist: profiles, tables, vocab_rows, folders, notes, dictation_notes, session_data
    const [profileRes, tablesRes, foldersRes, notesRes, dictationNotesRes, sessionDataRes] = await Promise.all([
        supabase.from('profiles').select('user_profile').eq('id', userId).single(),
        supabase.from('tables').select('*, vocab_rows(count)').eq('user_id', userId),
        supabase.from('folders').select('*').eq('user_id', userId),
        supabase.from('notes').select('id, title, created_at').eq('user_id', userId),
        supabase.from('dictation_notes').select('id, title, youtube_url, practice_history').eq('user_id', userId),
        supabase.from('session_data').select('flashcard_progresses').eq('user_id', userId).single()
    ]);

    // Throw if any critical query fails (except for profile not found)
    if (profileRes.error && profileRes.error.code !== 'PGRST116') throw profileRes.error;
    if (tablesRes.error) throw tablesRes.error;
    if (foldersRes.error) throw foldersRes.error;
    if (notesRes.error) throw notesRes.error;
    if (dictationNotesRes.error) throw dictationNotesRes.error;
    if (sessionDataRes.error && sessionDataRes.error.code !== 'PGRST116') throw sessionDataRes.error;

    return {
        user_profile: profileRes.data?.user_profile || null,
        tables: tablesRes.data || [],
        folders: foldersRes.data || [],
        notes: notesRes.data || [],
        dictation_notes: dictationNotesRes.data || [],
        session_data: sessionDataRes.data || null,
    };
};


// --- Main Component ---
const DataSyncManager: React.FC = () => {
    const { session, isGuest } = useUserStore(state => ({ session: state.session, isGuest: state.isGuest }));

    const userId = session?.user.id;
    const queryKey = ['appData', userId];

    // --- Data Fetching ---
    const { data: serverData, isSuccess, isError, error } = useQuery({
        queryKey,
        queryFn: () => fetchAllUserData(userId!),
        enabled: !!userId && !isGuest,
        refetchOnWindowFocus: true, // Re-sync data when user returns to the tab
        staleTime: 1000 * 60 * 5, // Data is considered fresh for 5 minutes
    });

    // Hydrate stores whenever server data is fetched successfully or reset on error
    React.useEffect(() => {
        if (isSuccess) {
            hydrateStores(serverData);
        } else if (isError) {
            console.error("Failed to load user data:", (error as Error).message || error);
            resetStores(); // Reset to default state on error
            useUIStore.getState().showToast("Failed to load your data.", "error");
        }
    }, [isSuccess, serverData, isError, error]);
    
    // This component is now only responsible for the initial data fetch and hydration.
    // It no longer controls the global loading state.

    return null; // This component does not render anything
};

export default DataSyncManager;