import React, { useState, useMemo, useRef, useLayoutEffect } from 'react';
import { FlashcardProgress, Table } from '../../../types';
import Modal from '../../../components/ui/Modal';
import Icon from '../../../components/ui/Icon';
import TableIcon from '../../../components/ui/TableIcon';
import { useSessionStore } from '../../../stores/useSessionStore';
import Popover from '../../../components/ui/Popover';
import { Button } from '../../../components/ui/Button';

// Node components
const ProgressNode = React.forwardRef<HTMLDivElement, { progress: FlashcardProgress; onClick: () => void }>(({ progress, onClick }, ref) => (
    <div ref={ref} id={`progress-${progress.id}`} onClick={onClick} className="p-3 bg-primary-100 dark:bg-primary-900/50 rounded-lg shadow-md w-fit max-w-xs cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all text-left">
        <div className="flex items-start gap-3">
            <Icon name="flashcards" className="w-6 h-6 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
            <div>
                <h3 className="font-bold text-sm text-primary-800 dark:text-primary-200">{progress.name}</h3>
                <p className="text-xs text-primary-700 dark:text-primary-300">{progress.queue.length} cards</p>
            </div>
        </div>
    </div>
));

const TableNode = React.forwardRef<HTMLDivElement, { table: Table }>(({ table }, ref) => (
    <div ref={ref} id={`table-${table.id}`} className="p-3 bg-secondary-100 dark:bg-secondary-800 rounded-lg shadow-md w-full text-left">
        <div className="flex items-start gap-3">
            <TableIcon className="w-6 h-6 text-secondary-500 dark:text-secondary-400 flex-shrink-0 mt-0.5" />
            <div>
                <h4 className="font-semibold text-sm text-text-main dark:text-secondary-200">{table.name}</h4>
                <p className="text-xs text-text-subtle">{table.rowCount ?? table.rows.length} words</p>
            </div>
        </div>
    </div>
));

interface Line {
    key: string;
    path: string;
}

const ProgressRelationshipGraphModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    progresses: FlashcardProgress[];
    tables: Table[];
}> = ({ isOpen, onClose, progresses, tables }) => {
    const { handleStartFlashcardSession } = useSessionStore();
    const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
    const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(new Set(tables.map(t => t.id)));
    const [lines, setLines] = useState<Line[]>([]);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const progressNodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const tableNodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const filteredTables = useMemo(() => {
        return tables.filter(t => selectedTableIds.has(t.id));
    }, [tables, selectedTableIds]);

    useLayoutEffect(() => {
        if (!isOpen || !containerRef.current) {
            setLines([]);
            return;
        }

        const containerRect = containerRef.current.getBoundingClientRect();
        const newLines: Line[] = [];

        progresses.forEach(progress => {
            const progressNode = progressNodeRefs.current[progress.id];
            if (!progressNode) return;

            const progressRect = progressNode.getBoundingClientRect();

            progress.tableIds.forEach(tableId => {
                if (!selectedTableIds.has(tableId)) return;
                const tableNode = tableNodeRefs.current[tableId];
                if (!tableNode) return;

                const tableRect = tableNode.getBoundingClientRect();

                const x1 = progressRect.right - containerRect.left;
                const y1 = progressRect.top + progressRect.height / 2 - containerRect.top;
                const x2 = tableRect.left - containerRect.left;
                const y2 = tableRect.top + tableRect.height / 2 - containerRect.top;

                const controlPointX1 = x1 + (x2 - x1) * 0.5;
                
                const path = `M ${x1} ${y1} C ${controlPointX1} ${y1}, ${controlPointX1} ${y2}, ${x2} ${y2}`;
                
                newLines.push({ key: `${progress.id}-${tableId}`, path });
            });
        });
        setLines(newLines);
    }, [isOpen, progresses, filteredTables, selectedTableIds]);

    const handleSessionStart = (progressId: string) => {
        handleStartFlashcardSession(progressId);
        onClose();
    };

    const handleToggleTableFilter = (tableId: string) => {
        setSelectedTableIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tableId)) {
                newSet.delete(tableId);
            } else {
                newSet.add(tableId);
            }
            return newSet;
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Progress Relationships" containerClassName="w-[95vw] max-w-[1600px] h-[90vh]">
            <div className="flex flex-col h-full">
                <div className="p-4 border-b border-secondary-200 dark:border-secondary-700 flex-shrink-0">
                    <Popover
                        isOpen={isFilterPopoverOpen}
                        setIsOpen={setIsFilterPopoverOpen}
                        trigger={
                            <Button variant="secondary" size="sm">
                                <Icon name="filter" className="w-4 h-4 mr-2" />
                                Filter Tables ({selectedTableIds.size} / {tables.length})
                            </Button>
                        }
                    >
                        <h4 className="font-semibold text-sm mb-2">Visible Tables</h4>
                        <div className="max-h-60 overflow-y-auto space-y-1">
                            {tables.map(table => (
                                <label key={table.id} className="flex items-center gap-2 p-1 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedTableIds.has(table.id)}
                                        onChange={() => handleToggleTableFilter(table.id)}
                                        className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                                    />
                                    <span className="text-sm">{table.name}</span>
                                </label>
                            ))}
                        </div>
                    </Popover>
                </div>
                <div ref={containerRef} className="flex-1 overflow-auto p-4 md:p-8 relative">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 lg:gap-x-32 gap-y-4">
                        {/* Left Column: Progresses */}
                        <div className="space-y-4 flex flex-col items-end">
                             <h2 className="text-lg font-bold text-center text-text-main dark:text-secondary-100 w-full">Flashcard Sets</h2>
                            {progresses.map(p => (
                                <ProgressNode
                                    key={p.id}
                                    ref={el => progressNodeRefs.current[p.id] = el}
                                    progress={p}
                                    onClick={() => handleSessionStart(p.id)}
                                />
                            ))}
                        </div>
                        {/* Right Column: Tables */}
                        <div className="space-y-4">
                             <h2 className="text-lg font-bold text-center text-text-main dark:text-secondary-100">Source Tables</h2>
                            {filteredTables.map(t => (
                                <TableNode
                                    key={t.id}
                                    ref={el => tableNodeRefs.current[t.id] = el}
                                    table={t}
                                />
                            ))}
                             {filteredTables.length === 0 && (
                                <div className="text-center text-text-subtle text-sm p-8">No tables selected.</div>
                             )}
                        </div>
                    </div>

                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" aria-hidden="true">
                        <defs>
                            <marker id="arrowhead-graph" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" className="fill-current text-secondary-300 dark:text-secondary-600" />
                            </marker>
                        </defs>
                        {lines.map(line => (
                            <path
                                key={line.key}
                                d={line.path}
                                className="stroke-current text-secondary-300 dark:text-secondary-600 transition-all duration-300"
                                strokeWidth="2"
                                fill="none"
                                markerEnd="url(#arrowhead-graph)"
                            />
                        ))}
                    </svg>
                </div>
            </div>
        </Modal>
    );
};

export default ProgressRelationshipGraphModal;
