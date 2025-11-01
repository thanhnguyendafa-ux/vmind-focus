
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { VocabTable, VocabRow, VocabRowStats, Relation, Folder, AppSettings } from '../types';
import Modal from '../components/Modal';
// FIX: Add missing import for FolderOpenIcon to resolve 'Cannot find name' error.
import { UploadIcon, DownloadIcon, CheckCircleIcon, UncheckedCircleIcon, PlusIcon, TrashIcon, FolderIcon, FolderOpenIcon, TableIcon, ChevronLeftIcon, DotsVerticalIcon, MoveIcon } from '../components/Icons';
// FIX: Changed import to named import as TableDetailView is not a default export.
import { TableDetailView } from './TableDetailView';
import { User } from '@supabase/supabase-js';
import Dropdown from '../components/Dropdown';

interface TablesScreenProps {
  tables: VocabTable[];
  setTables: React.Dispatch<React.SetStateAction<VocabTable[]>>;
  relations: Relation[];
  setRelations: React.Dispatch<React.SetStateAction<Relation[]>>;
  user: User | null;
  folders: Folder[];
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  onMoveTableToFolder: (tableId: string, folderId: string | null) => void;
  appSettings: AppSettings;
  onSubScreenChange: (subScreen: string | null) => void;
  showToast: (message: string) => void;
}

const TableCard: React.FC<{
  table: VocabTable;
  onClick: () => void;
  onDelete: () => void;
  onMove: () => void;
}> = ({ table, onClick, onDelete, onMove }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div 
      onClick={onClick}
      className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 transition-all duration-200 hover:shadow-md hover:border-cyan-400 cursor-pointer relative group"
    >
      <div className="flex items-center gap-3 pr-8">
        <TableIcon className="w-8 h-8 text-cyan-500 flex-shrink-0" />
        <div>
            <h3 className="text-lg font-bold text-cyan-600 truncate">{table.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{table.wordCount} word(s)</p>
        </div>
      </div>
      <div className="absolute top-2 right-2" onClick={e => e.stopPropagation()}>
          <Dropdown
            isOpen={isMenuOpen}
            onToggle={() => setIsMenuOpen(p => !p)}
            trigger={
              <button
                className="p-2 rounded-full bg-slate-100/50 text-slate-400 hover:bg-slate-200 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Options for table ${table.name}`}
              >
                <DotsVerticalIcon className="w-5 h-5" />
              </button>
            }
            className="w-48"
          >
            <div className="space-y-1">
                <button onClick={() => { onMove(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md"><MoveIcon className="w-4 h-4" /> Move to Folder...</button>
                <button onClick={() => { onDelete(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"><TrashIcon className="w-4 h-4" /> Delete</button>
            </div>
          </Dropdown>
      </div>
    </div>
  );
};

const FolderCard: React.FC<{
  folder: Folder;
  tableCount: number;
  onClick: () => void;
  onDelete: () => void;
}> = ({ folder, tableCount, onClick, onDelete }) => {
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 transition-all duration-200 hover:shadow-md hover:border-amber-400 cursor-pointer relative group"
    >
      <div className="flex items-center gap-3 pr-8">
        <FolderIcon className="w-8 h-8 text-amber-500 flex-shrink-0" />
        <div>
            <h3 className="text-lg font-bold text-cyan-600 truncate">{folder.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{tableCount} table(s)</p>
        </div>
      </div>
      <button
        onClick={handleDeleteClick}
        className="absolute top-2 right-2 p-2 rounded-full bg-slate-100/50 text-slate-400 hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label={`Delete folder ${folder.name}`}
      >
        <TrashIcon className="w-5 h-5" />
      </button>
    </div>
  );
};


const ToolbarButton: React.FC<{ children: React.ReactNode; onClick?: () => void; }> = ({ children, onClick }) => (
    <button onClick={onClick} className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 text-sm font-semibold py-2 px-3 rounded-md transition-colors flex items-center gap-2">
        {children}
    </button>
);

interface ColumnMapping {
  from: string;
  to: string;
  enabled: boolean;
}

const ImportExportModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  tables: VocabTable[];
  onAddTables: (newTables: VocabTable[]) => void;
  setTables: React.Dispatch<React.SetStateAction<VocabTable[]>>;
}> = ({ isOpen, onClose, tables, onAddTables, setTables }) => {
    const [activeTab, setActiveTab] = useState<'import' | 'export'>('export');
    
    // Export state
    const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
    const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');

    // Import state
    const [importStep, setImportStep] = useState<'file' | 'destination' | 'mapping'>('file');
    const [destination, setDestination] = useState<{ type: 'new' | 'existing'; tableId: string | null }>({ type: 'new', tableId: null });
    const [newTableName, setNewTableName] = useState('');
    const [importedFile, setImportedFile] = useState<File | null>(null);
    const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [parsedCsvData, setParsedCsvData] = useState<{
        fileName: string;
        headers: string[];
        rows: { [key: string]: string }[];
    } | null>(null);
    const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);

    useEffect(() => {
        if (!isOpen) {
            // Full reset when modal is closed
            setActiveTab('export');
            setSelectedTableIds([]);
            setExportFormat('json');
            setImportedFile(null);
            setFeedback(null);
            setParsedCsvData(null);
            setColumnMappings([]);
            setImportStep('file');
            setDestination({ type: 'new', tableId: null });
            setNewTableName('');
        }
    }, [isOpen]);

    const handleToggleTable = (id: string) => {
        setSelectedTableIds(prev => prev.includes(id) ? prev.filter(tableId => tableId !== id) : [...prev, id]);
    };

    const handleExport = () => {
        const tablesToExport = tables.filter(t => selectedTableIds.includes(t.id));
        if (tablesToExport.length === 0) return;
        
        let dataStr = '';
        let fileExt = exportFormat;

        if (exportFormat === 'json') {
            dataStr = JSON.stringify(tablesToExport, null, 2);
        } else { // CSV
            const table = tablesToExport[0];
            const headers = table.columns;
            const csvRows = table.rows.map(row => 
                headers.map(header => {
                    const cell = row.cols[header] || '';
                    return `"${cell.replace(/"/g, '""')}"`;
                }).join(',')
            );
            dataStr = [headers.join(','), ...csvRows].join('\n');
        }

        const blob = new Blob([dataStr], { type: `text/${fileExt};charset=utf-8;` });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `vmind_export_${new Date().toISOString().split('T')[0]}.${fileExt}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        onClose();
    };
    
    const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const handleFileSelect = (file: File) => {
        setFeedback(null);
        setParsedCsvData(null);
        setColumnMappings([]);
        setImportedFile(file);
    };
    
    const parseTsv = (tsvText: string): { headers: string[], rows: { [key: string]: string }[] } => {
        const lines = tsvText.trim().replace(/\r\n/g, '\n').split('\n');
        if (lines.length < 2) throw new Error("File must have a header and at least one data row.");
        
        const headers = lines[0].split('\t').map(h => h.trim());
        const rows: { [key: string]: string }[] = [];
        
        for(let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = lines[i].split('\t');
            const data: { [key: string]: string } = {};
            headers.forEach((h, index) => data[h] = (values[index] || '').trim());
            rows.push(data);
        }
        return { headers, rows };
    };

    useEffect(() => {
        if (!importedFile) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                if (importedFile.name.endsWith('.json')) {
                    const parsed = JSON.parse(text);
                    if (Array.isArray(parsed) && parsed.every(t => t.id && t.name && t.columns && t.rows)) {
                        onAddTables(parsed);
                        setFeedback({type: 'success', message: `Successfully imported ${parsed.length} table(s).`});
                    } else {
                        throw new Error('Invalid JSON structure for Vmind tables.');
                    }
                    setImportedFile(null);
                } else if (importedFile.name.endsWith('.csv')) {
                    const parseCsv = (csvText: string): { headers: string[], rows: { [key: string]: string }[] } => {
                        const lines = csvText.trim().split(/\r?\n/);
                        if (lines.length < 2) throw new Error("CSV must have a header and at least one data row.");
                        
                        const parseLine = (line: string): string[] => {
                            const values: string[] = [];
                            let currentVal = '';
                            let inQuotes = false;
                            for (let i = 0; i < line.length; i++) {
                                const char = line[i];
                                if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
                                    inQuotes = !inQuotes;
                                } else if (char === ',' && !inQuotes) {
                                    values.push(currentVal.trim().replace(/^"|"$/g, ''));
                                    currentVal = '';
                                } else {
                                    currentVal += char;
                                }
                            }
                            values.push(currentVal.trim().replace(/^"|"$/g, ''));
                            return values;
                        };
                        
                        const headers = parseLine(lines[0]);
                        const rows: { [key: string]: string }[] = [];
                        
                        for(let i = 1; i < lines.length; i++) {
                            if (!lines[i].trim()) continue;
                            const values = parseLine(lines[i]);
                            if (values.length !== headers.length) {
                                console.warn(`Skipping malformed CSV row ${i+1}: expected ${headers.length} columns, found ${values.length}`);
                                continue;
                            }
                            const data: { [key: string]: string } = {};
                            headers.forEach((h, index) => data[h] = values[index] || '');
                            rows.push(data);
                        }
                        return { headers, rows };
                    };
                    
                    const { headers, rows } = parseCsv(text);
                    const fileName = importedFile.name.replace(/\.csv$/, '');
                    setParsedCsvData({ fileName, headers, rows });
                    setNewTableName(fileName);
                    setImportStep('destination');
                } else if (importedFile.name.endsWith('.tsv') || importedFile.name.endsWith('.txt')) {
                    const { headers, rows } = parseTsv(text);
                    const fileName = importedFile.name.replace(/\.(tsv|txt)$/, '');
                    setParsedCsvData({ fileName, headers, rows });
                    setNewTableName(fileName);
                    setImportStep('destination');
                } else {
                    throw new Error('Unsupported file type. Please use .json, .csv, .tsv, or .txt');
                }
            } catch (e: any) {
                setFeedback({type: 'error', message: `Import failed: ${e.message}`});
                setImportedFile(null);
            }
        };
        reader.readAsText(importedFile);
    }, [importedFile, onAddTables]);

    const handleProceedToMapping = () => {
        if (destination.type === 'existing' && !destination.tableId) {
            setFeedback({ type: 'error', message: 'Please select a destination table.' });
            return;
        }
        if (destination.type === 'new' && !newTableName.trim()) {
            setFeedback({ type: 'error', message: 'Please provide a name for the new table.' });
            return;
        }

        setFeedback(null);
        let mappings: ColumnMapping[] = [];
        if (destination.type === 'new') {
            mappings = parsedCsvData!.headers.map(h => ({ from: h, to: h, enabled: true }));
        } else {
            const targetTable = tables.find(t => t.id === destination.tableId);
            if (targetTable) {
                mappings = parsedCsvData!.headers.map(header => {
                    const matchedColumn = targetTable.columns.find(c => c.toLowerCase() === header.toLowerCase());
                    return { from: header, to: matchedColumn || '', enabled: true };
                });
            }
        }
        setColumnMappings(mappings);
        setImportStep('mapping');
    };

    const handleMappingChange = (index: number, newToValue: string) => {
        setColumnMappings(prev => {
            const newMappings = [...prev];
            newMappings[index].to = newToValue;
            return newMappings;
        });
    };

    const handleMappingToggle = (index: number) => {
        setColumnMappings(prev => {
            const newMappings = [...prev];
            newMappings[index].enabled = !newMappings[index].enabled;
            return newMappings;
        });
    };

    const handleConfirmImport = () => {
        if (!parsedCsvData) return;
        setFeedback(null);
        
        const defaultStats: VocabRowStats = { Passed1: 0, Passed2: 0, Failed: 0, TotalAttempt: 0, SuccessRate: 0, FailureRate: 0, RankPoint: 0, Level: 1, InQueue: 0, QuitQueue: false, LastPracticeDate: null, flashcardStatus: null, flashcardEncounters: 0, flashcardRatings: { again: 0, hard: 0, good: 0, easy: 0, perfect: 0 }, isFlashcardReviewed: false, theaterEncounters: 0, scrambleEncounters: 0, scrambleRatings: { again: 0, hard: 0, good: 0, easy: 0, perfect: 0 }, isScrambleReviewed: false };

        if (destination.type === 'new') {
            const newHeaders = columnMappings
                .filter(mapping => mapping.enabled)
                .map(mapping => mapping.to.trim());
            
            if (newHeaders.some(h => h === '')) {
                setFeedback({ type: 'error', message: 'Column names cannot be empty.' }); return;
            }
            if (new Set(newHeaders).size !== newHeaders.length) {
                setFeedback({ type: 'error', message: 'Duplicate column names are not allowed.' }); return;
            }
            
            const newRows: VocabRow[] = parsedCsvData.rows.map((originalRow, i) => {
                const newCols: { [key: string]: string } = {};
                columnMappings.forEach(mapping => {
                    if (mapping.enabled) {
                        newCols[mapping.to.trim()] = originalRow[mapping.from] || '';
                    }
                });
                return {
                    id: `imported-row-${Date.now()}-${i}`,
                    cols: newCols,
                    stats: { ...defaultStats },
                    tags: [],
                };
            });

            const newTable: VocabTable = {
                id: `imported-table-${Date.now()}`,
                name: newTableName,
                columns: newHeaders,
                rows: newRows,
                wordCount: newRows.length,
                avgFailureRate: 0,
                avgRankPoint: 0,
                isDemo: false,
            };
            onAddTables([newTable]);
            setFeedback({type: 'success', message: `Successfully imported "${newTableName}".`});

        } else { // Append to existing table
            const targetTable = tables.find(t => t.id === destination.tableId);
            if (!targetTable) {
                setFeedback({ type: 'error', message: 'Destination table not found.' }); return;
            }
            
            const newRows: VocabRow[] = parsedCsvData.rows.map((originalRow, i) => {
                const newCols = { ...targetTable.columns.reduce((acc, col) => ({...acc, [col]: ''}), {}) }; // Ensure all columns exist
                columnMappings.forEach(mapping => {
                    if (mapping.enabled && mapping.to) {
                        newCols[mapping.to] = originalRow[mapping.from] || '';
                    }
                });
                return { id: `imported-row-${Date.now()}-${i}`, cols: newCols, stats: { ...defaultStats }, tags: [] };
            });

            setTables(currentTables => currentTables.map(t => {
                if (t.id === destination.tableId) {
                    return { ...t, rows: [...t.rows, ...newRows], wordCount: t.wordCount + newRows.length };
                }
                return t;
            }));
            setFeedback({type: 'success', message: `Appended ${newRows.length} rows to "${targetTable.name}".`});
        }
        
        setImportStep('file');
        setParsedCsvData(null);
        setImportedFile(null);
    };

    const handleCancelImport = () => {
        setParsedCsvData(null);
        setColumnMappings([]);
        setImportedFile(null);
        setFeedback(null);
        setImportStep('file');
    };

    const targetTableForMapping = useMemo(() => {
        if (destination.type === 'existing' && destination.tableId) {
            return tables.find(t => t.id === destination.tableId);
        }
        return null;
    }, [destination, tables]);

    const mappedHeaders = columnMappings.filter(m => m.enabled).map(m => m.to);

    const renderImportContent = () => {
        switch (importStep) {
            case 'destination':
                return parsedCsvData && (
                    <div className="animate-scale-in">
                        <h3 className="font-semibold text-gray-800 mb-1">Step 2: Choose Destination</h3>
                        <p className="text-sm text-gray-500 mb-4">Where should data from <span className="font-medium">"{parsedCsvData.fileName}"</span> go?</p>
                        
                        <div className="space-y-3">
                            <div onClick={() => setDestination({ ...destination, type: 'new' })} className={`p-4 border rounded-lg cursor-pointer transition-all ${destination.type === 'new' ? 'bg-cyan-50 border-cyan-500' : 'hover:border-gray-300'}`}>
                                <div className="flex items-start">
                                    {destination.type === 'new' ? <CheckCircleIcon className="w-5 h-5 text-cyan-500 mr-3 mt-0.5"/> : <UncheckedCircleIcon className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />}
                                    <div className="flex-grow">
                                        <h4 className="font-bold text-gray-800">Create a new table</h4>
                                        {destination.type === 'new' && <div className="mt-2 animate-scale-in">
                                            <label className="text-xs font-semibold text-gray-600">Table Name</label>
                                            <input type="text" value={newTableName} onChange={e => setNewTableName(e.target.value)} onClick={e => e.stopPropagation()} className="w-full mt-1 px-2 py-1.5 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
                                        </div>}
                                    </div>
                                </div>
                            </div>
                            <div onClick={() => setDestination({ ...destination, type: 'existing' })} className={`p-4 border rounded-lg cursor-pointer transition-all ${destination.type === 'existing' ? 'bg-cyan-50 border-cyan-500' : 'hover:border-gray-300'}`}>
                                <div className="flex items-start">
                                    {destination.type === 'existing' ? <CheckCircleIcon className="w-5 h-5 text-cyan-500 mr-3 mt-0.5"/> : <UncheckedCircleIcon className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />}
                                    <div className="flex-grow">
                                        <h4 className="font-bold text-gray-800">Append to an existing table</h4>
                                        {destination.type === 'existing' && <div className="mt-2 animate-scale-in">
                                             <label className="text-xs font-semibold text-gray-600">Select Table</label>
                                            <select value={destination.tableId || ''} onChange={e => setDestination({ type: 'existing', tableId: e.target.value })} onClick={e => e.stopPropagation()} className="w-full mt-1 px-2 py-1.5 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500">
                                                <option value="" disabled>-- Select a table --</option>
                                                {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                            </select>
                                        </div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {feedback && <div className={`mt-4 p-3 rounded-md text-sm ${feedback.type === 'error' ? 'bg-red-100 text-red-800' : ''}`}>{feedback.message}</div>}
                        <div className="flex justify-end gap-4 mt-6">
                            <button onClick={() => setImportStep('file')} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg">Back</button>
                            <button onClick={handleProceedToMapping} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg">Next: Map Columns</button>
                        </div>
                    </div>
                );
            case 'mapping':
                return parsedCsvData && (
                    <div className="animate-scale-in">
                        <h3 className="font-semibold text-gray-800 mb-1">Step 3: Map Columns</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Match columns from <span className="font-medium">"{parsedCsvData.fileName}"</span> to your destination.
                        </p>
                        <div className="space-y-3 p-3 bg-gray-50 border rounded-md max-h-48 overflow-y-auto">
                            {columnMappings.map((mapping, index) => (
                                <div key={mapping.from} className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-3 items-center text-sm">
                                    <input
                                        type="checkbox"
                                        checked={mapping.enabled}
                                        onChange={() => handleMappingToggle(index)}
                                        className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                                    />
                                    <span className="p-2 bg-white border border-gray-200 rounded-md truncate" title={mapping.from}>{mapping.from}</span>
                                    <span className="text-gray-400 font-semibold text-lg">→</span>
                                    {destination.type === 'new' ? (
                                        <input
                                            type="text"
                                            value={mapping.to}
                                            onChange={(e) => handleMappingChange(index, e.target.value)}
                                            className="w-full px-2 py-1 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:bg-gray-100 disabled:text-gray-400"
                                            disabled={!mapping.enabled}
                                        />
                                    ) : (
                                        <select
                                            value={mapping.to}
                                            onChange={(e) => handleMappingChange(index, e.target.value)}
                                            className="w-full px-2 py-1 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:bg-gray-100 disabled:text-gray-400"
                                            disabled={!mapping.enabled}
                                        >
                                            <option value="">-- Ignore this column --</option>
                                            {targetTableForMapping?.columns.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    )}
                                </div>
                            ))}
                        </div>

                        <h3 className="font-semibold text-gray-800 mb-2 mt-4">Live Preview</h3>
                        <div className="overflow-x-auto border rounded-lg max-h-56">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-100 sticky top-0">
                                    <tr>
                                        {mappedHeaders.map(header => header && <th key={header} className="p-2 text-left font-semibold text-gray-600">{header}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {parsedCsvData.rows.slice(0, 5).map((row, rowIndex) => (
                                        <tr key={rowIndex} className="border-t">
                                            {columnMappings.map(mapping => (
                                              mapping.enabled && mapping.to && <td key={mapping.from} className="p-2 truncate max-w-xs">{row[mapping.from]}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {parsedCsvData.rows.length > 5 && (
                            <p className="text-xs text-gray-500 text-center mt-2">...and {parsedCsvData.rows.length - 5} more rows.</p>
                        )}

                        {feedback && <div className={`mt-4 p-3 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {feedback.message}
                        </div>}

                        <div className="flex justify-end gap-4 mt-6">
                            <button onClick={() => setImportStep('destination')} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-lg text-lg">
                                Back
                            </button>
                            <button onClick={handleConfirmImport} className="flex-grow bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg text-lg flex items-center justify-center gap-2">
                                <UploadIcon /> Confirm Import
                            </button>
                        </div>
                    </div>
                );
            default: // 'file'
                 return (
                    <div>
                        <div 
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                            onDrop={handleFileDrop}
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging ? 'border-cyan-500 bg-cyan-50' : 'border-gray-300 bg-gray-50'}`}
                        >
                            <input type="file" id="file-upload" className="hidden" onChange={handleFileChange} accept=".json,.csv,.tsv,.txt" />
                            <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                            <label htmlFor="file-upload" className="mt-2 block font-semibold text-cyan-600 hover:text-cyan-500 cursor-pointer">
                                {importedFile ? `Selected: ${importedFile.name}` : "Choose a file"}
                            </label>
                            <p className="text-xs text-gray-500">or drag and drop a .JSON, .CSV, .TSV, or .TXT file</p>
                        </div>
                        {feedback && <div className={`mt-4 p-3 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {feedback.message}
                        </div>}
                    </div>
                );
        }
    }


    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Import & Export Tables" size="xl">
            <div>
                <div className="flex border-b border-gray-200">
                    <button onClick={() => setActiveTab('export')} className={`py-2 px-4 text-sm font-semibold ${activeTab === 'export' ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-gray-500'}`}>Export</button>
                    <button onClick={() => setActiveTab('import')} className={`py-2 px-4 text-sm font-semibold ${activeTab === 'import' ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-gray-500'}`}>Import</button>
                </div>

                {activeTab === 'export' && <div className="py-4">
                    <h3 className="font-semibold text-gray-800 mb-2">1. Select Tables to Export</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto p-2 bg-gray-50 rounded-md border">
                        {tables.map(table => {
                            const isSelected = selectedTableIds.includes(table.id);
                            return <div key={table.id} onClick={() => handleToggleTable(table.id)} className="flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                                {isSelected ? <CheckCircleIcon className="w-5 h-5 text-cyan-500 mr-3" /> : <UncheckedCircleIcon className="w-5 h-5 text-gray-300 mr-3" />}
                                <span>{table.name}</span>
                            </div>
                        })}
                    </div>
                    
                    <h3 className="font-semibold text-gray-800 mb-2 mt-4">2. Choose Format</h3>
                    <div className="flex gap-4">
                        <div onClick={() => setExportFormat('json')} className={`flex-1 p-3 border rounded-lg cursor-pointer ${exportFormat === 'json' ? 'border-cyan-500 bg-cyan-50' : ''}`}>
                            <h4 className="font-bold">JSON</h4>
                            <p className="text-xs text-gray-500">Best for backup. Exports all selected tables to a single file.</p>
                        </div>
                        <div onClick={() => selectedTableIds.length === 1 && setExportFormat('csv')} className={`flex-1 p-3 border rounded-lg ${selectedTableIds.length === 1 ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} ${exportFormat === 'csv' ? 'border-cyan-500 bg-cyan-50' : ''}`}>
                            <h4 className="font-bold">CSV</h4>
                            <p className="text-xs text-gray-500">For spreadsheets. Only available when one table is selected.</p>
                        </div>
                    </div>

                    <button onClick={handleExport} disabled={selectedTableIds.length === 0} className="w-full mt-6 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg text-lg shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        <DownloadIcon /> Export {selectedTableIds.length} Table(s)
                    </button>
                </div>}

                {activeTab === 'import' && <div className="py-4">
                    {renderImportContent()}
                </div>}
            </div>
        </Modal>
    );
};

const NewTableModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, columns: string[]) => void;
}> = ({ isOpen, onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [columnsStr, setColumnsStr] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        setError('');
        if (!name.trim()) {
            setError('Table name is required.');
            return;
        }
        const columns = columnsStr.split(',').map(c => c.trim()).filter(Boolean);
        if (columns.length === 0) {
            setError('Please define at least one column. The first column will be the primary keyword.');
            return;
        }
        if (new Set(columns).size !== columns.length) {
            setError('Column names must be unique.');
            return;
        }

        onCreate(name.trim(), columns);
        setName('');
        setColumnsStr('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Table" size="lg">
            <div className="space-y-4">
                <div>
                    <label htmlFor="table-name" className="block text-sm font-semibold text-gray-700 mb-1">Table Name</label>
                    <input type="text" id="table-name" value={name} onChange={e => setName(e.target.value)}
                        className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        placeholder="e.g., French Vocabulary"
                    />
                </div>
                 <div>
                    <label htmlFor="table-columns" className="block text-sm font-semibold text-gray-700 mb-1">Columns</label>
                    <input type="text" id="table-columns" value={columnsStr} onChange={e => setColumnsStr(e.target.value)}
                        className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        placeholder="Word, Definition, Example Sentence"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter column names separated by commas. The first one is the primary key.</p>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex justify-end gap-4 pt-4 border-t">
                  <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg">Cancel</button>
                  <button onClick={handleSubmit} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg">Create Table</button>
              </div>
            </div>
        </Modal>
    )
}

const NewFolderModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string) => void;
}> = ({ isOpen, onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    
    useEffect(() => {
        if(isOpen) {
            setName('');
            setError('');
        }
    }, [isOpen]);

    const handleSubmit = () => {
        setError('');
        if (!name.trim()) {
            setError('Folder name is required.');
            return;
        }
        onCreate(name.trim());
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Folder" size="md">
            <div className="space-y-4">
                <div>
                    <label htmlFor="folder-name" className="block text-sm font-semibold text-gray-700 mb-1">Folder Name</label>
                    <input type="text" id="folder-name" value={name} onChange={e => setName(e.target.value)}
                        className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        placeholder="e.g., Languages"
                    />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex justify-end gap-4 pt-4 border-t">
                  <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg">Cancel</button>
                  <button onClick={handleSubmit} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg">Create Folder</button>
              </div>
            </div>
        </Modal>
    )
}

const MoveTableModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    table: VocabTable | null;
    folders: Folder[];
    onConfirmMove: (tableId: string, folderId: string | null) => void;
}> = ({ isOpen, onClose, table, folders, onConfirmMove }) => {
    if (!table) return null;

    const userFolders = folders.filter(f => !f.isDemo);

    const handleMove = (folderId: string | null) => {
        onConfirmMove(table.id, folderId);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Move "${table.name}" to...`} size="md">
            <div className="space-y-2">
                <button 
                    onClick={() => handleMove(null)}
                    className="w-full text-left p-3 rounded-md hover:bg-slate-100 font-semibold text-slate-700 flex items-center gap-3"
                >
                    <FolderOpenIcon className="w-5 h-5" /> Main Screen (Root)
                </button>
                {userFolders.map(folder => (
                    <button 
                        key={folder.id} 
                        onClick={() => handleMove(folder.id)}
                        className="w-full text-left p-3 rounded-md hover:bg-slate-100 font-semibold text-slate-700 flex items-center gap-3"
                    >
                         <FolderIcon className="w-5 h-5 text-amber-500" /> {folder.name}
                    </button>
                ))}
                {userFolders.length === 0 && (
                    <p className="text-center text-slate-500 p-4">You haven't created any folders yet.</p>
                )}
            </div>
        </Modal>
    );
};


const TablesScreen: React.FC<TablesScreenProps> = ({ tables, setTables, relations, setRelations, user, folders, setFolders, onMoveTableToFolder, appSettings, onSubScreenChange, showToast }) => {
    const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
    const [isNewTableModalOpen, setIsNewTableModalOpen] = useState(false);
    const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [tableToDelete, setTableToDelete] = useState<VocabTable | null>(null);
    const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
    const [tableToMove, setTableToMove] = useState<VocabTable | null>(null);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

    const handleImportTables = (newTables: VocabTable[]) => {
        // Simple de-duplication based on table ID
        setTables(currentTables => {
            const currentIds = new Set(currentTables.map(t => t.id));
            const uniqueNewTables = newTables
                .filter(t => !currentIds.has(t.id))
                .map(t => ({ ...t, isDemo: false })); // Ensure all imported tables are marked as user-owned
            return [...currentTables, ...uniqueNewTables];
        });
    };
    
    const handleUpdateTable = (updatedTable: VocabTable) => {
        setTables(currentTables => 
            currentTables.map(t => t.id === updatedTable.id ? updatedTable : t)
        );
    };

    const handleCreateTable = (name: string, columns: string[]) => {
        const newTable: VocabTable = {
            id: `tbl-custom-${Date.now()}`,
            name,
            columns,
            rows: [],
            wordCount: 0,
            avgFailureRate: 0,
            avgRankPoint: 0,
            isDemo: false,
        };
        setTables(prev => [...prev, newTable]);
    };

    const handleCreateFolder = (name: string) => {
        const newFolder: Folder = {
            id: `fld-custom-${Date.now()}`,
            type: 'folder',
            name,
            tableIds: [],
            isDemo: false,
        };
        setFolders(prev => [...prev, newFolder]);
    };

    const handleDeleteTable = (tableId: string) => {
        setTables(currentTables => 
            currentTables.filter(t => t.id !== tableId)
        );
        setRelations(currentRelations =>
            currentRelations.filter(r => r.tableId !== tableId)
        );
        // Also remove table from any folder that contains it
        setFolders(currentFolders => currentFolders.map(f => ({
            ...f,
            tableIds: f.tableIds.filter(id => id !== tableId)
        })));
        setSelectedTableId(null);
    };

    const handleDeleteFolder = (folderId: string) => {
        setFolders(currentFolders => currentFolders.filter(f => f.id !== folderId));
        // Tables inside are now orphaned and will appear at the root.
    };

    const confirmDeleteTable = () => {
        if (tableToDelete) {
            handleDeleteTable(tableToDelete.id);
            setTableToDelete(null);
        }
    };
    
    const confirmDeleteFolder = () => {
        if (folderToDelete) {
            handleDeleteFolder(folderToDelete.id);
            setFolderToDelete(null);
        }
    };

    const selectedTable = useMemo(() => 
      tables.find(t => t.id === selectedTableId), 
    [tables, selectedTableId]);
    
    const currentFolder = useMemo(() => folders.find(f => f.id === currentFolderId), [folders, currentFolderId]);
    const allTableIdsInFolders = useMemo(() => folders.flatMap(f => f.tableIds), [folders]);

    const itemsToDisplay = useMemo(() => {
        if (currentFolder) {
            return tables.filter(t => currentFolder.tableIds.includes(t.id));
        } else {
            const topLevelTables = tables.filter(t => !allTableIdsInFolders.includes(t.id));
            return [...folders, ...topLevelTables];
        }
    }, [currentFolderId, folders, tables, allTableIdsInFolders, currentFolder]);

    useEffect(() => {
        // This effect only runs when TableDetailView is NOT active.
        // It reports the state of modals and sub-views within TablesScreen itself.
        if (selectedTableId) return;

        let subScreenName: string | null = null;
        if (currentFolder) {
            subScreenName = `Folder View: ${currentFolder.name}`;
        } else if (isImportExportModalOpen) {
            subScreenName = 'Import/Export Modal';
        } else if (isNewTableModalOpen) {
            subScreenName = 'New Table Modal';
        } else if (isNewFolderModalOpen) {
            subScreenName = 'New Folder Modal';
        } else if (tableToDelete) {
            subScreenName = `Confirm Delete Table Modal ("${tableToDelete.name}")`;
        } else if (folderToDelete) {
            subScreenName = `Confirm Delete Folder Modal ("${folderToDelete.name}")`;
        } else if (tableToMove) {
            subScreenName = `Move Table Modal ("${tableToMove.name}")`;
        }

        onSubScreenChange(subScreenName);
        
        // Cleanup function for when this view is no longer active
        return () => {
            onSubScreenChange(null);
        };
    }, [
        selectedTableId, currentFolder, isImportExportModalOpen, isNewTableModalOpen, 
        isNewFolderModalOpen, tableToDelete, folderToDelete, tableToMove, onSubScreenChange
    ]);


    if (selectedTable) {
        return <TableDetailView 
          table={selectedTable} 
          onBack={() => setSelectedTableId(null)} 
          onUpdateTable={handleUpdateTable}
          onDeleteTable={handleDeleteTable}
          relations={relations}
          setRelations={setRelations}
          user={user}
          appSettings={appSettings}
          onSubScreenChange={onSubScreenChange}
          showToast={showToast}
        />;
    }

    return (
        <div>
            {currentFolder ? (
                <header className="mb-6 flex items-center gap-4">
                    <button onClick={() => setCurrentFolderId(null)} className="p-2 rounded-full hover:bg-slate-200">
                        <ChevronLeftIcon />
                    </button>
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{currentFolder.name}</h1>
                        <p className="mt-1 text-md text-gray-500">
                            {currentFolder.tableIds.length} table(s) in this folder.
                        </p>
                    </div>
                </header>
            ) : (
                <>
                <header className="mb-6">
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Tables</h1>
                    <p className="mt-2 text-lg text-gray-500">Manage your vocabulary sets and folders.</p>
                </header>
                
                <div className="mb-6 p-2 bg-gray-100 rounded-lg flex flex-wrap gap-2 justify-start items-center">
                    <ToolbarButton onClick={() => setIsNewTableModalOpen(true)}>
                        <TableIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">New Table</span>
                    </ToolbarButton>
                    <ToolbarButton onClick={() => setIsNewFolderModalOpen(true)}>
                        <FolderIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">New Folder</span>
                    </ToolbarButton>
                    <div className="flex-grow"></div>
                    <ToolbarButton onClick={() => setIsImportExportModalOpen(true)}>
                        <UploadIcon />
                        <span className="hidden sm:inline">Import/Export</span>
                    </ToolbarButton>
                </div>
                </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {itemsToDisplay.map(item => {
                    if ('tableIds' in item) { // It's a Folder
                        return <FolderCard
                            key={item.id}
                            folder={item}
                            tableCount={item.tableIds.length}
                            onClick={() => setCurrentFolderId(item.id)}
                            onDelete={() => setFolderToDelete(item)}
                        />;
                    } else { // It's a VocabTable
                        return <TableCard 
                            key={item.id} 
                            table={item} 
                            onClick={() => setSelectedTableId(item.id)}
                            onDelete={() => setTableToDelete(item)}
                            onMove={() => setTableToMove(item)}
                        />
                    }
                })}
            </div>

            <ImportExportModal 
                isOpen={isImportExportModalOpen}
                onClose={() => setIsImportExportModalOpen(false)}
                tables={tables}
                onAddTables={handleImportTables}
                setTables={setTables}
            />
            <NewTableModal
                isOpen={isNewTableModalOpen}
                onClose={() => setIsNewTableModalOpen(false)}
                onCreate={handleCreateTable}
            />
            <NewFolderModal
                isOpen={isNewFolderModalOpen}
                onClose={() => setIsNewFolderModalOpen(false)}
                onCreate={handleCreateFolder}
            />
            <MoveTableModal
                isOpen={!!tableToMove}
                onClose={() => setTableToMove(null)}
                table={tableToMove}
                folders={folders}
                onConfirmMove={onMoveTableToFolder}
            />
            <Modal
                isOpen={!!tableToDelete}
                onClose={() => setTableToDelete(null)}
                title="Confirm Deletion"
                size="md"
            >
                <div>
                    <p className="text-slate-600 mb-4">
                        Are you sure you want to delete the table <strong className="text-slate-800">"{tableToDelete?.name}"</strong>?
                    </p>
                    <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                        This will also delete all associated relations and cannot be undone.
                    </p>
                    <div className="flex justify-end gap-4 mt-6">
                        <button
                            onClick={() => setTableToDelete(null)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-6 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDeleteTable}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </Modal>
             <Modal
                isOpen={!!folderToDelete}
                onClose={() => setFolderToDelete(null)}
                title="Confirm Folder Deletion"
                size="md"
            >
                <div>
                    <p className="text-slate-600 mb-4">
                        Are you sure you want to delete the folder <strong className="text-slate-800">"{folderToDelete?.name}"</strong>?
                    </p>
                    <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-md">
                        The tables inside this folder will <strong className="font-semibold">not</strong> be deleted. They will be moved to the main screen.
                    </p>
                    <div className="flex justify-end gap-4 mt-6">
                        <button
                            onClick={() => setFolderToDelete(null)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-6 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDeleteFolder}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg"
                        >
                            Delete Folder
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default TablesScreen;
