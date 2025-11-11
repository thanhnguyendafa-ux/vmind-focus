import React, { useState, useEffect, useMemo, useRef } from 'react';
import Icon from '../../components/ui/Icon';
import { useSessionStore } from '../../stores/useSessionStore';
import { useTableStore } from '../../stores/useTableStore';
import { Table, Relation } from '../../types';

type AnimationStep = 'in' | 'front' | 'flip' | 'back' | 'out';
interface CardPart { text: string; columnName: string; }

const TheaterSessionScreen: React.FC = () => {
    const { activeTheaterSession: session, handleFinishTheaterSession } = useSessionStore();
    const { tables } = useTableStore();
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const [animationStep, setAnimationStep] = useState<AnimationStep>('in');
    const [revealedPartIndex, setRevealedPartIndex] = useState(-1);
    const [isPaused, setIsPaused] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [elapsed, setElapsed] = useState(0);
    const [history, setHistory] = useState<{rowId: string, timestamp: number}[]>([]);

    const stepTimerRef = useRef<number | null>(null);
    const sessionTimerRef = useRef<number | null>(null);
    const controlsTimerRef = useRef<number | null>(null);

    const currentCardData = useMemo(() => {
        if (!session) return null;
        const currentRowId = session.queue[currentIndex];
        let currentTable: Table | undefined;
        let currentRow;
        for (const table of tables) { const row = table.rows.find(r => r.id === currentRowId); if (row) { currentTable = table; currentRow = row; break; } }
        if (!currentTable || !currentRow) return null;
        const source = session.settings.sources.find(s => s.tableId === currentTable!.id);
        if (!source) return null;
        const currentRelation = currentTable.relations.find(r => r.id === source.relationId);
        if (!currentRelation) return null;
        const getParts = (columnIds: string[]): CardPart[] => columnIds.map(id => ({ text: currentRow!.cols[id] || '', columnName: currentTable!.columns.find(c => c.id === id)?.name || '' })).filter(part => part.text);
        return { table: currentTable, row: currentRow, relation: currentRelation, frontParts: getParts(currentRelation.questionColumnIds), backParts: getParts(currentRelation.answerColumnIds) };
    }, [session, currentIndex, tables]);

    useEffect(() => {
        if (!session || isPaused) return;

        const { partDelay, cardInterval } = session.settings;
        const clearTimers = () => { if (stepTimerRef.current) clearTimeout(stepTimerRef.current); };
        
        const scheduleNextStep = (step: AnimationStep, delay: number) => { clearTimers(); stepTimerRef.current = window.setTimeout(() => setAnimationStep(step), delay); };
        
        switch (animationStep) {
            case 'in': scheduleNextStep('front', 500); break;
            case 'front':
                if (currentCardData && revealedPartIndex < currentCardData.frontParts.length - 1) {
                    stepTimerRef.current = window.setTimeout(() => setRevealedPartIndex(i => i + 1), partDelay);
                } else { scheduleNextStep('flip', partDelay * 1.5); }
                break;
            case 'flip': scheduleNextStep('back', 600); break;
            case 'back':
                if (currentCardData && revealedPartIndex < currentCardData.backParts.length - 1) {
                    stepTimerRef.current = window.setTimeout(() => setRevealedPartIndex(i => i + 1), partDelay);
                } else { scheduleNextStep('out', cardInterval); }
                break;
            case 'out':
                if (currentCardData) setHistory(h => [...h, {rowId: currentCardData.row.id, timestamp: Date.now()}]);
                stepTimerRef.current = window.setTimeout(() => {
                    if (currentIndex < session.queue.length - 1) {
                        setCurrentIndex(i => i + 1);
                        setAnimationStep('in');
                        setRevealedPartIndex(-1);
                    } else {
                        handleFinishTheaterSession({...session, history});
                    }
                }, 500);
                break;
        }
        return clearTimers;
    }, [animationStep, revealedPartIndex, isPaused, session, currentIndex, currentCardData]);

     useEffect(() => {
        if (!isPaused && session) {
            sessionTimerRef.current = window.setInterval(() => {
                setElapsed(e => {
                    const newElapsed = e + 1;
                    if (session.settings.sessionDuration > 0 && newElapsed >= session.settings.sessionDuration * 60) {
                        handleFinishTheaterSession({...session, history});
                    }
                    return newElapsed;
                });
            }, 1000);
        }
        return () => { if (sessionTimerRef.current) clearInterval(sessionTimerRef.current); };
    }, [isPaused, session]);
    
    const handleMouseMove = () => { setShowControls(true); if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current); controlsTimerRef.current = window.setTimeout(() => setShowControls(false), 3000); };
    useEffect(() => { handleMouseMove(); return () => { if(controlsTimerRef.current) clearTimeout(controlsTimerRef.current) }; }, []);

    if (!session || !currentCardData) return <div className="fixed inset-0 bg-black flex items-center justify-center text-white">Loading...</div>;

    const { frontParts, backParts } = currentCardData;
    const isFlipped = animationStep === 'back' || animationStep === 'flip';
    const animationClass = animationStep === 'in' ? 'animate-fade-in-up' : animationStep === 'out' ? 'animate-slide-out-left' : 'animate-slide-in-right';
    const progress = (currentIndex / session.queue.length) * 100;
    const time = new Date(elapsed * 1000).toISOString().substr(14, 5);

    const renderParts = (parts: CardPart[], step: 'front' | 'back') => (
        <div className="p-8 text-center space-y-4">
            {parts.map((part, index) => (
                <div key={index} className={`transition-all duration-500 ${revealedPartIndex >= index ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <p className="text-sm font-semibold text-white/50">{part.columnName}</p>
                    <p className="text-2xl md:text-3xl font-bold">{part.text}</p>
                </div>
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center p-4" onMouseMove={handleMouseMove}>
            <div className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <div className="flex justify-between items-center text-sm">
                    <span className="truncate max-w-xs">{currentCardData.table.name}</span>
                    <span>{time} {session.settings.sessionDuration > 0 && `/ ${session.settings.sessionDuration}:00`}</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-1 mt-2"><div className="bg-white h-1 rounded-full" style={{ width: `${progress}%` }}></div></div>
            </div>

            <main className="w-full max-w-2xl h-80 perspective-1000">
                <div className={`relative w-full h-full transform-style-3d transition-transform duration-500 ${isFlipped ? 'flipped' : ''}`}>
                    <div className={`card-front absolute w-full h-full flex flex-col items-center justify-center bg-secondary-800 rounded-lg shadow-lg ${animationStep !== 'out' ? 'animate-slide-in-right' : 'animate-slide-out-left'}`}>
                        {renderParts(frontParts, 'front')}
                    </div>
                    <div className={`card-back absolute w-full h-full flex flex-col items-center justify-center bg-secondary-700 rounded-lg shadow-lg`}>
                        {renderParts(backParts, 'back')}
                    </div>
                </div>
            </main>
            
            <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <div className="flex justify-center items-center gap-6">
                    <button onClick={() => setCurrentIndex(i => Math.max(0, i-1))} className="p-2"><Icon name="arrowLeft" className="w-8 h-8"/></button>
                    <button onClick={() => setIsPaused(!isPaused)} className="bg-white/20 rounded-full p-4"><Icon name={isPaused ? 'play' : 'pause'} className="w-10 h-10"/></button>
                    <button onClick={() => setCurrentIndex(i => Math.min(session.queue.length - 1, i+1))} className="p-2"><Icon name="arrowRight" className="w-8 h-8"/></button>
                    <button onClick={() => handleFinishTheaterSession({...session, history})} className="absolute right-4 p-2"><Icon name="x" className="w-8 h-8"/></button>
                </div>
            </div>
        </div>
    );
};

export default TheaterSessionScreen;
