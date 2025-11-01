
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { VocabRow, Relation, VocabTable, VocabRowStats, AppSettings, JournalData, ScrambleSessionContext } from '../types';
import Modal from '../components/Modal';
import { ClockIcon, CheckCircleIcon, XCircleIcon } from '../components/Icons';

// Helper functions
const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
};

const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

const normalizeSentence = (sentence: string) => {
    return sentence.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"").replace(/\s{2,}/g," ").trim();
};


// Main Component
interface ScrambleSessionScreenProps {
  sessionContext: ScrambleSessionContext;
  savedQueues: { [key: string]: string[] };
  onSessionFinish: (
    ratings: { [rowId: string]: VocabRowStats['scrambleRatings'] },
    encounterCounts: { [rowId: string]: number },
    reviewedIds: string[],
    durationSeconds: number,
    finalQueues: { [key: string]: string[] }
  ) => void;
  tables: VocabTable[];
  relations: Relation[];
  appSettings: AppSettings;
  onAddToJournal: (entryData: { vocabRow: VocabRow, relation: Relation, sourceSessionType: 'study' | 'flashcard' | 'theater' | 'scramble' }) => void;
  onWordChange: (word: VocabRow | null) => void;
}

type RatingKey = 'again' | 'hard' | 'good' | 'easy' | 'perfect';
type RatingStats = { again: number; hard: number; good: number; easy: number; perfect: number; };
type SessionCard = { row: VocabRow, ratings: NonNullable<VocabRowStats['scrambleRatings']> };

const ScrambleSessionScreen: React.FC<ScrambleSessionScreenProps> = ({ sessionContext, savedQueues, onSessionFinish, tables, relations, appSettings, onAddToJournal, onWordChange }) => {
    const [queue, setQueue] = useState<SessionCard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [originalSentence, setOriginalSentence] = useState('');
    const [scrambledParts, setScrambledParts] = useState<string[]>([]);
    
    // Interaction state
    const [userOrder, setUserOrder] = useState<string[]>([]);
    const [bankParts, setBankParts] = useState<string[]>([]);
    const [userTypedInput, setUserTypedInput] = useState('');

    // Flow control state
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [isConfirmingEnd, setIsConfirmingEnd] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [feedbackAnimationKey, setFeedbackAnimationKey] = useState(0);

    // Stats
    const [sessionRatings, setSessionRatings] = useState<RatingStats>({ again: 0, hard: 0, good: 0, easy: 0, perfect: 0 });
    const [encounterCounts, setEncounterCounts] = useState<Record<string, number>>({});
    const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
    
    const { tableIds, relationIds, settings } = sessionContext;

    // --- Stats Calculation ---
    const wordsForSessionStats = useMemo(() => {
         return tables
            .filter(t => tableIds.includes(t.id))
            .flatMap(t => t.rows)
            .filter(row => {
                 const tableOfRow = tables.find(t => t.rows.some(r => r.id === row.id));
                if (!tableOfRow) return false;
                const applicableRel = relations.find(r => r.tableId === tableOfRow.id && relationIds.includes(r.id));
                if (!applicableRel || applicableRel.questionCols.length === 0) return false;

                const sentenceCol = applicableRel.questionCols[0];
                const sentenceText = row.cols[sentenceCol];
                if (!sentenceText) return false;
                const wordCount = sentenceText.trim().split(/\s+/).length;
                return wordCount >= settings.splitInto;
            });
    }, [tables, tableIds, relations, relationIds, settings.splitInto]);

    const initialTotalEncounters = useMemo(() => {
        return wordsForSessionStats.reduce((sum, word) => sum + (word.stats.scrambleEncounters || 0), 0);
    }, [wordsForSessionStats]);

    const initialTotalRatings = useMemo(() => {
        const total: RatingStats = { again: 0, hard: 0, good: 0, easy: 0, perfect: 0 };
        for (const word of wordsForSessionStats) {
            if (word.stats.scrambleRatings) {
                total.again += word.stats.scrambleRatings.again || 0;
                total.hard += word.stats.scrambleRatings.hard || 0;
                total.good += word.stats.scrambleRatings.good || 0;
                total.easy += word.stats.scrambleRatings.easy || 0;
                total.perfect += word.stats.scrambleRatings.perfect || 0;
            }
        }
        return total;
    }, [wordsForSessionStats]);

    const initialReviewedCount = useMemo(() => {
        return wordsForSessionStats.filter(word => word.stats.isScrambleReviewed).length;
    }, [wordsForSessionStats]);

    const totalWordsInSelection = wordsForSessionStats.length;

    const newReviewsInSession = useMemo(() => {
        const initialReviewedIds = new Set(wordsForSessionStats.filter(w => w.stats.isScrambleReviewed).map(w => w.id));
        return Array.from(reviewedIds).filter(id => !initialReviewedIds.has(id)).length;
    }, [reviewedIds, wordsForSessionStats]);

    const totalReviewedCount = initialReviewedCount + newReviewsInSession;

    const totalSessionOnlyEncounters = useMemo(() => (Object.values(encounterCounts) as number[]).reduce((a, b) => a + b, 0), [encounterCounts]);

    const displayedTotalEncounters = initialTotalEncounters + totalSessionOnlyEncounters;
    
    const displayedRatings = useMemo(() => ({
      again: initialTotalRatings.again + sessionRatings.again,
      hard: initialTotalRatings.hard + sessionRatings.hard,
      good: initialTotalRatings.good + sessionRatings.good,
      easy: initialTotalRatings.easy + sessionRatings.easy,
      perfect: initialTotalRatings.perfect + sessionRatings.perfect,
    }), [initialTotalRatings, sessionRatings]);
    // --- End Stats Calculation ---

    const getSentenceForCard = useCallback((card: SessionCard) => {
        const tableOfRow = tables.find(t => t.rows.some(r => r.id === card.row.id));
        if (!tableOfRow) return '';
        const applicableRel = relations.find(r => r.tableId === tableOfRow.id && relationIds.includes(r.id));
        if (!applicableRel || applicableRel.questionCols.length === 0) return '';
        
        const sentenceCol = applicableRel.questionCols[0];
        return card.row.cols[sentenceCol] || '';
    }, [tables, relations, relationIds]);

    const setupNewCard = useCallback((card: SessionCard) => {
        const sentence = getSentenceForCard(card);
        setOriginalSentence(sentence);

        const words = sentence.trim().split(/\s+/);
        const numParts = Math.min(settings.splitInto, words.length);
        const partSize = Math.ceil(words.length / numParts);
        const parts: string[] = [];
        for (let i = 0; i < words.length; i += partSize) {
            parts.push(words.slice(i, i + partSize).join(' '));
        }
        
        const shuffled = shuffleArray(parts);
        setScrambledParts(shuffled);
        setBankParts(shuffled);
        setUserOrder([]);
        setUserTypedInput('');
        setIsSubmitted(false);
        onWordChange(card.row);
    }, [settings.splitInto, onWordChange, getSentenceForCard]);

    useEffect(() => {
        const wordsForSession = tables
            .filter(t => tableIds.includes(t.id))
            .flatMap(t => t.rows)
            .filter(row => {
                 const tableOfRow = tables.find(t => t.rows.some(r => r.id === row.id));
                if (!tableOfRow) return false;
                const applicableRel = relations.find(r => r.tableId === tableOfRow.id && relationIds.includes(r.id));
                if (!applicableRel || applicableRel.questionCols.length === 0) return false;

                const sentenceCol = applicableRel.questionCols[0];
                const sentenceText = row.cols[sentenceCol];
                if (!sentenceText) return false;
                const wordCount = sentenceText.trim().split(/\s+/).length;
                return wordCount >= settings.splitInto;
            });
        
        const sortedRelationIds = [...relationIds].sort();
        const relationKeyPart = sortedRelationIds.join(':');
        const tableKeyPart = [...tableIds].sort().join(':');
        const key = `${tableKeyPart}|${relationKeyPart}`;
        const savedQueueOrder = savedQueues[key];
        
        let words: VocabRow[];

        if (savedQueueOrder) {
            const wordsById = new Map(wordsForSession.map(w => [w.id, w]));
            words = savedQueueOrder.map(id => wordsById.get(id)).filter((w): w is VocabRow => !!w);
            const savedWordIds = new Set(savedQueueOrder);
            const newWords = wordsForSession.filter(w => !savedWordIds.has(w.id));
            words.push(...shuffleArray(newWords));
        } else {
            words = shuffleArray(wordsForSession);
        }
        
        const sessionQueue: SessionCard[] = words.map(row => ({
            row,
            ratings: row.stats.scrambleRatings || { again: 0, hard: 0, good: 0, easy: 0, perfect: 0 }
        }));

        setQueue(sessionQueue);
        if (sessionQueue.length > 0) {
            setCurrentIndex(0);
            setupNewCard(sessionQueue[0]);
        }
        setHasLoaded(true);
    }, [tables, tableIds, relations, relationIds, settings.splitInto, setupNewCard, savedQueues]);
    
    useEffect(() => {
        const timer = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleSubmit = () => {
        if (isSubmitted) return;
        
        const userAnswer = settings.interactionMode === 'drag' 
            ? userOrder.join(' ') 
            : userTypedInput;

        const isAnswerCorrect = normalizeSentence(userAnswer) === normalizeSentence(originalSentence);
        setIsCorrect(isAnswerCorrect);
        setIsSubmitted(true);
        setFeedbackAnimationKey(Date.now()); // Trigger animation

        const currentCard = queue[currentIndex];
        if (appSettings.journalLoggingMode === 'automatic') {
            const tableId = tables.find(t => t.rows.some(row => row.id === currentCard.row.id))?.id;
            const relation = relations.find(r => relationIds.includes(r.id) && r.tableId === tableId);
            if(relation) {
                onAddToJournal({ vocabRow: currentCard.row, relation: relation, sourceSessionType: 'scramble' });
            }
        }
    };
    
    const handleRating = (ratingKey: RatingKey, interval: number) => {
        if (!isSubmitted) return;
        const currentCard = queue[currentIndex];
        if (!currentCard) return;

        setReviewedIds(prev => new Set(prev).add(currentCard.row.id));
        setEncounterCounts(prev => ({ ...prev, [currentCard.row.id]: (prev[currentCard.row.id] || 0) + 1 }));
        setSessionRatings(prev => ({ ...prev, [ratingKey]: prev[ratingKey] + 1 }));

        const updatedQueue = [...queue];
        const cardIndex = updatedQueue.findIndex(c => c.row.id === currentCard.row.id);

        // FIX: Guard against card not being found in the queue to prevent crashes.
        if (cardIndex === -1) {
            // In rare race conditions, the card might not be found. Gracefully move to the next.
            const nextIdx = (currentIndex + 1) % queue.length;
            setCurrentIndex(nextIdx);
            if (queue.length > 0) setupNewCard(queue[nextIdx]);
            return;
        }

        const [removed] = updatedQueue.splice(cardIndex, 1);
        const card = removed;
        
        // FIX: Add a more robust check for the card object to prevent errors if the queue becomes corrupted.
        if (!card || !card.row) {
            const nextIdx = (currentIndex + 1) % queue.length;
            setCurrentIndex(nextIdx);
            if (queue.length > 0) setupNewCard(queue[nextIdx]);
            return;
        }
        
        const newRatings = { ...card.ratings, [ratingKey]: (card.ratings[ratingKey] || 0) + 1 };
        const updatedCard = { ...card, ratings: newRatings };
        
        const newIndex = Math.min(cardIndex + interval, updatedQueue.length);
        updatedQueue.splice(newIndex, 0, updatedCard);
        setQueue(updatedQueue);

        const nextIndex = (cardIndex >= updatedQueue.length) ? 0 : cardIndex;
        
        setCurrentIndex(nextIndex);
        if (updatedQueue.length > 0) {
            setupNewCard(updatedQueue[nextIndex]);
        }
    };

    const handleConfirmEnd = () => {
        const finalRatings: { [rowId: string]: VocabRowStats['scrambleRatings'] } = {};
        queue.forEach(card => {
            finalRatings[card.row.id] = card.ratings;
        });

        const sortedRelationIds = [...relationIds].sort();
        const relationKeyPart = sortedRelationIds.join(':');
        const tableKeyPart = [...tableIds].sort().join(':');
        const key = `${tableKeyPart}|${relationKeyPart}`;
        
        const finalQueues: { [key: string]: string[] } = {
            [key]: queue.map(card => card.row.id)
        };

        onSessionFinish(finalRatings, encounterCounts, Array.from(reviewedIds), elapsedSeconds, finalQueues);
    };
    
    const handleBankClick = (part: string, index: number) => {
        setUserOrder(prev => [...prev, part]);
        setBankParts(prev => prev.filter((_, i) => i !== index));
    };

    const handleUserOrderClick = (part: string, index: number) => {
        setBankParts(prev => [...prev, part]);
        setUserOrder(prev => prev.filter((_, i) => i !== index));
    };


    if (!hasLoaded) { return <div className="min-h-screen bg-slate-100 flex items-center justify-center">Loading session...</div>; }
    if (queue.length === 0) { return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <h2 className="text-2xl font-bold text-slate-700 mb-4">No compatible sentences found.</h2>
            <button onClick={handleConfirmEnd} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-lg">Back to Setup</button>
       </div>
    )}

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center p-4">
             <header className="w-full max-w-3xl mb-4">
                 <div className="w-full bg-white/80 backdrop-blur-sm p-3 rounded-lg border shadow-sm text-sm">
                    <div className="flex justify-between items-center text-slate-600 font-semibold mb-2">
                        <span>Words in session: <span className="text-slate-800 font-bold">{queue.length}</span></span>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1 text-sm">
                                <ClockIcon className="w-4 h-4" />
                                <span className="text-slate-800 font-bold">{formatTime(elapsedSeconds)}</span>
                            </div>
                            <span>Encounters: <span className="text-slate-800 font-bold">{displayedTotalEncounters}</span></span>
                            <span>Cards Reviewed: <span className="text-slate-800 font-bold">{totalReviewedCount} / {totalWordsInSelection}</span></span>
                        </div>
                    </div>
                    <div className="text-xs text-slate-500 font-medium text-center border-t pt-2 space-x-2">
                        <span className="font-semibold text-red-600">Again:</span>{displayedRatings.again} |
                        <span className="font-semibold text-orange-600">Hard:</span>{displayedRatings.hard} |
                        <span className="font-semibold text-amber-600">Good:</span>{displayedRatings.good} |
                        <span className="font-semibold text-sky-600">Easy:</span>{displayedRatings.easy} |
                        <span className="font-semibold text-teal-600">Perfect:</span>{displayedRatings.perfect}
                    </div>
                </div>
            </header>

            <main className="flex-grow w-full max-w-3xl flex flex-col items-center justify-center">
                {isSubmitted ? (
                    <div className={`w-full p-6 rounded-lg text-center animate-scale-in transition-all ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                        <div className="flex items-center justify-center gap-2 mb-3">
                            {isCorrect ? <CheckCircleIcon className="w-8 h-8 text-green-600" /> : <XCircleIcon className="w-8 h-8 text-red-600" />}
                            <h3 className={`text-3xl font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>{isCorrect ? 'Correct!' : 'Incorrect'}</h3>
                        </div>
                        <div className="mt-4 p-4 bg-white border rounded-md">
                            <p className="text-lg font-semibold text-slate-800">{originalSentence}</p>
                        </div>
                        <div className="mt-6 w-full grid grid-cols-5 gap-2 sm:gap-4 text-white">
                            <button onClick={() => handleRating('again', 3)} className="py-2 px-1 rounded-lg shadow-sm bg-red-500 hover:bg-red-600">Again<span className="block text-xs opacity-80">+3</span></button>
                            <button onClick={() => handleRating('hard', 5)} className="py-2 px-1 rounded-lg shadow-sm bg-orange-500 hover:bg-orange-600">Hard<span className="block text-xs opacity-80">+5</span></button>
                            <button onClick={() => handleRating('good', 8)} className="py-2 px-1 rounded-lg shadow-sm bg-amber-500 hover:bg-amber-600">Good<span className="block text-xs opacity-80">+8</span></button>
                            <button onClick={() => handleRating('easy', 13)} className="py-2 px-1 rounded-lg shadow-sm bg-sky-500 hover:bg-sky-600">Easy<span className="block text-xs opacity-80">+13</span></button>
                            <button onClick={() => handleRating('perfect', 21)} className="py-2 px-1 rounded-lg shadow-sm bg-teal-500 hover:bg-teal-600">Perfect<span className="block text-xs opacity-80">+21</span></button>
                        </div>
                    </div>
                ) : (
                    <div className="w-full">
                        {settings.interactionMode === 'drag' ? (
                            <div>
                                <div key={feedbackAnimationKey} className={`w-full min-h-[8rem] bg-white p-3 rounded-lg border-2 border-dashed border-slate-300 grid gap-2 items-center justify-center ${isSubmitted ? (isCorrect ? 'animate-border-flash-green' : 'animate-border-flash-red') : ''}`} style={{gridTemplateColumns: `repeat(${scrambledParts.length}, auto)`}}>
                                    {userOrder.map((part, i) => <div key={i} onClick={() => handleUserOrderClick(part, i)} className="p-3 bg-yellow-200 text-slate-800 rounded-md font-semibold cursor-pointer transition-transform transform hover:scale-105">{part}</div>)}
                                    {Array.from({ length: scrambledParts.length - userOrder.length }).map((_, i) => <div key={i} className="w-16 h-10"></div>)}
                                </div>
                                <div className="min-h-[8rem] p-3 mt-4 flex flex-wrap gap-3 items-center justify-center">
                                    {bankParts.map((part, i) => <div key={i} onClick={() => handleBankClick(part, i)} className="py-3 px-5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold cursor-pointer transition-transform transform hover:scale-105">{part}</div>)}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="p-4 mb-4 flex flex-wrap gap-2 items-center justify-center">
                                    {scrambledParts.map((part, i) => <div key={i} className="py-2 px-4 bg-slate-200 rounded-md font-semibold">{part}</div>)}
                                </div>
                                <input
                                    key={feedbackAnimationKey}
                                    type="text"
                                    value={userTypedInput}
                                    onChange={e => setUserTypedInput(e.target.value)}
                                    autoFocus
                                    className={`w-full p-4 text-lg border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 ${isSubmitted ? (isCorrect ? 'animate-border-flash-green' : 'animate-border-flash-red') : 'border-slate-300'}`}
                                    placeholder="Type the sentence..."
                                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                />
                            </div>
                        )}
                        <button onClick={handleSubmit} className="w-full mt-6 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg text-lg">Submit Answer</button>
                    </div>
                )}
            </main>

            <footer className="mt-auto pt-6 text-center">
                <button onClick={() => setIsConfirmingEnd(true)} className="text-slate-500 hover:text-slate-800 font-semibold text-sm">End Session</button>
            </footer>

            <Modal isOpen={isConfirmingEnd} onClose={() => setIsConfirmingEnd(false)} title="End Session?">
                <div>
                    <p className="text-slate-600 mb-6">Are you sure? Your progress will be saved.</p>
                    <div className="flex justify-end gap-4">
                        <button onClick={() => setIsConfirmingEnd(false)} className="bg-slate-200 font-bold py-2 px-6 rounded-lg">Cancel</button>
                        <button onClick={handleConfirmEnd} className="bg-yellow-500 text-white font-bold py-2 px-6 rounded-lg">End & Save</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ScrambleSessionScreen;
