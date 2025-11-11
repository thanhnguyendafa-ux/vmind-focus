import React, { useState, useMemo, useLayoutEffect, useRef } from 'react';
import { Screen, FlashcardProgress, FlashcardStatus, VocabRow, Table } from '../../types';
import Icon from '../../components/ui/Icon';
import { useSessionDataStore } from '../../stores/useSessionDataStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { useUIStore } from '../../stores/useUIStore';
import { useTableStore } from '../../stores/useTableStore';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import Modal from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import ProgressRelationshipGraphModal from './components/ProgressRelationshipGraphModal';

const statusDisplayConfig: { [key in FlashcardStatus]?: { label: string; tailwindColor: string; hexColor: string; } } = {
  [FlashcardStatus.New]: { label: 'New', tailwindColor: 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200', hexColor: '#cbd5e1' },
  [FlashcardStatus.Again]: { label: 'Again', tailwindColor: 'bg-red-200 dark:bg-red-900/60 text-red-800 dark:text-red-200', hexColor: '#fca5a5' }, // Red
  [FlashcardStatus.Hard]: { label: 'Hard', tailwindColor: 'bg-orange-200 dark:bg-orange-900/60 text-orange-800 dark:text-orange-200', hexColor: '#fdba74' }, // Orange
  [FlashcardStatus.Good]: { label: 'Good', tailwindColor: 'bg-yellow-200 dark:bg-yellow-900/60 text-yellow-800 dark:text-yellow-200', hexColor: '#fde68a' }, // Yellow
  [FlashcardStatus.Easy]: { label: 'Easy', tailwindColor: 'bg-green-200 dark:bg-green-900/60 text-green-800 dark:text-green-200', hexColor: '#86efac' }, // Green
  [FlashcardStatus.Perfect]: { label: 'Perfect', tailwindColor: 'bg-blue-200 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200', hexColor: '#93c5fd' }, // Blue
  [FlashcardStatus.Superb]: { label: 'Superb', tailwindColor: 'bg-purple-200 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200', hexColor: '#d8b4fe' }, // Purple
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


const PieChart: React.FC<{ data: { value: number; color: string; }[]; total: number; centerValue: string; centerLabel: string; }> = ({ data, total, centerValue, centerLabel }) => {
    const radius = 15.91549430918954; // so circumference is 100
    let offset = 0;

    return (
        <div className="relative w-32 h-32">
            <svg viewBox="0 0 36 36" className="w-full h-full">
                <circle cx="18" cy="18" r={radius} fill="transparent" className="stroke-secondary-200 dark:stroke-secondary-700" strokeWidth="3.8" />

                {data.map((item, index) => {
                    if (item.value === 0) return null;
                    const percentage = (item.value / total) * 100;
                    const currentOffset = offset;
                    offset += percentage;
                    return (
                        <circle
                            key={index}
                            cx="18"
                            cy="18"
                            r={radius}
                            fill="transparent"
                            stroke={item.color}
                            strokeWidth="3.8"
                            strokeDasharray={`${percentage} ${100 - percentage}`}
                            strokeDashoffset={-currentOffset}
                            transform="rotate(-90 18 18)"
                        />
                    );
                })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold text-text-main dark:text-secondary-100">{centerValue}</span>
                <span className="text-xs text-text-subtle">{centerLabel}</span>
            </div>
        </div>
    );
};


const ProgressStatsContent: React.FC<{ progress: FlashcardProgress }> = ({ progress }) => {
    const { tables } = useTableStore();

    const stats = React.useMemo(() => {
        const allRowsMap = new Map<string, VocabRow>();
        tables.forEach(table => {
            if (table.rows) {
                table.rows.forEach(row => allRowsMap.set(row.id, row));
            }
        });

        const progressRows = progress.queue.map(rowId => allRowsMap.get(rowId)).filter((r): r is VocabRow => !!r);
        
        const totalCards = progress.queue.length;
        const statusCounts: { [key in FlashcardStatus]: number } = { [FlashcardStatus.New]: 0, [FlashcardStatus.Again]: 0, [FlashcardStatus.Hard]: 0, [FlashcardStatus.Good]: 0, [FlashcardStatus.Easy]: 0, [FlashcardStatus.Perfect]: 0, [FlashcardStatus.Superb]: 0 };
        
        progressRows.forEach(row => {
            const status = row.stats?.flashcardStatus || FlashcardStatus.New;
            statusCounts[status]++;
        });
        
        const sourceTableNames = tables.filter(t => progress.tableIds.includes(t.id)).map(t => t.name);

        return { totalCards, statusCounts, sourceTableNames };
    }, [progress, tables]);

    const pieChartData = React.useMemo(() => {
        return (Object.keys(statusDisplayConfig) as FlashcardStatus[]).map(status => {
            const config = statusDisplayConfig[status];
            if (!config) return { label: '', value: 0, color: ''};
            return {
                label: config.label,
                value: stats.statusCounts[status],
                color: config.hexColor,
            };
        });
    }, [stats.statusCounts]);

    return (
        <div className="p-4 space-y-4 border-t border-secondary-200 dark:border-secondary-700/50 animate-fadeIn bg-secondary-50 dark:bg-secondary-900/50">
            <div>
                <h4 className="text-base font-semibold text-text-main dark:text-secondary-100 mb-2">Progress Breakdown</h4>
                <div className="bg-surface dark:bg-secondary-800 p-4 rounded-lg border border-secondary-200/80 dark:border-secondary-700/50">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="flex-shrink-0">
                            <PieChart
                                data={pieChartData}
                                total={stats.totalCards}
                                centerValue={stats.totalCards.toString()}
                                centerLabel="Total Cards"
                            />
                        </div>
                        <div className="w-full space-y-1">
                            {(Object.keys(statusDisplayConfig) as FlashcardStatus[]).map(status => {
                                const count = stats.statusCounts[status];
                                const config = statusDisplayConfig[status];
                                if (!config || count === 0) return null;
                                const percentage = stats.totalCards > 0 ? ((count / stats.totalCards) * 100).toFixed(0) : 0;
                                return (
                                    <div key={status} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.hexColor }}></div>
                                            <span className="font-semibold text-text-subtle">{config.label}</span>
                                        </div>
                                        <div className="font-mono text-text-main dark:text-secondary-200">
                                            <span className="font-semibold w-6 inline-block text-right">{count}</span>
                                            <span className="text-text-subtle ml-2 w-8 inline-block text-right">({percentage}%)</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
            <div>
                <h4 className="text-base font-semibold text-text-main dark:text-secondary-100 mb-2">Sources</h4>
                <div className="bg-surface dark:bg-secondary-800 border border-secondary-200/80 dark:border-secondary-700/50 rounded-lg p-3 space-y-1">
                    {stats.sourceTableNames.map(name => ( <p key={name} className="text-sm text-text-subtle">- {name}</p> ))}
                    {progress.tags.length > 0 && ( <div className="pt-2 mt-2 border-t border-secondary-200/80 dark:border-secondary-700/50"> <p className="text-xs font-bold text-text-subtle">Tags:</p> <div className="flex flex-wrap gap-1 mt-1"> {progress.tags.map(tag => ( <span key={tag} className="px-2 py-0.5 rounded text-xs font-semibold bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300">{tag}</span> ))} </div> </div> )}
                </div>
            </div>
        </div>
    );
};

const ProgressGalleryContent: React.FC<{ progress: FlashcardProgress }> = ({ progress }) => {
    const { tables } = useTableStore();
    const allRowsMap = React.useMemo(() => {
        const map = new Map<string, VocabRow>();
        tables.forEach(table => {
            if (table.rows) {
                table.rows.forEach(row => map.set(row.id, row));
            }
        });
        return map;
    }, [tables]);

    const firstRelationId = progress.relationIds[0];
    const firstRelation = React.useMemo(() => {
        for (const table of tables) {
            const rel = table.relations?.find(r => r.id === firstRelationId);
            if (rel) return { ...rel, tableId: table.id };
        }
        return null;
    }, [tables, firstRelationId]);

    const cardsToShow = progress.queue.map(rowId => {
        const row = allRowsMap.get(rowId);
        if (!row) return null;

        const table = tables.find(t => t.rows.some(r => r.id === rowId));
        
        let displayRelation = firstRelation;
        if (!displayRelation && table?.relations.length > 0) {
            displayRelation = { ...table.relations[0], tableId: table.id };
        }

        if (!table || !displayRelation) {
            return {
                id: row.id,
                text: 'Error: Data mismatch',
                status: row.stats.flashcardStatus || FlashcardStatus.New,
            };
        }
        
        const questionText = displayRelation.questionColumnIds
            .map(colId => row.cols[colId])
            .filter(Boolean)
            .join(' / ');

        return {
            id: row.id,
            text: questionText || '[Empty]',
            status: row.stats.flashcardStatus || FlashcardStatus.New,
        };
    }).filter((c): c is { id: string; text: string; status: FlashcardStatus } => c !== null);

    return (
        <div className="p-4 border-t border-secondary-200 dark:border-secondary-700/50 bg-secondary-50 dark:bg-secondary-900/50 animate-fadeIn">
            <h4 className="text-base font-semibold text-text-main dark:text-secondary-100 mb-3">Card Queue Showcase</h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-60 overflow-y-auto">
                {cardsToShow.map((card, index) => (
                    <div
                        key={`${card.id}-${index}`}
                        className={`p-2 rounded-md h-20 flex items-center justify-center text-center ${progressBarStatusColors[card.status]}`}
                        title={card.text}
                    >
                        <p className="text-xs font-semibold text-white truncate-2-lines" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
                            {card.text}
                        </p>
                    </div>
                ))}
            </div>
             <p className="text-xs text-text-subtle mt-2 text-center">This is a read-only view of your card queue. The order updates as you study.</p>
        </div>
    );
};

const SingleProgressRelationshipModal: React.FC<{ progress: FlashcardProgress | null; onClose: () => void; }> = ({ progress, onClose }) => {
    const { tables } = useTableStore();
    const { handleStartFlashcardSession } = useSessionStore();
    
    const containerRef = React.useRef<HTMLDivElement>(null);
    const progressCardRef = React.useRef<HTMLDivElement>(null);
    const tableCardRefs = React.useRef<(HTMLDivElement | null)[]>([]);
    
    const [lines, setLines] = React.useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);

    const linkedTables = React.useMemo(() => {
        if (!progress) return [];
        return tables.filter(t => progress.tableIds.includes(t.id));
    }, [progress, tables]);

    React.useLayoutEffect(() => {
        if (!progress || !containerRef.current) {
            setLines([]);
            return;
        }

        const containerRect = containerRef.current.getBoundingClientRect();
        const progressRect = progressCardRef.current?.getBoundingClientRect();

        if (!progressRect) return;

        const newLines = linkedTables.map((_, index) => {
            const tableRect = tableCardRefs.current[index]?.getBoundingClientRect();
            if (!tableRect) return null;

            const x1 = progressRect.right - containerRect.left;
            const y1 = progressRect.top + progressRect.height / 2 - containerRect.top;
            const x2 = tableRect.left - containerRect.left - 10; // -10 for arrowhead
            const y2 = tableRect.top + tableRect.height / 2 - containerRect.top;

            return { x1, y1, x2, y2 };
        }).filter((l): l is { x1: number; y1: number; x2: number; y2: number } => l !== null);

        setLines(newLines);
        
    }, [progress, linkedTables]);


    if (!progress) return null;
    
    return (
        <Modal isOpen={!!progress} onClose={onClose} title={`Links for "${progress.name}"`} containerClassName="max-w-4xl w-full">
            <div ref={containerRef} className="p-8 relative min-h-[300px]">
                <div className="flex justify-between items-start gap-16">
                    {/* Left Column */}
                    <div className="w-1/3 flex-shrink-0 flex items-center h-full">
                         <div
                            ref={progressCardRef}
                            onClick={() => handleStartFlashcardSession(progress.id)}
                            className="p-4 bg-primary-100 dark:bg-primary-900/50 rounded-lg shadow-lg w-full cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all text-center"
                         >
                            <Icon name="flashcards" className="w-10 h-10 mx-auto text-primary-600 dark:text-primary-400 mb-2"/>
                            <h3 className="font-bold text-primary-800 dark:text-primary-200">{progress.name}</h3>
                            <p className="text-xs text-primary-700 dark:text-primary-300">{progress.queue.length} cards</p>
                         </div>
                    </div>

                    {/* Right Column */}
                    <div className="w-2/3 flex flex-col gap-6">
                        {linkedTables.length > 0 ? linkedTables.map((table, index) => (
                            <div
                                key={table.id}
                                ref={el => tableCardRefs.current[index] = el}
                                className="p-3 bg-secondary-100 dark:bg-secondary-800 rounded-lg shadow-md w-full"
                            >
                                <div className="flex items-center gap-3">
                                    <Icon name="table-cells" className="w-6 h-6 text-secondary-500 dark:text-secondary-400 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold text-text-main dark:text-secondary-200">{table.name}</h4>
                                        <p className="text-xs text-text-subtle">{table.rowCount ?? table.rows.length} words</p>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="p-3 text-center text-text-subtle text-sm">No linked tables found.</div>
                        )}
                    </div>
                </div>
                
                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" aria-hidden="true">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="5" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" className="fill-current text-secondary-400 dark:text-secondary-500" />
                        </marker>
                    </defs>
                    {lines.map((line, i) => (
                         <path key={i} d={`M ${line.x1} ${line.y1} L ${line.x2} ${line.y2}`} className="stroke-current text-secondary-400 dark:text-secondary-500" strokeWidth="2" strokeDasharray="4,4" markerEnd="url(#arrowhead)" />
                    ))}
                </svg>
            </div>
        </Modal>
    );
};


const ProgressCard: React.FC<{ progress: FlashcardProgress; onLinkClick: () => void; }> = ({ progress, onLinkClick }) => {
    const { handleStartFlashcardSession } = useSessionStore();
    const { setFlashcardProgresses } = useSessionDataStore();
    const { tables } = useTableStore();
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [isStatsVisible, setIsStatsVisible] = useState(false);
    const [isGalleryVisible, setIsGalleryVisible] = useState(false);

    const queueStats = useMemo(() => {
        const allRowsMap = new Map<string, VocabRow>();
        tables.forEach(table => {
            if (table.rows) {
                table.rows.forEach(row => allRowsMap.set(row.id, row));
            }
        });

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
        progress.queue.forEach(rowId => {
            const row = allRowsMap.get(rowId);
            if (row) {
                const status = row.stats?.flashcardStatus || FlashcardStatus.New;
                counts[status]++;
                total++;
            }
        });
        return { counts, total };
    }, [progress, tables]);

    const orderedQueueStatuses = useMemo(() => {
        const allRowsMap = new Map<string, VocabRow>();
        tables.forEach(table => {
            if (table.rows) {
                table.rows.forEach(row => allRowsMap.set(row.id, row));
            }
        });

        // The queue, starting from the current card
        const queue = progress.queue;
        const currentIndex = progress.currentIndex;
        // Handle case where currentIndex might be out of bounds (e.g., session just finished)
        const validCurrentIndex = Math.min(Math.max(0, currentIndex), queue.length - 1);

        const reorderedQueue = [...queue.slice(validCurrentIndex), ...queue.slice(0, validCurrentIndex)];

        return reorderedQueue.map(rowId => {
            const row = allRowsMap.get(rowId);
            return row?.stats?.flashcardStatus || FlashcardStatus.New;
        });
    }, [progress, tables]);

    const handleDelete = () => {
        setFlashcardProgresses(prev => prev.filter(p => p.id !== progress.id));
        setIsConfirmDeleteOpen(false);
    };

    return (
        <>
            <div className="bg-surface dark:bg-secondary-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow flex flex-col overflow-hidden">
                <div className="p-4 flex-grow">
                    <div className="flex items-center gap-2">
                      <Icon name="flashcards" className="w-5 h-5 text-warning-500 flex-shrink-0" />
                      <h3 className="font-bold text-text-main dark:text-secondary-100 truncate">{progress.name}</h3>
                    </div>
                    <p className="text-xs text-text-subtle mt-1">{progress.queue.length} cards</p>
                    {progress.tags && progress.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1" aria-label="Tags">
                            {progress.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="px-2 py-0.5 rounded text-xs font-semibold bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300">
                                    {tag.startsWith('FC+') ? tag.substring(3).replace(/_/g, ' ') : tag}
                                </span>
                            ))}
                            {progress.tags.length > 3 && (
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-secondary-100 text-secondary-800 dark:bg-secondary-800/50 dark:text-secondary-300">
                                    +{progress.tags.length - 3}
                                </span>
                            )}
                        </div>
                    )}
                    <div className="mt-3">
                        <div className="flex justify-between items-center text-xs text-text-subtle mb-1">
                            <span>Status Distribution</span>
                            <span>{queueStats.total - queueStats.counts[FlashcardStatus.New]} / {queueStats.total} cards</span>
                        </div>
                        <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-2.5 flex overflow-hidden">
                            {orderedQueueStatuses.map((status, index) => {
                                const percentage = orderedQueueStatuses.length > 0 ? 100 / orderedQueueStatuses.length : 0;
                                return (
                                    <div
                                        key={`${status}-${index}`}
                                        className={`${progressBarStatusColors[status]} h-full`}
                                        style={{ width: `${percentage}%` }}
                                        title={`${status}`}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className="bg-secondary-50 dark:bg-secondary-800/50 border-t border-secondary-200/80 dark:border-secondary-700/50 p-2 flex justify-end items-center gap-2 rounded-b-xl">
                    <button onClick={() => setIsGalleryVisible(!isGalleryVisible)} title="Toggle Card Queue Showcase" className="font-semibold text-sm text-secondary-600 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700 px-3 py-1.5 rounded-md flex items-center gap-1.5">
                        <span>Queue</span>
                        <Icon name={isGalleryVisible ? 'chevron-up' : 'chevron-down'} className="w-4 h-4"/>
                    </button>
                    <button onClick={() => setIsStatsVisible(!isStatsVisible)} title="Toggle Statistics" className="font-semibold text-sm text-secondary-600 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700 px-3 py-1.5 rounded-md flex items-center gap-1.5">
                        <span>Stats</span>
                        <Icon name={isStatsVisible ? 'chevron-up' : 'chevron-down'} className="w-4 h-4"/>
                    </button>
                    <button onClick={onLinkClick} title="View Links" className="font-semibold text-sm text-secondary-600 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700 px-3 py-1.5 rounded-md flex items-center gap-1.5">
                        <Icon name="link" className="w-4 h-4"/>
                    </button>
                    <button onClick={() => setIsConfirmDeleteOpen(true)} title="Delete Progress" className="font-semibold text-sm text-error-600 dark:text-error-400 hover:bg-error-500/10 px-3 py-1.5 rounded-md flex items-center gap-1.5">
                        <Icon name="trash" className="w-4 h-4"/>
                    </button>
                    <button onClick={() => handleStartFlashcardSession(progress.id)} className="bg-primary-600 text-white font-semibold text-sm px-4 py-1.5 rounded-md hover:bg-primary-700 flex items-center gap-1.5">
                        <Icon name="play" className="w-4 h-4" />
                        {progress.currentIndex > 0 ? 'Resume' : 'Start'}
                    </button>
                </div>
                {isStatsVisible && <ProgressStatsContent progress={progress} />}
                {isGalleryVisible && <ProgressGalleryContent progress={progress} />}
            </div>
            <ConfirmationModal
                isOpen={isConfirmDeleteOpen}
                onClose={() => setIsConfirmDeleteOpen(false)}
                onConfirm={handleDelete}
                title="Delete Progress"
                message={`Are you sure you want to delete "${progress.name}"? All learning progress for this set will be lost.`}
                confirmText="Delete"
            />
        </>
    );
};


const FlashcardsScreen: React.FC = () => {
    const { flashcardProgresses } = useSessionDataStore();
    const { setCurrentScreen } = useUIStore();
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
    const [visualizingSingleProgress, setVisualizingSingleProgress] = useState<FlashcardProgress | null>(null);
    const [isGraphViewOpen, setIsGraphViewOpen] = useState(false);
    const { tables } = useTableStore();


    const allTags = useMemo(() => {
        const tags = new Set<string>();
        flashcardProgresses.forEach(progress => {
            (progress.tags || []).forEach(tag => tags.add(tag));
        });
        return Array.from(tags).sort();
    }, [flashcardProgresses]);

    const filteredProgresses = useMemo(() => {
        const sorted = [...flashcardProgresses].sort((a,b) => b.createdAt - a.createdAt);
        if (activeTags.size === 0) {
            return sorted;
        }
        return sorted.filter(progress =>
            (progress.tags || []).some(tag => activeTags.has(tag))
        );
    }, [flashcardProgresses, activeTags]);

    const handleToggleTag = (tag: string) => {
        setActiveTags(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tag)) {
                newSet.delete(tag);
            } else {
                newSet.add(tag);
            }
            return newSet;
        });
    };


    return (
        <div className="p-4 sm:p-6 mx-auto animate-fadeIn">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text-main dark:text-secondary-100">Flashcard Progress</h1>
                    <p className="text-sm text-text-subtle">Your saved flashcard learning sets.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setIsGraphViewOpen(true)}>
                        <Icon name="link" className="w-4 h-4 mr-2" />
                        Relationships
                    </Button>
                    {allTags.length > 0 && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsFilterOpen(true)}
                            className="relative"
                        >
                            <Icon name="filter" className="w-4 h-4 mr-2" />
                            Filter
                            {activeTags.size > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-white text-xs font-bold leading-none">
                                    {activeTags.size}
                                </span>
                            )}
                        </Button>
                    )}
                    <Button size="sm" onClick={() => setCurrentScreen(Screen.FlashcardProgressSetup)}>
                        <Icon name="plus" className="w-4 h-4 mr-2" />
                        <span>New Progress</span>
                    </Button>
                </div>
            </header>
            
            <main>
                {filteredProgresses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredProgresses.map(progress => (
                            <ProgressCard key={progress.id} progress={progress} onLinkClick={() => setVisualizingSingleProgress(progress)} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <Icon name={activeTags.size > 0 ? "filter" : "flashcards"} className="w-16 h-16 text-secondary-300 dark:text-secondary-700 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-secondary-700 dark:text-secondary-300">
                           {activeTags.size > 0 ? "No Progress Found" : "No Saved Progress"}
                        </h2>
                        <p className="text-text-subtle mt-2">
                            {activeTags.size > 0 ? "No progress sets match your selected tags." : 'Click "New Progress" to create a filtered set of flashcards to study.'}
                        </p>
                    </div>
                )}
            </main>

            <Modal isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} title="Filter by Tags">
                <div className="p-6">
                    <div className="flex flex-wrap gap-2">
                        {allTags.map(tag => {
                            const isSelected = activeTags.has(tag);
                            const cleanTag = tag.startsWith('FC+') ? tag.substring(3).replace(/_/g, ' ') : tag;
                            return (
                                <button
                                    key={tag}
                                    onClick={() => handleToggleTag(tag)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                                        isSelected
                                            ? 'bg-primary-500 text-white border-primary-500'
                                            : 'bg-surface dark:bg-secondary-700 text-text-subtle border-secondary-300 dark:border-secondary-600 hover:border-primary-400'
                                    }`}
                                >
                                    {cleanTag}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="p-4 bg-secondary-50 dark:bg-secondary-800/50 border-t border-secondary-200/80 dark:border-secondary-700/50 flex justify-between items-center">
                    {activeTags.size > 0 ? (
                        <Button variant="ghost" onClick={() => setActiveTags(new Set())}>
                            Clear Filters ({activeTags.size})
                        </Button>
                    ) : <div />}
                    <Button onClick={() => setIsFilterOpen(false)}>
                        Done
                    </Button>
                </div>
            </Modal>
            
            <SingleProgressRelationshipModal
                progress={visualizingSingleProgress}
                onClose={() => setVisualizingSingleProgress(null)}
            />

            <ProgressRelationshipGraphModal
                isOpen={isGraphViewOpen}
                onClose={() => setIsGraphViewOpen(false)}
                progresses={flashcardProgresses}
                tables={tables}
            />
        </div>
    );
};

export default FlashcardsScreen;