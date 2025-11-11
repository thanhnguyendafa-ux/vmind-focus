import * as React from 'react';
import { Table, VocabRow } from '../../../types';
import Icon from '../../../components/ui/Icon';

interface GalleryViewProps {
    table: Table;
    rows: VocabRow[];
    groupedRows: Map<string, VocabRow[]> | null;
    onEditRow: (row: VocabRow) => void;
    visibleColumns: Set<string>;
}

const GalleryCard: React.FC<{ row: VocabRow; table: Table; onEdit: () => void; visibleColumns: Set<string>; }> = ({ row, table, onEdit, visibleColumns }) => {
    const imageColumnId = table.imageConfig?.imageColumnId;
    const imageUrl = imageColumnId ? row.cols[imageColumnId] : null;

    return (
        <div onClick={onEdit} className="bg-surface dark:bg-secondary-800 rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all group relative cursor-pointer">
            {imageUrl && visibleColumns.has(imageColumnId!) && (
                <div className="h-32 bg-secondary-100 dark:bg-secondary-700 rounded-t-lg">
                    <img src={imageUrl} alt="" className="w-full h-full object-contain"/>
                </div>
            )}
            <div className="p-3">
                <ul className="space-y-1.5">
                    {table.columns
                        .filter(col => visibleColumns.has(col.id))
                        .map(col => {
                        if (col.id === imageColumnId) return null;
                        return (
                            <li key={col.id}>
                                <p className="text-xs font-semibold text-text-subtle">{col.name}</p>
                                <p className="text-sm text-text-main dark:text-secondary-300 truncate">{row.cols[col.id] || '—'}</p>
                            </li>
                        );
                    })}
                </ul>
            </div>
            <div className="absolute top-2 right-2 p-1.5 rounded-full bg-white/50 dark:bg-secondary-900/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                <Icon name="pencil" className="w-4 h-4"/>
            </div>
        </div>
    );
};

const GalleryView: React.FC<GalleryViewProps> = ({ table, rows, groupedRows, onEditRow, visibleColumns }) => {
    
    if (rows.length === 0) {
        return (
            <div className="text-center p-12 text-text-subtle bg-surface dark:bg-secondary-800/50 shadow-lg rounded-lg">
                <Icon name="filter" className="w-12 h-12 mx-auto mb-2 text-secondary-300 dark:text-secondary-600"/>
                <p>No cards match your current filters.</p>
            </div>
        );
    }
    
    const renderContent = () => {
        if (groupedRows) {
            return Array.from(groupedRows.entries()).map(([groupName, groupRows]) => (
                <div key={groupName}>
                    <h3 className="text-lg font-bold text-text-main dark:text-secondary-200 mt-6 mb-3">{groupName} ({groupRows.length})</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {groupRows.map(row => <GalleryCard key={row.id} row={row} table={table} onEdit={() => onEditRow(row)} visibleColumns={visibleColumns} />)}
                    </div>
                </div>
            ));
        }
        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {rows.map(row => <GalleryCard key={row.id} row={row} table={table} onEdit={() => onEditRow(row)} visibleColumns={visibleColumns} />)}
            </div>
        );
    };

    return <div>{renderContent()}</div>;
};

export default GalleryView;