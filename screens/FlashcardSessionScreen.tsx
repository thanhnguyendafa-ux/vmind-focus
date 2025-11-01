
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { VocabRow, Relation, VocabTable, VocabRowStats, AppSettings, JournalData } from '../types';
import { CloseIcon, ClockIcon, BookmarkIcon, BookmarkFilledIcon, SpeakerIcon } from '../components/Icons';
import Modal from '../components/Modal';
import { playSpeech, stopSpeech } from '../utils/gemini';

// Helper functions
const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
};

const getBackgroundStyle = (rel: Relation) => {
    const design = rel.design;
    if (!design?.background) return {};
    const { type, value, color1, color2, angle } = design.background;
    if (type === 'image') return { backgroundImage: `url(${value})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    if (type === 'gradient' && color1 && color2) return { background: `linear-gradient(${angle || 180}deg, ${color1}, ${color2})` };
    return { background: value };
};

const getColumnStyle = (rel: Relation, columnName: string) => {
    const style = rel.design?.columnStyles?.[columnName] || {};
    const textShadow = rel.design?.background ? '0px 1px 3px rgba(0,0,0,0.1)' : 'none';
    return {...style, textShadow};
};

// Types
interface FlashcardSessionScreenProps {
    sessionContext: {tableIds: string[], relationIds: string[]};
    savedQueues: { [key: string]: string[] };
    onSessionFinish: (ratings: { [rowId: string]: VocabRowStats['flashcardRatings'] }, reviewedIds: string[], flipCounts: Record<string, number>, perRowEncounterCounts: Record<string, number>, finalQueues: { [tableKey: string]: string[] }, durationSeconds: number) => void;
    tables: VocabTable[];
    relations: Relation[];
    appSettings: AppSettings;
    onAddToJournal: (entryData: { vocabRow: VocabRow, relation: Relation, sourceSessionType: 'flashcard' }) => void;
    journal: JournalData;
    onWordChange: (word: VocabRow | null) => void;
}

type RatingKey = 'again' | 'hard' | 'good' | 'easy' | 'perfect';
type SessionCard = { row: VocabRow; relation: Relation; ratings: NonNullable<VocabRowStats['flashcardRatings']> };

// Main Component
const FlashcardSessionScreen: React.FC<FlashcardSessionScreenProps> = ({ sessionContext, savedQueues, onSessionFinish, tables, relations, appSettings, onAddToJournal, journal, onWordChange }) => {
    const [queue, setQueue] = useState<SessionCard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    
    const [sessionRatings, setSessionRatings] = useState<Record<string, VocabRowStats['flashcardRatings']>>({});
    const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
    const [flipCounts, setFlipCounts] = useState<Record<string, number>>({});
    const [perRowEncounterCounts, setPerRowEncounterCounts] = useState<Record<string, number>>({});
    
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isConfirmingEnd, setIsConfirmingEnd] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    const [journalToast, setJournalToast] = useState<{ message: string; key: number } | null>(null);
    const [journalButtonState, setJournalButtonState] = useState<'idle' | 'saving'>('idle');

    const { tableIds, relationIds } = sessionContext;
    
    // --- Stats Calculation ---
    const wordsForSessionStats = useMemo(() => {
        return tables
            .filter(t => tableIds.includes(t.id))
            .flatMap(t => t.rows);
    }, [tables, tableIds]);

    const initialTotalEncounters = useMemo(() => {
        return wordsForSessionStats.reduce((sum, word) => {
            if (word.stats.flashcardRatings) {
                const ratings = word.stats.flashcardRatings;
                return sum + (ratings.again || 0) + (ratings.hard || 0) + (ratings.good || 0) + (ratings.easy || 0) + (ratings.perfect || 0);
            }
            return sum;
        }, 0);
    }, [wordsForSessionStats]);

    const initialReviewedIds = useMemo(() => {
        return new Set(wordsForSessionStats.filter(w => w.stats.isFlashcardReviewed).map(w => w.id));
    }, [wordsForSessionStats]);

    const totalWordsInSelection = wordsForSessionStats.length;

    const totalSessionOnlyEncounters = useMemo(() => Object.values(perRowEncounterCounts).reduce((a, b) => a + b, 0), [perRowEncounterCounts]);
    
    const newReviewsInSession = useMemo(() => {
        return Array.from(reviewedIds).filter(id => !initialReviewedIds.has(id)).length;
    }, [reviewedIds, initialReviewedIds]);
    
    const displayedTotalEncounters = initialTotalEncounters + totalSessionOnlyEncounters;
    const displayedReviewedCount = initialReviewedIds.size + newReviewsInSession;
    // --- End Stats Calculation ---

    useEffect(() => {
        const wordsForSession = tables
            .filter(t => tableIds.includes(t.id))
            .flatMap(t => t.rows);

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
        
        const sessionQueue: SessionCard[] = words.map(row => {
            const tableOfRow = tables.find(t => t.rows.some(r => r.id === row.id));
            const applicableRelations = relations.filter(r => r.tableId === tableOfRow?.id && relationIds.includes(r.id));
            const relation = applicableRelations[Math.floor(Math.random() * applicableRelations.length)];
            return {
                row,
                relation,
                ratings: row.stats.flashcardRatings || { again: 0, hard: 0, good: 0, easy: 0, perfect: 0 }
            };
        }).filter(item => item.relation);

        setQueue(sessionQueue);
        if(sessionQueue.length > 0) {
            setCurrentIndex(0);
            onWordChange(sessionQueue[0].row);
        }
        setHasLoaded(true);

        return () => onWordChange(null);
    }, [tableIds, relationIds, tables, relations, savedQueues, onWordChange]);

    useEffect(() => {
        const timer = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
        return () => clearInterval(timer);
    }, []);
    
    const currentCard = useMemo(() => queue.length > 0 ? queue[currentIndex] : null, [queue, currentIndex]);

    const handleFlip = () => {
        if (currentCard) {
            setFlipCounts(prev => ({ ...prev, [currentCard.relation.tableId]: (prev[currentCard.relation.tableId] || 0) + 1 }));
        }
        setIsFlipped(true);
    };

    const handleRating = (ratingKey: RatingKey, interval: number) => {
        if (!currentCard) return;

        setReviewedIds(prev => new Set(prev).add(currentCard.row.id));
        setPerRowEncounterCounts(prev => ({ ...prev, [currentCard.row.id]: (prev[currentCard.row.id] || 0) + 1 }));

        const currentRatings = sessionRatings[currentCard.row.id] || currentCard.ratings;
        const newRatings = { ...currentRatings, [ratingKey]: (currentRatings[ratingKey] || 0) + 1 };
        setSessionRatings(prev => ({ ...prev, [currentCard.row.id]: newRatings }));

        const updatedQueue = [...queue];
        const [removed] = updatedQueue.splice(currentIndex, 1);
        
        if (removed) {
            if (ratingKey !== 'again') {
                const newIndex = Math.min(currentIndex + interval, updatedQueue.length);
                updatedQueue.splice(newIndex, 0, removed);
            } else {
                const newIndex = Math.min(currentIndex + 3, updatedQueue.length);
                updatedQueue.splice(newIndex, 0, removed);
            }
        }
        
        setQueue(updatedQueue);

        const nextIndex = (currentIndex >= updatedQueue.length) ? 0 : currentIndex;
        setCurrentIndex(nextIndex);
        setIsFlipped(false);
        setJournalButtonState('idle');
        onWordChange(updatedQueue[nextIndex]?.row || null);
    };
    
    const handleFinish = () => {
        const sortedRelationIds = [...relationIds].sort();
        const relationKeyPart = sortedRelationIds.join(':');
        const tableKeyPart = [...tableIds].sort().join(':');
        const key = `${tableKeyPart}|${relationKeyPart}`;
        const finalQueues = { [key]: queue.map(c => c.row.id) };
        onSessionFinish(sessionRatings, Array.from(reviewedIds), flipCounts, perRowEncounterCounts, finalQueues, elapsedSeconds);
    };
    
    useEffect(() => { stopSpeech(); }, [currentIndex, isFlipped]);

    const handlePlayAudio = (e: React.MouseEvent, textSourceCols: string[]) => {
        e.stopPropagation();
        if (!currentCard) return;
        const table = tables.find(t => t.id === currentCard.relation.tableId);
        if (!table?.audioConfig) { return; }
        const { sourceColumn, language } = table.audioConfig;
        if (textSourceCols.includes(sourceColumn)) {
            const text = currentCard.row.cols[sourceColumn];
            if (text) playSpeech(text, language, appSettings.audioPlaybackRate).catch(err => console.error(err));
        }
    };
    
    const handleManualAddToJournal = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentCard || journalButtonState === 'saving') return;
        onAddToJournal({ vocabRow: currentCard.row, relation: currentCard.relation, sourceSessionType: 'flashcard' });
        setJournalButtonState('saving');
        setJournalToast({ message: "Added to journal!", key: Date.now() });
        setTimeout(() => setJournalButtonState('idle'), 1500);
        setTimeout(() => setJournalToast(null), 1500);
    };

    const currentCardStats = useMemo(() => {
        if (!currentCard) return null;
        const initial = currentCard.row.stats.flashcardRatings || { again: 0, hard: 0, good: 0, easy: 0, perfect: 0 };
        const sessionDelta = sessionRatings[currentCard.row.id] || { again: 0, hard: 0, good: 0, easy: 0, perfect: 0 };
        const combined = {
            again: (initial.again || 0) + (sessionDelta.again || 0),
            hard: (initial.hard || 0) + (sessionDelta.hard || 0),
            good: (initial.good || 0) + (sessionDelta.good || 0),
            easy: (initial.easy || 0) + (sessionDelta.easy || 0),
            perfect: (initial.perfect || 0) + (sessionDelta.perfect || 0),
        };
        const total = Object.values(combined).reduce((sum, val) => sum + val, 0);
        return { combined, total };
    }, [currentCard, sessionRatings]);
    
    if (!hasLoaded) return <div className="min-h-screen bg-slate-100 flex items-center justify-center">Loading session...</div>;
    if (queue.length === 0) return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
            <h2 className="text-2xl font-bold text-slate-700 mb-4">No words found for this session.</h2>
            <button onClick={handleFinish} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-6 rounded-lg">Back to Setup</button>
       </div>
    );

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col p-4">
             {journalToast && (
                <div key={journalToast.key} className="fixed top-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-sm font-semibold py-2 px-4 rounded-full shadow-lg z-50 animate-toast-in-out">
                    {journalToast.message}
                </div>
            )}
            <header className="w-full max-w-3xl mx-auto mb-4 flex-shrink-0">
                <div className="flex justify-between items-center text-slate-600 font-semibold mb-2">
                    <button onClick={() => setIsConfirmingEnd(true)}><CloseIcon /></button>
                    <span>{currentIndex + 1} / {queue.length}</span>
                </div>
                <div className="w-full bg-slate-300 rounded-full h-2.5">
                    <div className="bg-cyan-600 h-2.5 rounded-full" style={{ width: `${((currentIndex + 1) / queue.length) * 100}%` }}></div>
                </div>
                <div className="w-full bg-white/80 backdrop-blur-sm p-3 rounded-lg border shadow-sm text-sm mt-3">
                    <div className="flex justify-around items-center text-slate-600 font-semibold">
                        <div className="flex items-center gap-2"><ClockIcon className="w-5 h-5" /><span>{formatTime(elapsedSeconds)}</span></div>
                        <div>Encounters: <span className="text-slate-800 font-bold">{displayedTotalEncounters}</span></div>
                        <div>Reviewed: <span className="text-slate-800 font-bold">{displayedReviewedCount} / {totalWordsInSelection}</span></div>
                    </div>
                </div>
            </header>

            <main className="flex-grow w-full max-w-3xl mx-auto flex flex-col items-center justify-center">
                {currentCardStats && (
                    <div className="mb-4 p-2 w-full bg-white border border-slate-200 shadow-sm rounded-lg text-xs text-slate-500 font-semibold flex flex-wrap justify-center items-center gap-x-4 gap-y-1">
                        <span>Encounters: <span className="font-bold text-slate-700">{currentCardStats.total}</span></span>
                        <span className="text-slate-300 hidden sm:inline">|</span>
                        <span className="text-red-600">Again: {currentCardStats.combined.again}</span>
                        <span className="text-orange-600">Hard: {currentCardStats.combined.hard}</span>
                        <span className="text-amber-600">Good: {currentCardStats.combined.good}</span>
                        <span className="text-sky-600">Easy: {currentCardStats.combined.easy}</span>
                        <span className="text-teal-600">Perfect: {currentCardStats.combined.perfect}</span>
                    </div>
                )}
                <div className="w-full h-[400px]" style={{ perspective: '1000px' }} onClick={!isFlipped ? handleFlip : undefined}>
                    <div className="relative w-full h-full" style={{transformStyle: 'preserve-3d', transition: 'transform 0.6s', transform: isFlipped ? 'rotateY(180deg)' : ''}}>
                        {/* Front */}
                        <div style={{...getBackgroundStyle(currentCard.relation), backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden'}} className="absolute w-full h-full bg-white rounded-2xl shadow-xl flex flex-col items-start justify-center p-6 border border-slate-200 overflow-hidden">
                             <div className="flex w-full items-start justify-between gap-4">
                                <div className="text-left w-full space-y-4">
                                    {currentCard.relation.questionCols.map(col => {
                                        const value = currentCard.row.cols[col] || '';
                                        const style = getColumnStyle(currentCard.relation, col);
                                        return <div key={col}><span className="text-sm font-semibold text-slate-500">{col}:</span><p style={style} className="text-lg text-slate-800 whitespace-pre-wrap font-sans">{value}</p></div>
                                    })}
                                </div>
                                <button onClick={(e) => handlePlayAudio(e, currentCard.relation.questionCols)} className="text-slate-400 hover:text-cyan-700 p-2 -mr-4"><SpeakerIcon className="w-6 h-6" /></button>
                             </div>
                        </div>
                        {/* Back */}
                        <div style={{...getBackgroundStyle(currentCard.relation), backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)'}} className="absolute w-full h-full bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center p-8 border border-slate-200">
                             <div className="flex w-full items-start justify-between gap-4">
                                <div className="text-center w-full space-y-2">
                                    {currentCard.relation.answerCols.map(col => {
                                        const value = currentCard.row.cols[col] || '';
                                        const style = getColumnStyle(currentCard.relation, col);
                                        return <p key={col} style={style} className="text-lg text-slate-800 whitespace-pre-wrap font-sans">{value}</p>
                                    })}
                                </div>
                                <button onClick={(e) => handlePlayAudio(e, currentCard.relation.answerCols)} className="text-slate-400 hover:text-cyan-700 p-2 -mr-4"><SpeakerIcon className="w-6 h-6" /></button>
                             </div>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="w-full max-w-3xl mx-auto pt-6 text-center">
                {isFlipped ? (
                    <div className="animate-scale-in">
                        <div className="w-full grid grid-cols-5 gap-2 sm:gap-4 text-white">
                            <button onClick={() => handleRating('again', 3)} className="py-3 px-1 rounded-lg shadow-sm bg-red-500 hover:bg-red-600">Again<span className="block text-xs opacity-80">+3</span></button>
                            <button onClick={() => handleRating('hard', 5)} className="py-3 px-1 rounded-lg shadow-sm bg-orange-500 hover:bg-orange-600">Hard<span className="block text-xs opacity-80">+5</span></button>
                            <button onClick={() => handleRating('good', 8)} className="py-3 px-1 rounded-lg shadow-sm bg-amber-500 hover:bg-amber-600">Good<span className="block text-xs opacity-80">+8</span></button>
                            <button onClick={() => handleRating('easy', 13)} className="py-3 px-1 rounded-lg shadow-sm bg-sky-500 hover:bg-sky-600">Easy<span className="block text-xs opacity-80">+13</span></button>
                            <button onClick={() => handleRating('perfect', 21)} className="py-3 px-1 rounded-lg shadow-sm bg-teal-500 hover:bg-teal-600">Perfect<span className="block text-xs opacity-80">+21</span></button>
                        </div>
                        {currentCard && (
                            <div className="mt-6 flex justify-between items-center">
                                <button onClick={() => setIsConfirmingEnd(true)} className="text-slate-500 hover:text-slate-800 font-semibold text-sm py-2 px-3 rounded-md hover:bg-slate-100 transition-colors">
                                    End Session
                                </button>
                                <button onClick={handleManualAddToJournal} disabled={journalButtonState === 'saving'} className="text-sm font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-2 py-2 px-3 rounded-md hover:bg-slate-100 transition-colors">
                                    {journalButtonState === 'saving' ? <BookmarkFilledIcon className="w-4 h-4 text-amber-500"/> : <BookmarkIcon className="w-4 h-4"/>}
                                    {journalButtonState === 'saving' ? 'Saved!' : 'Add to Journal'}
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <button onClick={handleFlip} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg text-lg shadow-md">Show Answer</button>
                )}
            </footer>

            <Modal isOpen={isConfirmingEnd} onClose={() => setIsConfirmingEnd(false)} title="End Session?">
                <p className="text-slate-600 mb-6">Are you sure? Your progress will be saved so you can resume later.</p>
                <div className="flex justify-end gap-4">
                    <button onClick={() => setIsConfirmingEnd(false)} className="bg-slate-200 font-bold py-2 px-6 rounded-lg">Cancel</button>
                    <button onClick={handleFinish} className="bg-cyan-600 text-white font-bold py-2 px-6 rounded-lg">End & Save</button>
                </div>
            </Modal>
        </div>
    );
};

export default FlashcardSessionScreen;
