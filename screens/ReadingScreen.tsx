import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ReadingNote, VocabTable, VocabRow, VocabRowStats } from '../types';
import { PlusIcon, ChevronLeftIcon, EditIcon, TrashIcon, SaveIcon, SparklesIcon } from '../components/Icons';
import Modal from '../components/Modal';

const defaultStats: VocabRowStats = { Passed1: 0, Passed2: 0, Failed: 0, TotalAttempt: 0, SuccessRate: 0, FailureRate: 0, RankPoint: 0, Level: 1, InQueue: 0, QuitQueue: false, LastPracticeDate: null, flashcardStatus: null, flashcardEncounters: 0, flashcardRatings: { again: 0, hard: 0, good: 0, easy: 0, perfect: 0 }, isFlashcardReviewed: false };

interface ReadingScreenProps {
  readingNotes: ReadingNote[];
  setReadingNotes: React.Dispatch<React.SetStateAction<ReadingNote[]>>;
  tables: VocabTable[];
  setTables: React.Dispatch<React.SetStateAction<VocabTable[]>>;
  showToast: (message: string) => void;
  onSubScreenChange: (subScreen: string | null) => void;
  onVmindLookup: (text: string) => void;
}

type SelectionInfo = {
    text: string;
    tableId: string | null;
    column: string | null;
};

type SelectionPopupInfo = {
    text: string;
    top: number;
    left: number;
};


const NewTableForReadingModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, columns: string[]) => void;
}> = ({ isOpen, onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [columnsStr, setColumnsStr] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setName('');
            setColumnsStr('');
            setError('');
        }
    }, [isOpen]);

    const handleSubmit = () => {
        setError('');
        if (!name.trim()) {
            setError('Table name is required.');
            return;
        }
        const columns = columnsStr.split(',').map(c => c.trim()).filter(Boolean);
        if (columns.length === 0) {
            setError('Please define at least one column.');
            return;
        }
        if (new Set(columns).size !== columns.length) {
            setError('Column names must be unique.');
            return;
        }
        onCreate(name.trim(), columns);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Table for Reading">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Table Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                        className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        placeholder="e.g., The Great Gatsby Vocab"
                        autoFocus
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Columns</label>
                    <input type="text" value={columnsStr} onChange={e => setColumnsStr(e.target.value)}
                        className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        placeholder="Word, Definition, Context"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter column names separated by commas. The first column will be the default for new words.</p>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex justify-end gap-4 pt-4 border-t">
                    <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg">Cancel</button>
                    <button onClick={handleSubmit} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg">Create Table</button>
                </div>
            </div>
        </Modal>
    );
};


const ReadingScreen: React.FC<ReadingScreenProps> = ({ readingNotes, setReadingNotes, tables, setTables, showToast, onSubScreenChange, onVmindLookup }) => {
    const [view, setView] = useState<'list' | 'editor' | 'reader'>('list');
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [noteToDelete, setNoteToDelete] = useState<ReadingNote | null>(null);
    const [selection, setSelection] = useState<SelectionInfo | null>(null);
    const [selectionPopup, setSelectionPopup] = useState<SelectionPopupInfo | null>(null);
    const readerRef = useRef<HTMLDivElement>(null);

    const activeNote = useMemo(() => readingNotes.find(n => n.id === activeNoteId), [activeNoteId, readingNotes]);

    useEffect(() => {
        let subScreen = '';
        if (view === 'editor') subScreen = activeNoteId ? `Editing "${activeNote?.title}"` : 'New Note Editor';
        else if (view === 'reader') subScreen = `Reading "${activeNote?.title}"`;
        else subScreen = 'Notes List';
        onSubScreenChange(subScreen);
    }, [view, activeNoteId, activeNote, onSubScreenChange]);
    
    useEffect(() => {
        const readerEl = readerRef.current;
        if (!readerEl) return;
        const handleScroll = () => setSelectionPopup(null);
        readerEl.addEventListener('scroll', handleScroll);
        return () => readerEl.removeEventListener('scroll', handleScroll);
    }, []);

    const handleNewNote = () => {
        setActiveNoteId(null);
        setView('editor');
    };

    const handleSelectNote = (noteId: string, targetView: 'reader' | 'editor') => {
        setActiveNoteId(noteId);
        setView(targetView);
    };

    const handleSaveNote = (note: Omit<ReadingNote, 'id' | 'createdAt'> & { id?: string }) => {
        if (note.id) {
            setReadingNotes(notes => notes.map(n => n.id === note.id ? { ...n, ...note } : n));
        } else {
            const newNote: ReadingNote = {
                ...note,
                id: `note-${Date.now()}`,
                createdAt: new Date().toISOString(),
            };
            setReadingNotes(notes => [newNote, ...notes]);
            setActiveNoteId(newNote.id);
        }
        setView('reader');
    };

    const confirmDelete = () => {
        if (noteToDelete) {
            setReadingNotes(notes => notes.filter(n => n.id !== noteToDelete.id));
            setNoteToDelete(null);
            if (activeNoteId === noteToDelete.id) {
                setView('list');
                setActiveNoteId(null);
            }
        }
    };
    
    const handleSelection = () => {
        setTimeout(() => {
            if (!readerRef.current) return;

            const selectionObj = window.getSelection();
            const text = selectionObj?.toString().trim();

            if (text && text.length > 0 && text.length < 100) {
                const range = selectionObj.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                const readerRect = readerRef.current.getBoundingClientRect();

                setSelectionPopup({
                    text: text,
                    top: rect.bottom - readerRect.top + 8,
                    left: rect.left - readerRect.left + rect.width / 2,
                });
            } else {
                setSelectionPopup(null);
            }
        }, 50);
    };

    const handleLookupClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (selectionPopup) {
            onVmindLookup(selectionPopup.text);
            setSelectionPopup(null);
        }
    }

    const handleAddWordClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (selectionPopup && activeNote) {
            setSelection({
                text: selectionPopup.text,
                tableId: activeNote.defaultTableId,
                column: activeNote.defaultColumn,
            });
            setSelectionPopup(null);
        }
    };

    const handleAddWord = () => {
        if (!selection || !selection.tableId || !selection.column) {
            showToast("Please select a target table and column.");
            return;
        }

        setTables(currentTables => {
            const tableIndex = currentTables.findIndex(t => t.id === selection.tableId);
            if (tableIndex === -1) return currentTables;
            
            const newTables = [...currentTables];
            const targetTable = { ...newTables[tableIndex] };
            
            const newRow: VocabRow = {
                id: `r-read-${Date.now()}`,
                cols: { [selection.column]: selection.text },
                stats: { ...defaultStats },
                tags: [],
            };

            targetTable.rows = [newRow, ...targetTable.rows];
            targetTable.wordCount++;
            newTables[tableIndex] = targetTable;
            return newTables;
        });

        showToast(`Added "${selection.text}" to "${tables.find(t=>t.id === selection.tableId)?.name}"`);
        setSelection(null);
    };

    const sortedNotes = useMemo(() => {
        return [...readingNotes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [readingNotes]);


    const renderContent = () => {
        if (view === 'editor') {
            return <NoteEditor note={activeNote} onSave={handleSaveNote} onBack={() => setView('list')} tables={tables} setTables={setTables} />;
        }
        if (view === 'reader' && activeNote) {
            return (
                <div className="relative h-full flex flex-col">
                    <header className="flex-shrink-0 p-4 border-b flex justify-between items-center">
                        <button onClick={() => setView('list')} className="p-2 rounded-full hover:bg-slate-100"><ChevronLeftIcon /></button>
                        <h2 className="text-xl font-bold text-slate-800 truncate">{activeNote.title}</h2>
                        <button onClick={() => handleSelectNote(activeNote.id, 'editor')} className="font-semibold text-cyan-600 hover:bg-cyan-50 p-2 rounded-lg">Edit</button>
                    </header>
                    <div ref={readerRef} onMouseUp={handleSelection} onTouchEnd={handleSelection} className="relative flex-grow p-6 overflow-y-auto prose lg:prose-lg max-w-full">
                        <p className="whitespace-pre-wrap">{activeNote.content}</p>

                        {selectionPopup && (
                            <div 
                                className="absolute flex items-center gap-1 bg-white p-1 rounded-full shadow-lg animate-scale-in"
                                style={{ top: `${selectionPopup.top}px`, left: `${selectionPopup.left}px`, transform: 'translateX(-50%)' }}
                            >
                                <button 
                                    onClick={handleLookupClick}
                                    className="flex items-center gap-1.5 bg-teal-700 text-white font-semibold py-2 px-3 rounded-full transition-transform transform hover:scale-105"
                                >
                                    <SparklesIcon className="w-4 h-4" />
                                    Vmind
                                </button>
                                <button 
                                    onClick={handleAddWordClick}
                                    className="flex items-center gap-1.5 bg-slate-200 text-slate-700 font-semibold py-2 px-3 rounded-full transition-transform transform hover:scale-105"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    Add
                                </button>
                            </div>
                        )}
                    </div>
                     <Modal isOpen={!!selection} onClose={() => setSelection(null)} title="Add to Table" size="sm">
                        {selection && (
                           <>
                                <p className="font-bold text-slate-800 border-b pb-2 mb-2">"{selection.text}"</p>
                                <div className="space-y-2 text-sm">
                                    <select value={selection.tableId || ''} onChange={(e) => setSelection(s => s ? {...s, tableId: e.target.value, column: null} : null)} className="w-full p-2 border rounded-md">
                                        <option value="">Select Table</option>
                                        {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                    <select value={selection.column || ''} onChange={(e) => setSelection(s => s ? {...s, column: e.target.value} : null)} disabled={!selection.tableId} className="w-full p-2 border rounded-md">
                                        <option value="">Select Column</option>
                                        {tables.find(t => t.id === selection.tableId)?.columns.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <button onClick={handleAddWord} className="mt-4 w-full bg-cyan-600 text-white font-bold py-2 rounded-lg">Add to Table</button>
                           </>
                        )}
                    </Modal>
                </div>
            );
        }

        // List View
        return (
            <div className="h-full flex flex-col">
                <header className="flex-shrink-0 p-4 border-b flex justify-between items-center">
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Reading Space</h1>
                    <button onClick={handleNewNote} className="bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"><PlusIcon /> New Note</button>
                </header>
                <div className="flex-grow p-4 overflow-y-auto space-y-3">
                    {sortedNotes.length === 0 ? (
                        <div className="text-center py-20 text-slate-500">
                            <p>No notes yet.</p>
                            <p>Create a new note to start reading and adding vocabulary.</p>
                        </div>
                    ) : (
                        sortedNotes.map(note => (
                            <div key={note.id} className="bg-white rounded-lg shadow-sm border p-4 group relative">
                                <div onClick={() => handleSelectNote(note.id, 'reader')} className="cursor-pointer">
                                    <h3 className="font-bold text-lg text-cyan-700">{note.title}</h3>
                                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">{note.content}</p>
                                    <p className="text-xs text-slate-400 mt-2">{new Date(note.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleSelectNote(note.id, 'editor')} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200"><EditIcon className="w-4 h-4" /></button>
                                    <button onClick={() => setNoteToDelete(note)} className="p-2 rounded-full bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-slate-50 rounded-lg shadow-inner h-full">
            {renderContent()}
            <Modal isOpen={!!noteToDelete} onClose={() => setNoteToDelete(null)} title="Confirm Deletion">
                <p>Are you sure you want to delete the note "{noteToDelete?.title}"?</p>
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={() => setNoteToDelete(null)} className="bg-slate-200 font-bold py-2 px-6 rounded-lg">Cancel</button>
                    <button onClick={confirmDelete} className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg">Delete</button>
                </div>
            </Modal>
        </div>
    );
};

interface NoteEditorProps {
    note: ReadingNote | null | undefined;
    onSave: (note: Omit<ReadingNote, 'id' | 'createdAt'> & { id?: string }) => void;
    onBack: () => void;
    tables: VocabTable[];
    setTables: React.Dispatch<React.SetStateAction<VocabTable[]>>;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ note, onSave, onBack, tables, setTables }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [defaultTableId, setDefaultTableId] = useState<string | null>(null);
    const [defaultColumn, setDefaultColumn] = useState<string | null>(null);
    const [isNewTableModalOpen, setIsNewTableModalOpen] = useState(false);
    const titleInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (note) { // Editing an existing note
            setTitle(note.title || '');
            setContent(note.content || '');
            setDefaultTableId(note.defaultTableId || null);
            setDefaultColumn(note.defaultColumn || null);
        } else { // Creating a new note
            const now = new Date();
            const mm = (now.getMonth() + 1).toString().padStart(2, '0');
            const dd = now.getDate().toString().padStart(2, '0');
            const yy = now.getFullYear().toString().slice(-2);
            const hh = now.getHours().toString().padStart(2, '0');
            const min = now.getMinutes().toString().padStart(2, '0');
            const defaultTitle = `${mm}/${dd}/${yy} ${hh}:${min} + `;
            
            setTitle(defaultTitle);
            setContent('');
            setDefaultTableId(null);
            setDefaultColumn(null);

            // Use a short timeout to ensure the input is rendered before focusing
            setTimeout(() => {
                if (titleInputRef.current) {
                    titleInputRef.current.focus();
                    const len = defaultTitle.length;
                    titleInputRef.current.setSelectionRange(len, len);
                }
            }, 50);
        }
    }, [note]);

    const handleSaveClick = () => {
        if (!title.trim()) {
            alert("Please enter a title.");
            return;
        }
        onSave({ id: note?.id, title, content, defaultTableId, defaultColumn });
    };

    const availableColumns = useMemo(() => {
        if (!defaultTableId) return [];
        return tables.find(t => t.id === defaultTableId)?.columns || [];
    }, [defaultTableId, tables]);
    
    useEffect(() => {
        if (defaultTableId && !availableColumns.includes(defaultColumn || '')) {
            setDefaultColumn(null);
        }
    }, [defaultTableId, availableColumns, defaultColumn]);

    const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === '__CREATE_NEW__') {
            setIsNewTableModalOpen(true);
        } else {
            setDefaultTableId(value || null);
        }
    };

    const handleCreateTable = (name: string, columns: string[]) => {
        const newTable: VocabTable = {
            id: `tbl-read-${Date.now()}`,
            name,
            columns,
            rows: [],
            wordCount: 0,
            avgFailureRate: 0,
            avgRankPoint: 0,
            isDemo: false,
        };
        setTables(prev => [newTable, ...prev]);
        setDefaultTableId(newTable.id);
        setDefaultColumn(columns[0] || null);
    };

    return (
        <div className="h-full flex flex-col">
            <header className="flex-shrink-0 p-4 border-b flex justify-between items-center">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100"><ChevronLeftIcon /></button>
                <h2 className="text-xl font-bold text-slate-800">{note ? 'Edit Note' : 'New Note'}</h2>
                <button onClick={handleSaveClick} className="bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"><SaveIcon /> Save</button>
            </header>
            <div className="flex-grow p-4 overflow-y-auto space-y-4">
                <input ref={titleInputRef} type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Note Title" className="w-full text-2xl font-bold p-2 border-b-2 focus:outline-none focus:border-cyan-500" />
                <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Paste or write your reading content here..." className="w-full h-64 p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                <div className="p-4 bg-white border rounded-lg">
                    <h3 className="font-bold text-slate-800 mb-2">Quick Add Settings</h3>
                    <p className="text-sm text-slate-500 mb-3">Set the default destination for new words from this note.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-semibold">Target Table</label>
                            <select value={defaultTableId || ''} onChange={handleTableChange} className="w-full mt-1 p-2 border rounded-md">
                                <option value="">None</option>
                                {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                <option value="__CREATE_NEW__" className="font-bold text-cyan-600">Create new table...</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-semibold">Target Column</label>
                            <select value={defaultColumn || ''} onChange={e => setDefaultColumn(e.target.value || null)} disabled={!defaultTableId} className="w-full mt-1 p-2 border rounded-md">
                                <option value="">None</option>
                                {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>
            <NewTableForReadingModal 
                isOpen={isNewTableModalOpen}
                onClose={() => setIsNewTableModalOpen(false)}
                onCreate={handleCreateTable}
            />
        </div>
    );
};

export default ReadingScreen;
