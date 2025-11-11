import { StateStorage } from 'zustand/middleware';
import { AppState, Table, FlashcardStatus, Relation, VocabRow, UserStats, Folder, Note, DictationNote, StudyMode, Column, RelationDesign, FlashcardProgress, TextBox } from '../types';
import { useUserStore } from './useUserStore';
import { useTableStore } from './useTableStore';
import { useNoteStore } from './useNoteStore';
import { useDictationNoteStore } from './useDictationNoteStore';
import { useSessionDataStore } from './useSessionDataStore';

// --- DEFAULT STATE (used for guests or new users) ---

// --- [NEW] Default Feature Showcase Table ---
const showcaseWordCol: Column = { id: 'showcase-col-word', name: 'Word' };
const showcasePosCol: Column = { id: 'showcase-col-pos', name: 'Part of Speech' };
const showcaseDefCol: Column = { id: 'showcase-col-def', name: 'Definition' };
const showcaseSentenceCol: Column = { id: 'showcase-col-sentence', name: 'Example Sentence' };
const showcaseTagCol: Column = { id: 'showcase-col-tag', name: 'Tags' };


const showcaseRows: VocabRow[] = [
    { id: 'showcase-row-1', cols: { 'showcase-col-word': 'Algorithm', 'showcase-col-pos': 'noun', 'showcase-col-def': 'A process or set of rules to be followed in calculations or other problem-solving operations.', 'showcase-col-sentence': 'The developer designed an efficient algorithm to sort the data.', [showcaseTagCol.id]: 'tech' }, stats: { correct: 2, incorrect: 0, lastStudied: Date.now() - 86400000 * 3, flashcardStatus: FlashcardStatus.Good, flashcardEncounters: 2, isFlashcardReviewed: true, lastPracticeDate: Date.now() - 86400000 * 3 } },
    { id: 'showcase-row-2', cols: { 'showcase-col-word': 'Ephemeral', 'showcase-col-pos': 'adjective', 'showcase-col-def': 'Lasting for a very short time.', 'showcase-col-sentence': 'The beauty of the cherry blossoms is ephemeral, lasting only a week.', [showcaseTagCol.id]: 'general' }, stats: { correct: 3, incorrect: 0, lastStudied: Date.now() - 86400000 * 2, flashcardStatus: FlashcardStatus.Easy, flashcardEncounters: 3, isFlashcardReviewed: true, lastPracticeDate: Date.now() - 86400000 * 2 } },
    { id: 'showcase-row-3', cols: { 'showcase-col-word': 'Compiler', 'showcase-col-pos': 'noun', 'showcase-col-def': 'A program that converts instructions into a machine-code or lower-level form so that they can be read and executed by a computer.', 'showcase-col-sentence': 'The C++ code must be run through a compiler before it can be executed.', [showcaseTagCol.id]: 'tech' }, stats: { correct: 1, incorrect: 1, lastStudied: Date.now() - 86400000 * 1, flashcardStatus: FlashcardStatus.Again, flashcardEncounters: 2, isFlashcardReviewed: true, lastPracticeDate: Date.now() - 86400000 * 1 } },
    { id: 'showcase-row-4', cols: { 'showcase-col-word': 'Mellifluous', 'showcase-col-pos': 'adjective', 'showcase-col-def': '(Of a voice or words) sweet or musical; pleasant to hear.', 'showcase-col-sentence': 'Her mellifluous voice calmed the crying child.', [showcaseTagCol.id]: 'general' }, stats: { correct: 0, incorrect: 1, lastStudied: Date.now() - 86400000 * 5, flashcardStatus: FlashcardStatus.Hard, flashcardEncounters: 1, isFlashcardReviewed: true, lastPracticeDate: Date.now() - 86400000 * 5 } },
    { id: 'showcase-row-5', cols: { 'showcase-col-word': 'API', 'showcase-col-pos': 'noun', 'showcase-col-def': 'Application Programming Interface; a set of functions and procedures allowing the creation of applications that access the features or data of an operating system, application, or other service.', 'showcase-col-sentence': 'We used the Google Maps API to display locations on our website.', [showcaseTagCol.id]: 'tech' }, stats: { correct: 1, incorrect: 0, lastStudied: Date.now() - 86400000 * 4, flashcardStatus: FlashcardStatus.Good, flashcardEncounters: 1, isFlashcardReviewed: true, lastPracticeDate: Date.now() - 86400000 * 4 } },
    { id: 'showcase-row-6', cols: { 'showcase-col-word': 'Serendipity', 'showcase-col-pos': 'noun', 'showcase-col-def': 'The occurrence and development of events by chance in a happy or beneficial way.', 'showcase-col-sentence': 'Finding a forgotten twenty-dollar bill in my old coat was a moment of serendipity.', [showcaseTagCol.id]: 'general' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
    { id: 'showcase-row-7', cols: { 'showcase-col-word': 'Database', 'showcase-col-pos': 'noun', 'showcase-col-def': 'A structured set of data held in a computer, especially one that is accessible in various ways.', 'showcase-col-sentence': 'All customer information is stored in a secure database.', [showcaseTagCol.id]: 'tech' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
    { id: 'showcase-row-8', cols: { 'showcase-col-word': 'Ubiquitous', 'showcase-col-pos': 'adjective', 'showcase-col-def': 'Present, appearing, or found everywhere.', 'showcase-col-sentence': 'Smartphones have become ubiquitous in modern society.', [showcaseTagCol.id]: 'general' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
    { id: 'showcase-row-9', cols: { 'showcase-col-word': 'Framework', 'showcase-col-pos': 'noun', 'showcase-col-def': 'A basic structure underlying a system, concept, or text; a reusable set of libraries or classes for a software system.', 'showcase-col-sentence': 'React is a popular JavaScript framework for building user interfaces.', [showcaseTagCol.id]: 'tech' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
    { id: 'showcase-row-10', cols: { 'showcase-col-word': 'Petrichor', 'showcase-col-pos': 'noun', 'showcase-col-def': 'A pleasant smell that frequently accompanies the first rain after a long period of warm, dry weather.', 'showcase-col-sentence': 'The air was filled with the fresh scent of petrichor after the storm.', [showcaseTagCol.id]: 'general' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
    { id: 'showcase-row-11', cols: { 'showcase-col-word': 'Variable', 'showcase-col-pos': 'noun', 'showcase-col-def': 'A data item that may take on more than one value during the runtime of a program.', 'showcase-col-sentence': 'In the equation x + 5 = 10, x is the variable.', [showcaseTagCol.id]: 'tech' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
    { id: 'showcase-row-12', cols: { 'showcase-col-word': 'Cacophony', 'showcase-col-pos': 'noun', 'showcase-col-def': 'A harsh, discordant mixture of sounds.', 'showcase-col-sentence': 'The cacophony of car horns filled the city street during rush hour.', [showcaseTagCol.id]: 'general' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
    { id: 'showcase-row-13', cols: { 'showcase-col-word': 'Boolean', 'showcase-col-pos': 'adjective', 'showcase-col-def': 'A binary variable, having two possible values called “true” and “false”.', 'showcase-col-sentence': 'The function returns a boolean value to indicate success or failure.', [showcaseTagCol.id]: 'tech' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
    { id: 'showcase-row-14', cols: { 'showcase-col-word': 'Solitude', 'showcase-col-pos': 'noun', 'showcase-col-def': 'The state or situation of being alone.', 'showcase-col-sentence': 'He enjoyed the peace and solitude of the mountains.', [showcaseTagCol.id]: 'general' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
    { id: 'showcase-row-15', cols: { 'showcase-col-word': 'Syntax', 'showcase-col-pos': 'noun', 'showcase-col-def': 'The set of rules that defines the combinations of symbols that are considered to be correctly structured statements or expressions in a language.', 'showcase-col-sentence': 'A missing semicolon was the cause of the syntax error.', [showcaseTagCol.id]: 'tech' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
];

const showcaseRel1: Relation = { id: 'showcase-rel-1', name: 'Word -> Definition', questionColumnIds: [showcaseWordCol.id], answerColumnIds: [showcaseDefCol.id], compatibleModes: [StudyMode.Flashcards, StudyMode.Typing, StudyMode.MultipleChoice] };
const showcaseRel2: Relation = { id: 'showcase-rel-2', name: 'Definition -> Word', questionColumnIds: [showcaseDefCol.id], answerColumnIds: [showcaseWordCol.id], compatibleModes: [StudyMode.Flashcards, StudyMode.Typing, StudyMode.MultipleChoice] };
const showcaseRel3: Relation = { id: 'showcase-rel-3', name: 'Sentence Scramble', questionColumnIds: [showcaseSentenceCol.id], answerColumnIds: [], compatibleModes: [StudyMode.Scrambled] };
const showcaseRel4: Relation = { id: 'showcase-rel-4', name: 'Full Context Review', questionColumnIds: [showcaseWordCol.id, showcasePosCol.id], answerColumnIds: [showcaseDefCol.id, showcaseSentenceCol.id], compatibleModes: [StudyMode.Flashcards] };

const defaultFeatureShowcaseTable: Table = {
    id: 'default-feature-showcase',
    name: 'Vmind Feature Showcase',
    columns: [showcaseWordCol, showcasePosCol, showcaseDefCol, showcaseSentenceCol, showcaseTagCol],
    rows: showcaseRows,
    rowCount: showcaseRows.length,
    relations: [showcaseRel1, showcaseRel2, showcaseRel3, showcaseRel4],
    tags: ['sample', 'vmind'],
    createdAt: Date.now() - 86400000 * 7, // 7 days ago
    modifiedAt: Date.now() - 86400000 * 1, // 1 day ago
};

// --- Default Solar System Table ---
const defaultSolarSystemTable: Table = {
    id: 'default-solar-system',
    name: 'Solar System Facts',
    columns: [ { id: 'col-planet', name: 'Planet' }, { id: 'col-fact', name: 'Fact' } ],
    rows: [ { id: 'row-earth', cols: { 'col-planet': 'Earth', 'col-fact': 'The only planet known to support life.' }, stats: { correct: 10, incorrect: 1, lastStudied: Date.now() - 259200000, flashcardStatus: FlashcardStatus.Easy, flashcardEncounters: 11, isFlashcardReviewed: true, lastPracticeDate: Date.now() - 259200000 } } ],
    rowCount: 1,
    relations: [],
    createdAt: Date.now() - 86400000 * 5, // 5 days ago
    modifiedAt: Date.now() - 86400000 * 2, // 2 days ago
};

// --- Default Anki Table ---
const ankiFrontCol: Column = { id: 'default-anki-front', name: 'Front' };
const ankiBackCol: Column = { id: 'default-anki-back', name: 'Back' };
const ankiDesign: RelationDesign = {
    front: { backgroundType: 'solid', backgroundValue: '#2d3748', gradientAngle: 135, typography: { 'default-anki-front': { color: '#cda434', fontSize: '1.625rem', fontFamily: 'Poppins, sans-serif', textAlign: 'center', fontWeight: 'bold' } }, layout: 'vertical' },
    back: { backgroundType: 'solid', backgroundValue: '#1a202c', gradientAngle: 135, typography: { 'default-anki-back': { color: '#e0c585', fontSize: '1.25rem', fontFamily: 'Poppins, sans-serif', textAlign: 'center', fontWeight: 'normal' } }, layout: 'vertical' },
    designLinked: true,
};
const ankiRel1: Relation = { id: 'default-anki-rel1', name: 'Front -> Back', questionColumnIds: [ankiFrontCol.id], answerColumnIds: [ankiBackCol.id], compatibleModes: [StudyMode.Flashcards, StudyMode.Typing], design: ankiDesign };
const ankiRel2: Relation = { id: 'default-anki-rel2', name: 'Back -> Front', questionColumnIds: [ankiBackCol.id], answerColumnIds: [ankiFrontCol.id], compatibleModes: [StudyMode.Flashcards, StudyMode.Typing], design: ankiDesign };
const defaultAnkiTable: Table = {
    id: 'default-anki-table',
    name: 'Sample Anki Deck (Japanese)',
    columns: [ankiFrontCol, ankiBackCol],
    rows: [
        { id: 'anki-row-1', cols: { 'default-anki-front': 'こんにちわ', 'default-anki-back': 'Hello' }, stats: { correct: 2, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
        { id: 'anki-row-2', cols: { 'default-anki-front': 'ありがとう', 'default-anki-back': 'Thank you' }, stats: { correct: 1, incorrect: 1, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } }
    ],
    rowCount: 2,
    relations: [ankiRel1, ankiRel2],
    tags: ['sample', 'language'],
    createdAt: Date.now() - 86400000 * 4, // 4 days ago
    modifiedAt: Date.now() - 86400000 * 3, // 3 days ago
};

// --- Default Flashcard Progresses ---
const techRowIds = showcaseRows.filter(r => r.cols[showcaseTagCol.id] === 'tech').map(r => r.id);

const defaultProgress1: FlashcardProgress = {
    id: 'default-progress-1',
    name: 'Sample: All Showcase Cards',
    tableIds: ['default-feature-showcase'],
    relationIds: ['showcase-rel-1', 'showcase-rel-2'],
    tags: ['FC+Vmind_Feature_Showcase'],
    createdAt: Date.now() - 100000,
    queue: showcaseRows.map(r => r.id),
    currentIndex: 5,
};

const defaultProgress2: FlashcardProgress = {
    id: 'default-progress-2',
    name: 'Sample: Tech Terms',
    tableIds: ['default-feature-showcase'],
    relationIds: ['showcase-rel-1'],
    tags: ['FC+Vmind_Feature_Showcase', 'FC+tech'],
    createdAt: Date.now(),
    queue: techRowIds,
    currentIndex: 2,
};


const defaultStats: UserStats = { xp: 0, level: 1, studyStreak: 0, lastSessionDate: null, activity: {}, totalStudyTimeSeconds: 0, unlockedBadges: [] };
const defaultDictationNote = { id: 'default-dictation-1', title: 'Sample Dictation', youtubeUrl: '', transcript: [{ text: "Welcome to Vmind!", start: 0, duration: 3 }], practiceHistory: [] };
const defaultState: AppState = { tables: [defaultFeatureShowcaseTable, defaultSolarSystemTable, defaultAnkiTable], folders: [], stats: defaultStats, notes: [], dictationNotes: [defaultDictationNote], settings: { journalMode: 'manual' }, flashcardProgresses: [defaultProgress1, defaultProgress2] };


// --- UTILITY FUNCTIONS ---
const VMINDS_STORAGE_KEYS = [
    'vmind-theme',
    'vmind-user-data',
    'vmind-tables',
    'vmind-notes',
    'vmind-dictation-notes',
    'vmind-session-data',
];

export function clearLocalStorage() {
    VMINDS_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
}

// This type mirrors the data structure fetched by the new DataSyncManager
type FetchedNormalizedData = {
    user_profile: Partial<Pick<AppState, 'stats' | 'settings'>> | null;
    tables: (Omit<Table, 'rows'> & { vocab_rows: { count: number }[] })[];
    folders: Folder[];
    notes: Pick<Note, 'id' | 'title' | 'createdAt'>[];
    dictation_notes: Pick<DictationNote, 'id' | 'title' | 'youtubeUrl' | 'practiceHistory'>[];
    session_data: { flashcard_progresses: FlashcardProgress[] } | null;
} | null;


// --- HYDRATION & RESET LOGIC ---
export function hydrateStores(data: FetchedNormalizedData) {
    if (!data) {
        resetStores();
        return;
    }
    
    // Process tables by re-integrating the nested vocab_rows
    const processedTables = ((data.tables || []) as any[]).map(t => {
        const { vocab_rows, image_config, audio_config, ai_prompts, is_public, created_at, modified_at, ...tableData } = t;
        // Legacy data migration/cleaning logic
        const relations = (tableData.relations || []).map((r: any): Relation => ({
            ...r,
            questionColumnIds: Array.isArray(r.questionColumnIds) ? r.questionColumnIds : (r.questionColumnId ? [r.questionColumnId] : []),
            answerColumnIds: Array.isArray(r.answerColumnIds) ? r.answerColumnIds : (r.answerColumnId ? [r.answerColumnId] : [])
        }));
        
        return {
            ...tableData,
            // FIX: Use Array.isArray for a more robust check to ensure 'columns' is always an array.
            // This prevents crashes if the database contains a malformed table object with null or non-array 'columns'.
            columns: Array.isArray(tableData.columns) ? tableData.columns : [],
            imageConfig: image_config,
            audioConfig: audio_config,
            aiPrompts: ai_prompts,
            isPublic: is_public,
            rows: [], // Rows will be lazy-loaded
            rowCount: vocab_rows[0]?.count ?? 0,
            relations: relations,
            createdAt: created_at ? new Date(created_at).getTime() : undefined,
            modifiedAt: modified_at ? new Date(modified_at).getTime() : undefined,
        };
    });
    
    const processedNotes = ((data.notes || []) as any[]).map(note => ({
        id: note.id,
        title: note.title,
        createdAt: new Date(note.created_at).getTime(),
        // content is lazy loaded, so it's not present here
    }));
    
    const processedDictationNotes = ((data.dictation_notes || []) as any[]).map(note => ({
        id: note.id,
        title: note.title,
        youtubeUrl: note.youtube_url, // Map from snake_case to camelCase
        practiceHistory: note.practice_history, // Map from snake_case to camelCase
        // transcript is lazy-loaded
    }));
    
    // FIX: Map `created_at` from the database to `createdAt` in the folder object. This fixes arithmetic errors when sorting folders by date.
    const processedFolders = ((data.folders || []) as any[]).map(folder => ({
        id: folder.id,
        name: folder.name,
        tableIds: folder.table_ids || [], // Map from snake_case to camelCase
        createdAt: new Date(folder.created_at).getTime(),
    }));

    useUserStore.setState({ stats: data.user_profile?.stats || defaultStats, settings: data.user_profile?.settings || defaultState.settings });
    useTableStore.setState({ tables: processedTables as Table[], folders: processedFolders as Folder[] });
    useNoteStore.setState({ notes: processedNotes as Note[] });
    useDictationNoteStore.setState({ dictationNotes: processedDictationNotes as DictationNote[] });
    useSessionDataStore.setState({ flashcardProgresses: data.session_data?.flashcard_progresses || [] });
}

export function resetStores() {
    // Reset stores to their initial (guest) state. The persist middleware will then load from localStorage if available.
    useUserStore.setState({ stats: defaultState.stats, settings: defaultState.settings });
    useTableStore.setState({ tables: defaultState.tables, folders: defaultState.folders });
    useNoteStore.setState({ notes: defaultState.notes });
    useDictationNoteStore.setState({ dictationNotes: defaultState.dictationNotes });
    useSessionDataStore.setState({ flashcardProgresses: defaultState.flashcardProgresses || [] });
}

// --- ZUSTAND STORAGE ADAPTER ---
// This adapter now ONLY handles localStorage for guests.
// Server sync is managed by DataSyncManager for loading and individual store actions for saving.
export const vmindStorage: StateStorage = {
    getItem: (name: string): string | null => {
        // Always read from localStorage. DataSyncManager will overwrite for logged-in users.
        return localStorage.getItem(name);
    },
    setItem: (name: string, value: string): void => {
        const { isGuest } = useUserStore.getState();
        // Only write to localStorage for guests. Logged-in user data is persisted on the server.
        if(isGuest) {
            localStorage.setItem(name, value);
        }
    },
    removeItem: (name: string): void => {
        localStorage.removeItem(name);
    },
};