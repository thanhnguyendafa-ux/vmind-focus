import { create } from 'zustand';
import { Screen, StudySessionData, Question, FlashcardSession, ScrambleSessionData, TheaterSessionData, DictationSessionData, StudySettings, ScrambleSessionSettings, TheaterSessionSettings, DictationNote, SessionWordResult, FlashcardStatus, Column, FlashcardProgress } from '../types';
import { useUserStore } from './useUserStore';
import { useUIStore } from './useUIStore';
import { useTableStore } from './useTableStore';
import { useSessionDataStore } from './useSessionDataStore';
import { useDictationNoteStore } from './useDictationNoteStore';
import { generateStudySession, generateScrambleSession } from '../utils/studySessionGenerator';

// --- XP Constants ---
const XP_PER_CORRECT_ANSWER = 10;
const XP_QUIT_PENALTY = 15;
const XP_PER_FLASHCARD_REVIEW = 5;
const XP_PER_SCRAMBLE_CORRECT = 15;
const XP_PER_MINUTE_THEATER = 20;
const XP_PER_DICTATION_CORRECT = 8;

interface SessionState {
    activeSession: StudySessionData | null;
    activeFlashcardSession: FlashcardSession | null;
    activeScrambleSession: ScrambleSessionData | null;
    activeTheaterSession: TheaterSessionData | null;
    activeDictationSession: DictationSessionData | null;
    editingDictationNote: DictationNote | null;
    activeTableId: string | null;
    studySetupSourceTableId: string | null;
    readingScreenNoteId: string | null;

    handleStartStudySession: (settings: StudySettings) => void;
    handleEndSession: (results: SessionWordResult[], durationSeconds: number) => void;
    handleSessionQuit: (results: SessionWordResult[], durationSeconds: number, remainingQueue: Question[]) => void;
    
    handleStartFlashcardSession: (progressId: string) => void;
    handleFinishFlashcardSession: (finalSession: FlashcardSession) => void;
    
    handleStartScrambleSession: (settings: ScrambleSessionSettings) => void;
    // FIX: Renamed from handleFinishFlashcardSession to handleFinishScrambleSession to resolve duplicate identifier error.
    handleFinishScrambleSession: (finalSession: ScrambleSessionData) => void;
    
    handleStartTheaterSession: (settings: TheaterSessionSettings) => void;
    handleFinishTheaterSession: (finalSession: TheaterSessionData) => void;
    
    handleStartDictationSession: (note: DictationNote) => void;
    handleFinishDictationSession: (session: DictationSessionData, results: { correct: number, total: number }) => void;
    
    setEditingDictationNote: (note: DictationNote | null) => void;
    handleUpdateDictationNote: (note: DictationNote) => void;
    handleSelectTable: (tableId: string) => void;
    setStudySetupSourceTableId: (id: string | null) => void;
    setReadingScreenNoteId: (id: string | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
    activeSession: null,
    activeFlashcardSession: null,
    activeScrambleSession: null,
    activeTheaterSession: null,
    activeDictationSession: null,
    editingDictationNote: null,
    activeTableId: null,
    studySetupSourceTableId: null,
    readingScreenNoteId: null,

    handleStartStudySession: (settings) => {
        const { tables } = useTableStore.getState();
        const questions = generateStudySession(tables, settings);
        if (questions.length === 0) {
            useUIStore.getState().showToast("Could not generate any questions.", "error");
            return;
        }
        set({ activeSession: { questions, startTime: Date.now(), settings } });
    },
    handleEndSession: (results, durationSeconds) => {
        const xpGained = results.reduce((total, r) => total + (r.isCorrect ? (r.hintUsed ? XP_PER_CORRECT_ANSWER / 2 : XP_PER_CORRECT_ANSWER) : 0), 0);
        useUserStore.getState().updateStatsFromSession(durationSeconds, xpGained, 0);
        useTableStore.getState().updateRowsFromSession(results);
        set({ activeSession: null });
    },
    handleSessionQuit: (results, durationSeconds, remainingQueue) => {
        const xpGained = results.reduce((total, r) => total + (r.isCorrect ? (r.hintUsed ? XP_PER_CORRECT_ANSWER / 2 : XP_PER_CORRECT_ANSWER) : 0), 0);
        useUserStore.getState().updateStatsFromSession(durationSeconds, xpGained, XP_QUIT_PENALTY);
        useTableStore.getState().updateRowsFromSession(results, new Set(remainingQueue.map(q => q.rowId)));
        set({ activeSession: null });
    },

    handleStartFlashcardSession: (progressId: string) => {
        const { flashcardProgresses } = useSessionDataStore.getState();
        const progress = flashcardProgresses.find(p => p.id === progressId);

        if (!progress) {
            useUIStore.getState().showToast("Could not find the selected progress.", "error");
            return;
        }

        if (progress.queue.length === 0) {
            useUIStore.getState().showToast("This progress has no cards to study.", "info");
            return;
        }
        
        set({ 
            activeFlashcardSession: { 
                progressId: progress.id,
                tableIds: progress.tableIds, 
                relationIds: progress.relationIds, 
                queue: progress.queue, 
                currentIndex: progress.currentIndex, 
                sessionEncounters: 0, 
                startTime: Date.now(), 
                history: [] 
            } 
        });
    },
    handleFinishFlashcardSession: (session) => {
        const { setFlashcardProgresses } = useSessionDataStore.getState();

        // Persist the queue state
        setFlashcardProgresses(prev => prev.map(p => 
            p.id === session.progressId 
                ? { ...p, queue: session.queue, currentIndex: session.currentIndex }
                : p
        ));

        // Update global stats
        const duration = Math.round((Date.now() - session.startTime) / 1000);
        const xpGained = session.history.length * XP_PER_FLASHCARD_REVIEW;
        useTableStore.getState().updateRowsFromFlashcardSession(session.history, session.tableIds);
        useUserStore.getState().updateStatsFromSession(duration, xpGained, 0);
        
        set({ activeFlashcardSession: null });
    },

    handleStartScrambleSession: (settings) => {
        const { tables } = useTableStore.getState();
        const questions = generateScrambleSession(tables, settings);
        if (questions.length === 0) {
            useUIStore.getState().showToast("No sentences found for scramble.", "error");
            return;
        }
        set({ activeScrambleSession: { settings, queue: questions, currentIndex: 0, startTime: Date.now(), history: [] } });
    },
    handleFinishScrambleSession: (session) => {
        const duration = Math.round((Date.now() - session.startTime) / 1000);
        const correctCount = session.history.filter(h => h.status !== 'Again' && h.status !== 'Hard').length;
        const xpGained = correctCount * XP_PER_SCRAMBLE_CORRECT;
        useTableStore.getState().updateRowsFromScrambleSession(session.history);
        useUserStore.getState().updateStatsFromSession(duration, xpGained, 0);
        set({ activeScrambleSession: null });
    },

    handleStartTheaterSession: (settings) => {
        const { tables } = useTableStore.getState();
        const rows = tables.filter(t => settings.sources.some(s => s.tableId === t.id)).flatMap(t => t.rows);
        if (rows.length === 0) {
            useUIStore.getState().showToast("No cards available.", "error");
            return;
        }
        set({ activeTheaterSession: { settings, queue: shuffleArray(rows.map(r => r.id)), startTime: Date.now(), history: [] } });
    },
    handleFinishTheaterSession: (session) => {
        const duration = Math.round((Date.now() - session.startTime) / 1000);
        const minutes = Math.floor(duration / 60);
        const xpGained = minutes * XP_PER_MINUTE_THEATER;
        useTableStore.getState().updateRowsFromTheaterSession(session.history);
        useUserStore.getState().updateStatsFromSession(duration, xpGained, 0);
        set({ activeTheaterSession: null });
    },
    
    handleStartDictationSession: (note) => set({ activeDictationSession: { note, startTime: Date.now() } }),
    handleFinishDictationSession: (session, results) => {
        const duration = Math.round((Date.now() - session.startTime) / 1000);
        const xpGained = results.correct * XP_PER_DICTATION_CORRECT;
        const accuracy = results.total > 0 ? results.correct / results.total : 0;
        const newRecord = { timestamp: Date.now(), accuracy, durationSeconds: duration };
        
        useUserStore.getState().updateStatsFromSession(duration, xpGained, 0);
        useDictationNoteStore.getState().updateDictationNote({
            ...session.note,
            practiceHistory: [...session.note.practiceHistory, newRecord]
        });
        
        set({ activeDictationSession: null });
    },

    setEditingDictationNote: (note) => set({ editingDictationNote: note }),
    handleUpdateDictationNote: (note) => {
        useDictationNoteStore.getState().updateDictationNote(note);
        set({ editingDictationNote: note });
    },
    handleSelectTable: (tableId) => {
        set({ activeTableId: tableId });
        useUIStore.getState().setCurrentScreen(Screen.TableDetail);
    },
    setStudySetupSourceTableId: (id) => set({ studySetupSourceTableId: id }),
    setReadingScreenNoteId: (id) => set({ readingScreenNoteId: id }),
}));

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

const findTagColumn = (columns: Column[]): Column | undefined => {
    return columns.find(c => /^tags$/i.test(c.name)) || columns.find(c => /^tag$/i.test(c.name));
};