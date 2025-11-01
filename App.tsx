import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import BottomNav from './components/BottomNav';
import HomeScreen from './screens/HomeScreen';
import TablesScreen from './screens/TablesScreen';
import StudyScreen from './screens/StudyScreen';
import FlashcardsScreen from './screens/FlashcardsScreen';
import RewardsScreen from './screens/RewardsScreen';
import SettingsScreen from './screens/SettingsScreen';
import StudySessionScreen from './screens/StudySessionScreen';
import FlashcardSessionScreen from './screens/FlashcardSessionScreen';
import TheaterSessionScreen from './screens/TheaterSessionScreen';
import LibraryScreen from './screens/LibraryScreen';
import JournalScreen from './screens/JournalScreen';
import ReadingScreen from './screens/ReadingScreen';
import VmindScreen from './screens/VmindScreen';
import TheaterSetupScreen from './screens/TheaterSetupScreen';
import ScrambleSetupScreen from './screens/ScrambleSetupScreen';
import ScrambleSessionScreen from './screens/ScrambleSessionScreen';
import DictationScreen from './screens/DictationScreen';
import DictationEditorScreen from './screens/DictationEditorScreen';
import DictationSessionScreen from './screens/DictationSessionScreen';
import { StudySettings, VocabTable, Relation, StudyQuestion, SessionWordResult, GlobalStats, StudyPreset, VocabRow, HistoryLogItem, AppSettings, FullAppState, BackupRecord, Folder, VocabRowStats, TheaterSessionContext, JournalData, ChatContext, ReadingNote, BackgroundMusicLink, ScrambleSessionContext, DictationSessionContext, DictationNote, TranscriptEntry } from './types';
import { sampleTables as initialTables, sampleRelations as initialRelations, sampleFolders as initialFolders, initialGlobalStats } from './data/mockData';
import { defaultStudySettings } from './data/defaults';
import { generateStudySession } from './utils/studySessionGenerator';
import { milestones } from './data/milestones';
import { supabase } from './utils/supabase';
import { User } from '@supabase/supabase-js';
import Chatbot from './components/Chatbot';
import { PlayIcon, MusicNoteIcon, SpinnerIcon, CheckCircleIcon, AlertTriangleIcon } from './components/Icons';
import FloatingMusicPlayer from './components/FloatingMusicPlayer';
import { calculateTotalPracticeSeconds } from './utils/timeUtils';

export type Screen = 'Home' | 'Tables' | 'Study' | 'FlashCards' | 'Rewards' | 'Settings' | 'Library' | 'Journal' | 'Reading' | 'Vmind' | 'TheaterSetup' | 'ScrambleSetup' | 'Dictation';

const blankGlobalStats: GlobalStats = {
  xp: 0,
  inQueueReal: 0,
  quitQueueReal: 0,
  unlockedMilestoneIds: [],
  history: [],
  lastViewedMilestoneCount: 0,
};

const getLevelFromRankPoint = (rankPoint: number): number => {
  if (rankPoint <= 0) return 1;
  if (rankPoint <= 3) return 2;
  if (rankPoint <= 7) return 3;
  if (rankPoint <= 15) return 4;
  if (rankPoint <= 31) return 5;
  return 6;
};

const defaultAppSettings: AppSettings = { 
  quitPenalty: 'none',
  autoBackupInterval: '1d',
  conflictResolution: 'merge',
  backupHistory: [],
  audioAutoPlay: true,
  audioRepeat: 1,
  audioPlaybackRate: 1.0,
  journalLoggingMode: 'manual',
  userApiKey: null,
  backgroundMusic: 'off',
  backgroundMusicLinks: [],
  repeatMode: 'none',
};

const getInitialAppState = (): FullAppState => ({
  tables: initialTables.map(t => ({...t, isDemo: false})),
  relations: initialRelations.map(r => ({...r, isDemo: false})),
  folders: initialFolders.map(f => ({...f, isDemo: false})),
  globalStats: initialGlobalStats,
  studySettings: defaultStudySettings,
  appSettings: defaultAppSettings,
  studyPresets: [],
  profilePicture: null,
  savedFlashcardQueues: {},
  savedScrambleQueues: {},
  journal: {},
  readingNotes: [],
  dictationNotes: [],
});


const SyncStatusIndicator: React.FC<{ status: 'idle' | 'unsaved' | 'saving' | 'saved' | 'error' }> = ({ status }) => {
    // Per user request, 'idle' and 'unsaved' states are now invisible.
    // FIX: Corrected a logical error where the condition was always true because 'unsaved' is a truthy string.
    if (status === 'idle' || status === 'unsaved') {
        return null;
    }

    const content = {
        saving: { 
            icon: <SpinnerIcon className="w-5 h-5 animate-spin-fast" />, 
            text: null, 
            color: "bg-slate-700", 
            padding: "p-2" 
        },
        saved: { 
            icon: <CheckCircleIcon className="w-5 h-5" />, 
            text: null, 
            color: "bg-teal-600", 
            padding: "p-2" 
        },
        error: { 
            icon: <AlertTriangleIcon className="w-5 h-5" />, 
            text: "Sync error", 
            color: "bg-red-600", 
            padding: "px-3 py-1.5" 
        },
    };

    const { icon, text, color, padding } = content[status as keyof typeof content];

    return (
        <div className={`fixed bottom-20 left-4 flex items-center gap-2 rounded-full text-white text-xs font-semibold shadow-lg z-50 animate-scale-in ${color} ${padding}`}>
            {icon}
            {text && <span>{text}</span>}
        </div>
    );
};


const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<Screen>('Home');
  const [studySettings, setStudySettings] = useState<StudySettings>(defaultStudySettings);
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);
  const [userTables, setUserTables] = useState<VocabTable[]>([]);
  const [userRelations, setUserRelations] = useState<Relation[]>([]);
  const [userFolders, setUserFolders] = useState<Folder[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats>(blankGlobalStats);
  const [studyPresets, setStudyPresets] = useState<StudyPreset[]>([]);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [savedFlashcardQueues, setSavedFlashcardQueues] = useState<{ [key: string]: string[] }>({});
  const [savedScrambleQueues, setSavedScrambleQueues] = useState<{ [key: string]: string[] }>({});
  const [journal, setJournal] = useState<JournalData>({});
  const [readingNotes, setReadingNotes] = useState<ReadingNote[]>([]);
  const [dictationNotes, setDictationNotes] = useState<DictationNote[]>([]);
  
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [studyQueue, setStudyQueue] = useState<StudyQuestion[]>([]);
  
  const [isFlashcardSessionActive, setIsFlashcardSessionActive] = useState(false);
  const [currentFlashcardSessionContext, setCurrentFlashcardSessionContext] = useState<{tableIds: string[], relationIds: string[]} | null>(null);
  
  const [isTheaterSessionActive, setIsTheaterSessionActive] = useState(false);
  const [currentTheaterSessionContext, setCurrentTheaterSessionContext] = useState<TheaterSessionContext | null>(null);

  const [isScrambleSessionActive, setIsScrambleSessionActive] = useState(false);
  const [currentScrambleSessionContext, setCurrentScrambleSessionContext] = useState<ScrambleSessionContext | null>(null);
  
  const [currentDictationNote, setCurrentDictationNote] = useState<DictationNote | null>(null);
  const [editingDictationNote, setEditingDictationNote] = useState<DictationNote | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const debounceTimeoutRef = useRef<number | null>(null);

  const [toast, setToast] = useState<{ message: string, key: number } | null>(null);

  // --- Sync Status State ---
  const [syncStatus, setSyncStatus] = useState<'idle' | 'unsaved' | 'saving' | 'saved' | 'error'>('idle');
  const savedTimeoutRef = useRef<number | null>(null);
  const initialLoadDone = useRef(false);
  
  // --- Global UI State ---
  const [isReadingFocusMode, setIsReadingFocusMode] = useState(false);

  // --- Chatbot Context State ---
  const [currentSessionWord, setCurrentSessionWord] = useState<VocabRow | null>(null);
  const [activeJournalDate, setActiveJournalDate] = useState<string | null>(null);
  const [activeSubScreen, setActiveSubScreen] = useState<string | null>(null);
  const [initialChatQuery, setInitialChatQuery] = useState<string | null>(null);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  const chatContext = useMemo((): ChatContext => {
    const context: ChatContext = { screen: activeScreen };
    if (activeSubScreen) {
      context.subScreen = activeSubScreen;
    }
    if (isSessionActive || isFlashcardSessionActive || isTheaterSessionActive) {
      context.currentWord = currentSessionWord;
    }
    if (activeScreen === 'Journal' && activeJournalDate) {
      context.journalDate = activeJournalDate;
      context.journalContent = journal[activeJournalDate]?.note;
    }
    return context;
  }, [activeScreen, activeSubScreen, currentSessionWord, activeJournalDate, journal, isSessionActive, isFlashcardSessionActive, isTheaterSessionActive]);

  const handleVmindLookup = (text: string) => {
    setInitialChatQuery(`Explain this sentence: "${text}"`);
    setIsChatbotOpen(true);
  };

  const handleInitialQueryHandled = () => {
    setInitialChatQuery(null);
  };

  const totalPracticeHours = useMemo(() => {
    return calculateTotalPracticeSeconds(globalStats.history) / 3600;
  }, [globalStats.history]);

  const applyLoadedState = (loadedState: FullAppState | null) => {
    const userOwnedTables = (loadedState?.tables || []).map(t => ({ ...t, isDemo: false }));
    setUserTables(userOwnedTables);
    setUserRelations(loadedState?.relations || []);
    setUserFolders(loadedState?.folders || []);
    setGlobalStats({ ...blankGlobalStats, ...(loadedState?.globalStats || {}) });
    setStudySettings({ ...defaultStudySettings, ...(loadedState?.studySettings || {}) });

    const finalAppSettings = { ...defaultAppSettings, ...(loadedState?.appSettings || {}) };

    // --- MIGRATION LOGIC FOR backgroundMusicLinks ---
    if (finalAppSettings.backgroundMusicLinks && finalAppSettings.backgroundMusicLinks.length > 0 && typeof finalAppSettings.backgroundMusicLinks[0] === 'string') {
        const migratedLinks = (finalAppSettings.backgroundMusicLinks as unknown as string[]).map((url, index) => {
            let title = `Custom Link ${index + 1}`;
            try {
                const urlObject = new URL(url);
                const pathSegments = urlObject.pathname.split('/');
                const filename = pathSegments[pathSegments.length - 1];
                const decodedFilename = decodeURIComponent(filename);
                const lastDotIndex = decodedFilename.lastIndexOf('.');
                const nameWithoutExtension = lastDotIndex !== -1 ? decodedFilename.substring(0, lastDotIndex) : decodedFilename;
                
                if (nameWithoutExtension) {
                    title = nameWithoutExtension.replace(/[-_]/g, ' ');
                }
            } catch (e) {
                console.warn("Could not parse URL for background music title:", url);
            }
            return { title, url };
        });
        finalAppSettings.backgroundMusicLinks = migratedLinks;
    }
    // --- END MIGRATION LOGIC ---
    
    setAppSettings(prev => ({ ...prev, ...finalAppSettings }));

    setStudyPresets(loadedState?.studyPresets || []);
    setProfilePicture(loadedState?.profilePicture || null);
    setSavedFlashcardQueues(loadedState?.savedFlashcardQueues || {});
    setSavedScrambleQueues(loadedState?.savedScrambleQueues || {});
    setJournal(loadedState?.journal || {});
    setReadingNotes(loadedState?.readingNotes || []);
    setDictationNotes(loadedState?.dictationNotes || []);
  };

  const showToast = useCallback((message: string) => {
    setToast({ message, key: Date.now() });
    // Duration should match CSS animation
    setTimeout(() => setToast(null), 3000);
  }, []);
  
  // --- Auth & Data Loading ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoadingData(false); // Initial load check is done
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        showToast("You have been signed out.");
        setActiveScreen('Home');
      }
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [showToast]);
  
  useEffect(() => {
    if (user) {
      setIsLoadingData(true);
      supabase.from('user_data').select('app_state').single()
        .then(({ data, error }) => {
          if (data && data.app_state) {
            applyLoadedState(data.app_state as FullAppState);
          } else if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine for a new user
            console.error('Error fetching data:', error);
            alert('Could not load your data.');
            applyLoadedState(getInitialAppState()); // Fallback to initial data
          } else {
            // New user, no data found. Seed their account with the initial state.
            applyLoadedState(getInitialAppState());
          }
        })
        .finally(() => setIsLoadingData(false));
    } else {
      // Logged out, use initial data.
      applyLoadedState(getInitialAppState());
      setIsLoadingData(false);
    }
  }, [user]);

  const gatherAppState = (): FullAppState => {
    const { backupHistory, ...settingsToSave } = appSettings;
    return {
      tables: userTables,
      relations: userRelations,
      folders: userFolders,
      globalStats,
      studySettings,
      appSettings: settingsToSave,
      studyPresets,
      profilePicture,
      savedFlashcardQueues,
      savedScrambleQueues,
      journal,
      readingNotes,
      dictationNotes,
    };
  };

  // --- Data Saving ---
  useEffect(() => {
    if (isLoadingData) {
        initialLoadDone.current = false;
        return;
    }

    if (!initialLoadDone.current) {
        initialLoadDone.current = true;
        return;
    }

    if (user) {
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
        setSyncStatus('unsaved');

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        
        debounceTimeoutRef.current = window.setTimeout(() => {
            setSyncStatus('saving');
            const appState = gatherAppState();
            supabase.from('user_data').upsert({
                id: user.id,
                app_state: appState,
                updated_at: new Date().toISOString()
            }).then(({ error }) => {
                if (error) {
                    console.error("Error saving data:", error);
                    setSyncStatus('error');
                } else {
                    setSyncStatus('saved');
                    savedTimeoutRef.current = window.setTimeout(() => setSyncStatus('idle'), 2000);
                }
            });
        }, 2500);
    }

    return () => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
    };
}, [user, isLoadingData, userTables, userRelations, userFolders, globalStats, studySettings, appSettings, studyPresets, profilePicture, savedFlashcardQueues, savedScrambleQueues, journal, readingNotes, dictationNotes]);

  
  const allMusicTracks = useMemo<BackgroundMusicLink[]>(() => {
    return appSettings.backgroundMusicLinks || [];
  }, [appSettings.backgroundMusicLinks]);

  const handleTrackChange = (url: string) => {
    setAppSettings(prev => ({...prev, backgroundMusic: url}));
  };

  
  const tables = userTables;
  const relations = userRelations;
  const folders = userFolders;

  const updateUserTables = (updater: React.SetStateAction<VocabTable[]>) => {
    setUserTables(updater);
  };

  const updateUserRelations = (updater: React.SetStateAction<Relation[]>) => {
    setUserRelations(updater);
  };

  const updateUserFolders = (updater: React.SetStateAction<Folder[]>) => {
    setUserFolders(updater);
  };

  const handleMoveTableToFolder = (tableId: string, folderId: string | null) => {
      updateUserFolders(currentFolders => {
        const newFolders = JSON.parse(JSON.stringify(currentFolders));
        
        // 1. Remove table from its current folder (if any)
        newFolders.forEach((folder: Folder) => {
          const index = folder.tableIds.indexOf(tableId);
          if (index > -1) {
            folder.tableIds.splice(index, 1);
          }
        });

        // 2. Add table to the new folder (if a folder is selected)
        if (folderId) {
          const targetFolder = newFolders.find((f: Folder) => f.id === folderId);
          if (targetFolder) {
            targetFolder.tableIds.push(tableId);
          }
        }
        
        return newFolders;
      });
    };

  const handleDownloadLibraryTable = (tableToAdd: VocabTable) => {
    updateUserTables(currentTables => {
        // Check if a table with the same name already exists to avoid confusion
        if (currentTables.some(t => (t.name || '').toLowerCase() === (tableToAdd.name || '').toLowerCase())) {
            if (!window.confirm(`A table named "${tableToAdd.name}" already exists. Do you want to add this one anyway?`)) {
                return currentTables;
            }
        }
        return [...currentTables, tableToAdd];
    });
    setActiveScreen('Tables');
  };

  const handleAddToJournal = (entryData: {
      vocabRow: VocabRow;
      relation: Relation;
      sourceSessionType: 'study' | 'flashcard' | 'theater' | 'scramble' | 'dictation';
  }) => {
      const { vocabRow, relation, sourceSessionType } = entryData;
      
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = (now.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
      const dd = now.getDate().toString().padStart(2, '0');
      const localDateString = `${yyyy}-${mm}-${dd}`;

      const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const dateString = `${dd}/${mm}/${yyyy.toString().slice(-2)}`;
      const sessionName = sourceSessionType.charAt(0).toUpperCase() + sourceSessionType.slice(1);

      const logHeader = `*Logged at [${dateString} :${timeString}] from ${sessionName}*`;

      const frontContent = relation.questionCols
          .map(colName => `${colName}: ${vocabRow.cols[colName] || ''}`)
          .join('\n');

      const backContent = relation.answerCols
          .map(colName => `${colName}: ${vocabRow.cols[colName] || ''}`)
          .join('\n');
      
      const markdownSnippet = [
          '---',
          logHeader,
          'Front:',
          frontContent,
          '',
          'Back:',
          backContent
      ].join('\n');

      setJournal(prevJournal => {
          const todayData = prevJournal[localDateString] || { note: '' };
          const existingNote = todayData.note || '';
          // Prepend new entry at the top for better visibility
          const newNote = existingNote ? `${markdownSnippet}\n\n${existingNote}` : markdownSnippet;
          
          return {
              ...prevJournal,
              [localDateString]: { note: newNote },
          };
      });
  };
  
  const handleAddToJournalFromText = (content: string, source: string, contextInfo?: string) => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = (now.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
    const dd = now.getDate().toString().padStart(2, '0');
    const localDateString = `${yyyy}-${mm}-${dd}`;

    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const dateString = `${dd}/${mm}/${yyyy.toString().slice(-2)}`;
    
    const logHeader = `*Logged at [${dateString} :${timeString}] from ${source}*`;
    
    const markdownSnippet = [
        '---',
        logHeader,
        contextInfo ? `${contextInfo}\n${content}` : content
    ].join('\n');

    setJournal(prevJournal => {
        const todayData = prevJournal[localDateString] || { note: '' };
        const existingNote = todayData.note || '';
        const newNote = existingNote ? `${markdownSnippet}\n\n${existingNote}` : markdownSnippet;
        
        return {
            ...prevJournal,
            [localDateString]: { note: newNote },
        };
    });
    showToast("Added to journal!");
  };

  const handleAddToJournalFromChatbot = (content: string) => {
    handleAddToJournalFromText(content, 'Chatbot');
  };

  // --- Manual Backup and Restore Logic (Kept as a feature) ---
  const handleSaveFullBackup = () => {
    const appState = gatherAppState();
    const dataStr = JSON.stringify(appState, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `vmind_full_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLoadFullBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const text = e.target?.result as string;
            const loadedState = JSON.parse(text) as FullAppState;
            if (window.confirm("Are you sure you want to load this backup? This will overwrite your current data.")) {
                applyLoadedState(loadedState);
            }
          } catch (error) {
            console.error("Failed to load backup:", error);
            alert("Failed to read or parse the backup file.");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };
  
  const startSession = () => {
    const queue = generateStudySession(studySettings, tables, relations);
    if (queue.length > 0) {
      setStudyQueue(queue);
      setIsSessionActive(true);
    } else {
      alert("Could not generate a study session. Please check your selections and try again. You may need more words in your tables for certain question types.");
    }
  };
  
  const finishSession = () => {
    setIsSessionActive(false);
    setStudyQueue([]);
    setStudySettings(prev => ({...prev, isManualMode: false, manualWordIds: []}));
    setActiveScreen('Home');
  };

  const startFlashcardSession = (tableIds: string[], relationIds: string[]) => {
      const allWordsInTables = tables.filter(t => tableIds.includes(t.id)).flatMap(t => t.rows);
      const rels = relations.filter(r => relationIds.includes(r.id));
      
      if (allWordsInTables.length > 0 && rels.length > 0) {
          setCurrentFlashcardSessionContext({ tableIds, relationIds });
          setIsFlashcardSessionActive(true);
      } else {
          alert("Please select at least one table with words and one relation to start a flashcard session.");
      }
  };

  const startTheaterSession = (context: TheaterSessionContext) => {
    const allWordsInTables = tables.filter(t => context.tableIds.includes(t.id)).flatMap(t => t.rows);
    const rels = relations.filter(r => context.relationIds.includes(r.id));
      
    if (allWordsInTables.length > 0 && rels.length > 0) {
        setCurrentTheaterSessionContext(context);
        setIsTheaterSessionActive(true);
    } else {
        alert("Please select at least one table with words and one relation to start a theater session.");
    }
  };
  
  const startScrambleSession = (context: ScrambleSessionContext) => {
    const rels = relations.filter(r => context.relationIds.includes(r.id));
    const sentenceColsByTableId = new Map<string, string>();
    rels.forEach(r => {
      if (r.questionCols.length > 0) {
        sentenceColsByTableId.set(r.tableId, r.questionCols[0]);
      }
    });

    const tablesForSession = tables.filter(t => context.tableIds.includes(t.id));

    let sentencesFound = false;
    for (const table of tablesForSession) {
        const sentenceCol = sentenceColsByTableId.get(table.id);
        if (sentenceCol) {
            for (const row of table.rows) {
                const sentenceText = row.cols[sentenceCol];
                if (sentenceText && sentenceText.trim().split(/\s+/).length >= context.settings.splitInto) {
                    sentencesFound = true;
                    break;
                }
            }
        }
        if (sentencesFound) break;
    }

    if (sentencesFound) {
        setCurrentScrambleSessionContext(context);
        setIsScrambleSessionActive(true);
    } else {
        alert("No compatible sentences found. Please check your selections and ensure sentences have enough words for the selected split count.");
    }
  };

  const handleCreateDictationNote = (title: string) => {
    const newNote: DictationNote = {
      id: `dictation-${Date.now()}`,
      createdAt: new Date().toISOString(),
      lastPracticedAt: null,
      practiceHistory: [],
      title,
      youtubeUrl: '',
      transcript: [],
    };
    setDictationNotes(prev => [newNote, ...prev]);
    setEditingDictationNote(newNote); // Immediately open the new note in the editor
  };
  
  const handleSelectDictationNoteForEdit = (note: DictationNote) => {
    setEditingDictationNote(note);
  };
  
  const handleStartDictationSession = (note: DictationNote) => {
    // Save any pending changes from the editor before starting
    handleUpdateDictationNote(note.id, note);
    setCurrentDictationNote(note);
    setEditingDictationNote(null);
  };
  
  const handleUpdateDictationNote = (noteId: string, updates: Partial<DictationNote>) => {
    setDictationNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...updates } : n));
  };
  
  const handleDeleteDictationNote = (noteId: string) => {
    setDictationNotes(prev => prev.filter(n => n.id !== noteId));
  };

  const handleFinishDictationSession = (correctCount: number, totalCount: number, durationSeconds: number) => {
    if (!currentDictationNote) return;

    setDictationNotes(prev => prev.map(note => {
      if (note.id === currentDictationNote.id) {
        const newHistoryItem = {
          timestamp: new Date().toISOString(),
          accuracy: totalCount > 0 ? (correctCount / totalCount) * 100 : 0,
          correctCount,
          totalCount,
          durationSeconds,
        };
        return {
          ...note,
          lastPracticedAt: new Date().toISOString(),
          practiceHistory: [...note.practiceHistory, newHistoryItem],
        };
      }
      return note;
    }));

    const xpGains = 10 + (correctCount * 2);
    setGlobalStats(prev => {
        const newHistory: HistoryLogItem[] = [...prev.history];
        newHistory.push({
            id: `hist-dictation-${Date.now()}`,
            timestamp: new Date().toISOString(),
            description: `Completed Dictation (${correctCount}/${totalCount} correct)`,
            xpChange: xpGains,
            type: 'dictation_session_complete',
            durationSeconds: durationSeconds,
        });

        while (newHistory.length > 50) { newHistory.shift(); }

        return {
          ...prev,
          xp: Math.max(0, prev.xp + xpGains),
          history: newHistory,
        };
    });

    const minutes = Math.round(durationSeconds / 60);
    if (minutes > 0) {
      showToast(`You practiced for ${minutes} minutes.`);
    }

    setCurrentDictationNote(null);
    setActiveScreen('Dictation');
  };

  const finishFlashcardSession = (ratings: { [rowId: string]: VocabRowStats['flashcardRatings'] }, reviewedIds: string[], flipCounts: Record<string, number>, perRowEncounterCounts: Record<string, number>, finalQueues: { [tableKey: string]: string[] }, durationSeconds: number) => {
    setSavedFlashcardQueues(prev => ({ ...(prev || {}), ...finalQueues }));
    const timestamp = new Date().toISOString();

    updateUserTables(currentTables => {
        const tablesCopy = JSON.parse(JSON.stringify(currentTables));
        const reviewedIdsSet = new Set(reviewedIds);

        tablesCopy.forEach((table: VocabTable) => {
            // Update total flip count for the table
            if (flipCounts[table.id]) {
                table.totalFlipCount = (table.totalFlipCount || 0) + flipCounts[table.id];
            }

            table.rows.forEach((row: VocabRow) => {
                // Update ratings for each row
                if (ratings[row.id]) {
                    row.stats.flashcardRatings = ratings[row.id];
                }
                // Update reviewed status and last practiced date
                if (reviewedIdsSet.has(row.id)) {
                    row.stats.isFlashcardReviewed = true;
                    row.stats.LastPracticeDate = timestamp;
                }
            });
        });
        return tablesCopy;
    });

    const xpGains = 10 + reviewedIds.length * 2;
        
    setGlobalStats(prev => {
        const currentXp = prev.xp;
        const newTotalXp = Math.max(0, currentXp + xpGains);
        
        const newlyUnlocked = milestones.filter(m => m.xpThreshold > currentXp && m.xpThreshold <= newTotalXp);
        const newUnlockedIds = [...prev.unlockedMilestoneIds, ...newlyUnlocked.map(m => m.id)];
        
        const newHistory: HistoryLogItem[] = [...prev.history];
        newHistory.push({
            id: `hist-flashcard-${Date.now()}`,
            timestamp: new Date().toISOString(),
            description: 'Completed Flashcard Session',
            xpChange: xpGains,
            type: 'session_complete',
            durationSeconds: durationSeconds,
        });
        newlyUnlocked.forEach(m => {
            newHistory.push({
                id: `hist-${Date.now()}-${m.id}`,
                timestamp: new Date().toISOString(),
                description: `Unlocked "${m.name}"`,
                xpChange: null,
                type: 'badge_gain',
                relatedMilestoneId: m.id,
            });
        });

        while (newHistory.length > 50) { newHistory.shift(); }

        return {
        ...prev,
        xp: newTotalXp,
        unlockedMilestoneIds: newUnlockedIds,
        history: newHistory,
        };
    });

    const minutes = Math.round(durationSeconds / 60);
    if (minutes > 0) {
        showToast(`You practiced for ${minutes} minutes.`);
    }

    setIsFlashcardSessionActive(false);
    setCurrentFlashcardSessionContext(null);
    setActiveScreen('FlashCards');
  };

  const finishTheaterSession = (viewedIds: string[], durationSeconds: number) => {
    const timestamp = new Date().toISOString();

    updateUserTables(currentTables => {
        const tablesCopy = JSON.parse(JSON.stringify(currentTables));
        const viewedIdsSet = new Set(viewedIds);

        tablesCopy.forEach((table: VocabTable) => {
            table.rows.forEach((row: VocabRow) => {
                if (viewedIdsSet.has(row.id)) {
                    row.stats.theaterEncounters = (row.stats.theaterEncounters || 0) + 1;
                    row.stats.LastPracticeDate = timestamp;
                }
            });
        });
        return tablesCopy;
    });

    const xpGains = 5 + Math.floor(durationSeconds / 60);
        
    setGlobalStats(prev => {
        const currentXp = prev.xp;
        const newTotalXp = Math.max(0, currentXp + xpGains);
        
        const newlyUnlocked = milestones.filter(m => m.xpThreshold > currentXp && m.xpThreshold <= newTotalXp);
        const newUnlockedIds = [...prev.unlockedMilestoneIds, ...newlyUnlocked.map(m => m.id)];
        
        const newHistory: HistoryLogItem[] = [...prev.history];
        newHistory.push({
            id: `hist-theater-${Date.now()}`,
            timestamp: new Date().toISOString(),
            description: 'Completed Theater Session',
            xpChange: xpGains,
            type: 'theater_session_complete',
            durationSeconds: durationSeconds,
        });
        
        while (newHistory.length > 50) { newHistory.shift(); }

        return {
        ...prev,
        xp: newTotalXp,
        unlockedMilestoneIds: newUnlockedIds,
        history: newHistory,
        };
    });
    
    const minutes = Math.round(durationSeconds / 60);
    if (minutes > 0) {
      showToast(`You practiced for ${minutes} minutes.`);
    }

    setIsTheaterSessionActive(false);
    setCurrentTheaterSessionContext(null);
    setActiveScreen('Vmind');
  };

  const finishScrambleSession = (
    ratings: { [rowId: string]: VocabRowStats['scrambleRatings'] },
    encounterCounts: { [rowId: string]: number },
    reviewedIds: string[],
    durationSeconds: number,
    finalQueues: { [key: string]: string[] }
  ) => {
    setSavedScrambleQueues(prev => ({ ...(prev || {}), ...finalQueues }));
    const timestamp = new Date().toISOString();
    
    updateUserTables(currentTables => {
        const tablesCopy = JSON.parse(JSON.stringify(currentTables));
        const reviewedIdsSet = new Set(reviewedIds);

        tablesCopy.forEach((table: VocabTable) => {
            table.rows.forEach((row: VocabRow) => {
                if (ratings[row.id]) {
                    row.stats.scrambleRatings = ratings[row.id];
                }
                if (encounterCounts[row.id]) {
                    row.stats.scrambleEncounters = (row.stats.scrambleEncounters || 0) + encounterCounts[row.id];
                }
                if (reviewedIdsSet.has(row.id)) {
                    row.stats.isScrambleReviewed = true;
                    row.stats.LastPracticeDate = timestamp;
                }
            });
        });
        return tablesCopy;
    });

    const xpGains = 15 + reviewedIds.length * 3;
    
    setGlobalStats(prev => {
        const currentXp = prev.xp;
        const newTotalXp = Math.max(0, currentXp + xpGains);
        
        const newlyUnlocked = milestones.filter(m => m.xpThreshold > currentXp && m.xpThreshold <= newTotalXp);
        const newUnlockedIds = [...prev.unlockedMilestoneIds, ...newlyUnlocked.map(m => m.id)];
        
        const newHistory: HistoryLogItem[] = [...prev.history];
        newHistory.push({
            id: `hist-scramble-${Date.now()}`,
            timestamp: new Date().toISOString(),
            description: 'Completed Sentence Scramble',
            xpChange: xpGains,
            type: 'scramble_session_complete',
            durationSeconds: durationSeconds,
        });

        while (newHistory.length > 50) { newHistory.shift(); }

        return {
        ...prev,
        xp: newTotalXp,
        unlockedMilestoneIds: newUnlockedIds,
        history: newHistory,
        };
    });

    const minutes = Math.round(durationSeconds / 60);
    if (minutes > 0) {
        showToast(`You practiced for ${minutes} minutes.`);
    }

    setIsScrambleSessionActive(false);
    setCurrentScrambleSessionContext(null);
    setActiveScreen('Vmind');
  };

  const handleSessionFinish = (results: SessionWordResult[], sessionXp: number, durationSeconds: number) => {
    const xpGains = 50 + sessionXp;
    
    setGlobalStats(prev => {
      const currentXp = prev.xp;
      const newTotalXp = Math.max(0, currentXp + xpGains);
      
      const newlyUnlocked = milestones.filter(m => m.xpThreshold > currentXp && m.xpThreshold <= newTotalXp);
      const newUnlockedIds = [...prev.unlockedMilestoneIds, ...newlyUnlocked.map(m => m.id)];
      
      const newHistory: HistoryLogItem[] = [...prev.history];
      newHistory.push({
          id: `hist-${Date.now()}`,
          timestamp: new Date().toISOString(),
          description: 'Completed Session',
          xpChange: xpGains,
          type: 'session_complete',
          durationSeconds: durationSeconds,
      });
      newlyUnlocked.forEach(m => {
           newHistory.push({
              id: `hist-${Date.now()}-${m.id}`,
              timestamp: new Date().toISOString(),
              description: `Unlocked "${m.name}"`,
              xpChange: null,
              type: 'badge_gain',
              relatedMilestoneId: m.id,
          });
      });

      while (newHistory.length > 50) { newHistory.shift(); }

      return {
        ...prev,
        xp: newTotalXp,
        inQueueReal: prev.inQueueReal + 1,
        unlockedMilestoneIds: newUnlockedIds,
        history: newHistory,
      };
    });

    updateUserTables(currentTables => {
      const tablesCopy = JSON.parse(JSON.stringify(currentTables));
      for (const result of results) {
        const table = tablesCopy.find((t: VocabTable) => t.id === result.tableId);
        if (table) {
          const row = table.rows.find((r: any) => r.id === result.rowId);
          if (row) {
            const stats = row.stats;
            stats.Passed1 += result.passed1;
            stats.Passed2 += result.passed2;
            stats.Failed += result.failed;
            
            stats.TotalAttempt = stats.Passed1 + stats.Passed2 + stats.Failed;
            stats.FailureRate = stats.TotalAttempt > 0 ? stats.Failed / stats.TotalAttempt : 0;
            stats.SuccessRate = 1 - stats.FailureRate;
            stats.RankPoint = (stats.Passed1 + stats.Passed2) - stats.Failed;
            stats.Level = getLevelFromRankPoint(stats.RankPoint);

            stats.InQueue += 1;
            stats.QuitQueue = false;
            stats.LastPracticeDate = new Date().toISOString();
          }
        }
      }
      return tablesCopy;
    });

    const minutes = Math.round(durationSeconds / 60);
    if (minutes > 0) {
        showToast(`You practiced for ${minutes} minutes.`);
    }
    finishSession();
  };
  
  const handleSessionQuit = (abandonedWords: { rowId: string; tableId: string }[], durationSeconds: number) => {
    const xpLoss = 30;

    setGlobalStats(prev => {
        let newUnlockedIds = [...prev.unlockedMilestoneIds];
        const newHistory: HistoryLogItem[] = [...prev.history];

        newHistory.push({
            id: `hist-${Date.now()}`,
            timestamp: new Date().toISOString(),
            description: 'Abandoned Session',
            xpChange: -xpLoss,
            type: 'session_quit',
            durationSeconds: durationSeconds,
        });

        if (appSettings.quitPenalty === 'lose_badge' && newUnlockedIds.length > 0) {
            const latestBadgeId = newUnlockedIds[newUnlockedIds.length - 1];
            const latestBadge = milestones.find(m => m.id === latestBadgeId);
            if (latestBadge) {
                newUnlockedIds.pop();
                newHistory.push({
                    id: `hist-${Date.now()}-loss`,
                    timestamp: new Date().toISOString(),
                    description: `Lost "${latestBadge.name}"`,
                    xpChange: null,
                    type: 'badge_loss',
                    relatedMilestoneId: latestBadge.id,
                });
            }
        }

        while (newHistory.length > 50) { newHistory.shift(); }
        
        return {
            ...prev,
            xp: Math.max(0, prev.xp - xpLoss),
            quitQueueReal: prev.quitQueueReal + 1,
            unlockedMilestoneIds: newUnlockedIds,
            history: newHistory,
        };
    });

    updateUserTables(currentTables => {
        const tablesCopy = JSON.parse(JSON.stringify(currentTables));
        for (const word of abandonedWords) {
            const table = tablesCopy.find((t: VocabTable) => t.id === word.tableId);
            if(table) {
                const row = table.rows.find((r: any) => r.id === word.rowId);
                if (row) {
                    row.stats.QuitQueue = true;
                }
            }
        }
        return tablesCopy;
    });

    const minutes = Math.round(durationSeconds / 60);
    if (minutes > 0) {
        showToast(`You practiced for ${minutes} minutes.`);
    }
    finishSession();
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-8 w-8 text-teal-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg font-semibold text-slate-500 mt-4">Loading your data...</p>
        </div>
      </div>
    );
  }

  const renderScreen = () => {
    switch (activeScreen) {
      case 'Home':
        return <HomeScreen setActiveScreen={setActiveScreen} tables={tables} globalStats={globalStats} readingNotes={readingNotes} onSubScreenChange={setActiveSubScreen} totalPracticeHours={totalPracticeHours} />;
      case 'Tables':
        return <TablesScreen 
          tables={tables} 
          setTables={updateUserTables} 
          relations={relations}
          setRelations={updateUserRelations}
          user={user}
          folders={folders}
          setFolders={updateUserFolders}
          onMoveTableToFolder={handleMoveTableToFolder}
          appSettings={appSettings}
          onSubScreenChange={setActiveSubScreen}
          showToast={showToast}
        />;
      case 'Vmind':
        return <VmindScreen setActiveScreen={setActiveScreen} />;
      case 'Study':
        return <StudyScreen 
            studySettings={studySettings} 
            setStudySettings={setStudySettings} 
            tables={tables} 
            relations={relations}
            setRelations={updateUserRelations}
            onStartSession={startSession}
            setActiveScreen={setActiveScreen}
            studyPresets={studyPresets}
            setStudyPresets={setStudyPresets}
            onSubScreenChange={setActiveSubScreen}
        />;
      case 'FlashCards':
        return <FlashcardsScreen tables={tables} relations={relations} onStartSession={startFlashcardSession} />;
      case 'TheaterSetup':
        return <TheaterSetupScreen tables={tables} relations={relations} onStartTheaterSession={startTheaterSession} setActiveScreen={setActiveScreen} />;
      case 'ScrambleSetup':
        return <ScrambleSetupScreen tables={tables} relations={relations} onStartScrambleSession={startScrambleSession} setActiveScreen={setActiveScreen} />;
      case 'Dictation':
        return <DictationScreen
          dictationNotes={dictationNotes}
          onDeleteNote={handleDeleteDictationNote}
          onCreateNote={handleCreateDictationNote}
          onEditNote={handleSelectDictationNoteForEdit}
          setActiveScreen={setActiveScreen}
        />;
      case 'Rewards':
        return <RewardsScreen globalStats={globalStats} setGlobalStats={setGlobalStats} onSubScreenChange={setActiveSubScreen} totalPracticeHours={totalPracticeHours} />;
      case 'Library':
        return <LibraryScreen onDownloadTable={handleDownloadLibraryTable} user={user} />;
      case 'Journal':
        return <JournalScreen journal={journal} setJournal={setJournal} onActiveJournalChange={setActiveJournalDate} />;
      case 'Reading':
        return <ReadingScreen
          readingNotes={readingNotes}
          setReadingNotes={setReadingNotes}
          tables={tables}
          setTables={updateUserTables}
          showToast={showToast}
          onSubScreenChange={setActiveSubScreen}
          onVmindLookup={handleVmindLookup}
          onFocusModeChange={setIsReadingFocusMode}
        />;
      case 'Settings':
        return <SettingsScreen
          user={user}
          profilePicture={profilePicture}
          setProfilePicture={setProfilePicture}
          appSettings={appSettings}
          setAppSettings={setAppSettings}
          setActiveScreen={setActiveScreen}
          onSaveBackup={handleSaveFullBackup}
          onLoadBackup={handleLoadFullBackup}
          onSubScreenChange={setActiveSubScreen}
        />;
      default:
        return <HomeScreen setActiveScreen={setActiveScreen} tables={tables} globalStats={globalStats} readingNotes={readingNotes} onSubScreenChange={setActiveSubScreen} totalPracticeHours={totalPracticeHours} />;
    }
  };

  if (editingDictationNote) {
    return <DictationEditorScreen 
      note={editingDictationNote}
      onBack={() => setEditingDictationNote(null)}
      onSave={handleUpdateDictationNote}
      onStartPractice={handleStartDictationSession}
    />
  }

  if (currentDictationNote) {
    return <DictationSessionScreen
      note={currentDictationNote}
      onSessionFinish={handleFinishDictationSession}
      onVmindLookup={handleVmindLookup}
      onAddToJournal={handleAddToJournalFromText}
    />
  }

  if (isScrambleSessionActive) {
    return <ScrambleSessionScreen
      sessionContext={currentScrambleSessionContext!}
      savedQueues={savedScrambleQueues}
      onSessionFinish={finishScrambleSession}
      tables={tables}
      relations={relations}
      appSettings={appSettings}
      onAddToJournal={(entry) => handleAddToJournal({...entry, sourceSessionType: 'scramble'})}
      onWordChange={setCurrentSessionWord}
    />
  }

  if (isTheaterSessionActive) {
    return <TheaterSessionScreen 
        sessionContext={currentTheaterSessionContext!}
        onSessionFinish={finishTheaterSession}
        tables={tables}
        relations={relations}
        appSettings={appSettings}
        onAddToJournal={(entry) => handleAddToJournal({...entry, sourceSessionType: 'theater'})}
        journal={journal}
        onWordChange={setCurrentSessionWord}
    />
  }

  if (isFlashcardSessionActive) {
    return <FlashcardSessionScreen 
        sessionContext={currentFlashcardSessionContext!}
        savedQueues={savedFlashcardQueues}
        onSessionFinish={finishFlashcardSession}
        tables={tables}
        relations={relations}
        appSettings={appSettings}
        onAddToJournal={(entry) => handleAddToJournal({...entry, sourceSessionType: 'flashcard'})}
        journal={journal}
        onWordChange={setCurrentSessionWord}
    />
  }

  if (isSessionActive) {
    return <StudySessionScreen 
        queue={studyQueue} 
        onSessionFinish={handleSessionFinish}
        onSessionQuit={handleSessionQuit}
        tables={tables}
        relations={relations}
        settings={studySettings}
        globalStats={globalStats}
        appSettings={appSettings}
        onAddToJournal={(entry) => handleAddToJournal({...entry, sourceSessionType: 'study'})}
        journal={journal}
        onWordChange={setCurrentSessionWord}
    />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1F2937] font-sans flex flex-col">
       {toast && (
        <div key={toast.key} className="fixed top-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-sm font-semibold py-2 px-4 rounded-full shadow-lg z-50 animate-toast-in-out">
            {toast.message}
        </div>
      )}
      <main className={`flex-grow container mx-auto px-4 py-6 ${!isReadingFocusMode ? 'mb-20' : ''}`}>
        {renderScreen()}
      </main>
      
      {!isReadingFocusMode && (
        <>
            <BottomNav activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
            <SyncStatusIndicator status={syncStatus} />
            <FloatingMusicPlayer
                activeMusicUrl={appSettings.backgroundMusic || 'off'}
                allMusicTracks={allMusicTracks}
                onTrackChange={handleTrackChange}
                repeatMode={appSettings.repeatMode || 'none'}
                onRepeatModeChange={(mode) => setAppSettings(prev => ({ ...prev, repeatMode: mode }))}
            />
            <Chatbot 
                context={chatContext} 
                userApiKey={appSettings.userApiKey} 
                onAddToJournal={handleAddToJournalFromChatbot}
                isOpen={isChatbotOpen}
                setIsOpen={setIsChatbotOpen}
                // FIX: Corrected variable name from 'initialQuery' to 'initialChatQuery' as per the component's state.
                initialQuery={initialChatQuery}
                onQueryHandled={handleInitialQueryHandled}
            />
        </>
      )}
    </div>
  );
};

export default App;
