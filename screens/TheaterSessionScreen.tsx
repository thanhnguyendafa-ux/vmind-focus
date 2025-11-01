import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { VocabRow, Relation, VocabTable, AppSettings, TheaterSessionContext, JournalData } from '../types';
import { CloseIcon, PlayIcon, PauseIcon, RepeatIcon, ChevronLeftIcon, ChevronRightIcon, BookmarkIcon, BookmarkFilledIcon } from '../components/Icons';
import { playSpeech, stopSpeech } from '../utils/gemini';

// Helper to shuffle array
const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

// Helper to format time
const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
};

// Helper for styling
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
    // Apply a subtle text shadow if there's any custom background for better readability
    const textShadow = rel.design?.background ? 'rgba(0, 0, 0, 0.2) 0px 1px 3px, rgba(0, 0, 0, 0.1) 0px 1px 2px' : 'none';
    return { ...style, textShadow };
};

type SessionCard = {
    row: VocabRow;
    relation: Relation;
};

type DisplayItem = {
    type: 'colName' | 'colValue';
    value: string;
    colName: string;
};

// Main Component
interface TheaterSessionScreenProps {
  sessionContext: TheaterSessionContext;
  onSessionFinish: (viewedIds: string[], durationSeconds: number) => void;
  tables: VocabTable[];
  relations: Relation[];
  appSettings: AppSettings;
  onAddToJournal: (entryData: { vocabRow: VocabRow, relation: Relation, sourceSessionType: 'study' | 'flashcard' | 'theater' }) => void;
  journal: JournalData;
  onWordChange: (word: VocabRow | null) => void;
}

const TheaterSessionScreen: React.FC<TheaterSessionScreenProps> = ({ sessionContext, onSessionFinish, tables, relations, appSettings, onAddToJournal, journal, onWordChange }) => {
    const [queue, setQueue] = useState<SessionCard[]>([]);
    const [cardIndex, setCardIndex] = useState(0);
    const [animationStep, setAnimationStep] = useState(-1);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [viewedCardIds, setViewedCardIds] = useState<Set<string>>(new Set());
    const [isComplete, setIsComplete] = useState(false);
    const [sessionElapsed, setSessionElapsed] = useState(0);
    const [journalToast, setJournalToast] = useState<{ message: string; key: number } | null>(null);
    const [journalButtonState, setJournalButtonState] = useState<'idle' | 'saving'>('idle');
    const [isControlsVisible, setIsControlsVisible] = useState(true);
    const [animationDirection, setAnimationDirection] = useState<'next' | 'prev'>('next');
    const [contentKey, setContentKey] = useState(0);
    
    const timerRef = useRef<number | null>(null);
    const controlsTimerRef = useRef<number | null>(null);

    // --- Queue and Card Setup ---
    useEffect(() => {
        const allWords = tables
            .filter(t => sessionContext.tableIds.includes(t.id))
            .flatMap(t => t.rows);
        
        const sessionQueue: SessionCard[] = allWords.map(row => {
            const tableId = tables.find(t => t.rows.some(r => r.id === row.id))?.id;
            const applicableRelations = relations.filter(r => r.tableId === tableId && sessionContext.relationIds.includes(r.id));
            const relation = applicableRelations[Math.floor(Math.random() * applicableRelations.length)];
            return { row, relation };
        }).filter(item => item.relation);

        setQueue(shuffleArray(sessionQueue));
    }, [tables, relations, sessionContext]);

    const currentCard = useMemo(() => queue[cardIndex], [queue, cardIndex]);
    
    const displayItems = useMemo(() => {
        if (!currentCard) return { front: [], back: [] };
        const { relation, row } = currentCard;
        const frontItems: DisplayItem[] = relation.questionCols.flatMap(colName => ([
            { type: 'colName' as const, value: colName, colName },
            { type: 'colValue' as const, value: row.cols[colName] || ' ', colName }
        ]));
        const backItems: DisplayItem[] = relation.answerCols.flatMap(colName => ([
            { type: 'colName' as const, value: colName, colName },
            { type: 'colValue' as const, value: row.cols[colName] || ' ', colName }
        ]));
        return { front: frontItems, back: backItems };
    }, [currentCard]);

    const itemsToRender = isFlipped ? displayItems.back : displayItems.front;

    // --- Core Animation Logic ---
    const advance = useCallback(() => {
        if (!isFlipped) { // We are on the front side
            if (animationStep < displayItems.front.length) {
                setAnimationStep(i => i + 1);
            } else { // Finished revealing front, now flip
                setIsFlipped(true);
                setAnimationStep(0);
            }
        } else { // We are on the back side
            if (animationStep < displayItems.back.length) {
                setAnimationStep(i => i + 1);
            } else { // Finished revealing back, move to next card
                setAnimationDirection('next');
                setContentKey(k => k + 1);
            }
        }
    }, [animationStep, displayItems.front.length, displayItems.back.length, isFlipped]);

    useEffect(() => {
        if (isPaused || isComplete || !currentCard) {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        let nextStepDelay;
        const currentItems = isFlipped ? displayItems.back : displayItems.front;

        if (animationStep < currentItems.length) {
            // Staggered reveal of each item
            nextStepDelay = (animationStep === -1) ? 500 : sessionContext.settings.delaySeconds * 500;
        } else if (!isFlipped) {
            // Pause after question is fully revealed
            nextStepDelay = sessionContext.settings.delaySeconds * 1000 * 1.5;
        } else {
            // Pause after answer is fully revealed, before next card
            nextStepDelay = sessionContext.settings.cardIntervalSeconds * 1000;
        }

        timerRef.current = window.setTimeout(advance, nextStepDelay);

        return () => { if (timerRef.current) clearTimeout(timerRef.current) };
    }, [advance, animationStep, isFlipped, isPaused, isComplete, sessionContext.settings, displayItems, currentCard]);
    
    const resetCardState = useCallback(() => {
        setIsFlipped(false);
        setAnimationStep(-1);
        setJournalButtonState('idle');
    }, []);

    // Effect to handle logic that depends on the NEW currentCard
    useEffect(() => {
        if (!currentCard) {
            onWordChange(null);
            return;
        }
        
        setViewedCardIds(prev => new Set(prev).add(currentCard.row.id));
        if (appSettings.journalLoggingMode === 'automatic') {
            onAddToJournal({ vocabRow: currentCard.row, relation: currentCard.relation, sourceSessionType: 'theater' });
        }
        onWordChange(currentCard.row);

    }, [currentCard, appSettings.journalLoggingMode, onAddToJournal, onWordChange]);
    
    // This effect handles the transition TO a new card.
    useEffect(() => {
        if (contentKey > 0) { // Only run after the initial load
            const timeout = setTimeout(() => {
                setCardIndex(i => {
                    if (animationDirection === 'next') {
                        if (i + 1 >= queue.length) {
                            setQueue(q => shuffleArray([...q]));
                            return 0;
                        }
                        return i + 1;
                    } else { // prev
                        return (i - 1 + queue.length) % queue.length;
                    }
                });
                resetCardState();
            }, 300); // Match slide-out animation duration
            return () => clearTimeout(timeout);
        } else if (contentKey === 0 && queue.length > 0) {
            // Initial setup for the very first card
             resetCardState();
        }
    }, [contentKey, animationDirection, queue.length, resetCardState]);
    
    // --- Timers and Controls ---
    useEffect(() => {
        const interval = setInterval(() => { if (!isPaused) setSessionElapsed(s => s + 1) }, 1000);
        if (sessionContext.settings.durationMinutes > 0 && sessionElapsed >= sessionContext.settings.durationMinutes * 60) setIsComplete(true);
        return () => clearInterval(interval);
    }, [sessionElapsed, sessionContext.settings.durationMinutes, isPaused]);
    
    const showControls = useCallback(() => {
        setIsControlsVisible(true);
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = window.setTimeout(() => setIsControlsVisible(false), 3000);
    }, []);

    useEffect(() => {
        showControls();
        const events = ['mousemove', 'touchstart', 'click'];
        events.forEach(e => window.addEventListener(e, showControls));
        return () => {
            events.forEach(e => window.removeEventListener(e, showControls));
            if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        };
    }, [showControls]);

    // --- Audio ---
    useEffect(() => { stopSpeech() }, [cardIndex, isFlipped]);
    useEffect(() => {
        if (isPaused || isComplete || !appSettings.audioAutoPlay || !currentCard || animationStep < 0 || animationStep % 2 !== 1) return;
        
        const table = tables.find(t => t.rows.some(r => r.id === currentCard.row.id));
        if (!table?.audioConfig) return;

        const { sourceColumn, language } = table.audioConfig;
        const currentItems = isFlipped ? displayItems.back : displayItems.front;
        const currentColName = currentItems[animationStep - 1]?.value;

        if (sourceColumn === currentColName) {
            const text = currentItems[animationStep].value;
            if (text) playSpeech(text, language, appSettings.audioPlaybackRate).catch(err => console.error("Speech error:", err));
        }
    }, [animationStep, cardIndex, queue, isPaused, isComplete, appSettings.audioAutoPlay, appSettings.audioPlaybackRate, tables, displayItems, isFlipped, currentCard]);

    // --- Event Handlers ---
    const handleStop = () => onSessionFinish(Array.from(viewedCardIds), sessionElapsed);
    const handleRestart = () => { setQueue(q => shuffleArray([...q])); setCardIndex(0); setContentKey(k => k + 1); setIsComplete(false); };
    const changeCard = useCallback((direction: 'next' | 'prev') => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setAnimationDirection(direction);
        setContentKey(k => k + 1);
    }, []);
    
    const handleManualAddToJournal = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentCard || journalButtonState === 'saving') return;
        onAddToJournal({ vocabRow: currentCard.row, relation: currentCard.relation, sourceSessionType: 'theater' });
        setJournalButtonState('saving');
        setJournalToast({ message: "Đã thêm vào nhật ký!", key: Date.now() });
        setTimeout(() => setJournalButtonState('idle'), 1500);
        setTimeout(() => setJournalToast(null), 1500);
    };
    
    const handlePlayPause = () => {
        setIsPaused(p => !p);
        showControls();
    };

    if (isComplete) {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 text-center animate-scale-in" onMouseMove={showControls} onTouchStart={showControls}>
                <div className="w-full max-w-md">
                    <h1 className="text-4xl font-extrabold text-cyan-400 mb-4">Session Complete!</h1>
                    <p className="text-lg text-slate-300 mb-8">You reviewed {viewedCardIds.size} cards in {formatTime(sessionElapsed)}.</p>
                    <div className="flex gap-4">
                        <button onClick={handleRestart} className="flex-1 bg-slate-700 hover:bg-slate-600 border border-slate-500 font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2"><RepeatIcon /> Restart</button>
                        <button onClick={handleStop} className="flex-1 bg-cyan-600 hover:bg-cyan-500 font-bold py-3 px-6 rounded-lg">End Session</button>
                    </div>
                </div>
            </div>
        );
    }
    
    if (!currentCard) {
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading Theater...</div>;
    }

    const backgroundStyle = getBackgroundStyle(currentCard.relation);
    const hasCustomBackground = Object.keys(backgroundStyle).length > 0;

    return (
        <div 
            className={`min-h-screen text-white flex flex-col items-center justify-center p-4 overflow-hidden relative transition-all duration-500 ${!hasCustomBackground ? 'bg-slate-900' : ''}`}
            style={backgroundStyle}
            onMouseMove={showControls} onTouchStart={showControls}
        >
            {journalToast && (
                <div key={journalToast.key} className="fixed top-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-sm font-semibold py-2 px-4 rounded-full shadow-lg z-50 animate-toast-in-out">
                    {journalToast.message}
                </div>
            )}
            <div className="absolute inset-0 bg-black/10"></div>
            
            <button onClick={handleStop} className={`absolute top-4 left-4 p-3 rounded-full bg-black/20 hover:bg-black/40 transition-opacity duration-300 z-30 ${isControlsVisible ? 'opacity-100' : 'opacity-0'}`}><CloseIcon /></button>
            <button onClick={handleManualAddToJournal} disabled={journalButtonState === 'saving'} className={`absolute top-4 right-4 p-3 rounded-full bg-black/20 hover:bg-black/40 transition-opacity duration-300 z-30 ${isControlsVisible ? 'opacity-100' : 'opacity-0'}`}>
                {journalButtonState === 'saving' ? <BookmarkFilledIcon className="w-6 h-6 text-amber-400" /> : <BookmarkIcon className="w-6 h-6"/>}
            </button>

            <div
                key={contentKey}
                className={`w-full max-w-4xl min-h-[300px] text-center p-8 transition-opacity duration-300 ${
                    contentKey > 0 ? (animationDirection === 'next' ? 'animate-theater-slide-in-right' : 'animate-theater-slide-in-left') : 'animate-scale-in'
                }`}
            >
                {itemsToRender.map((item, index) => {
                    const isVisible = animationStep >= index;
                    const style = {
                        animationDelay: `${index * 0.15}s`,
                        ...getColumnStyle(currentCard.relation, item.colName)
                    };
                    
                    if (item.type === 'colName') {
                        return <p key={`${cardIndex}-${isFlipped}-${index}-name`} style={style} className={`text-lg ${!style.color ? 'text-slate-300 opacity-80' : ''} mb-1 transition-opacity duration-300 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>{item.value}</p>;
                    } else { // colValue
                        return <p key={`${cardIndex}-${isFlipped}-${index}-value`} style={style} className={`text-4xl md:text-5xl font-semibold mb-10 transition-opacity duration-300 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>{item.value}</p>;
                    }
                })}
            </div>
            
            <div className={`fixed bottom-0 left-0 right-0 p-4 transition-opacity duration-300 z-20 ${isControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="max-w-3xl mx-auto p-3 bg-black/30 backdrop-blur-sm rounded-xl flex items-center gap-4">
                    <span className="text-sm font-mono text-slate-300">{cardIndex + 1} / {queue.length}</span>
                    <div className="flex-grow h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white" style={{width: `${((cardIndex + 1) / queue.length) * 100}%`, transition: 'width 0.3s'}}></div>
                    </div>
                    <span className="text-sm font-mono text-slate-300">{formatTime(sessionElapsed)}</span>
                </div>
                <div className="max-w-xs mx-auto mt-4 flex justify-center items-center gap-6">
                    <button onClick={() => changeCard('prev')} className="p-3 text-slate-300 hover:text-white"><ChevronLeftIcon /></button>
                    <button onClick={handlePlayPause} className="w-16 h-16 bg-white/90 text-slate-800 rounded-full flex items-center justify-center text-4xl shadow-lg">
                        {isPaused ? <PlayIcon className="w-8 h-8"/> : <PauseIcon className="w-8 h-8"/>}
                    </button>
                    <button onClick={() => changeCard('next')} className="p-3 text-slate-300 hover:text-white"><ChevronRightIcon /></button>
                </div>
            </div>
        </div>
    );
};

export default TheaterSessionScreen;