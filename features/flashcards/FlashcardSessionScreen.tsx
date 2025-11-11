import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { FlashcardStatus, Table, VocabRow, Relation, TypographyDesign, CardFaceDesign, TextBox } from '../../types';
import Icon from '../../components/ui/Icon';
import Modal from '../../components/ui/Modal';
import { useSessionStore } from '../../stores/useSessionStore';
import { useTableStore } from '../../stores/useTableStore';
import { useNoteStore } from '../../stores/useNoteStore';
import { useUIStore } from '../../stores/useUIStore';
import { useAudioStore } from '../../stores/useAudioStore';
import WordDetailModal from '../tables/WordDetailModal';

const statusConfig: { [key in FlashcardStatus]: { label: string; color: string; interval: number } } = {
  [FlashcardStatus.New]: { label: 'New', color: 'gray', interval: 0 },
  [FlashcardStatus.Again]: { label: 'Again+3', color: 'bg-red-500 hover:bg-red-600', interval: 3 }, // Red
  [FlashcardStatus.Hard]: { label: 'Hard+5', color: 'bg-orange-500 hover:bg-orange-600', interval: 5 }, // Orange
  [FlashcardStatus.Good]: { label: 'Good+8', color: 'bg-yellow-500 hover:bg-yellow-600', interval: 8 }, // Yellow
  [FlashcardStatus.Easy]: { label: 'Easy+13', color: 'bg-green-500 hover:bg-green-600', interval: 13 }, // Green
  [FlashcardStatus.Perfect]: { label: 'Perfect+21', color: 'bg-blue-500 hover:bg-blue-600', interval: 21 }, // Blue
  [FlashcardStatus.Superb]: { label: 'Superb+34', color: 'bg-purple-500 hover:bg-purple-600', interval: 34 }, // Purple
};

const progressBarStatusColors: { [key in FlashcardStatus]: string } = {
    [FlashcardStatus.New]: 'bg-slate-400',
    [FlashcardStatus.Again]: 'bg-red-500',
    [FlashcardStatus.Hard]: 'bg-orange-500',
    [FlashcardStatus.Good]: 'bg-yellow-500',
    [FlashcardStatus.Easy]: 'bg-green-500',
    [FlashcardStatus.Perfect]: 'bg-blue-500',
    [FlashcardStatus.Superb]: 'bg-purple-500',
};

const orderedStatuses: FlashcardStatus[] = [
    FlashcardStatus.New,
    FlashcardStatus.Again,
    FlashcardStatus.Hard,
    FlashcardStatus.Good,
    FlashcardStatus.Easy,
    FlashcardStatus.Perfect,
    FlashcardStatus.Superb
];

const CardTextElement: React.FC<{
    text: string;
    typography: TypographyDesign;
    onFocusClick: () => void;
}> = ({ text, typography, onFocusClick }) => {
    const textRef = React.useRef<HTMLDivElement>(null);
    const [isOverflowing, setIsOverflowing] = React.useState(false);
    const { overflowBehavior, maxLines } = typography;

    React.useLayoutEffect(() => {
        const checkOverflow = () => {
            if (textRef.current) {
                setIsOverflowing(textRef.current.scrollHeight > textRef.current.clientHeight);
            }
        };
        checkOverflow();
        const timeoutId = setTimeout(checkOverflow, 100);
        return () => clearTimeout(timeoutId);
    }, [text, typography, maxLines]);

    const style: React.CSSProperties = { ...typography, wordBreak: 'break-word' };

    if (overflowBehavior === 'truncate') {
        style.display = '-webkit-box';
        style.WebkitBoxOrient = 'vertical';
        style.WebkitLineClamp = maxLines || 3;
        style.overflow = 'hidden';
        style.textOverflow = 'ellipsis';
    } else if (overflowBehavior === 'scroll') {
        style.overflowY = 'auto';
        style.maxHeight = '7em';
        style.paddingRight = '8px';
    }

    return (
        <div className="relative w-full">
            <div ref={textRef} style={style}>
                {text}
            </div>
            {overflowBehavior === 'truncate' && isOverflowing && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onFocusClick(); }}
                    className="absolute bottom-0 right-0 bg-white/50 dark:bg-secondary-800/50 rounded-full p-1 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-secondary-700/80"
                >
                    <Icon name="arrows-pointing-out" className="w-4 h-4 text-secondary-600 dark:text-secondary-300" />
                </button>
            )}
        </div>
    );
};


const DefaultCardFace: React.FC<{
    face: 'front' | 'back';
    relation: Relation;
    row: VocabRow;
    table: Table;
    onFocusClick: (title: string, content: string) => void;
}> = ({ face, relation, row, table, onFocusClick }) => {
    
    if (face === 'front') {
        return (
            <div className="p-6 w-full text-left">
                <p className="text-sm font-semibold text-text-subtle mb-2">Question:</p>
                <div className="space-y-3 text-lg">
                    {relation.questionColumnIds.map(id => {
                        const col = table.columns.find(c => c.id === id);
                        return (
                            <div key={id}>
                                <p className="text-sm font-bold text-secondary-600 dark:text-secondary-300">{col?.name}</p>
                                <p className="text-2xl font-bold text-text-main dark:text-secondary-100">{row.cols[id] || '—'}</p>
                            </div>
                        );
                    })}
                </div>
                <div className="border-t border-secondary-200 dark:border-secondary-700 my-4"></div>
                <p className="text-sm text-secondary-400 dark:text-secondary-500">
                    ({relation.answerColumnIds.map(id => table.columns.find(c => c.id === id)?.name).join(', ')}) = ????
                </p>
            </div>
        );
    }

    return (
        <div className="p-6 w-full text-left">
             <p className="text-sm font-semibold text-text-subtle mb-2">Answer:</p>
            <div className="space-y-3">
                {relation.answerColumnIds.map(id => {
                    const col = table.columns.find(c => c.id === id);
                    return (
                        <div key={id}>
                            <p className="text-sm font-bold text-secondary-600 dark:text-secondary-300">{col?.name}</p>
                            <p className="text-2xl font-bold text-text-main dark:text-secondary-100">{row.cols[id] || '—'}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


const FlashcardSessionScreen: React.FC = () => {
  const { activeFlashcardSession, handleFinishFlashcardSession } = useSessionStore();
  const { tables, updateTable } = useTableStore();
  const { handleSaveToJournal } = useNoteStore();
  const { theme, setGalleryViewData } = useUIStore();
  const { handlePlayTextAsSpeech } = useAudioStore();
  
  if (!activeFlashcardSession) return null;

  const [currentSession, setCurrentSession] = useState(activeFlashcardSession);
  const [isFlipped, setIsFlipped] = useState(false);
  const [rowForDetail, setRowForDetail] = useState<VocabRow | null>(null);
  const [focusContent, setFocusContent] = useState<{title: string, content: string} | null>(null);
  const [cardAnimation, setCardAnimation] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const rowDataMap = useMemo(() => { const map = new Map<string, VocabRow>(); tables.flatMap(t => t.rows).forEach(w => map.set(w.id, w)); return map; }, [tables]);
  const relationDataMap = useMemo(() => { const map = new Map<string, Relation>(); tables.flatMap(t => t.relations).forEach(r => map.set(r.id, r)); return map; }, [tables]);

  const currentRowId = currentSession.queue[currentSession.currentIndex];
  const currentRow = rowDataMap.get(currentRowId);

  const rowRelationMap = useMemo(() => { const map = new Map<string, string>(); currentSession.queue.forEach(rowId => { const randomRelId = currentSession.relationIds[Math.floor(Math.random() * currentSession.relationIds.length)]; map.set(rowId, randomRelId); }); return map; }, [currentSession.queue, currentSession.relationIds]);

  const currentRelationId = rowRelationMap.get(currentRowId);
  const currentRelation = currentRelationId ? relationDataMap.get(currentRelationId) : null;
  const currentTable = tables.find(t => t.rows.some(w => w.id === currentRowId));

  const sessionStatusOverrides = useMemo(() => {
    const overrides = new Map<string, FlashcardStatus>();
    currentSession.history.forEach(h => {
        overrides.set(h.rowId, h.status);
    });
    return overrides;
  }, [currentSession.history]);

  const queueStats = useMemo(() => {
      const counts: { [key in FlashcardStatus]: number } = {
          [FlashcardStatus.New]: 0,
          [FlashcardStatus.Again]: 0,
          [FlashcardStatus.Hard]: 0,
          [FlashcardStatus.Good]: 0,
          [FlashcardStatus.Easy]: 0,
          [FlashcardStatus.Perfect]: 0,
          [FlashcardStatus.Superb]: 0,
      };
      let total = 0;
      currentSession.queue.forEach(rowId => {
          const row = rowDataMap.get(rowId);
          if (row) {
              const status = sessionStatusOverrides.get(rowId) || row.stats.flashcardStatus || FlashcardStatus.New;
              counts[status]++;
              total++;
          }
      });
      return { counts, total };
  }, [currentSession.queue, rowDataMap, sessionStatusOverrides]);

  useEffect(() => {
    // Apply fade-in animation for the very first card
    setCardAnimation('animate-fadeIn');
    const timer = setTimeout(() => setCardAnimation(''), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleOpenGalleryView = (table: Table, rowId: string) => {
    setGalleryViewData({ table, initialRowId: rowId });
  };

  const handleUpdateRow = async (updatedRow: VocabRow): Promise<void> => {
    if (!currentTable) return;
    const updatedTable = { ...currentTable, rows: currentTable.rows.map(r => r.id === updatedRow.id ? updatedRow : r) };
    const success = await updateTable(updatedTable);
    if (success) {
        setRowForDetail(null); // Close the modal on success
    }
  };

  const handleRate = useCallback((status: FlashcardStatus) => {
    if (!currentRowId || cardAnimation || isTransitioning) return;

    setCardAnimation('animate-slide-out-left');

    setTimeout(() => {
        // By setting this flag, we apply a class that disables the flip transition.
        setIsTransitioning(true);
        setIsFlipped(false); // This reset will be instant.

        const { interval } = statusConfig[status];
        const originalQueue = currentSession.queue;
        const currentIndex = currentSession.currentIndex;
        const queueAfterRemoval = originalQueue.filter((_, index) => index !== currentIndex);
        const itemToMove = originalQueue[currentIndex];
        const insertIndex = Math.min(currentIndex + interval, queueAfterRemoval.length);
        const newQueue = [...queueAfterRemoval.slice(0, insertIndex), itemToMove, ...queueAfterRemoval.slice(insertIndex)];
        const wasLastCard = currentIndex >= queueAfterRemoval.length;
        const nextIndex = wasLastCard ? newQueue.length : currentIndex;

        setCurrentSession(prev => ({
            ...prev,
            queue: newQueue,
            currentIndex: nextIndex,
            sessionEncounters: prev.sessionEncounters + 1,
            history: [...prev.history, { rowId: currentRowId, status, timestamp: Date.now() }],
        }));
        
        // Use rAF to ensure the DOM updates (no-transition class applied) before we animate in.
        requestAnimationFrame(() => {
            setIsTransitioning(false); // Re-enable transitions for the next user flip.
            setCardAnimation('animate-slide-in-right');
            setTimeout(() => setCardAnimation(''), 100); // Cleanup animation class
        });

    }, 100); // Corresponds to slideOutLeft animation duration
  }, [currentRowId, cardAnimation, isTransitioning, currentSession]);


  const handlePlayAudio = (textToSpeak: string, id: string) => {
    handlePlayTextAsSpeech(textToSpeak, `flashcard-${id}`);
  };

  const getCardFaceStyle = (faceDesign: CardFaceDesign): React.CSSProperties => {
      let background = faceDesign.backgroundValue;
      if (faceDesign.backgroundType === 'gradient' && faceDesign.backgroundValue.includes(',')) { const [color1, color2] = faceDesign.backgroundValue.split(','); background = `linear-gradient(${faceDesign.gradientAngle}deg, ${color1 || '#ffffff'}, ${color2 || '#e0e0e0'})`; } else if (faceDesign.backgroundType === 'image') { background = `url("${faceDesign.backgroundValue}") center/cover no-repeat, #f0f0f0`; }
      return { background };
  };

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts if a modal is open or an input is focused
      if (rowForDetail || focusContent || ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      
      // Prevent actions during card animations
      if (cardAnimation || isTransitioning) {
        return;
      }

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      }

      if (isFlipped) {
        switch (e.key) {
          case '1': handleRate(FlashcardStatus.Again); break;
          case '2': handleRate(FlashcardStatus.Hard); break;
          case '3': handleRate(FlashcardStatus.Good); break;
          case '4': handleRate(FlashcardStatus.Easy); break;
          case '5': handleRate(FlashcardStatus.Perfect); break;
          case '6': handleRate(FlashcardStatus.Superb); break;
          default: break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFlipped, cardAnimation, isTransitioning, rowForDetail, focusContent, handleRate]);


  if (!currentRow || !currentRelation || !currentTable) {
    return (
        <div className="fixed inset-0 bg-background dark:bg-secondary-900 flex flex-col items-center justify-center">
            <h2 className="text-xl font-bold mb-4">Session Complete!</h2>
            <button onClick={() => handleFinishFlashcardSession(currentSession)} className="bg-primary-600 text-white font-bold py-3 px-6 rounded-lg">
                Return to Menu
            </button>
        </div>
    );
  }

  const cardFrontText = currentRelation.questionColumnIds.map(id => currentRow.cols[id]).filter(Boolean).join(' / ') || 'N/A';
  const canPlayFrontAudio = currentRelation.questionColumnIds.includes(currentTable.audioConfig?.sourceColumnId || '');
  const canPlayBackAudio = currentRelation.answerColumnIds.includes(currentTable.audioConfig?.sourceColumnId || '');
  
  const defaultTypo: TypographyDesign = {
    color: theme === 'dark' ? '#f1f5f9' : '#1e293b',
    fontSize: '24px',
    fontFamily: 'sans-serif',
    textAlign: 'center',
    fontWeight: 'bold',
  };


  return (
    <div className="fixed inset-0 bg-background dark:bg-secondary-900 flex flex-col items-center p-4 transition-colors duration-300">
      <header className="w-full max-w-2xl mb-4">
          <div className="flex justify-between items-center text-text-subtle mb-2">
            <span>Card {currentSession.currentIndex + 1} of {currentSession.queue.length}</span>
            <button onClick={() => handleFinishFlashcardSession(currentSession)} className="hover:text-text-main dark:hover:text-secondary-100 transition-colors">End Session</button>
          </div>
          <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-2.5 flex overflow-hidden">
            {orderedStatuses.map(status => {
                const count = queueStats.counts[status];
                if (count === 0) return null;
                const percentage = (count / queueStats.total) * 100;
                return (
                    <div
                        key={status}
                        className={`${progressBarStatusColors[status]} h-full transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                        title={`${status}: ${count} card(s)`}
                    />
                );
            })}
          </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl">
        <div className={`w-full h-64 sm:h-80 mb-6 perspective-1000 ${cardAnimation}`}>
            <div className={`card-container w-full h-full cursor-pointer group ${isFlipped ? 'flipped' : ''} ${isTransitioning ? 'no-transition' : ''}`} onClick={() => !cardAnimation && !isTransitioning && setIsFlipped(!isFlipped)}>
                <div className="card-flip relative w-full h-full transform-style-3d">
                    <div className="card-front absolute w-full h-full flex flex-col items-center justify-center p-4 rounded-lg shadow-xl" style={currentRelation.design ? getCardFaceStyle(currentRelation.design.front) : {backgroundColor: 'var(--color-surface)'}}>
                        {currentRelation.design ? (
                            <>
                                <div className={`flex-1 flex items-center justify-center w-full ${currentRelation.design.front.layout === 'vertical' ? 'flex-col gap-2' : 'flex-row gap-4'}`}>
                                    {(currentRelation.design.front.elementOrder || currentRelation.questionColumnIds).map(id => {
                                        const col = currentTable.columns.find(c => c.id === id);
                                        const txt = currentRelation.design!.front.textBoxes?.find(t => t.id === id);
                                        if (col) {
                                            const typography = currentRelation.design!.front.typography[id] || defaultTypo;
                                            const text = currentRow.cols[id] || `[${col.name}]`;
                                            return <div key={id} className="p-1 w-full"><CardTextElement text={text} typography={typography} onFocusClick={() => setFocusContent({ title: col.name || "Content", content: currentRow.cols[id] })}/></div>;
                                        }
                                        if (txt) {
                                            const typography = txt.typography;
                                            return <div key={id} className="p-1 w-full"><CardTextElement text={txt.text} typography={typography} onFocusClick={() => setFocusContent({ title: "Text Box", content: txt.text })}/></div>;
                                        }
                                        return null;
                                    })}
                                </div>
                                {canPlayFrontAudio && <button onClick={(e) => {e.stopPropagation(); handlePlayAudio(cardFrontText, currentRow.id)}} className="absolute bottom-4 right-4 text-secondary-400 hover:text-primary-500"><Icon name="play" className="w-6 h-6"/></button>}
                            </>
                        ) : (
                           <DefaultCardFace face="front" relation={currentRelation} row={currentRow} table={currentTable} onFocusClick={(title, content) => setFocusContent({title, content})} />
                        )}
                    </div>
                    <div className="card-back absolute w-full h-full flex flex-col items-center justify-center p-4 rounded-lg shadow-xl" style={currentRelation.design ? getCardFaceStyle(currentRelation.design.back) : {backgroundColor: 'var(--color-secondary-50)'}}>
                         {currentRelation.design ? (
                            <>
                                <div className={`flex-1 flex items-center justify-center w-full ${currentRelation.design.back.layout === 'vertical' ? 'flex-col gap-2' : 'flex-row gap-4'}`}>
                                    {(currentRelation.design.back.elementOrder || currentRelation.answerColumnIds).map(id => {
                                        const col = currentTable.columns.find(c => c.id === id);
                                        const txt = currentRelation.design!.back.textBoxes?.find(t => t.id === id);
                                        if (col) {
                                            const typography = currentRelation.design!.back.typography[id] || defaultTypo;
                                            const text = currentRow.cols[id] || `[${col.name}]`;
                                            return <div key={id} className="p-1 w-full"><CardTextElement text={text} typography={typography} onFocusClick={() => setFocusContent({ title: col.name || "Content", content: currentRow.cols[id] })}/></div>;
                                        }
                                        if (txt) {
                                            const typography = txt.typography;
                                            return <div key={id} className="p-1 w-full"><CardTextElement text={txt.text} typography={typography} onFocusClick={() => setFocusContent({ title: "Text Box", content: txt.text })}/></div>;
                                        }
                                        return null;
                                    })}
                                </div>
                                {canPlayBackAudio && <button onClick={(e) => { const audioText = currentRelation.answerColumnIds.map(id => currentRow.cols[id]).filter(Boolean).join(' / '); e.stopPropagation(); handlePlayAudio(audioText, currentRow.id) }} className="absolute bottom-4 right-4 text-secondary-400 hover:text-primary-500"><Icon name="play" className="w-6 h-6"/></button>}
                            </>
                         ) : (
                            <DefaultCardFace face="back" relation={currentRelation} row={currentRow} table={currentTable} onFocusClick={(title, content) => setFocusContent({title, content})} />
                         )}
                    </div>
                </div>
            </div>
        </div>
        {isFlipped && (
          <div className="grid grid-cols-6 gap-2 sm:gap-3 w-full animate-fadeIn">
            {[FlashcardStatus.Again, FlashcardStatus.Hard, FlashcardStatus.Good, FlashcardStatus.Easy, FlashcardStatus.Perfect, FlashcardStatus.Superb].map((status, index) => {
                const config = statusConfig[status];
                return (
                  <button key={status} onClick={() => handleRate(status)} className={`py-2 sm:py-3 rounded-lg text-white text-xs sm:text-sm font-bold transition-transform hover:scale-105 ${config.color}`}>
                    <span className="hidden sm:inline">{config.label}</span>
                    <span className="sm:hidden">{index + 1}</span>
                  </button>
                );
            })}
          </div>
        )}
      </main>
      <footer className="w-full max-w-2xl mt-4 flex items-center justify-between">
          <div className="flex gap-2">
            <button onClick={() => setRowForDetail(currentRow)} title="View/Edit Row" className="p-2 rounded-full bg-surface dark:bg-secondary-700 text-text-subtle hover:text-primary-500 shadow-sm"><Icon name="pencil" className="w-5 h-5"/></button>
            <button onClick={() => handleOpenGalleryView(currentTable, currentRow.id)} title="View in Gallery" className="p-2 rounded-full bg-surface dark:bg-secondary-700 text-text-subtle hover:text-primary-500 shadow-sm"><Icon name="list-bullet" className="w-5 h-5"/></button>
            <button onClick={() => { const frontText = currentRelation.questionColumnIds.map(id => currentRow.cols[id]).filter(Boolean).join(' / '); const backText = currentRelation.answerColumnIds.map(id => currentRow.cols[id]).filter(Boolean).join(' / '); handleSaveToJournal("Flashcard Review", `*Q: ${frontText}*\n*A: ${backText}*`); }} title="Save to Journal" className="p-2 rounded-full bg-surface dark:bg-secondary-700 text-text-subtle hover:text-primary-500 shadow-sm"><Icon name="book" className="w-5 h-5"/></button>
          </div>
          <div className="text-xs text-text-subtle"> Session Time: {Math.floor((Date.now() - currentSession.startTime) / 60000)}m </div>
      </footer>
       <WordDetailModal 
            isOpen={!!rowForDetail} 
            row={rowForDetail} 
            columns={currentTable.columns} 
            aiPrompts={currentTable.aiPrompts}
            imageColumnId={currentTable.imageConfig?.imageColumnId} 
            audioConfig={currentTable.audioConfig}
            onClose={() => setRowForDetail(null)} 
            onSave={handleUpdateRow} 
            onDelete={() => {}} 
            onConfigureAI={() => {}} 
        />
       <Modal isOpen={!!focusContent} onClose={() => setFocusContent(null)} title={focusContent?.title || ''} containerClassName="max-w-3xl w-full">
            <div className="p-6 whitespace-pre-wrap text-lg leading-relaxed text-secondary-700 dark:text-secondary-200 overflow-y-auto">
                {focusContent?.content}
            </div>
       </Modal>
    </div>
  );
};

export default FlashcardSessionScreen;