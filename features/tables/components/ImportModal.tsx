import React, { useState } from 'react';
import Modal from '../../../components/ui/Modal';
import { useTableStore } from '../../../stores/useTableStore';
import { useUIStore } from '../../../stores/useUIStore';
import { Table, VocabRow, FlashcardStatus } from '../../../types';

type ParsedCsv = { headers: string[], rows: (string[])[] };

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose }) => {
    const { tables, importTables } = useTableStore();
    const { showToast } = useUIStore();
    const [step, setStep] = useState(1);
    const [file, setFile] = useState<File | null>(null);
    const [parsedCsv, setParsedCsv] = useState<ParsedCsv | null>(null);
    const [destination, setDestination] = useState<'new' | 'append'>('new');
    const [newTableName, setNewTableName] = useState('');
    const [appendTableId, setAppendTableId] = useState('');
    const [columnMap, setColumnMap] = useState<{[key: number]: string}>({});

    const reset = () => { setStep(1); setFile(null); setParsedCsv(null); setDestination('new'); setNewTableName(''); setAppendTableId(''); setColumnMap({}); };

    const handleFile = async (selectedFile: File) => {
        setFile(selectedFile);
        if (selectedFile.type === 'application/json') {
            const text = await selectedFile.text();
            try {
                const importedTables = JSON.parse(text);
                if (Array.isArray(importedTables) && importedTables.every(t => t.id && t.name)) {
                    importTables(importedTables);
                    showToast(`Successfully imported ${importedTables.length} table(s).`, 'success');
                    reset();
                    onClose();
                } else { throw new Error("Invalid JSON file.")}
            } catch (e) { showToast("Error parsing JSON file.", 'error'); }
        } else {
             const reader = new FileReader();
             reader.onload = e => {
                 const text = e.target?.result as string;
                 const lines = text.split(/\r\n|\n/).filter(line => line);
                 const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                 const rows = lines.slice(1).map(line => line.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
                 setParsedCsv({ headers, rows });
                 setNewTableName(selectedFile.name.replace(/\.[^/.]+$/, ""));
                 setStep(2);
             };
             reader.readAsText(selectedFile);
        }
    };

    const handleFinishImport = () => {
        if (!parsedCsv) return;
        let finalRows: VocabRow[] = [];
        const destColumns = destination === 'new' ? parsedCsv.headers.map((h, i) => ({ id: `col-import-${i}`, name: h })) : tables.find(t => t.id === appendTableId)?.columns || [];
        const effectiveMap: {[key: number]: string} = {};
        if (destination === 'new') { destColumns.forEach((c, i) => effectiveMap[i] = c.id); } else { Object.assign(effectiveMap, columnMap); }

        finalRows = parsedCsv.rows.map(row => {
            const cols: Record<string, string> = {};
            row.forEach((cellValue, index) => { const destColId = effectiveMap[index]; if (destColId && destColId !== 'ignore') { cols[destColId] = cellValue; } });
            return { id: `row-import-${Date.now()}-${Math.random()}`, cols, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null }, };
        });

        if (destination === 'new') {
            const finalTable: Table = { id: `table-import-${Date.now()}`, name: newTableName, columns: destColumns, rows: finalRows, relations: [] };
            importTables([finalTable]);
        } else {
            const tableToAppend = { rows: finalRows } as Partial<Table>;
            importTables([tableToAppend as Table], appendTableId);
        }

        showToast(`Successfully imported ${finalRows.length} rows.`, 'success');
        reset();
        onClose();
    };
    
    const renderStep = () => {
        switch (step) {
            case 1: return ( <div className="p-6"> <p className="text-center text-slate-500 dark:text-slate-400 mb-4 text-sm">Import from .json (backup) or .csv files.</p> <input type="file" onChange={e => e.target.files && handleFile(e.target.files[0])} accept=".json,.csv" className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" /> </div> );
            case 2: return ( <div className="p-6"> <h3 className="font-semibold mb-2 text-slate-700 dark:text-slate-200">Destination</h3> <div className="space-y-2"> <label className="flex items-center gap-3 p-2 rounded-md has-[:checked]:bg-slate-100 dark:has-[:checked]:bg-slate-700"> <input type="radio" name="dest" value="new" checked={destination === 'new'} onChange={() => setDestination('new')} /> <span className="text-sm">Create new table</span> </label> {destination === 'new' && <input type="text" value={newTableName} onChange={e => setNewTableName(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-800 dark:text-white ml-6 text-sm" />} <label className="flex items-center gap-3 p-2 rounded-md has-[:checked]:bg-slate-100 dark:has-[:checked]:bg-slate-700"> <input type="radio" name="dest" value="append" checked={destination === 'append'} onChange={() => setDestination('append')} /> <span className="text-sm">Append to existing table</span> </label> {destination === 'append' && <select value={appendTableId} onChange={e => setAppendTableId(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-800 dark:text-white ml-6 text-sm"><option value="">Select table...</option>{tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>} {destination === 'append' && appendTableId && parsedCsv && ( <div className="ml-6 mt-4"> <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Map CSV Columns</h4> <div className="space-y-2 max-h-32 overflow-y-auto"> {parsedCsv.headers.map((header, index) => { const targetTable = tables.find(t => t.id === appendTableId); return ( <div key={index} className="grid grid-cols-2 gap-2 items-center text-sm"> <span className="truncate font-semibold text-slate-600 dark:text-slate-400" title={header}>{header}</span> <select onChange={e => setColumnMap(m => ({...m, [index]: e.target.value}))} defaultValue="ignore" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs"> <option value="ignore">Ignore</option> {(targetTable?.columns || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)} </select> </div> ) })} </div> </div> )} </div> <div className="mt-6 flex justify-end gap-2"> <button onClick={() => { reset(); onClose(); }} className="bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-semibold px-4 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600">Cancel</button> <button onClick={handleFinishImport} disabled={!((destination === 'new' && newTableName) || (destination === 'append' && appendTableId))} className="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50">Finish Import</button> </div> </div> );
        }
    };
     return ( <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }} title={`Import - Step ${step}`}> {renderStep()} </Modal> );
};

export default ImportModal;