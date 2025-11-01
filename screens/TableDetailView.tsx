
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { VocabTable, VocabRow, VocabRowStats, Relation, AppSettings } from '../types';
import { ChevronLeftIcon, ImageIcon, FilterIcon, SortAscIcon, EyeIcon, PlusIcon, TrashIcon, ChevronDownIcon, EditIcon, ArrowUpIcon, ArrowDownIcon, SearchIcon, DragHandleIcon, XCircleIcon, SparklesIcon, SpinnerIcon, TableViewIcon, CardViewIcon, ChevronRightIcon, UploadIcon, SpeakerIcon, PlayIcon, PauseIcon, ChatIcon, AlertTriangleIcon } from '../components/Icons';
import Dropdown from '../components/Dropdown';
import RelationEditorModal from '../components/RelationEditorModal';
import Modal from '../components/Modal';
import ImageInputModal from '../components/ImageInputModal';
import { calculatePriorityScore } from '../utils/priorityScore';
import { generateAiContent, playSpeech, stopSpeech } from '../utils/gemini';
import { User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import RelationPreviewModal from '../components/RelationPreviewModal';
import AiPromptConfigModal from '../components/AiPromptConfigModal';

// --- Types ---
type FilterOperator = 'contains' | 'not_contains' | 'is' | 'is_not' | 'is_empty' | 'is_not_empty' | 'greater_than' | 'less_than' | 'equals' | 'not_equals';
interface FilterRule {
  id: string;
  column: string; // This will be the label
  operator: FilterOperator;
  value: string;
}
interface SortRule {
  id: string;
  column: string; // This will be the label
  direction: 'asc' | 'desc';
}
interface ViewSettings {
    visibleColumns: string[];
    filters: FilterRule[];
    sorts: SortRule[];
    searchQuery: string;
}
type StatColumnKey = keyof VocabRowStats;
type ColumnInfo = {
    key: string;
    label: string;
    type: 'col' | 'stat';
    dataType: 'string' | 'number' | 'date' | 'boolean';
};

// --- Constants & Helpers ---
const languageOptions = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'fr-FR', name: 'French (France)' },
    { code: 'es-ES', name: 'Spanish (Spain)' },
    { code: 'de-DE', name: 'German' },
    { code: 'it-IT', name: 'Italian' },
    { code: 'ja-JP', name: 'Japanese' },
    { code: 'ko-KR', name: 'Korean' },
    { code: 'zh-CN', name: 'Chinese (Mandarin, Simplified)' },
    { code: 'zh-TW', name: 'Chinese (Mandarin, Traditional)' },
    { code: 'ru-RU', name: 'Russian' },
    { code: 'pt-PT', name: 'Portuguese (Portugal)' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)' },
    { code: 'ar-SA', name: 'Arabic' },
    { code: 'hi-IN', name: 'Hindi' },
    { code: 'vi-VN', name: 'Vietnamese' },
];

const getStatValue = (row: VocabRow, key: string, maxInQueue: number): any => {
    const flashcardRatingKeys = ['again', 'hard', 'good', 'easy', 'perfect'];
    if (key === 'priorityScore') {
        return calculatePriorityScore(row, maxInQueue);
    }
    if (key === 'flashcardEncounters') {
        const ratings = row.stats.flashcardRatings;
        if (!ratings) return 0;
        return (ratings.again || 0) + (ratings.hard || 0) + (ratings.good || 0) + (ratings.easy || 0) + (ratings.perfect || 0);
    }
    if (flashcardRatingKeys.includes(key)) {
        return row.stats.flashcardRatings?.[key as keyof VocabRowStats['flashcardRatings']] ?? 0;
    }
    return row.stats[key as keyof VocabRowStats];
};

const STATS_COLUMNS: { key: string; label: string; formatter?: (value: any) => string | number, dataType: 'string' | 'number' | 'boolean' | 'date' }[] = [
    { key: 'priorityScore', label: 'Priority Score', formatter: (v) => typeof v === 'number' ? v.toFixed(3) : 'N/A', dataType: 'number' },
    { key: 'RankPoint', label: 'Rank Point', dataType: 'number' },
    // Fix: Safely handle potential non-numeric values by casting to Number.
    { key: 'SuccessRate', label: 'Success Rate', formatter: (v) => `${(Number(v || 0) * 100).toFixed(0)}%`, dataType: 'number' },
    { key: 'Level', label: 'Level', dataType: 'number' },
    { key: 'LastPracticeDate', label: 'Last Practiced', formatter: (v) => v ? new Date(v).toLocaleDateString() : 'N/A', dataType: 'date' },
    { key: 'Passed1', label: 'Passed (1st time)', dataType: 'number' },
    { key: 'Passed2', label: 'Passed (2nd time)', dataType: 'number' },
    { key: 'Failed', label: 'Failed', dataType: 'number' },
    { key: 'TotalAttempt', label: 'Attempts', dataType: 'number' },
    { key: 'InQueue', label: 'In Queue Count', dataType: 'number' },
    { key: 'QuitQueue', label: 'Quit Queue', formatter: (v) => v ? 'Yes' : 'No', dataType: 'boolean' },
    // Flashcard stats:
    { key: 'flashcardEncounters', label: 'Encounters (FC)', dataType: 'number' },
    { key: 'again', label: 'Again (FC)', dataType: 'number' },
    { key: 'hard', label: 'Hard (FC)', dataType: 'number' },
    { key: 'good', label: 'Good (FC)', dataType: 'number' },
    { key: 'easy', label: 'Easy (FC)', dataType: 'number' },
    { key: 'perfect', label: 'Perfect (FC)', dataType: 'number' },
    { key: 'flashcardStatus', label: 'Flashcard Status', dataType: 'string' },
    { key: 'isFlashcardReviewed', label: 'Reviewed (FC)', formatter: (v) => v ? 'Yes' : 'No', dataType: 'boolean' },
];

const OPERATORS: Record<'string' | 'number' | 'date' | 'boolean', { value: FilterOperator, label: string }[]> = {
    string: [
        { value: 'contains', label: 'contains' }, { value: 'not_contains', label: 'does not contain' },
        { value: 'is', label: 'is' }, { value: 'is_not', label: 'is not' },
        { value: 'is_empty', label: 'is empty' }, { value: 'is_not_empty', label: 'is not empty' },
    ],
    number: [
        { value: 'equals', label: '=' }, { value: 'not_equals', label: '≠' },
        { value: 'greater_than', label: '>' }, { value: 'less_than', label: '<' },
    ],
    date: [ { value: 'is', label: 'is on' }, { value: 'is_not', label: 'is not on' }, { value: 'greater_than', label: 'is after' }, { value: 'less_than', label: 'is before' }, ],
    boolean: [ { value: 'is', label: 'is' }, ]
};

const defaultStats: VocabRowStats = { Passed1: 0, Passed2: 0, Failed: 0, TotalAttempt: 0, SuccessRate: 0, FailureRate: 0, RankPoint: 0, Level: 1, InQueue: 0, QuitQueue: false, LastPracticeDate: null, flashcardStatus: null, flashcardEncounters: 0, flashcardRatings: { again: 0, hard: 0, good: 0, easy: 0, perfect: 0 }, isFlashcardReviewed: false, theaterEncounters: 0, scrambleEncounters: 0, scrambleRatings: { again: 0, hard: 0, good: 0, easy: 0, perfect: 0 }, isScrambleReviewed: false };

// --- Child Components ---
const ColumnEditorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  table: VocabTable;
  relations: Relation[];
  onUpdateTable: (updatedTable: VocabTable) => void;
  setRelations: React.Dispatch<React.SetStateAction<Relation[]>>;
}> = ({ isOpen, onClose, table, relations, onUpdateTable, setRelations }) => {
  type EditableColumn = { originalName: string; currentName: string; isNew: boolean };

  const [editedColumns, setEditedColumns] = useState<EditableColumn[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setEditedColumns(table.columns.map(c => ({ originalName: c, currentName: c, isNew: false })));
      setError('');
    }
  }, [isOpen, table.columns]);

  const handleNameChange = (index: number, newName: string) => {
    const newCols = [...editedColumns];
    newCols[index].currentName = newName;
    setEditedColumns(newCols);
  };

  const handleAddColumn = () => {
    const newName = 'New Column';
    let finalName = newName;
    let counter = 1;
    while (editedColumns.some(c => c.currentName === finalName)) {
      finalName = `${newName} ${counter++}`;
    }
    setEditedColumns([...editedColumns, { originalName: `__new_${Date.now()}`, currentName: finalName, isNew: true }]);
  };

  const handleDeleteColumn = (index: number) => {
    setEditedColumns(editedColumns.filter((_, i) => i !== index));
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newCols = [...editedColumns];
    const [draggedItem] = newCols.splice(draggedIndex, 1);
    newCols.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    setEditedColumns(newCols);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSaveChanges = () => {
    setError('');
    const finalColumnNames = editedColumns.map(c => c.currentName.trim());
    if (finalColumnNames.some(name => name === '')) {
      setError('Column names cannot be empty.'); return;
    }
    if (new Set(finalColumnNames).size !== finalColumnNames.length) {
      setError('Column names must be unique.'); return;
    }

    const initialColumns = table.columns;
    const renamedColumns = new Map<string, string>();
    editedColumns.forEach(ec => {
      if (!ec.isNew && ec.originalName !== ec.currentName) {
        renamedColumns.set(ec.originalName, ec.currentName.trim());
      }
    });

    const finalOriginalNames = new Set(editedColumns.map(ec => ec.originalName));
    const deletedColumns = initialColumns.filter(c => !finalOriginalNames.has(c));

    const newRows = table.rows.map(row => {
      const newCols: { [key: string]: string } = {};
      editedColumns.forEach(ec => {
        const value = ec.isNew ? '' : (row.cols[ec.originalName] || '');
        newCols[ec.currentName.trim()] = value;
      });
      return { ...row, cols: newCols };
    });
    
    const newAiPrompts = { ...table.aiPrompts };
    deletedColumns.forEach(deletedCol => {
        delete newAiPrompts[deletedCol];
    });
    renamedColumns.forEach((newName, oldName) => {
        if (newAiPrompts[oldName]) {
            newAiPrompts[newName] = newAiPrompts[oldName];
            delete newAiPrompts[oldName];
        }
    });

    const relationsForThisTable = relations.filter(r => r.tableId === table.id);
    const otherRelations = relations.filter(r => r.tableId !== table.id);

    const updatedRelationsForThisTable = relationsForThisTable.map(r => {
      const newQuestionCols = r.questionCols
        .map(c => renamedColumns.get(c) || c)
        .filter(c => !deletedColumns.includes(c));
      const newAnswerCols = r.answerCols
        .map(c => renamedColumns.get(c) || c)
        .filter(c => !deletedColumns.includes(c));
      return { ...r, questionCols: newQuestionCols, answerCols: newAnswerCols };
    }).filter(r => r.questionCols.length > 0 && r.answerCols.length > 0);

    onUpdateTable({ ...table, columns: finalColumnNames, rows: newRows, aiPrompts: newAiPrompts });
    setRelations([...otherRelations, ...updatedRelationsForThisTable]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Table Column Editor">
      <div className="space-y-4">
        <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md">Drag to reorder, edit names, or add/delete columns. The first column is the primary key and cannot be renamed or deleted.</p>
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {editedColumns.map((col, index) => (
                <div
                    key={col.originalName}
                    className={`flex items-center gap-2 p-2 rounded-md transition-all ${draggedIndex === index ? 'bg-cyan-100 opacity-50' : 'bg-slate-50'}`}
                    draggable={index > 0}
                    onDragStart={e => index > 0 && handleDragStart(e, index)}
                    onDragOver={e => index > 0 && handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                >
                    <div className={`p-1 ${index > 0 ? 'cursor-grab text-slate-400' : 'text-slate-200'}`}>
                        <DragHandleIcon className="w-5 h-5" />
                    </div>
                    <input
                        type="text"
                        value={col.currentName}
                        onChange={e => handleNameChange(index, e.target.value)}
                        className="flex-grow px-2 py-1.5 text-slate-800 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-slate-200 disabled:text-slate-500"
                        readOnly={index === 0}
                    />
                    <button 
                        onClick={() => handleDeleteColumn(index)} 
                        disabled={index === 0}
                        className="p-2 text-slate-400 hover:text-red-500 disabled:text-slate-300 disabled:cursor-not-allowed"
                        aria-label="Delete column"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            ))}
        </div>
        <div>
            <button onClick={handleAddColumn} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2">
                <PlusIcon className="w-5 h-5" /> Add Column
            </button>
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}
        <div className="flex justify-end gap-4 pt-4 border-t">
          <button onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-6 rounded-lg">Cancel</button>
          <button onClick={handleSaveChanges} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg">Save Changes</button>
        </div>
      </div>
    </Modal>
  );
};


const AddColumnModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onAdd: (columnName: string) => void;
    existingColumns: string[];
}> = ({ isOpen, onClose, onAdd, existingColumns }) => {
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError('Column name is required.');
            return;
        }
        if (existingColumns.map(c => c.toLowerCase()).includes(trimmedName.toLowerCase())) {
            setError('A column with this name already exists.');
            return;
        }
        onAdd(trimmedName);
        onClose();
    };
    
    useEffect(() => {
        if (isOpen) {
            setName('');
            setError('');
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Column" zIndex="z-[60]">
            <div className="space-y-4">
                <div>
                    <label htmlFor="column-name" className="block text-sm font-semibold text-slate-700 mb-1">Column Name</label>
                    <input
                        type="text"
                        id="column-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 text-slate-700 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        placeholder="e.g., Context"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex justify-end gap-4 pt-4 border-t">
                    <button onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-6 rounded-lg">Cancel</button>
                    <button onClick={handleSubmit} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg">Add Column</button>
                </div>
            </div>
        </Modal>
    );
};

const ImageCell: React.FC<{ imageUrl: string; onEdit: () => void; }> = ({ imageUrl, onEdit }) => {
    if (imageUrl) { return ( <div className="w-full h-12 bg-slate-100 rounded-md overflow-hidden group relative cursor-pointer" onClick={onEdit} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onEdit()} role="button" tabIndex={0} aria-label="Edit image"> <img src={imageUrl} alt="Vocabulary item" className="w-full h-full object-cover" /> <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center"> <EditIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" /> </div> </div> ); }
    return ( <button onClick={onEdit} aria-label="Add image" className="w-full h-12 flex items-center justify-center text-slate-400 bg-slate-100 hover:bg-slate-200 hover:text-slate-600 transition-colors rounded-lg border-2 border-dashed"> <ImageIcon className="w-5 h-5" /> </button> );
}

const WordDetailModal: React.FC<{ isOpen: boolean; onClose: () => void; row: VocabRow | null; columns: string[]; onRowUpdate: (rowId: string, column: string, value: string) => void; onRowDelete: (rowId: string) => void; onOpenImageModal: (rowId: string) => void; maxInQueue: number; table: VocabTable; onPlaySpeech: (row: VocabRow, e: React.MouseEvent) => void; playingRowId: string | null; onConfigureAi: (column: string) => void; appSettings: AppSettings; onGenerateAi: (column: string) => void; onAddColumn: () => void; generatingCells: Record<string, boolean>; }> = ({ isOpen, onClose, row, columns, onRowUpdate, onRowDelete, onOpenImageModal, maxInQueue, table, onPlaySpeech, playingRowId, onConfigureAi, appSettings, onGenerateAi, onAddColumn, generatingCells }) => {
    const [editedCols, setEditedCols] = useState<{[key: string]: string}>(row?.cols || {});
    
    useEffect(() => {
        if (isOpen && row) {
            const newEditedCols = {...row.cols};
            for (const col of columns) {
                if (!(col in newEditedCols)) {
                    newEditedCols[col] = '';
                }
            }
            setEditedCols(newEditedCols);
        }
    }, [isOpen, row, columns]);

    const totalEncounters = useMemo(() => {
        if (!row?.stats.flashcardRatings) return 0;
        const { again, hard, good, easy, perfect } = row.stats.flashcardRatings;
        return (again || 0) + (hard || 0) + (good || 0) + (easy || 0) + (perfect || 0);
    }, [row]);

    if (!isOpen || !row) return null;

    const handleFieldChange = (column: string, value: string) => {
        setEditedCols(prev => ({ ...prev, [column]: value }));
    };

    const handleSave = (column: string) => {
        if (row && (row.cols[column] || '') !== (editedCols[column] || '')) {
            onRowUpdate(row.id, column, editedCols[column] || '');
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !(e.target as HTMLElement).matches('textarea')) {
            (e.target as HTMLElement).blur();
        }
    };
    
    const StatItem: React.FC<{ label: string; value: string | number | null }> = ({ label, value }) => (
        <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-xl font-bold text-slate-800">{value ?? 'N/A'}</p>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="">
            <div className="space-y-6">
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-semibold text-slate-500">{columns[0]}</label>
                        {table.audioConfig?.sourceColumn && (
                            <button onClick={(e) => onPlaySpeech(row, e)} className="p-2 rounded-full hover:bg-slate-200 text-slate-500 hover:text-cyan-600">
                                {playingRowId === row.id ? <PauseIcon className="w-5 h-5" /> : <SpeakerIcon className="w-5 h-5" />}
                            </button>
                        )}
                    </div>
                    <input
                        type="text"
                        value={editedCols[columns[0]] || ''}
                        onChange={(e) => handleFieldChange(columns[0], e.target.value)}
                        onBlur={() => handleSave(columns[0])}
                        onKeyDown={handleKeyDown}
                        className="w-full text-3xl font-bold text-slate-800 p-2 border border-slate-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 focus:outline-none rounded-lg bg-slate-50 focus:bg-white"
                    />
                </div>
                <div className="space-y-4 pt-4 border-t">
                    {columns.slice(1).map((col) => {
                        const isImage = col === table.imageConfig?.imageColumn;
                        const cellContent = editedCols[col] || '';
                        const isPotentiallyMultilineByColName = ['definition', 'example', 'note', 'sentence', 'nghĩa'].some(keyword => col.toLowerCase().includes(keyword));
                        const isMultiline = isPotentiallyMultilineByColName || cellContent.length > 60 || cellContent.includes('\n');
                        const cellId = `${row.id}-${col}`;
                        const isGenerating = generatingCells[cellId];
                        const isAiFillable = !!table.aiPrompts?.[col] && !cellContent.trim() && col !== table.imageConfig?.imageColumn;
                        const highlightClasses = isAiFillable ? 'bg-cyan-50 animate-ai-glow' : 'bg-slate-50 focus:bg-white';

                        return (
                            <div key={col} title={isAiFillable ? "This cell can be filled using 'Run AI'" : undefined}>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm font-semibold text-slate-500">{col}</label>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => onConfigureAi(col)} className="p-1 rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-600" title={`Configure AI prompt for "${col}"`}>
                                            <ChatIcon className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => onGenerateAi(col)} 
                                            disabled={isGenerating} 
                                            className="p-1 rounded-md text-slate-400 hover:bg-cyan-100 hover:text-cyan-500 disabled:cursor-not-allowed disabled:opacity-50" 
                                            title={!appSettings.userApiKey ? "Set your Gemini API key in Settings" : !table.aiPrompts?.[col] ? `No AI prompt configured for "${col}"` : `Generate content for "${col}"`}>
                                            {isGenerating ? <SpinnerIcon className="w-4 h-4 animate-spin-fast" /> : <SparklesIcon className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                {isImage ? (
                                    <ImageCell imageUrl={editedCols[col] || ''} onEdit={() => onOpenImageModal(row.id)} />
                                ) : isMultiline ? (
                                    <textarea
                                        value={editedCols[col] || ''}
                                        onChange={(e) => handleFieldChange(col, e.target.value)}
                                        onBlur={() => handleSave(col)}
                                        onKeyDown={handleKeyDown}
                                        rows={3}
                                        disabled={isGenerating}
                                        className={`w-full text-base text-slate-900 p-2 border border-slate-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 focus:outline-none rounded-lg resize-y disabled:opacity-60 disabled:bg-slate-200 ${highlightClasses}`}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={editedCols[col] || ''}
                                        onChange={(e) => handleFieldChange(col, e.target.value)}
                                        onBlur={() => handleSave(col)}
                                        onKeyDown={handleKeyDown}
                                        disabled={isGenerating}
                                        className={`w-full text-base text-slate-900 p-2 border border-slate-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 focus:outline-none rounded-lg disabled:opacity-60 disabled:bg-slate-200 ${highlightClasses}`}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="pt-4 border-t">
                    <h4 className="text-md font-bold text-slate-800 mb-3">Statistics</h4>
                    <div className="grid grid-cols-3 gap-y-6 gap-x-4">
                        <StatItem label="Priority Score" value={calculatePriorityScore(row, maxInQueue).toFixed(3)} />
                        <StatItem label="Rank Point" value={row.stats.RankPoint} />
                        <StatItem label="Success Rate" value={`${(row.stats.SuccessRate * 100).toFixed(0)}%`} />
                        <StatItem label="Level" value={row.stats.Level} />
                        <StatItem label="Last Practiced" value={row.stats.LastPracticeDate ? new Date(row.stats.LastPracticeDate).toLocaleDateString() : 'N/A'} />
                        <StatItem label="Attempts" value={row.stats.TotalAttempt} />
                        <StatItem label="Passed (1st time)" value={row.stats.Passed1} />
                        <StatItem label="Passed (2nd time)" value={row.stats.Passed2} />
                        <StatItem label="Failed" value={row.stats.Failed} />
                        <StatItem label="In Queue Count" value={row.stats.InQueue} />
                        <StatItem label="Quit Queue" value={row.stats.QuitQueue ? 'Yes' : 'No'} />
                        <div />
                        <StatItem label="Encounters (FC)" value={totalEncounters} />
                        <StatItem label="Reviewed (FC)" value={row.stats.isFlashcardReviewed ? 'Yes' : 'No'} />
                        <StatItem label="Flashcard Status" value={row.stats.flashcardStatus} />
                        <StatItem label="Again (FC)" value={row.stats.flashcardRatings?.again ?? 0} />
                        <StatItem label="Hard (FC)" value={row.stats.flashcardRatings?.hard ?? 0} />
                        <StatItem label="Good (FC)" value={row.stats.flashcardRatings?.good ?? 0} />
                        <StatItem label="Easy (FC)" value={row.stats.flashcardRatings?.easy ?? 0} />
                        <StatItem label="Perfect (FC)" value={row.stats.flashcardRatings?.perfect ?? 0} />
                    </div>
                </div>
                <div className="flex justify-between items-center gap-4 pt-5 mt-2 border-t">
                    <button onClick={() => onRowDelete(row.id)} className="bg-red-50 hover:bg-red-100 text-red-700 font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"> <TrashIcon className="w-5 h-5"/> Delete Word </button>
                    <div className="flex items-center gap-2">
                        <button onClick={onAddColumn} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg flex items-center gap-2">
                            <PlusIcon className="w-5 h-5"/> Add Column
                        </button>
                        <button onClick={onClose} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg"> Done </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

const TableView: React.FC<{ rows: VocabRow[]; table: VocabTable; columns: string[]; visibleStatsColumns: (typeof STATS_COLUMNS); onRowDelete: (rowId: string) => void; onColumnDelete: (column: string) => void; onColumnReorder: (newColumns: string[]) => void; selectedRowIds: Set<string>; onToggleRow: (rowId: string) => void; onToggleSelectAll: () => void; sorts: SortRule[]; onSort: (columnLabel: string) => void; onRowClick: (row: VocabRow) => void; maxInQueue: number; onOpenImageModal: (rowId: string) => void; onConfigureAi: (column: string) => void; onGenerateAiContent: (row: VocabRow, column: string) => void; generatingCells: Record<string, boolean>; onPlaySpeech: (row: VocabRow, e: React.MouseEvent) => void; playingRowId: string | null; appSettings: AppSettings; isAiRunning: boolean; }> = ({ rows, table, columns, visibleStatsColumns, onRowDelete, onColumnDelete, onColumnReorder, selectedRowIds, onToggleRow, onToggleSelectAll, sorts, onSort, onRowClick, maxInQueue, onOpenImageModal, onConfigureAi, onGenerateAiContent, generatingCells, onPlaySpeech, playingRowId, appSettings, isAiRunning }) => {
    const [draggedColumn, setDraggedColumn] = useState<number | null>(null); const [dragOverColumn, setDragOverColumn] = useState<number | null>(null); const [activeColumnMenu, setActiveColumnMenu] = useState<string | null>(null); const headerCheckboxRef = useRef<HTMLInputElement>(null);
    const allProcessedRowsSelected = useMemo(() => rows.length > 0 && rows.every(row => selectedRowIds.has(row.id)), [rows, selectedRowIds]); const someProcessedRowsSelected = useMemo(() => !allProcessedRowsSelected && rows.some(row => selectedRowIds.has(row.id)), [allProcessedRowsSelected, rows, selectedRowIds]);
    useEffect(() => { if (headerCheckboxRef.current) { headerCheckboxRef.current.indeterminate = someProcessedRowsSelected; } }, [someProcessedRowsSelected]);
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => { e.dataTransfer.setData('text/plain', index.toString()); setDraggedColumn(index); }; const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => { e.preventDefault(); if (index !== draggedColumn) { setDragOverColumn(index); } }; const handleDragLeave = () => { setDragOverColumn(null); }; const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => { e.preventDefault(); const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10); if (sourceIndex !== targetIndex && targetIndex > 0) { const newColumns = [...columns]; const [movedColumn] = newColumns.splice(sourceIndex, 1); newColumns.splice(targetIndex, 0, movedColumn); onColumnReorder(newColumns); } setDraggedColumn(null); setDragOverColumn(null); };
    return (
        <div className="w-full">
            {/* DESKTOP HEADER */}
            <div className="hidden md:block bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <div className="flex">
                    <div className="px-4 py-3 sticky left-0 bg-slate-50 w-12 z-20 flex-shrink-0"> <input type="checkbox" ref={headerCheckboxRef} className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500" checked={allProcessedRowsSelected} onChange={onToggleSelectAll} /> </div>
                    {columns.map((col, index) => { const isDraggable = index > 0; const isBeingDragged = draggedColumn === index; const isDragTarget = dragOverColumn === index; const currentSort = sorts.find(s => s.column === col); const isFirstCol = index === 0; const hasAiPrompt = !!table.aiPrompts?.[col]; return ( <div key={col} className={`px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider group relative transition-colors flex-shrink-0 ${isBeingDragged ? 'opacity-50' : ''} ${isDragTarget ? 'bg-cyan-100' : ''} ${isFirstCol ? 'sticky left-12 bg-slate-50 z-20' : ''}`} style={{width: isFirstCol ? '250px' : '200px'}} draggable={isDraggable} onDragStart={(e) => isDraggable && handleDragStart(e, index)} onDragOver={(e) => isDraggable && handleDragOver(e, index)} onDragLeave={handleDragLeave} onDrop={(e) => isDraggable && handleDrop(e, index)}> <div className="flex items-center justify-between"> <div onClick={() => onSort(col)} className={`flex items-center gap-2 ${isDraggable ? 'cursor-grab' : 'cursor-pointer'}`}> {isDraggable && <DragHandleIcon className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />} <span className="flex items-center gap-1.5">{hasAiPrompt && <SparklesIcon className="w-3 h-3 text-cyan-400" />} {col} {currentSort && (currentSort.direction === 'asc' ? <ArrowUpIcon className="w-3 h-3"/> : <ArrowDownIcon className="w-3 h-3"/>)}</span> </div> <Dropdown className="w-56" isOpen={activeColumnMenu === col} onToggle={() => setActiveColumnMenu(prev => prev === col ? null : col)} trigger={<button className={`p-1 rounded-md transition-colors text-slate-400 hover:bg-slate-200 hover:text-slate-600 ${activeColumnMenu === col ? 'bg-slate-200 text-slate-700' : ''}`} aria-label={`Column options for ${col}`}> <ChevronDownIcon className="w-4 h-4" /> </button>}>
                      <button onClick={() => { onConfigureAi(col); setActiveColumnMenu(null); }} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><SparklesIcon className="w-4 h-4" /> Configure AI Prompt</button>
                      <button
                        onClick={() => { onColumnDelete(col); setActiveColumnMenu(null); }}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 rounded-md transition-colors ${
                            isFirstCol
                                ? 'text-slate-400 cursor-not-allowed'
                                : 'text-red-600 hover:bg-red-50'
                        }`}
                        disabled={isFirstCol}
                      >
                        <TrashIcon className="w-4 h-4" /> Delete Column
                      </button>
                  </Dropdown> </div> {isDragTarget && <div className="absolute top-0 left-0 bottom-0 w-1 bg-cyan-500" />} </div> ) })}
                    {visibleStatsColumns.map(sc => { const currentSort = sorts.find(s => s.column === sc.label); return ( <div key={sc.key} onClick={() => onSort(sc.label)} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer flex-shrink-0" style={{width: '150px'}}> <span className="flex items-center gap-1.5">{sc.label} {currentSort && (currentSort.direction === 'asc' ? <ArrowUpIcon className="w-3 h-3"/> : <ArrowDownIcon className="w-3 h-3"/>)}</span> </div> ) })}
                    <div className="px-4 py-3 w-24 flex-shrink-0"></div>
                </div>
            </div>

            {/* CONTENT */}
            <div>
            {rows.map((row) => { 
                if (!row) return null;
                return ( <div key={row.id}>
                    {/* MOBILE CARD */}
                    <div className="md:hidden h-[80px] p-2" onClick={() => onRowClick(row)}>
                        <div className={`h-full rounded-lg shadow-md flex items-center gap-2 cursor-pointer ${selectedRowIds.has(row.id) ? 'bg-cyan-100 border border-cyan-300' : 'bg-white'}`}>
                            <div className="pl-4" onClick={e => e.stopPropagation()}>
                                <input type="checkbox" className="h-5 w-5 rounded border-slate-400 text-cyan-600 focus:ring-cyan-500" checked={selectedRowIds.has(row.id)} onChange={() => onToggleRow(row.id)} />
                            </div>
                            <div className="flex-grow py-3 pr-4 overflow-hidden">
                                <p className="font-bold text-md text-slate-800 truncate">{row.cols[columns[0]] || ' '}</p>
                                {columns[1] && <p className="text-sm text-slate-600 truncate mt-1">{row.cols[columns[1]] || ' '}</p>}
                            </div>
                        </div>
                    </div>
                    
                    {/* DESKTOP ROW */}
                    <div className={`hidden md:flex h-[57px] group cursor-pointer border-b border-slate-200 ${selectedRowIds.has(row.id) ? 'bg-cyan-50' : 'hover:bg-slate-50'}`} onClick={() => onRowClick(row)}>
                        <div className="px-4 whitespace-nowrap align-middle sticky left-0 z-10 w-12 flex-shrink-0 flex items-center justify-center" onClick={e => e.stopPropagation()}> <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500" checked={selectedRowIds.has(row.id)} onChange={() => onToggleRow(row.id)} /> </div>
                        {columns.map((col, colIndex) => { const cellId = `${row.id}-${col}`; const isGenerating = generatingCells[cellId]; const hasAiPrompt = !!table.aiPrompts?.[col]; const isImageColumn = col === table.imageConfig?.imageColumn; const isAiFillable = hasAiPrompt && !row.cols[col]?.trim() && !isImageColumn; return (
                        <div key={col} className={`px-6 py-2 text-slate-700 align-middle max-w-sm flex-shrink-0 flex items-center ${isAiFillable ? 'animate-ai-glow bg-cyan-50' : 'group-hover:bg-slate-100'}`} style={{width: colIndex === 0 ? '250px' : '200px', ...(colIndex === 0 && { position: 'sticky', left: '3rem', zIndex: 10 })}} title={isAiFillable ? "This cell can be filled using 'Run AI'" : undefined}>
                        {isImageColumn ? ( <div className="w-16 h-full" onClick={(e) => e.stopPropagation()}> <ImageCell imageUrl={row.cols[col] || ''} onEdit={() => onOpenImageModal(row.id)} /> </div> ) : (
                            <div className="flex items-center justify-between w-full">
                                <span className="truncate pr-2">{row.cols[col] || <span className="text-slate-400">empty</span>}</span>
                                {isGenerating ? (
                                    <SpinnerIcon className="w-4 h-4 animate-spin-fast text-slate-400" />
                                ) : hasAiPrompt && (
                                    <button onClick={(e) => { e.stopPropagation(); onGenerateAiContent(row, col); }} disabled={isGenerating || isAiRunning} title={!appSettings.userApiKey ? "Set your Gemini API key in Settings to use this feature" : "Generate content"} className="p-1 rounded-md text-slate-400 hover:bg-cyan-100 hover:text-cyan-600 disabled:visible disabled:cursor-wait opacity-0 group-hover:opacity-100 disabled:opacity-40">
                                        <SparklesIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )}
                        </div>
                        )})}
                        {visibleStatsColumns.map(sc => { const value = getStatValue(row, sc.key, maxInQueue); return ( <div key={sc.key} className="px-6 py-2 whitespace-nowrap text-slate-500 align-middle flex-shrink-0 flex items-center" style={{width: '150px'}}> {sc.formatter ? sc.formatter(value) : (value ?? 'N/A')} </div> ); })}
                        <div className="px-4 py-2 w-24 flex-shrink-0 flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                           {table.audioConfig?.sourceColumn && (
                                <button onClick={(e) => onPlaySpeech(row, e)} className="text-slate-400 hover:text-cyan-600 invisible group-hover:visible p-1 rounded-full">
                                    {playingRowId === row.id ? <PauseIcon className="w-4 h-4"/> : <SpeakerIcon className="w-4 h-4"/>}
                                </button>
                            )}
                           <button onClick={() => onRowDelete(row.id)} className="text-slate-400 hover:text-red-500 invisible group-hover:visible p-1 rounded-full"> <TrashIcon className="w-4 h-4"/> </button>
                        </div>
                    </div>
                  </div> );
            })}
          </div>
        </div>
    )
};

const RelationsView: React.FC<{ relations: Relation[]; onCreate: () => void; onEdit: (relation: Relation) => void; onPreview: (relation: Relation) => void; onDelete: (relation: Relation) => void; onDesign: (relation: Relation) => void; }> = ({ relations, onCreate, onEdit, onPreview, onDelete, onDesign }) => (
  <div className="animate-scale-in p-1">
    <div className="flex justify-end mb-4"> <button onClick={onCreate} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105 flex items-center gap-2"> <PlusIcon className="w-5 h-5" /> Create New Relation </button> </div>
    <div className="space-y-4">
      {relations.map(relation => (
          <div key={relation.id} className="bg-white p-4 rounded-lg shadow border border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">{relation.name}</h3>
              <div className="text-sm text-slate-500 mt-2 flex items-center gap-2 flex-wrap"> <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">Q:</span> <span className="text-slate-600">{relation.questionCols.join(', ')}</span> <span className="text-cyan-600 font-bold text-lg mx-2">→</span> <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">A:</span> <span className="text-slate-600">{relation.answerCols.join(', ')}</span> </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-center">
                <button onClick={() => onPreview(relation)} className="bg-slate-100 hover:bg-slate-200 p-2 rounded-lg transition-colors" aria-label="Preview relation">
                    <EyeIcon className="w-5 h-5"/>
                </button>
                {relation.isCustom && (
                  <>
                    <button onClick={() => onDesign(relation)} className="bg-slate-100 hover:bg-slate-200 p-2 rounded-lg transition-colors" aria-label="Design relation">
                      <SparklesIcon className="w-5 h-5"/>
                    </button>
                    <button onClick={() => onEdit(relation)} className="bg-slate-100 hover:bg-slate-200 p-2 rounded-lg transition-colors" aria-label="Edit relation">
                      <EditIcon />
                    </button>
                    <button onClick={() => onDelete(relation)} className="bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 p-2 rounded-lg transition-colors" aria-label="Delete relation">
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </>
                )}
            </div>
          </div>
        ))}
        {relations.length === 0 && <p className="text-center text-slate-500 py-8">No relations created yet for this table.</p>}
    </div>
  </div>
);

const CardView: React.FC<{
    rows: VocabRow[];
    table: VocabTable;
    maxInQueue: number;
    visibleColumns: string[];
    onPlaySpeech: (row: VocabRow, e: React.MouseEvent) => void;
    playingRowId: string | null;
}> = ({ rows, table, maxInQueue, visibleColumns, onPlaySpeech, playingRowId }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [animationClass, setAnimationClass] = useState('animate-scale-in');
    const cardRef = useRef<HTMLDivElement>(null);
    const touchStartX = useRef(0);
    const touchMoveX = useRef(0);
    const isDragging = useRef(false);

    const goTo = useCallback((index: number, direction: 'next' | 'prev') => {
        if (index < 0 || index >= rows.length || index === currentIndex) return;
        setAnimationClass(direction === 'next' ? 'animate-slide-out-left' : 'animate-slide-out-right');
        setTimeout(() => {
            setCurrentIndex(index);
            setAnimationClass(direction === 'next' ? 'animate-slide-in-right' : 'animate-slide-in-left');
        }, 200);
    }, [rows.length, currentIndex]);

    const goToNext = useCallback(() => goTo(currentIndex + 1, 'next'), [currentIndex, goTo]);
    const goToPrev = useCallback(() => goTo(currentIndex - 1, 'prev'), [currentIndex, goTo]);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') goToNext();
            if (e.key === 'ArrowLeft') goToPrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goToNext, goToPrev]);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX; isDragging.current = true; if (cardRef.current) cardRef.current.style.transition = 'none';
    };
    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging.current) return; touchMoveX.current = e.touches[0].clientX; const deltaX = touchMoveX.current - touchStartX.current;
        if (cardRef.current) { cardRef.current.style.transform = `translateX(${deltaX}px)`; cardRef.current.style.opacity = `${1 - Math.abs(deltaX) / (cardRef.current.offsetWidth / 2)}`; }
    };
    const handleTouchEnd = () => {
        if (!isDragging.current) return; isDragging.current = false; const deltaX = touchMoveX.current - touchStartX.current; const threshold = 75;
        if (cardRef.current) { if (Math.abs(deltaX) > threshold) { if (deltaX > 0) goToPrev(); else goToNext(); } else { cardRef.current.style.transition = 'transform 0.3s ease, opacity 0.3s ease'; cardRef.current.style.transform = 'translateX(0px)'; cardRef.current.style.opacity = '1'; } }
        touchStartX.current = 0; touchMoveX.current = 0;
    };
    
    const currentRow = rows[currentIndex];
    if (!currentRow) return <div className="flex-grow flex items-center justify-center text-slate-500">No words to display in card view.</div>;

    return (
        <div className="flex-grow flex flex-col items-center justify-center md:p-4 relative">
            <div className="w-full max-w-2xl flex items-center justify-center gap-2">
                <button onClick={goToPrev} disabled={currentIndex === 0} className="p-2 rounded-full bg-white/70 hover:bg-white shadow-md disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeftIcon /></button>
                <div className="relative w-full h-[550px] overflow-hidden" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div key={currentRow.id} ref={cardRef} className={`absolute inset-0 bg-white rounded-xl shadow-lg border flex flex-col ${animationClass}`}>
                        <div className="p-6 flex-grow overflow-y-auto space-y-5">
                             {table.audioConfig?.sourceColumn && (
                                <button onClick={(e) => onPlaySpeech(currentRow, e)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-200 text-slate-500 hover:text-cyan-600">
                                    {playingRowId === currentRow.id ? <PauseIcon className="w-5 h-5" /> : <SpeakerIcon className="w-5 h-5" />}
                                </button>
                             )}
                            {table.columns.map(col => {
                                if (!visibleColumns.includes(col)) return null;
                                const value = currentRow.cols[col];
                                const isImageColumn = col === table.imageConfig?.imageColumn || (!table.imageConfig && col.toLowerCase() === 'image');

                                if (!value && !isImageColumn) return null;

                                return (
                                    <div key={col}>
                                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{col}</h3>
                                        {isImageColumn ? (
                                            value ? <img src={value} alt={col} className="mt-1 rounded-lg max-h-48 w-auto" /> : <div className="mt-1 text-slate-400 italic">No image</div>
                                        ) : (
                                            <p className="text-slate-700 mt-1 whitespace-pre-wrap">{value}</p>
                                        )}
                                    </div>
                                );
                            })}
                            <div className="pt-4 border-t">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Statistics</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                                    {STATS_COLUMNS.map(sc => { if (!visibleColumns.includes(sc.label)) return null; const value = getStatValue(currentRow, sc.key, maxInQueue) ?? (sc.dataType === 'string' ? null : 0); const formattedValue = sc.formatter ? sc.formatter(value) : (value ?? 'N/A'); return (<div key={sc.key} className="truncate"><p className="text-xs text-slate-500 truncate">{sc.label}</p><p className="font-semibold text-slate-700 text-base">{String(formattedValue)}</p></div>);})}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <button onClick={goToNext} disabled={currentIndex === rows.length - 1} className="p-2 rounded-full bg-white/70 hover:bg-white shadow-md disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRightIcon /></button>
            </div>
            <div className="mt-4 font-semibold text-slate-600">{currentIndex + 1} / {rows.length}</div>
        </div>
    );
};

const ShareModal: React.FC<{ isOpen: boolean; onClose: () => void; table: VocabTable; user: User; }> = ({ isOpen, onClose, table, user }) => {
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [isSharing, setIsSharing] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            setDescription('');
            setTags('');
            setIsSharing(false);
            setFeedback(null);
        }
    }, [isOpen]);

    const handleShare = async () => {
        if (!description.trim() || !tags.trim()) {
            setFeedback({ type: 'error', message: 'Please provide a description and at least one tag.' });
            return;
        }
        setIsSharing(true);
        setFeedback(null);

        const sanitizedRows = table.rows.map(row => ({
            ...row,
            stats: { ...defaultStats }, // Reset stats for sharing
        }));

        const table_data = {
            columns: table.columns,
            rows: sanitizedRows,
        };

        const { error } = await supabase.from('library_tables').insert({
            name: table.name,
            description,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            word_count: table.wordCount,
            author_id: user.id,
            author_name: user.email,
            table_data,
        });

        setIsSharing(false);
        if (error) {
            setFeedback({ type: 'error', message: `Failed to share: ${error.message}` });
        } else {
            setFeedback({ type: 'success', message: 'Table shared successfully!' });
            setTimeout(onClose, 2000);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Share "${table.name}"`}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full h-24 px-3 py-2 text-slate-700 border border-slate-300 rounded-md" placeholder="What is this table about? Who is it for?" />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Tags</label>
                    <input type="text" value={tags} onChange={e => setTags(e.target.value)} className="w-full px-3 py-2 text-slate-700 border border-slate-300 rounded-md" placeholder="e.g., English, C1, Science" />
                    <p className="text-xs text-slate-500 mt-1">Separate tags with commas.</p>
                </div>
                {feedback && <div className={`p-3 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{feedback.message}</div>}
                <div className="flex justify-end gap-4 pt-4 border-t">
                    <button onClick={onClose} disabled={isSharing} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-6 rounded-lg">Cancel</button>
                    <button onClick={handleShare} disabled={isSharing} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg disabled:bg-slate-300 flex items-center justify-center gap-2">
                        {isSharing ? <SpinnerIcon className="w-5 h-5 animate-spin-fast" /> : <UploadIcon />}
                        Share
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const SelectionActionBar: React.FC<{
  selectedCount: number;
  onDelete: () => void;
  onDeselectAll: () => void;
}> = ({ selectedCount, onDelete, onDeselectAll }) => {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-16 left-0 right-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] z-45 animate-slide-in-up">
      <div className="container mx-auto px-4 h-16 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onDeselectAll} className="p-2 rounded-full hover:bg-slate-100" aria-label="Deselect all">
            <XCircleIcon className="w-6 h-6 text-slate-500" />
          </button>
          <span className="font-semibold text-slate-700">{selectedCount} item{selectedCount > 1 ? 's' : ''} selected</span>
        </div>
        <button
          onClick={onDelete}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg shadow-md flex items-center gap-2"
        >
          <TrashIcon className="w-5 h-5" />
          Delete ({selectedCount})
        </button>
      </div>
    </div>
  );
};

const UndoToast: React.FC<{ count: number; onUndo: () => void; isColumn?: boolean; }> = ({ count, onUndo, isColumn = false }) => (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-800 text-white py-3 px-6 rounded-lg shadow-lg flex items-center gap-4 animate-slide-in-up z-50">
      <span>{count} {isColumn ? (count > 1 ? 'columns' : 'column') : (count > 1 ? 'words' : 'word')} deleted.</span>
      <button onClick={onUndo} className="font-bold text-cyan-400 hover:text-cyan-300">Undo</button>
    </div>
);


// --- Props & Main Component ---
interface TableDetailViewProps {
  table: VocabTable;
  onBack: () => void;
  onUpdateTable: (updatedTable: VocabTable) => void;
  onDeleteTable: (tableId: string) => void;
  relations: Relation[];
  setRelations: React.Dispatch<React.SetStateAction<Relation[]>>;
  user: User | null;
  appSettings: AppSettings;
  onSubScreenChange: (subScreen: string | null) => void;
  showToast: (message: string) => void;
}
export const TableDetailView: React.FC<TableDetailViewProps> = ({ table, onBack, onUpdateTable, onDeleteTable, relations, setRelations, user, appSettings, onSubScreenChange, showToast }) => {
    const [activeTab, setActiveTab] = useState<'view' | 'relations' | 'settings'>('view');
    const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
    const [isRelationModalOpen, setIsRelationModalOpen] = useState(false);
    const [relationToEdit, setRelationToEdit] = useState<Relation | null>(null);
    const [relationToDelete, setRelationToDelete] = useState<Relation | null>(null);
    const [relationToPreview, setRelationToPreview] = useState<Relation | null>(null);
    const [relationToDesign, setRelationToDesign] = useState<Relation | null>(null);
    const [viewSettings, setViewSettings] = useState<ViewSettings>({ visibleColumns: [...table.columns, ...STATS_COLUMNS.map(sc => sc.label)], filters: [], sorts: [], searchQuery: '' });
    const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
    const [wordIdInDetailModal, setWordIdInDetailModal] = useState<string | null>(null);
    const [imageModalContext, setImageModalContext] = useState<{ rowId: string; searchTerm: string; imageColumn: string; } | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isAiPromptModalOpen, setIsAiPromptModalOpen] = useState(false);
    const [columnForAiConfig, setColumnForAiConfig] = useState<string | null>(null);
    const [generatingCells, setGeneratingCells] = useState<Record<string, boolean>>({});
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [undoState, setUndoState] = useState<{ deletedRows: VocabRow[]; timerId: number | null }>({ deletedRows: [], timerId: null });
    const [undoColumnState, setUndoColumnState] = useState<{ deletedColumn: { name: string; index: number; data: (string|undefined)[] }; timerId: number | null } | null>(null);
    const topScrollRef = useRef<HTMLDivElement>(null);
    const [isColumnEditorOpen, setIsColumnEditorOpen] = useState(false);
    const [playingRowId, setPlayingRowId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string, key: number } | null>(null);
    const [isAiRunning, setIsAiRunning] = useState(false);
    const [aiProgress, setAiProgress] = useState({ processed: 0, total: 0 });
    const [isRunAiModalOpen, setIsRunAiModalOpen] = useState(false);
    const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);

    const [audioConfigForm, setAudioConfigForm] = useState(table.audioConfig || { sourceColumn: '', language: 'en-US' });
    const [imageConfigForm, setImageConfigForm] = useState(table.imageConfig || { sourceColumn: '', imageColumn: '' });

    const showLocalToast = (message: string) => {
        setToast({ message, key: Date.now() });
        setTimeout(() => {
            setToast(null);
        }, 3000);
    };

    useEffect(() => {
        let subScreenName = `Table Detail View ("${table.name}")`;

        if (isRelationModalOpen) {
            subScreenName = relationToEdit ? 'Edit Relation Modal' : 'Create Relation Modal';
        } else if (wordIdInDetailModal) {
            const word = table.rows.find(r => r.id === wordIdInDetailModal);
            subScreenName = `Word Detail Modal ("${word?.cols[table.columns[0]] || 'New Word'}")`;
        } else if (relationToDelete) {
            subScreenName = `Confirm Delete Relation Modal ("${relationToDelete.name}")`;
        } else if (relationToPreview) {
            subScreenName = `Relation Preview Modal ("${relationToPreview.name}")`;
        } else if (relationToDesign) {
            subScreenName = `Relation Designer Modal ("${relationToDesign.name}")`;
        } else if (isAddColumnModalOpen) {
            subScreenName = 'Add Column Modal';
        } else if (imageModalContext) {
            subScreenName = 'Image Input Modal';
        } else if (isAiPromptModalOpen) {
            subScreenName = `AI Prompt Config Modal ("${columnForAiConfig}")`;
        } else if (isShareModalOpen) {
            subScreenName = 'Share to Library Modal';
        } else if (isColumnEditorOpen) {
            subScreenName = 'Table Column Editor';
        } else if (isRunAiModalOpen) {
            subScreenName = 'Confirm Run AI Modal';
        } else if (isQuickAddModalOpen) {
            subScreenName = 'Quick Add Modal';
        } else {
            if (activeTab === 'relations') {
                subScreenName += ' - Relations Tab';
            } else if (activeTab === 'settings') {
                subScreenName += ' - Settings Tab';
            } else {
                subScreenName += ' - View Tab';
            }
        }
    
        onSubScreenChange(subScreenName);
        
        return () => {
            onSubScreenChange(null);
        };
    }, [
        table, activeTab, isRelationModalOpen, relationToEdit, wordIdInDetailModal, relationToDelete,
        relationToPreview, relationToDesign, isAddColumnModalOpen, imageModalContext,
        isAiPromptModalOpen, columnForAiConfig, isShareModalOpen, isColumnEditorOpen, onSubScreenChange, isRunAiModalOpen, isQuickAddModalOpen
    ]);

    useEffect(() => {
        setAudioConfigForm(table.audioConfig || { sourceColumn: '', language: 'en-US' });
        setImageConfigForm(table.imageConfig || { sourceColumn: '', imageColumn: '' });
    }, [table.audioConfig, table.imageConfig]);
    
    const handlePlaySpeech = (row: VocabRow, e: React.MouseEvent) => {
        e.stopPropagation();
        if (playingRowId === row.id) {
            stopSpeech();
            setPlayingRowId(null);
            return;
        }

        if (!table.audioConfig?.sourceColumn) {
            showLocalToast("Audio source column is not configured in settings.");
            return;
        }
        const text = row.cols[table.audioConfig.sourceColumn];
        if (!text) {
            showLocalToast("Source text is empty for this row.");
            return;
        }
        setPlayingRowId(row.id);
        playSpeech(text, table.audioConfig.language, appSettings.audioPlaybackRate)
            .then(() => {
                setPlayingRowId(null);
            })
            .catch(err => {
                showLocalToast(`Speech error: ${err}`);
                setPlayingRowId(null);
            });
    };

    useEffect(() => {
        // Cleanup function to stop any lingering speech when component unmounts
        return () => {
            stopSpeech();
        };
    }, []);

    const handleSaveAudioConfig = () => {
        onUpdateTable({ ...table, audioConfig: audioConfigForm });
    };

    const handleRemoveAudioConfig = () => {
        onUpdateTable({ ...table, audioConfig: undefined });
    };

    const handleSaveImageConfig = () => {
        onUpdateTable({ ...table, imageConfig: imageConfigForm });
    };

    const handleRemoveImageConfig = () => {
        onUpdateTable({ ...table, imageConfig: undefined });
    };


    useEffect(() => {
        return () => {
            if (undoState.timerId) clearTimeout(undoState.timerId);
            if (undoColumnState?.timerId) clearTimeout(undoColumnState.timerId);
        };
    }, [undoState.timerId, undoColumnState]);

    const handleUndoColumnDelete = useCallback(() => {
        if (!undoColumnState) return;
        if (undoColumnState.timerId) {
            clearTimeout(undoColumnState.timerId);
        }

        if (undoColumnState.deletedColumn) {
            const { name, index, data } = undoColumnState.deletedColumn;
            
            const restoredColumns = [...table.columns];
            restoredColumns.splice(index, 0, name);
            
            const restoredRows = table.rows.map((row, rowIndex) => {
                const orderedCols: { [key: string]: string } = {};
                restoredColumns.forEach(colName => {
                    if (colName === name) {
                        orderedCols[colName] = data[rowIndex] || '';
                    } else if (row.cols.hasOwnProperty(colName)) {
                        orderedCols[colName] = row.cols[colName];
                    }
                });
                return { ...row, cols: orderedCols };
            });

            onUpdateTable({
                ...table,
                columns: restoredColumns,
                rows: restoredRows
            });

            setViewSettings(vs => ({
                ...vs,
                visibleColumns: [...vs.visibleColumns, name]
            }));
        }

        setUndoColumnState(null);
    }, [undoColumnState, table, onUpdateTable]);

    const handleColumnDelete = useCallback((columnName: string) => {
        const columnIndex = table.columns.findIndex(c => c === columnName);
        if (columnIndex === -1) return;

        const relationsUsingColumn = relations.filter(r => r.tableId === table.id && (r.questionCols.includes(columnName) || r.answerCols.includes(columnName)));

        let confirmMessage = `Are you sure you want to delete the column "${columnName}"? This action can be undone for a short period.`;
        if (relationsUsingColumn.length > 0) {
            confirmMessage += `\n\nWarning: This column is used in ${relationsUsingColumn.length} relation(s). Those relations will be updated, which cannot be undone.`;
        }
        
        if (!window.confirm(confirmMessage)) {
            return;
        }

        if (undoColumnState?.timerId) {
            clearTimeout(undoColumnState.timerId);
        }
        const columnData = table.rows.map(row => row.cols[columnName]);

        const newColumns = table.columns.filter(c => c !== columnName);
        const newRows = table.rows.map(row => {
            const newCols = { ...row.cols };
            delete newCols[columnName];
            return { ...row, cols: newCols };
        });

        const newAiPrompts = { ...table.aiPrompts };
        delete newAiPrompts[columnName];

        onUpdateTable({ ...table, columns: newColumns, rows: newRows, aiPrompts: newAiPrompts });

        const relationsForThisTable = relations.filter(r => r.tableId === table.id);
        const otherRelations = relations.filter(r => r.tableId !== table.id);
        const updatedRelationsForThisTable = relationsForThisTable
            .map(r => ({
                ...r,
                questionCols: r.questionCols.filter(c => c !== columnName),
                answerCols: r.answerCols.filter(c => c !== columnName),
            }))
            .filter(r => r.questionCols.length > 0 && r.answerCols.length > 0);
        setRelations([...otherRelations, ...updatedRelationsForThisTable]);

        setViewSettings(vs => ({
            ...vs,
            visibleColumns: vs.visibleColumns.filter(c => c !== columnName),
            filters: vs.filters.filter(f => f.column !== columnName),
            sorts: vs.sorts.filter(s => s.column !== columnName)
        }));

        const newTimerId = window.setTimeout(() => {
            setUndoColumnState(null);
        }, 7000);

        setUndoColumnState({
            deletedColumn: { name: columnName, index: columnIndex, data: columnData },
            timerId: newTimerId
        });
    }, [table, relations, onUpdateTable, setRelations, undoColumnState]);

    const allColumns = useMemo<ColumnInfo[]>(() => { const tableCols: ColumnInfo[] = table.columns.map(c => ({ key: c, label: c, type: 'col', dataType: 'string' })); const statCols: ColumnInfo[] = STATS_COLUMNS.map(sc => ({ key: sc.key, label: sc.label, type: 'stat', dataType: sc.dataType })); return [...tableCols, ...statCols]; }, [table.columns]);
    const maxInQueue = useMemo(() => Math.max(...table.rows.map(r => r.stats.InQueue), 0) || 1, [table.rows]);
    
    const visibleTableColumns = useMemo(() => table.columns.filter(c => viewSettings.visibleColumns.includes(c)), [table.columns, viewSettings.visibleColumns]);
    const visibleStatsColumns = useMemo(() => STATS_COLUMNS.filter(sc => viewSettings.visibleColumns.includes(sc.label)), [viewSettings.visibleColumns]);

    const totalContentWidth = useMemo(() => {
        const checkboxWidth = 48;
        const firstColWidth = visibleTableColumns.length > 0 ? 250 : 0;
        const otherColsWidth = Math.max(0, visibleTableColumns.length - 1) * 200;
        const statsColsWidth = visibleStatsColumns.length * 150;
        const actionColWidth = 64;
        return checkboxWidth + firstColWidth + otherColsWidth + statsColsWidth + actionColWidth;
    }, [visibleTableColumns, visibleStatsColumns]);

    useEffect(() => {
        const topScroll = topScrollRef.current;
        const mainScroll = scrollContainerRef.current;
        if (!topScroll || !mainScroll) return;

        let isSyncing = false;

        const syncScroll = (source: 'top' | 'main') => {
            if (isSyncing) return;
            isSyncing = true;
            
            if (source === 'top') {
                mainScroll.scrollLeft = topScroll.scrollLeft;
            } else {
                topScroll.scrollLeft = mainScroll.scrollLeft;
            }
            
            requestAnimationFrame(() => { isSyncing = false; });
        };

        const handleTopScroll = () => syncScroll('top');
        const handleMainScroll = () => syncScroll('main');

        topScroll.addEventListener('scroll', handleTopScroll);
        mainScroll.addEventListener('scroll', handleMainScroll);

        return () => {
            topScroll.removeEventListener('scroll', handleTopScroll);
            mainScroll.removeEventListener('scroll', handleMainScroll);
        };
    }, []);

    const processedRows = useMemo(() => {
        let filteredRows = [...table.rows];
        if (viewSettings.searchQuery) { const query = viewSettings.searchQuery.toLowerCase(); filteredRows = filteredRows.filter(row => Object.values(row.cols).some(val => String(val).toLowerCase().includes(query))); }
        if (viewSettings.filters.length > 0) { filteredRows = filteredRows.filter(row => viewSettings.filters.every(filter => { const colInfo = allColumns.find(c => c.label === filter.column); if (!colInfo) return true; let value: any = colInfo.type === 'col' ? row.cols[colInfo.key] : getStatValue(row, colInfo.key, maxInQueue); const filterValue = filter.value; if (filter.operator === 'is_empty') return !value; if (filter.operator === 'is_not_empty') return !!value; if (!value && value !== 0) return false;
                switch (colInfo.dataType) {
                    case 'string': const strValue = String(value).toLowerCase(); const fStrValue = filterValue.toLowerCase(); if (filter.operator === 'contains') return strValue.includes(fStrValue); if (filter.operator === 'not_contains') return !strValue.includes(fStrValue); if (filter.operator === 'is') return strValue === fStrValue; if (filter.operator === 'is_not') return strValue !== fStrValue; break;
                    case 'number': const numValue = Number(value); const fNumValue = Number(filterValue); if (isNaN(numValue) || isNaN(fNumValue)) return false; if (filter.operator === 'equals') return numValue === fNumValue; if (filter.operator === 'not_equals') return numValue !== fNumValue;
                    if (filter.operator === 'greater_than') return numValue > fNumValue;
                    if (filter.operator === 'less_than') return numValue < fNumValue; break;
                    case 'boolean': const boolValue = value === true; const fBoolValue = filterValue === 'true'; if (filter.operator === 'is') return boolValue === fBoolValue; break;
                } return true; }));
        }
        if (viewSettings.sorts.length > 0) { filteredRows.sort((a, b) => { for (const sortRule of viewSettings.sorts) { const colInfo = allColumns.find(c => c.label === sortRule.column); if (!colInfo) continue; let valA: any, valB: any; if (colInfo.type === 'col') { valA = a.cols[colInfo.key]; valB = b.cols[colInfo.key]; } else { valA = getStatValue(a, colInfo.key, maxInQueue); valB = getStatValue(b, colInfo.key, maxInQueue); } let comparison = 0; if (valA === null || valA === undefined) valA = colInfo.dataType === 'number' ? -Infinity : ''; if (valB === null || valB === undefined) valB = colInfo.dataType === 'number' ? -Infinity : ''; if (colInfo.dataType === 'number') { comparison = Number(valA) - Number(valB); } else if (colInfo.dataType === 'date') { const dateA = new Date(valA).getTime() || 0; const dateB = new Date(valB).getTime() || 0; comparison = dateA - dateB; } else { comparison = String(valA).localeCompare(String(valB)); } if (comparison !== 0) return sortRule.direction === 'asc' ? comparison : -comparison; } return 0; }); }
        return filteredRows;
    }, [table.rows, viewSettings, allColumns, maxInQueue]);

    const handleUndoDelete = () => {
        if (undoState.timerId) clearTimeout(undoState.timerId);
        if (undoState.deletedRows.length > 0) {
            onUpdateTable({ ...table, rows: [...table.rows, ...undoState.deletedRows], wordCount: table.rows.length + undoState.deletedRows.length, });
        }
        setUndoState({ deletedRows: [], timerId: null });
    };

    const triggerUndoableDelete = (rowsToDelete: VocabRow[]) => {
        if (rowsToDelete.length === 0) return;
        if (undoState.timerId) clearTimeout(undoState.timerId);
        const rowsToDeleteIds = new Set(rowsToDelete.map(r => r.id));
        onUpdateTable({ ...table, rows: table.rows.filter(row => !rowsToDeleteIds.has(row.id)), wordCount: table.rows.length - rowsToDelete.length });
        const newTimerId = window.setTimeout(() => { setUndoState({ deletedRows: [], timerId: null }); }, 7000);
        setUndoState({ deletedRows: rowsToDelete, timerId: newTimerId });
        setSelectedRowIds(prev => { const newSet = new Set(prev); rowsToDeleteIds.forEach(id => newSet.delete(id)); return newSet; });
        setWordIdInDetailModal(null);
    };

    const handleRowUpdate = (rowId: string, column: string, value: string) => onUpdateTable({ ...table, rows: table.rows.map(row => row.id === rowId ? { ...row, cols: { ...row.cols, [column]: value } } : row) });
    const handleRowDelete = (rowId: string) => { const rowToDelete = table.rows.find(row => row.id === rowId); if (rowToDelete) triggerUndoableDelete([rowToDelete]); };
    const handleDeleteSelectedRows = () => { if (selectedRowIds.size > 0) { const rowsToDelete = table.rows.filter(row => selectedRowIds.has(row.id)); triggerUndoableDelete(rowsToDelete); } };
    const handleAddColumn = (columnName: string) => { onUpdateTable({ ...table, columns: [...table.columns, columnName], rows: table.rows.map(row => ({ ...row, cols: { ...row.cols, [columnName]: '' } })) }); setViewSettings(vs => ({...vs, visibleColumns: [...vs.visibleColumns, columnName]})); };
    const handleAddNewColumn = (columnName: string) => {
        const updatedTable: VocabTable = {
            ...table,
            columns: [...table.columns, columnName],
            rows: table.rows.map(row => ({
                ...row,
                cols: {
                    ...row.cols,
                    [columnName]: '',
                }
            }))
        };
        onUpdateTable(updatedTable);
        setIsAddColumnModalOpen(false);
    };
    
    const handleAddRow = () => { const newRow: VocabRow = { id: `row-${Date.now()}`, cols: table.columns.reduce((acc, col) => ({ ...acc, [col]: '' }), {}), stats: { ...defaultStats }, tags: [] }; onUpdateTable({ ...table, rows: [newRow, ...table.rows], wordCount: table.wordCount + 1 }); setWordIdInDetailModal(newRow.id); };
    const handleBulkAddRows = (newRows: VocabRow[]) => {
        onUpdateTable({
            ...table,
            rows: [...newRows, ...table.rows],
            wordCount: table.wordCount + newRows.length,
        });
        showToast(`Added ${newRows.length} new words!`);
    };
    const handleSaveRelation = (relationData: Omit<Relation, 'id' | 'isCustom'> & { id?: string }) => { if (relationData.id) { setRelations(prev => prev.map(r => r.id === relationData.id ? { ...r, ...relationData } as Relation : r)); } else { setRelations(prev => [...prev, { ...relationData, id: `rel-custom-${Date.now()}`, tableId: table.id, isCustom: true }]); } };
    const handleUpdateRelation = (updatedRelation: Relation) => { setRelations(currentRelations => currentRelations.map(r => (r.id === updatedRelation.id ? updatedRelation : r))); };
    const handleDeleteRelation = (relationId: string) => { setRelations(prev => prev.filter(r => r.id !== relationId)); setRelationToDelete(null); };
    const handleToggleSelectAll = () => { if (processedRows.length > 0 && processedRows.every(row => selectedRowIds.has(row.id))) { setSelectedRowIds(new Set()); } else { setSelectedRowIds(new Set(processedRows.map(row => row.id))); } };
    const handleSort = (columnLabel: string) => { setViewSettings(prev => { const newSorts = [...prev.sorts]; const existingSortIndex = newSorts.findIndex(s => s.column === columnLabel); if (existingSortIndex > -1) { if (newSorts[existingSortIndex].direction === 'desc') { newSorts.splice(existingSortIndex, 1); } else { newSorts[existingSortIndex] = { ...newSorts[existingSortIndex], direction: 'desc' }; } } else { if (newSorts.length < 3) newSorts.push({ id: `sort-${Date.now()}`, column: columnLabel, direction: 'asc' }); } return { ...prev, sorts: newSorts }; }); };
    const tableRelations = useMemo(() => relations.filter(r => r.tableId === table.id), [relations, table.id]);
    const wordInDetail = useMemo(() => table.rows.find(r => r.id === wordIdInDetailModal), [table.rows, wordIdInDetailModal]);

    const handleOpenImageModal = (rowId: string) => {
        const row = table.rows.find(r => r.id === rowId);
        if (!row) return;
        const imageColumn = table.imageConfig?.imageColumn || table.columns.find(c => c.toLowerCase() === 'image') || '';
        const sourceColumn = table.imageConfig?.sourceColumn || table.columns[0];
        const searchTerm = row.cols[sourceColumn] || '';
        setImageModalContext({ rowId, searchTerm, imageColumn });
    };

    const handleSaveAiPrompt = (column: string, prompt: string) => { const newAiPrompts = { ...table.aiPrompts, [column]: prompt }; onUpdateTable({ ...table, aiPrompts: newAiPrompts }); };
    const handleRemoveAiPrompt = (column: string) => { const newAiPrompts = { ...table.aiPrompts }; delete newAiPrompts[column]; onUpdateTable({ ...table, aiPrompts: newAiPrompts }); };
    
    const handleGenerateAiContent = async (row: VocabRow, column: string) => {
        if (!appSettings.userApiKey) {
            showLocalToast("Please set your Gemini API key in Settings.");
            return;
        }
        const promptTemplate = table.aiPrompts?.[column];
        if (!promptTemplate) {
            showLocalToast("AI prompt not configured.");
            return;
        }

        const cellId = `${row.id}-${column}`;
        setGeneratingCells(prev => ({ ...prev, [cellId]: true }));
        try {
            const filledPrompt = promptTemplate.replace(/\{([^}]+)\}/g, (match, colName) => row.cols[colName] || '');
            const result = await generateAiContent(filledPrompt, appSettings.userApiKey);
            handleRowUpdate(row.id, column, result);
        } catch (e: any) {
            showLocalToast(`AI Error: ${e.message}`);
        } finally {
            setGeneratingCells(prev => {
                const newStatus = { ...prev };
                delete newStatus[cellId];
                return newStatus;
            });
        }
    };

    const tableActiveRelations = useMemo(() => relations.filter(r => r.tableId === table.id), [relations, table.id]);

    const handleColumnReorder = (newColumns: string[]) => {
        onUpdateTable({ ...table, columns: newColumns });
    };

    const fillableCells = useMemo(() => {
        if (!table.aiPrompts) return [];
        const imageColumnName = table.imageConfig?.imageColumn;
        const cells: { rowId: string; column: string }[] = [];
        for (const row of table.rows) {
            for (const column in table.aiPrompts) {
                if (Object.prototype.hasOwnProperty.call(table.aiPrompts, column)) {
                    const hasPrompt = !!table.aiPrompts[column];
                    const isCellEmpty = !row.cols[column]?.trim();
                    if (hasPrompt && isCellEmpty && column !== imageColumnName) {
                        cells.push({ rowId: row.id, column });
                    }
                }
            }
        }
        return cells;
    }, [table.rows, table.aiPrompts, table.imageConfig]);
    
    const fillableColumnsSummary = useMemo(() => {
        return fillableCells.reduce((acc, cell) => {
            acc[cell.column] = (acc[cell.column] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }, [fillableCells]);

    const handleStartRunAi = () => {
        if (fillableCells.length > 0) {
            setSelectedColumnsForAi(new Set(Object.keys(fillableColumnsSummary)));
            setIsRunAiModalOpen(true);
        }
    };

    const handleConfirmRunAi = async () => {
        if (isAiRunning || !appSettings.userApiKey) {
            if (!appSettings.userApiKey) {
                showLocalToast("Please set your Gemini API key in Settings.");
            }
            setIsRunAiModalOpen(false);
            return;
        }
        
        const filteredFillableCells = fillableCells.filter(cell => selectedColumnsForAi.has(cell.column));
        const batch = filteredFillableCells.slice(0, 5);
        
        if (batch.length === 0) {
            setIsRunAiModalOpen(false);
            return;
        }

        setIsRunAiModalOpen(false);
        setIsAiRunning(true);
        setAiProgress({ processed: 0, total: batch.length });

        const newGeneratingCells: Record<string, boolean> = {};
        batch.forEach(cell => {
            newGeneratingCells[`${cell.rowId}-${cell.column}`] = true;
        });
        setGeneratingCells(prev => ({ ...prev, ...newGeneratingCells }));

        const promises = batch.map(cell => {
            const row = table.rows.find(r => r.id === cell.rowId);
            const promptTemplate = table.aiPrompts?.[cell.column];
            if (!row || !promptTemplate) {
                return Promise.resolve({ ...cell, status: 'rejected', reason: new Error("Missing row or prompt") });
            }
            const filledPrompt = promptTemplate.replace(/\{([^}]+)\}/g, (_, colName) => row.cols[colName] || '');
            
            return generateAiContent(filledPrompt, appSettings.userApiKey)
                .then(result => {
                    setAiProgress(prev => ({ ...prev, processed: prev.processed + 1 }));
                    return { ...cell, status: 'fulfilled', value: result };
                })
                .catch(error => {
                    setAiProgress(prev => ({ ...prev, processed: prev.processed + 1 }));
                    return { ...cell, status: 'rejected', reason: error };
                });
        });

        const results = await Promise.all(promises);
        
        const successfulUpdates: Record<string, Record<string, string>> = {};

        let successCount = 0;

        results.forEach(result => {
            if (result.status === 'fulfilled') {
                if (!successfulUpdates[result.rowId]) {
                    successfulUpdates[result.rowId] = {};
                }
                successfulUpdates[result.rowId][result.column] = result.value;
                successCount++;
            } else {
                console.error(`Failed to generate for ${result.rowId}-${result.column}:`, result.reason);
            }
        });
        
        if (successCount > 0) {
            const updatedRows = table.rows.map(row => {
                if (successfulUpdates[row.id]) {
                    const newCols = { ...row.cols, ...successfulUpdates[row.id] };
                    return { ...row, cols: newCols };
                }
                return row;
            });
            onUpdateTable({ ...table, rows: updatedRows });
        }
        
        showLocalToast(`Successfully filled ${successCount} out of ${batch.length} cells.`);

        setGeneratingCells(prev => {
            const newStatus = { ...prev };
            batch.forEach(cell => {
                delete newStatus[`${cell.rowId}-${cell.column}`];
            });
            return newStatus;
        });
        setIsAiRunning(false);
    };


    return (
        <div className="flex flex-col h-full bg-slate-100">
            {toast && (
                <div key={toast.key} className="fixed top-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-sm font-semibold py-2 px-4 rounded-full shadow-lg z-50 animate-toast-in-out">
                    {toast.message}
                </div>
            )}
            <header className="flex-shrink-0 bg-white border-b border-slate-200">
                <div className="flex items-center gap-2 p-2">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100">
                        <ChevronLeftIcon />
                    </button>
                    <div className="flex-grow min-w-0">
                        <h1 className="text-xl font-bold text-slate-800 truncate">{table.name}</h1>
                        <p className="text-sm text-slate-500">{table.wordCount} words</p>
                    </div>
                    {user && (
                        <button onClick={() => setIsShareModalOpen(true)} className="flex-shrink-0 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold py-2 px-3 rounded-md flex items-center gap-2">
                            <UploadIcon />
                        </button>
                    )}
                </div>
                <div className="flex px-2 border-t">
                    <button onClick={() => setActiveTab('view')} className={`flex-1 py-2 text-sm font-semibold ${activeTab === 'view' ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-slate-500'}`}>View</button>
                    <button onClick={() => setActiveTab('relations')} className={`flex-1 py-2 text-sm font-semibold ${activeTab === 'relations' ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-slate-500'}`}>Relations</button>
                    <button onClick={() => setActiveTab('settings')} className={`flex-1 py-2 text-sm font-semibold ${activeTab === 'settings' ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-slate-500'}`}>Settings</button>
                </div>
            </header>
            
            {activeTab === 'view' && (
                <div className="flex-grow flex flex-col min-h-0">
                    <div className="flex-shrink-0 p-2 bg-slate-100 border-b border-slate-200 flex flex-wrap gap-2 justify-start items-center">
                        <button onClick={handleAddRow} className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-sm font-semibold py-1.5 px-3 rounded-md flex items-center gap-2"> <PlusIcon className="w-5 h-5" /> Add Word </button>
                        <button onClick={() => setIsQuickAddModalOpen(true)} className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-sm font-semibold py-1.5 px-3 rounded-md flex items-center gap-2"> <SparklesIcon className="w-5 h-5" /> Quick Add </button>
                        <button onClick={handleStartRunAi} disabled={isAiRunning || fillableCells.length === 0} className="relative bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-sm font-semibold py-1.5 px-3 rounded-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isAiRunning ? (
                                <>
                                    <SpinnerIcon className="w-5 h-5 animate-spin-fast" />
                                    Processing... ({aiProgress.processed}/{aiProgress.total})
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-5 h-5" /> Run AI
                                    {fillableCells.length > 0 && (
                                        <span className="absolute -top-2 -right-2 w-5 h-5 bg-cyan-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-slate-100">
                                            {fillableCells.length > 99 ? '99+' : fillableCells.length}
                                        </span>
                                    )}
                                </>
                            )}
                        </button>
                        <div className="relative flex-grow min-w-[150px] max-w-sm"> <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /> <input type="text" placeholder="Search..." value={viewSettings.searchQuery} onChange={e => setViewSettings({ ...viewSettings, searchQuery: e.target.value })} className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-md" /> </div>
                        <div className="flex-grow"></div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setViewMode(prev => prev === 'table' ? 'card' : 'table')} className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 p-2 rounded-md">
                                {viewMode === 'table' ? <CardViewIcon /> : <TableViewIcon />}
                            </button>
                            <Dropdown isOpen={activeDropdown === 'filter'} onToggle={() => setActiveDropdown(p => p === 'filter' ? null : 'filter')} trigger={<button className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 p-2 rounded-md relative"> <FilterIcon className="w-5 h-5" /> {viewSettings.filters.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{viewSettings.filters.length}</span>} </button>}>
                                <div className="space-y-3"> {viewSettings.filters.map((filter, index) => { const colInfo = allColumns.find(c => c.label === filter.column); return ( <div key={filter.id} className="flex items-center gap-2 text-sm"> <select value={filter.column} onChange={e => setViewSettings(vs => { const newFilters = [...vs.filters]; newFilters[index].column = e.target.value; return {...vs, filters: newFilters}; })} className="p-1 border rounded-md"> {allColumns.map(c => <option key={c.key} value={c.label}>{c.label}</option>)} </select> <select value={filter.operator} onChange={e => setViewSettings(vs => { const newFilters = [...vs.filters]; newFilters[index].operator = e.target.value as FilterOperator; return {...vs, filters: newFilters}; })} className="p-1 border rounded-md"> {colInfo && OPERATORS[colInfo.dataType].map(op => <option key={op.value} value={op.value}>{op.label}</option>)} </select> <input type="text" value={filter.value} onChange={e => setViewSettings(vs => { const newFilters = [...vs.filters]; newFilters[index].value = e.target.value; return {...vs, filters: newFilters}; })} className="p-1 border rounded-md flex-grow" disabled={filter.operator === 'is_empty' || filter.operator === 'is_not_empty'} /> <button onClick={() => setViewSettings(vs => ({...vs, filters: vs.filters.filter(f => f.id !== filter.id)}))} className="p-1 text-slate-400 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button> </div> )})} <button onClick={() => setViewSettings(vs => ({...vs, filters: [...vs.filters, {id: `filter-${Date.now()}`, column: allColumns[0].label, operator: 'contains', value: ''}]}))} className="w-full text-sm bg-slate-100 hover:bg-slate-200 py-1.5 rounded-md">Add Filter</button> </div>
                            </Dropdown>
                            <Dropdown isOpen={activeDropdown === 'sort'} onToggle={() => setActiveDropdown(p => p === 'sort' ? null : 'sort')} trigger={<button className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 p-2 rounded-md relative"> <SortAscIcon className="w-5 h-5" /> {viewSettings.sorts.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{viewSettings.sorts.length}</span>} </button>}>
                                <div className="space-y-3"> {viewSettings.sorts.map((sort, index) => ( <div key={sort.id} className="flex items-center gap-2 text-sm"> <select value={sort.column} onChange={e => setViewSettings(vs => { const newSorts = [...vs.sorts]; newSorts[index].column = e.target.value; return {...vs, sorts: newSorts}; })} className="p-1 border rounded-md"> {allColumns.map(c => <option key={c.key} value={c.label}>{c.label}</option>)} </select> <div className="flex"> <button onClick={() => setViewSettings(vs => { const newSorts = [...vs.sorts]; newSorts[index].direction = 'asc'; return {...vs, sorts: newSorts}; })} className={`p-1 border rounded-l-md ${sort.direction === 'asc' ? 'bg-cyan-100' : ''}`}><ArrowUpIcon className="w-3 h-3"/></button> <button onClick={() => setViewSettings(vs => { const newSorts = [...vs.sorts]; newSorts[index].direction = 'desc'; return {...vs, sorts: newSorts}; })} className={`p-1 border-t border-b border-r rounded-r-md ${sort.direction === 'desc' ? 'bg-cyan-100' : ''}`}><ArrowDownIcon className="w-3 h-3"/></button> </div> <button onClick={() => setViewSettings(vs => ({...vs, sorts: vs.sorts.filter(s => s.id !== sort.id)}))} className="p-1 text-slate-400 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button> </div> ))} <button onClick={() => setViewSettings(vs => ({...vs, sorts: [...vs.sorts, {id: `sort-${Date.now()}`, column: allColumns[0].label, direction: 'asc'}]}))} className="w-full text-sm bg-slate-100 hover:bg-slate-200 py-1.5 rounded-md" disabled={viewSettings.sorts.length >= 3}>Add Sort Layer</button> </div>
                            </Dropdown>
                            <Dropdown isOpen={activeDropdown === 'columns'} onToggle={() => setActiveDropdown(p => p === 'columns' ? null : 'columns')} trigger={<button className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 p-2 rounded-md"> <EyeIcon className="w-5 h-5" /> </button>}>
                                <div className="space-y-2 max-h-80 overflow-y-auto"> {allColumns.map(col => <div key={col.key} className="flex items-center"> <input type="checkbox" id={`col-${col.key}`} checked={viewSettings.visibleColumns.includes(col.label)} onChange={() => setViewSettings(vs => ({...vs, visibleColumns: vs.visibleColumns.includes(col.label) ? vs.visibleColumns.filter(c => c !== col.label) : [...vs.visibleColumns, col.label]}))} className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500" /> <label htmlFor={`col-${col.key}`} className="ml-2 text-sm">{col.label}</label> </div>)} </div>
                            </Dropdown>
                        </div>
                    </div>
                    <div ref={scrollContainerRef} className="flex-grow overflow-auto relative">
                        {viewMode === 'table' ? (
                            <TableView
                                rows={processedRows}
                                table={table}
                                columns={visibleTableColumns}
                                visibleStatsColumns={visibleStatsColumns}
                                onRowDelete={handleRowDelete}
                                onColumnDelete={handleColumnDelete}
                                onColumnReorder={handleColumnReorder}
                                selectedRowIds={selectedRowIds}
                                onToggleRow={rowId => setSelectedRowIds(prev => { const newSet = new Set(prev); if (newSet.has(rowId)) newSet.delete(rowId); else newSet.add(rowId); return newSet; })}
                                onToggleSelectAll={handleToggleSelectAll}
                                sorts={viewSettings.sorts}
                                onSort={handleSort}
                                onRowClick={(row) => setWordIdInDetailModal(row.id)}
                                maxInQueue={maxInQueue}
                                onOpenImageModal={handleOpenImageModal}
                                onConfigureAi={(col) => { setColumnForAiConfig(col); setIsAiPromptModalOpen(true); }}
                                onGenerateAiContent={(row, col) => handleGenerateAiContent(row, col)}
                                generatingCells={generatingCells}
                                onPlaySpeech={handlePlaySpeech}
                                playingRowId={playingRowId}
                                appSettings={appSettings}
                                isAiRunning={isAiRunning}
                            />
                        ) : (
                            <CardView 
                                rows={processedRows}
                                table={table}
                                maxInQueue={maxInQueue}
                                visibleColumns={viewSettings.visibleColumns}
                                onPlaySpeech={handlePlaySpeech}
                                playingRowId={playingRowId}
                            />
                        )}
                    </div>
                </div>
            )}
            
            {activeTab === 'relations' && ( <div className="flex-grow p-4 overflow-y-auto"> <RelationsView relations={tableRelations} onCreate={() => { setRelationToEdit(null); setIsRelationModalOpen(true); }} onEdit={(rel) => { setRelationToEdit(rel); setIsRelationModalOpen(true); }} onPreview={(rel) => setRelationToPreview(rel)} onDelete={(rel) => setRelationToDelete(rel)} onDesign={(rel) => setRelationToDesign(rel)} /> </div> )}
            
            {activeTab === 'settings' && (
                <div className="flex-grow p-4 overflow-y-auto space-y-6">
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Columns</h3>
                        <button onClick={() => setIsColumnEditorOpen(true)} className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2"> <EditIcon /> Manage Columns </button>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Image Generation</h3>
                        <p className="text-sm text-slate-500 mb-4">Set which column contains the image and which to use as the source for search terms.</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-sm font-semibold">Source Column</label><select value={imageConfigForm.sourceColumn} onChange={e => setImageConfigForm(f => ({...f, sourceColumn: e.target.value}))} className="w-full mt-1 p-2 border rounded-md"><option value="">-- Select --</option>{table.columns.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                            <div><label className="text-sm font-semibold">Image Column</label><select value={imageConfigForm.imageColumn} onChange={e => setImageConfigForm(f => ({...f, imageColumn: e.target.value}))} className="w-full mt-1 p-2 border rounded-md"><option value="">-- Select --</option>{table.columns.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                        </div>
                        <div className="flex gap-2 mt-4"><button onClick={handleSaveImageConfig} className="bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg">Save</button><button onClick={handleRemoveImageConfig} className="bg-slate-100 text-slate-700 font-semibold py-2 px-4 rounded-lg">Remove</button></div>
                    </div>
                     <div className="bg-white p-4 rounded-lg shadow-sm border">
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Text-to-Speech</h3>
                        <p className="text-sm text-slate-500 mb-4">Configure audio playback using your browser's built-in voice synthesis.</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-sm font-semibold">Source Text Column</label><select value={audioConfigForm.sourceColumn} onChange={e => setAudioConfigForm(f => ({...f, sourceColumn: e.target.value}))} className="w-full mt-1 p-2 border rounded-md"><option value="">-- Select --</option>{table.columns.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                            
                            <div><label className="text-sm font-semibold">Language</label><select value={audioConfigForm.language} onChange={e => setAudioConfigForm(f => ({...f, language: e.target.value }))} className="w-full mt-1 p-2 border rounded-md">{languageOptions.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}</select></div>
                        </div>
                        <div className="flex gap-2 mt-4"><button onClick={handleSaveAudioConfig} className="bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg">Save</button><button onClick={handleRemoveAudioConfig} className="bg-slate-100 text-slate-700 font-semibold py-2 px-4 rounded-lg">Remove</button></div>
                    </div>
                </div>
            )}
            
            <SelectionActionBar selectedCount={selectedRowIds.size} onDelete={handleDeleteSelectedRows} onDeselectAll={() => setSelectedRowIds(new Set())} />
            {undoState.deletedRows.length > 0 && <UndoToast count={undoState.deletedRows.length} onUndo={handleUndoDelete} />}
            {undoColumnState && <UndoToast count={1} onUndo={handleUndoColumnDelete} isColumn />}

            <WordDetailModal
                isOpen={!!wordIdInDetailModal}
                onClose={() => setWordIdInDetailModal(null)}
                row={wordInDetail}
                columns={table.columns}
                onRowUpdate={handleRowUpdate}
                onRowDelete={handleRowDelete}
                onOpenImageModal={handleOpenImageModal}
                maxInQueue={maxInQueue}
                table={table}
                onPlaySpeech={handlePlaySpeech}
                playingRowId={playingRowId}
                onConfigureAi={(col) => { setColumnForAiConfig(col); setIsAiPromptModalOpen(true); }}
                appSettings={appSettings}
                onGenerateAi={(col) => wordInDetail && handleGenerateAiContent(wordInDetail, col)}
                onAddColumn={() => setIsAddColumnModalOpen(true)}
                generatingCells={generatingCells}
            />
            
            <ImageInputModal
                isOpen={!!imageModalContext}
                onClose={() => setImageModalContext(null)}
                onSave={(value) => imageModalContext && handleRowUpdate(imageModalContext.rowId, imageModalContext.imageColumn, value)}
                onRemove={() => imageModalContext && handleRowUpdate(imageModalContext.rowId, imageModalContext.imageColumn, '')}
                currentValue={imageModalContext ? table.rows.find(r => r.id === imageModalContext.rowId)?.cols[imageModalContext.imageColumn] || null : null}
                searchTerm={imageModalContext?.searchTerm}
            />
            
            <RelationEditorModal 
                isOpen={isRelationModalOpen}
                onClose={() => setIsRelationModalOpen(false)}
                onSave={handleSaveRelation}
                table={table}
                relationToEdit={relationToEdit}
            />
            
            <RelationPreviewModal
                isOpen={!!relationToPreview}
                onClose={() => setRelationToPreview(null)}
                relation={relationToPreview}
                table={table}
            />
            
             <RelationPreviewModal
                isOpen={!!relationToDesign}
                onClose={() => setRelationToDesign(null)}
                relation={relationToDesign}
                table={table}
                onUpdateRelation={handleUpdateRelation}
                startInDesignMode
            />

            <AddColumnModal
                isOpen={isAddColumnModalOpen}
                onClose={() => setIsAddColumnModalOpen(false)}
                onAdd={handleAddNewColumn}
                existingColumns={table.columns}
            />

            <AiPromptConfigModal
                isOpen={isAiPromptModalOpen}
                onClose={() => setIsAiPromptModalOpen(false)}
                columnName={columnForAiConfig}
                table={table}
                onSavePrompt={handleSaveAiPrompt}
                onRemovePrompt={handleRemoveAiPrompt}
            />
            
            {user && <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} table={table} user={user} />}
            
            <ColumnEditorModal
                isOpen={isColumnEditorOpen}
                onClose={() => setIsColumnEditorOpen(false)}
                table={table}
                relations={relations}
                onUpdateTable={onUpdateTable}
                setRelations={setRelations}
            />

            <Modal isOpen={isRunAiModalOpen} onClose={() => setIsRunAiModalOpen(false)} title="Run AI on Empty Cells">
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">This will fill up to 5 empty cells based on your AI prompts. Which columns should be included?</p>
                    <div className="space-y-2 p-2 bg-slate-50 border rounded-md">
                        {Object.entries(fillableColumnsSummary).map(([col, count]) => (
                            <div key={col} className="flex items-center p-2 rounded-md hover:bg-slate-100">
                                <input
                                    type="checkbox"
                                    id={`ai-col-${col}`}
                                    checked={selectedColumnsForAi.has(col)}
                                    onChange={() => setSelectedColumnsForAi(prev => {
                                        const newSet = new Set(prev);
                                        if (newSet.has(col)) newSet.delete(col);
                                        else newSet.add(col);
                                        return newSet;
                                    })}
                                    className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                />
                                <label htmlFor={`ai-col-${col}`} className="ml-3 flex-grow cursor-pointer">
                                    <span className="font-semibold text-slate-800">{col}</span>
                                    <span className="text-sm text-slate-500 ml-2">({count} empty)</span>
                                </label>
                            </div>
                        ))}
                    </div>
                     <div className="flex justify-end gap-4 pt-4 border-t">
                        <button onClick={() => setIsRunAiModalOpen(false)} className="bg-slate-200 font-bold py-2 px-6 rounded-lg">Cancel</button>
                        <button onClick={handleConfirmRunAi} disabled={selectedColumnsForAi.size === 0} className="bg-cyan-600 text-white font-bold py-2 px-6 rounded-lg disabled:bg-slate-300">
                            Run AI ({Math.min(5, Array.from(selectedColumnsForAi).reduce((sum, col) => sum + fillableColumnsSummary[col], 0))})
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={!!relationToDelete} onClose={() => setRelationToDelete(null)} title="Confirm Deletion">
                <p>Are you sure you want to delete the relation "{relationToDelete?.name}"?</p>
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={() => setRelationToDelete(null)} className="bg-slate-200 font-bold py-2 px-6 rounded-lg">Cancel</button>
                    <button onClick={() => relationToDelete && handleDeleteRelation(relationToDelete.id)} className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg">Delete</button>
                </div>
            </Modal>
        </div>
    );
};
