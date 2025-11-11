import * as React from 'react';
import { Table, VocabRow, Column } from '../../../types';
import Icon from '../../../components/ui/Icon';
import { useTableView } from '../contexts/TableViewContext';
import Popover from '../../../components/ui/Popover';

interface TableViewProps {
    table: Table;
    rows: VocabRow[];
    allFilteredRows: VocabRow[];
    groupedRows: Map<string, VocabRow[]> | null;
    sortableStats: { key: string, label: string }[];
    onEditRow: (row: VocabRow) => void;
    onConfigureAI: (column: Column) => void;
    fillableCells: Set<string>;
    onManageColumns: () => void;
}

const TableView: React.FC<TableViewProps> = ({ table, rows, allFilteredRows, groupedRows, sortableStats, onEditRow, onConfigureAI, fillableCells, onManageColumns }) => {
    const { state, dispatch } = useTableView();
    const { selectedRows, visibleColumns, visibleStats, grouping, sorts, columnWidths, rowHeight, isTextWrapEnabled } = state;
    const resizingColumnRef = React.useRef<{ id: string, startX: number, startWidth: number } | null>(null);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const payload = e.target.checked ? new Set(allFilteredRows.map(r => r.id)) : new Set<string>();
        dispatch({ type: 'SET_SELECTED_ROWS', payload });
    };
    
    const handleSelectRow = (rowId: string) => {
        dispatch({ type: 'TOGGLE_ROW_SELECTION', payload: rowId });
    };

    const handleSort = (key: string) => {
        const currentSort = sorts.find(s => s.key === key);
        let newSorts = [];

        if (currentSort) {
            if (currentSort.direction === 'asc') {
                newSorts = [{ ...currentSort, direction: 'desc' }];
            }
        } else {
            newSorts = [{ id: crypto.randomUUID(), key, direction: 'asc' }];
        }
        dispatch({ type: 'SET_SORTS', payload: newSorts });
    };

    // --- Unified Resizing Handlers for Mouse & Touch ---
    const handleResizeMove = React.useCallback((e: MouseEvent | TouchEvent) => {
        if (!resizingColumnRef.current) return;

        const currentX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const { id, startX, startWidth } = resizingColumnRef.current;
        const deltaX = currentX - startX;
        const newWidth = startWidth + deltaX;
        
        const minWidth = 80; // Minimum column width
        const finalWidth = Math.max(newWidth, minWidth);

        dispatch({ type: 'SET_COLUMN_WIDTH', payload: { columnId: id, width: finalWidth } });
    }, [dispatch]);

    const handleResizeEnd = React.useCallback(() => {
        resizingColumnRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
        window.removeEventListener('touchmove', handleResizeMove);
        window.removeEventListener('touchend', handleResizeEnd);
    }, [handleResizeMove]);

    const handleResizeStart = (columnId: string, e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        e.preventDefault();
        const th = e.currentTarget.parentElement;
        const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;

        if (th) {
            resizingColumnRef.current = {
                id: columnId,
                startX,
                startWidth: th.offsetWidth,
            };

            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            window.addEventListener('mousemove', handleResizeMove);
            window.addEventListener('mouseup', handleResizeEnd);
            window.addEventListener('touchmove', handleResizeMove);
            window.addEventListener('touchend', handleResizeEnd);
        }
    };

    React.useEffect(() => {
        // Cleanup function to remove listeners if the component unmounts during a resize
        return () => {
            handleResizeEnd();
        };
    }, [handleResizeEnd]);


    const getStatDisplayValue = (row: VocabRow, statKey: string): string | number => {
        const stats = row.stats;
        switch (statKey) {
            case 'stat:successRate':
                const encounters = stats.correct + stats.incorrect;
                return encounters > 0 ? `${Math.round((stats.correct / encounters) * 100)}%` : '—';
            case 'stat:encounters':
                return stats.correct + stats.incorrect;
            case 'stat:lastStudied':
                return stats.lastStudied ? new Date(stats.lastStudied).toLocaleDateString() : 'Never';
            default:
                return '...';
        }
    };

    const visibleCols = table.columns.filter(c => visibleColumns.has(c.id));
    const visibleStatDefs = sortableStats.filter(s => visibleStats.has(s.key));

    const rowHeightClasses = {
        short: 'py-3',
        medium: 'py-6',
        tall: 'py-12',
    }[rowHeight];

    const textHeightClasses = {
        short: 'text-sm',
        medium: 'text-base',
        tall: 'text-lg',
    }[rowHeight];

    const renderRow = (row: VocabRow) => (
        <tr key={row.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <td className={`px-4 align-top ${rowHeightClasses} text-slate-500 dark:text-slate-400`}>
                <input type="checkbox" checked={selectedRows.has(row.id)} onChange={() => handleSelectRow(row.id)} className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 mt-1"/>
            </td>
            {visibleCols.map(col => {
                const cellValue = row.cols[col.id] || '';
                const emptyCellClasses = !cellValue ? 'bg-error-100 dark:bg-red-900/50' : '';
                return (
                    <td key={col.id} className={`px-4 align-top ${rowHeightClasses} text-slate-500 dark:text-slate-400 ${emptyCellClasses}`}>
                        <div className={`${textHeightClasses} ${isTextWrapEnabled ? 'whitespace-normal break-words' : 'truncate'}`}>
                            {cellValue}
                        </div>
                    </td>
                );
            })}
            {visibleStatDefs.map(stat => (
                 <td key={stat.key} className={`px-4 align-top ${rowHeightClasses} ${textHeightClasses} text-slate-500 dark:text-slate-400`}>
                    {getStatDisplayValue(row, stat.key)}
                </td>
            ))}
             <td className={`px-4 align-top ${rowHeightClasses} text-right`}>
                <button onClick={() => onEditRow(row)} className="p-1 rounded-md text-slate-400 hover:text-primary-500 hover:bg-slate-200 dark:hover:bg-slate-700">
                    <Icon name="pencil" className="w-4 h-4"/>
                </button>
            </td>
            <td></td>
        </tr>
    );

    if (allFilteredRows.length === 0 && table.rows.length > 0) {
        return (
            <div className="text-center p-12 text-text-subtle bg-surface dark:bg-secondary-800/50 rounded-lg shadow-lg">
                <Icon name="filter" className="w-12 h-12 mx-auto mb-2 text-secondary-300 dark:text-secondary-600"/>
                <p>No rows match your current filters.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto bg-surface dark:bg-secondary-800/50 rounded-lg shadow-lg">
            <table className="w-full table-fixed">
                <colgroup>
                    <col style={{ width: '50px' }} />
                    {visibleCols.map(col => (
                        <col key={col.id} style={{ width: columnWidths[col.id] ? `${columnWidths[col.id]}px` : '200px' }} />
                    ))}
                    {visibleStatDefs.map(stat => (
                        <col key={stat.key} style={{ width: '140px' }} />
                    ))}
                    <col style={{ width: '60px' }} />
                    <col style={{ width: '60px' }} />
                </colgroup>
                <thead className="sticky top-0 z-10">
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-secondary-800">
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            <input type="checkbox" onChange={handleSelectAll} checked={allFilteredRows.length > 0 && selectedRows.size === allFilteredRows.length} className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"/>
                        </th>
                        {visibleCols.map(col => {
                            const promptForCol = (table.aiPrompts || []).find(p => p.targetColumnId === col.id);
                            const currentSort = sorts.find(s => s.key === col.id);
                            return (
                                <th key={col.id} className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider group relative">
                                    <div className="flex items-center justify-between gap-1.5">
                                        <div onClick={() => handleSort(col.id)} className="flex items-center gap-1 cursor-pointer flex-grow truncate">
                                            <span>{col.name}</span>
                                            {currentSort ? (
                                                <Icon name={currentSort.direction === 'asc' ? 'arrow-up' : 'arrow-down'} className="w-4 h-4" />
                                            ) : (
                                                <Icon name="arrows-up-down" className="w-4 h-4 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            )}
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onConfigureAI(col); }} 
                                            title={promptForCol ? `Edit '${promptForCol.name}' prompt` : 'Configure AI Prompt'}
                                            className={`transition-colors p-1 rounded-full ${promptForCol ? 'text-amber-400 hover:text-amber-300' : 'text-slate-400 hover:text-emerald-500'}`}
                                        >
                                            <Icon name={promptForCol ? 'star' : 'star-outline'} className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div
                                        onMouseDown={(e) => handleResizeStart(col.id, e)}
                                        onTouchStart={(e) => handleResizeStart(col.id, e)}
                                        className="absolute top-0 right-0 h-full w-4 cursor-col-resize z-10 touch-none group-hover:bg-primary-500/30 transition-colors"
                                    />
                                </th>
                            );
                        })}
                        {visibleStatDefs.map(stat => {
                            const currentSort = sorts.find(s => s.key === stat.key);
                            return (
                                <th key={stat.key} className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider group cursor-pointer" onClick={() => handleSort(stat.key)}>
                                    <div className="flex items-center gap-1">
                                        <span>{stat.label}</span>
                                        {currentSort ? (
                                            <Icon name={currentSort.direction === 'asc' ? 'arrow-up' : 'arrow-down'} className="w-4 h-4" />
                                        ) : (
                                            <Icon name="arrows-up-down" className="w-4 h-4 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        )}
                                    </div>
                                </th>
                            );
                        })}
                        <th className="px-4 py-2"></th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            <button onClick={onManageColumns} title="Add or manage columns" className="p-1 rounded-full text-slate-400 hover:text-primary-500 hover:bg-slate-200 dark:hover:bg-slate-700">
                                <Icon name="plus" className="w-5 h-5"/>
                            </button>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {groupedRows ? (
                        Array.from(groupedRows.entries()).map(([groupName, groupRows]) => (
                            <React.Fragment key={groupName}>
                                <tr><td colSpan={visibleCols.length + visibleStatDefs.length + 3} className="px-4 py-1 bg-slate-100 dark:bg-secondary-900/50 text-xs font-bold text-slate-600 dark:text-slate-300">{groupName} ({groupRows.length})</td></tr>
                                {groupRows.map(renderRow)}
                            </React.Fragment>
                        ))
                    ) : (
                        rows.map(renderRow)
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default TableView;