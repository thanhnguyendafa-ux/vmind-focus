import React, { useState } from 'react';
import Modal from '../../../components/ui/Modal';
import { useTableStore } from '../../../stores/useTableStore';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
    const { tables } = useTableStore();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const handleToggle = (id: string) => { 
        const newSet = new Set(selectedIds); 
        if (newSet.has(id)) newSet.delete(id); 
        else newSet.add(id); 
        setSelectedIds(newSet); 
    };
    
    const handleExport = (format: 'json' | 'csv') => {
        if (format === 'json') {
            const tablesToExport = tables.filter(t => selectedIds.has(t.id));
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tablesToExport, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "vmind_export.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        } else if (format === 'csv') {
            const tableId = Array.from(selectedIds)[0];
            const table = tables.find(t => t.id === tableId);
            if (!table) return;

            const headers = table.columns.map(c => c.name).join(',');
            const rows = table.rows.map(row => table.columns.map(c => `"${(row.cols[c.id] || '').replace(/"/g, '""')}"`).join(','));
            const csvContent = [headers, ...rows].join('\n');
            const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", `${table.name}.csv`);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Export Tables">
            <div className="p-6">
                <p className="text-slate-600 dark:text-slate-300 mb-4 text-sm">Select tables to export.</p>
                <div className="max-h-60 overflow-y-auto space-y-2 mb-4 border dark:border-slate-600 rounded-md p-2">
                    {tables.map(table => (
                        <label key={table.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                            <input type="checkbox" checked={selectedIds.has(table.id)} onChange={() => handleToggle(table.id)} className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500" />
                            <span className="text-sm">{table.name}</span>
                        </label>
                    ))}
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handleExport('json')} disabled={selectedIds.size === 0} className="flex-1 bg-slate-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-slate-700 transition-colors disabled:opacity-50 text-sm">Export as JSON</button>
                    <button onClick={() => handleExport('csv')} disabled={selectedIds.size !== 1} className="flex-1 bg-slate-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-slate-700 transition-colors disabled:opacity-50 text-sm">Export as CSV (1 table)</button>
                </div>
            </div>
        </Modal>
    );
};

export default ExportModal;