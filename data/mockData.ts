

import { GlobalStats, VocabTable, Relation, VocabRowStats, Folder, HistoryLogItem } from "../types";

const now = Date.now();
const oneHour = 3600 * 1000;
const oneDay = 24 * oneHour;

const heatmapHistory: HistoryLogItem[] = [
    // Today: 1 min (60s) - goal not met, shows progress ring
    { id: 'h-sample-0', timestamp: new Date(now - oneHour).toISOString(), description: 'Completed a session', xpChange: 12, type: 'session_complete', durationSeconds: 60 },
    // Yesterday: 10 mins (600s) - goal met
    { id: 'h-sample-1', timestamp: new Date(now - oneDay).toISOString(), description: 'Completed a session', xpChange: 60, type: 'session_complete', durationSeconds: 600 },
    // A badge gain from yesterday for variety in the history log
    { id: 'h-badge-1', timestamp: new Date(now - oneDay - oneHour).toISOString(), description: 'Unlocked "Bronze Scholar"', xpChange: null, type: 'badge_gain', relatedMilestoneId: 'milestone-8' },
    // 3 days ago: 2.5 hours (9000s) - high activity
    { id: 'h-sample-3', timestamp: new Date(now - 3 * oneDay).toISOString(), description: 'Completed a session', xpChange: 150, type: 'session_complete', durationSeconds: 9000 },
    // 4 days ago: 3 mins (180s) - goal not met
    { id: 'h-sample-4', timestamp: new Date(now - 4 * oneDay).toISOString(), description: 'Completed a session', xpChange: 18, type: 'session_complete', durationSeconds: 180 },
    // 5 days ago: 5 mins (300s) - goal met
    { id: 'h-sample-5', timestamp: new Date(now - 5 * oneDay).toISOString(), description: 'Completed a session', xpChange: 30, type: 'session_complete', durationSeconds: 300 },
    // 7 days ago (a week): 45 mins (2700s) - medium-high activity
    { id: 'h-sample-7', timestamp: new Date(now - 7 * oneDay).toISOString(), description: 'Completed a session', xpChange: 90, type: 'session_complete', durationSeconds: 2700 },
    // 8 days ago: 1 hour (3600s)
    { id: 'h-sample-8', timestamp: new Date(now - 8 * oneDay).toISOString(), description: 'Completed a session', xpChange: 120, type: 'session_complete', durationSeconds: 3600 },
    // 10 days ago: 20 mins (1200s)
    { id: 'h-sample-10', timestamp: new Date(now - 10 * oneDay).toISOString(), description: 'Completed a session', xpChange: 75, type: 'session_complete', durationSeconds: 1200 },
    // 12 days ago: 1 min (60s)
    { id: 'h-sample-12', timestamp: new Date(now - 12 * oneDay).toISOString(), description: 'Completed a session', xpChange: 6, type: 'session_complete', durationSeconds: 60 },
    // 14 days ago (2 weeks): 35 mins (2100s)
    { id: 'h-sample-14', timestamp: new Date(now - 14 * oneDay).toISOString(), description: 'Completed a session', xpChange: 80, type: 'session_complete', durationSeconds: 2100 },
    // 15 days ago: quit session, 4 mins (240s)
    { id: 'h-sample-quit-15', timestamp: new Date(now - 15 * oneDay).toISOString(), description: 'Abandoned Session', xpChange: -30, type: 'session_quit', durationSeconds: 240 },
    // 20 days ago: 8 mins (480s)
    { id: 'h-sample-20', timestamp: new Date(now - 20 * oneDay).toISOString(), description: 'Completed a session', xpChange: 48, type: 'session_complete', durationSeconds: 480 },
    // 30 days ago: 1.5 hours (5400s)
    { id: 'h-sample-30', timestamp: new Date(now - 30 * oneDay).toISOString(), description: 'Completed a session', xpChange: 135, type: 'session_complete', durationSeconds: 5400 },
];

export const initialGlobalStats: GlobalStats = {
  xp: 1294,
  inQueueReal: 12, // Corresponds to the 12 'session_complete' items in heatmapHistory
  quitQueueReal: 1,  // Corresponds to the 1 'session_quit' item in heatmapHistory
  unlockedMilestoneIds: ['milestone-0', 'milestone-1', 'milestone-2', 'milestone-3', 'milestone-4', 'milestone-5', 'milestone-6', 'milestone-7', 'milestone-8', 'milestone-9'],
  history: heatmapHistory,
  lastViewedMilestoneCount: 8,
};

const defaultStats: VocabRowStats = {
  Passed1: 0,
  Passed2: 0,
  Failed: 0,
  TotalAttempt: 0,
  SuccessRate: 0,
  FailureRate: 0,
  RankPoint: 0,
  Level: 1,
  InQueue: 0,
  QuitQueue: false,
  LastPracticeDate: null,
  flashcardStatus: null,
  flashcardEncounters: 0,
  flashcardRatings: { again: 0, hard: 0, good: 0, easy: 0, perfect: 0 },
  isFlashcardReviewed: false,
  theaterEncounters: 0,
  scrambleEncounters: 0,
  scrambleRatings: { again: 0, hard: 0, good: 0, easy: 0, perfect: 0 },
  isScrambleReviewed: false,
};

export const sampleFolders: Folder[] = [
  {
    id: 'fld_demo_1',
    type: 'folder',
    name: 'Languages',
    tableIds: ['tbl_man_hsk1'],
  }
];

export const sampleTables: VocabTable[] = [
  {
    id: 'tbl_eng_c2',
    name: 'English C2 Advanced',
    wordCount: 5,
    avgRankPoint: 8,
    avgFailureRate: 0.12,
    columns: ['Word', 'Definition', 'Synonyms', 'Antonyms', 'Example Sentence', 'Note'],
    rows: [
      { id: 'r1', cols: { 'Word': 'Aberration', 'Definition': 'A departure from what is normal, usual, or expected, typically one that is unwelcome.', 'Synonyms': 'anomaly, deviation, irregularity', 'Antonyms': 'normality, regularity', 'Example Sentence': 'The single poor grade was an aberration in her otherwise stellar academic record.', 'Note': '' }, stats: {...defaultStats}, tags: [] },
      { id: 'r2', cols: { 'Word': 'Capricious', 'Definition': 'Given to sudden and unaccountable changes of mood or behavior.', 'Synonyms': 'fickle, inconstant, changeable', 'Antonyms': 'stable, consistent', 'Example Sentence': 'The capricious weather made it difficult to plan the outdoor event.', 'Note': 'Often used for people or things that are unpredictable.' }, stats: {...defaultStats}, tags: [] },
      { id: 'r3', cols: { 'Word': 'Enervate', 'Definition': 'To cause (someone) to feel drained of energy or vitality; weaken.', 'Synonyms': 'exhaust, tire, fatigue', 'Antonyms': 'invigorate, energize', 'Example Sentence': 'The long, humid hike enervated the group.', 'Note': 'Often confused with "energize", but it is the opposite.' }, stats: {...defaultStats}, tags: [] },
      { id: 'r4', cols: { 'Word': 'Fastidious', 'Definition': 'Very attentive to and concerned about accuracy and detail.', 'Synonyms': 'meticulous, scrupulous, painstaking', 'Antonyms': 'careless, sloppy', 'Example Sentence': 'He was fastidious about keeping the house clean.', 'Note': '' }, stats: {...defaultStats}, tags: [] },
      { id: 'r5', cols: { 'Word': 'Juxtaposition', 'Definition': 'The fact of two things being seen or placed close together with contrasting effect.', 'Synonyms': 'comparison, contrast, proximity', 'Antonyms': 'separation, distance', 'Example Sentence': 'The juxtaposition of the ancient ruins and the modern city was striking.', 'Note': 'A key term in art and literature.' }, stats: {...defaultStats}, tags: [] },
    ],
  },
  {
    id: 'tbl_eng_b1',
    name: 'English B1-B2 Intermediate',
    wordCount: 5,
    avgRankPoint: 4,
    avgFailureRate: 0.25,
    columns: ['Word', 'Definition', 'Example', 'Part of Speech', 'Image', 'Note'],
    rows: [
      { id: 'r6', cols: { 'Word': 'Consequence', 'Definition': 'A result or effect of an action or condition.', 'Example': 'The consequence of not studying is failing the exam.', 'Part of Speech': 'noun', 'Image': '', 'Note': '' }, stats: {...defaultStats}, tags: [] },
      { id: 'r7', cols: { 'Word': 'Develop', 'Definition': 'Grow or cause to grow and become more mature, advanced, or elaborate.', 'Example': 'The company plans to develop a new marketing strategy.', 'Part of Speech': 'verb', 'Image': '', 'Note': '' }, stats: {...defaultStats}, tags: [] },
      { id: 'r8', cols: { 'Word': 'Environment', 'Definition': 'The surroundings or conditions in which a person, animal, or plant lives or operates.', 'Example': 'We must protect the environment from pollution.', 'Part of Speech': 'noun', 'Image': '', 'Note': '' }, stats: {...defaultStats}, tags: [] },
      { id: 'r9', cols: { 'Word': 'Sufficient', 'Definition': 'Enough; adequate.', 'Example': 'Do we have sufficient food for all the guests?', 'Part of Speech': 'adjective', 'Image': '', 'Note': '' }, stats: {...defaultStats}, tags: [] },
      { id: 'r10', cols: { 'Word': 'Tendency', 'Definition': 'An inclination toward a particular characteristic or type of behavior.', 'Example': 'He has a tendency to procrastinate.', 'Part of Speech': 'noun', 'Image': '', 'Note': '' }, stats: {...defaultStats}, tags: [] },
    ],
  },
  {
    id: 'tbl_man_hsk1',
    name: 'Mandarin HSK1',
    wordCount: 5,
    avgRankPoint: 12,
    avgFailureRate: 0.08,
    columns: ['Word (Hanzi)', 'Pinyin', 'Definition', 'Example Sentence', 'Example Translation', 'Note'],
    rows: [
      { id: 'r11', cols: { 'Word (Hanzi)': '你好', 'Pinyin': 'nǐ hǎo', 'Definition': 'Hello', 'Example Sentence': '你好吗？', 'Example Translation': 'How are you?', 'Note': '' }, stats: {...defaultStats}, tags: [] },
      { id: 'r12', cols: { 'Word (Hanzi)': '谢谢', 'Pinyin': 'xièxie', 'Definition': 'Thank you', 'Example Sentence': '谢谢你的帮助。', 'Example Translation': 'Thank you for your help.', 'Note': '' }, stats: {...defaultStats}, tags: [] },
      { id: 'r13', cols: { 'Word (Hanzi)': '不客气', 'Pinyin': 'bú kèqi', 'Definition': "You're welcome", 'Example Sentence': 'A: 谢谢你。B: 不客气。', 'Example Translation': "A: Thank you. B: You're welcome.", 'Note': '' }, stats: {...defaultStats}, tags: [] },
      { id: 'r14', cols: { 'Word (Hanzi)': '再见', 'Pinyin': 'zàijiàn', 'Definition': 'Goodbye', 'Example Sentence': '我们明天见，再见！', 'Example Translation': "We'll see you tomorrow, goodbye!", 'Note': '' }, stats: {...defaultStats}, tags: [] },
      { id: 'r15', cols: { 'Word (Hanzi)': '对不起', 'Pinyin': 'duìbuqǐ', 'Definition': 'Sorry', 'Example Sentence': '对不起，我迟到了。', 'Example Translation': 'Sorry, I am late.', 'Note': '' }, stats: {...defaultStats}, tags: [] },
    ],
  },
];

export const sampleRelations: Relation[] = [
  // English C2
  {
    id: 'rel_c2_1',
    tableId: 'tbl_eng_c2',
    name: 'Word ➔ Definition',
    modes: ['MCQ', 'Typing', 'TF'],
    questionCols: ['Word'],
    answerCols: ['Definition'],
    isCustom: false,
  },
  {
    id: 'rel_c2_2',
    tableId: 'tbl_eng_c2',
    name: 'Word ➔ Synonyms/Antonyms',
    modes: ['MCQ'],
    questionCols: ['Word'],
    answerCols: ['Synonyms', 'Antonyms'],
    isCustom: false,
  },
  // English B1-B2
  {
    id: 'rel_b1_1',
    tableId: 'tbl_eng_b1',
    name: 'Word ➔ Definition',
    modes: ['MCQ', 'Typing', 'TF'],
    questionCols: ['Word'],
    answerCols: ['Definition'],
    isCustom: false,
  },
  {
    id: 'rel_b1_2',
    tableId: 'tbl_eng_b1',
    name: 'Fill in the Blank (Example)',
    modes: ['Typing'],
    questionCols: ['Example'],
    answerCols: ['Word'],
    isCustom: false,
  },
  // Mandarin HSK1
  {
    id: 'rel_hsk1_1',
    tableId: 'tbl_man_hsk1',
    name: 'Hanzi ➔ Pinyin & Definition',
    modes: ['MCQ', 'Typing', 'TF'],
    questionCols: ['Word (Hanzi)'],
    answerCols: ['Pinyin', 'Definition'],
    isCustom: false,
  },
  {
    id: 'rel_hsk1_2',
    tableId: 'tbl_man_hsk1',
    name: 'Definition ➔ Hanzi',
    modes: ['MCQ'],
    questionCols: ['Definition'],
    answerCols: ['Word (Hanzi)'],
    isCustom: false,
  },
];