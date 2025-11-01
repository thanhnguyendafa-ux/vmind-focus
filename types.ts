import React from 'react';
import { Modality } from '@google/genai';

export interface HistoryLogItem {
  id: string;
  timestamp: string; // ISO string
  description: string;
  xpChange: number | null; // Can be null for non-xp events
  type: 'session_complete' | 'session_quit' | 'badge_gain' | 'badge_loss' | 'theater_session_complete' | 'scramble_session_complete' | 'dictation_session_complete';
  relatedMilestoneId?: string;
  durationSeconds?: number;
}

export interface Folder {
  id: string;
  type: 'folder';
  name: string;
  tableIds: string[];
  isDemo?: boolean;
}

// New Journal types
export interface JournalDay {
  note: string;
}

export type JournalData = Record<string, JournalDay>; // Key is YYYY-MM-DD string

// New Reading Note types
export interface ReadingNote {
  id: string;
  title: string;
  content: string;
  defaultTableId: string | null;
  defaultColumn: string | null;
  createdAt: string; // ISO string
}

export interface DictationNote {
  id: string;
  title: string;
  youtubeUrl: string;
  transcript: TranscriptEntry[];
  createdAt: string;
  lastPracticedAt: string | null;
  practiceHistory: {
    timestamp: string;
    accuracy: number;
    correctCount: number;
    totalCount: number;
    durationSeconds: number;
  }[];
}

export interface FullAppState {
  tables: VocabTable[];
  relations: Relation[];
  folders: Folder[];
  globalStats: GlobalStats;
  studySettings: StudySettings;
  appSettings: Omit<AppSettings, 'backupHistory'>;
  studyPresets: StudyPreset[];
  profilePicture: string | null;
  savedFlashcardQueues?: { [key: string]: string[] };
  savedScrambleQueues?: { [key: string]: string[] };
  journal?: JournalData;
  readingNotes?: ReadingNote[];
  dictationNotes?: DictationNote[];
}

// FIX: Define the missing BackupRecord interface.
export interface BackupRecord {
  id: string;
  timestamp: string; // ISO string
  description: string;
}

export interface BackgroundMusicLink {
  title: string;
  url: string;
}

export interface AppSettings {
  quitPenalty: 'none' | 'lose_badge';
  autoBackupInterval: 'off' | '30m' | '2h' | '6h' | '1d' | '2d' | '7d';
  conflictResolution: 'merge' | 'copy' | 'overwrite_local' | 'overwrite_cloud';
  backupHistory?: BackupRecord[]; // Keep last 5
  audioAutoPlay?: boolean;
  audioRepeat?: number;
  audioPlaybackRate?: number;
  journalLoggingMode?: 'manual' | 'automatic';
  userApiKey?: string | null;
  backgroundMusic?: string; // 'off' or a URL
  backgroundMusicLinks?: BackgroundMusicLink[]; // Array of up to 6 custom links
  repeatMode?: 'none' | 'all' | 'one';
}

export interface Milestone {
  id: string;
  xpThreshold: number;
  name: string;
  description: string;
}

export interface TimeMilestone {
  id: string;
  hoursThreshold: number;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface GlobalStats {
  xp: number;
  inQueueReal: number;
  quitQueueReal: number;
  unlockedMilestoneIds: string[];
  history: HistoryLogItem[];
  lastViewedMilestoneCount: number;
}

export interface VocabRowStats {
  Passed1: number;
  Passed2: number;
  Failed: number;
  TotalAttempt: number;
  SuccessRate: number; // 0 to 1
  FailureRate: number; // 0 to 1
  RankPoint: number;
  Level: number;
  InQueue: number;
  QuitQueue: boolean;
  LastPracticeDate: string | null;
  flashcardStatus: 'Hard' | 'Good' | 'Easy' | null;
  flashcardEncounters?: number;
  flashcardRatings?: {
    again: number; // i+3
    hard: number;  // i+5
    good: number;  // i+8
    easy: number;  // i+13
    perfect: number; // i+21
  };
  isFlashcardReviewed?: boolean;
  theaterEncounters?: number;
  scrambleEncounters?: number;
  scrambleRatings?: {
    again: number;
    hard: number;
    good: number;
    easy: number;
    perfect: number;
  };
  isScrambleReviewed?: boolean;
}

export interface VocabRow {
  id: string;
  cols: { [key: string]: string };
  stats: VocabRowStats;
  tags: string[];
}

export interface VocabTable {
  id: string;
  name: string;
  wordCount: number;
  avgRankPoint: number;
  avgFailureRate: number;
  columns: string[];
  rows: VocabRow[];
  isDemo?: boolean;
  aiPrompts?: { [columnName: string]: string };
  totalFlipCount?: number;
  imageConfig?: {
    imageColumn: string;
    sourceColumn: string;
  };
  audioConfig?: {
    sourceColumn: string;
    language: string;
  };
}

export type StudyMode = 'MCQ' | 'TF' | 'Typing' | 'Scrambled';

export interface SortRule {
  column: string;
  direction: 'asc' | 'desc';
}

export type StudyCriterion = 'priority' | 'weakest' | 'least_practiced' | 'most_attempted';

export interface StudySettings {
  studyMode: 'table' | 'criteria';
  criteriaSorts: SortRule[];
  selectedTableIds: string[];
  selectedModes: StudyMode[];
  randomizeModes: boolean;
  selectedRelationIds: string[];
  randomRelation: boolean;
  isManualMode: boolean;
  manualWordIds: string[];
  wordCount: number;
  enableAccuracyGoal: boolean;
  accuracyGoal: number; // Percentage from 0 to 100
  // New properties for advanced word selection
  wordSelectionStrategy: 'holistic' | 'perTable';
  perTableSorts: { [tableId: string]: SortRule[] };
  queueCompositionStrategy: 'balanced' | 'percentage';
  tablePercentages: { [tableId: string]: number };
}

export interface StudyPreset {
  id: string;
  name: string;
  settings: StudySettings;
}

export interface RelationDesign {
  background?: {
    type: 'color' | 'gradient' | 'image';
    value: string; // hex color, gradient css string, or image URL
    // for gradient
    angle?: number;
    color1?: string;
    color2?: string;
  };
  columnStyles?: {
    [columnName: string]: {
      fontFamily?: string;
      fontSize?: number;
      fontWeight?: 'normal' | 'bold';
      color?: string;
    }
  };
}

export interface Relation {
  id: string;
  tableId: string;
  name: string;
  modes: StudyMode[];
  questionCols: string[];
  answerCols: string[];
  isCustom?: boolean;
  isDemo?: boolean;
  design?: RelationDesign;
}

export interface StudyQuestion {
  id:string;
  mode: StudyMode;
  vocabRow: VocabRow;
  tableId: string;
  relation: Relation;
  questionContent: string;
  answerContent: string; // The correct answer's text
  // For MCQ
  mcqOptions?: string[]; // Shuffled list of options including the correct one
  // For TF
  tfIsCorrect?: boolean; // Is the presented `answerContent` the true one for `questionContent`?
}


// For new session logic
export type SessionItemState = 'unseen' | 'fail' | 'pass1' | 'pass2';

export interface SessionWordResult {
    rowId: string;
    tableId: string;
    passed1: number;
    passed2: number;
    failed: number;
}

export interface LibraryTable {
  id: string;
  created_at: string;
  name: string;
  description: string;
  tags: string[];
  word_count: number;
  author_id: string;
  author_name: string;
  downloads: number;
  table_data: {
    columns: string[];
    rows: VocabRow[]; // These rows will have default stats
  };
}

// FIX: Define the missing TheaterSessionSettings interface.
export interface TheaterSessionSettings {
  delaySeconds: number;
  cardIntervalSeconds: number;
  durationMinutes: number;
}

export interface TheaterSessionContext {
  tableIds: string[];
  relationIds: string[];
  settings: TheaterSessionSettings;
}

export interface ScrambleSessionSettings {
  splitInto: number;
  interactionMode: 'drag' | 'type';
}

export interface ScrambleSessionContext {
  tableIds: string[];
  relationIds: string[];
  settings: ScrambleSessionSettings;
}

// --- Dictation Types ---
export interface TranscriptEntry {
  text: string;
  start: number;
  duration: number;
}

export interface DictationSettings {
  playbackRate: number;
  hidePunctuation: boolean;
}

export interface DictationSessionContext {
  youtubeUrl: string;
  transcript: TranscriptEntry[];
  settings: DictationSettings;
}

// --- Chatbot Types ---
export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export type Screen = 'Home' | 'Tables' | 'Study' | 'FlashCards' | 'Rewards' | 'Settings' | 'Library' | 'Journal' | 'Reading' | 'Vmind' | 'TheaterSetup' | 'ScrambleSetup' | 'Dictation';
export interface ChatContext {
  screen: Screen;
  subScreen?: string;
  currentWord?: VocabRow | null;
  journalDate?: string | null;
  journalContent?: string;
}