import React, { useState, useMemo } from 'react';
import { DictationNote, TranscriptEntry } from '../types';
import { PlusIcon, EditIcon, TrashIcon, ClockIcon } from '../components/Icons';
import Modal from '../components/Modal';
import { Screen } from '../App';

interface DictationScreenProps {
  dictationNotes: DictationNote[];
  onDeleteNote: (noteId: string) => void;
  onCreateNote: (title: string) => void;
  onEditNote: (note: DictationNote) => void;
  setActiveScreen: (screen: Screen) => void;
}

const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString();
};

const NewNoteModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCreate: (title: string) => void;
}> = ({ isOpen, onClose, onCreate }) => {
    const [title, setTitle] = useState('');

    const handleCreate = () => {
        if (title.trim()) {
            onCreate(title.trim());
            setTitle('');
            onClose();
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Dictation Note">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
                    <input 
                        type="text" 
                        value={title} 
                        onChange={e => setTitle(e.target.value)} 
                        placeholder="e.g., English Listening Practice"
                        className="w-full p-2 border border-slate-300 rounded-md"
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    />
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <button onClick={onClose} className="py-2 px-4 bg-slate-200 rounded-md">Cancel</button>
                    <button onClick={handleCreate} className="py-2 px-4 bg-cyan-600 text-white rounded-md">Create</button>
                </div>
            </div>
        </Modal>
    )
};


const DictationScreen: React.FC<DictationScreenProps> = (props) => {
    const { dictationNotes, onDeleteNote, onCreateNote, onEditNote, setActiveScreen } = props;
    const [isNewNoteModalOpen, setIsNewNoteModalOpen] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState<DictationNote | null>(null);

    const sortedNotes = useMemo(() => {
        return [...dictationNotes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [dictationNotes]);

    return (
        <div className="flex flex-col h-full">
            <header className="mb-8 flex-shrink-0 flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Dictation Library</h1>
                    <p className="mt-2 text-lg text-slate-500">Your saved dictation exercises.</p>
                </div>
                <button onClick={() => setIsNewNoteModalOpen(true)} className="bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"><PlusIcon /> New Note</button>
            </header>

            {sortedNotes.length === 0 ? (
                 <div className="text-center py-20 bg-slate-50 rounded-lg border-2 border-dashed">
                    <h3 className="text-xl font-semibold text-slate-700">Your Library is Empty</h3>
                    <p className="text-slate-500 mt-2">Create a new note to start practicing.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sortedNotes.map(note => {
                        const lastHistory = note.practiceHistory[note.practiceHistory.length - 1];
                        return (
                            <div key={note.id} className="bg-white rounded-lg shadow-sm border p-4 group relative">
                                <div onClick={() => onEditNote(note)} className="cursor-pointer">
                                    <h3 className="font-bold text-lg text-cyan-700">{note.title}</h3>
                                    <div className="text-sm text-slate-500 mt-2 flex flex-wrap gap-x-4 gap-y-1">
                                        <span className="flex items-center gap-1.5"><ClockIcon className="w-4 h-4" /> Last practiced: <span className="font-semibold text-slate-600">{formatDate(note.lastPracticedAt)}</span></span>
                                        {lastHistory && <span>Last Accuracy: <span className="font-semibold text-slate-600">{lastHistory.accuracy.toFixed(1)}%</span></span>}
                                    </div>
                                </div>
                                 <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => onEditNote(note)} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200"><EditIcon className="w-4 h-4" /></button>
                                    <button onClick={() => setNoteToDelete(note)} className="p-2 rounded-full bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
            
            <NewNoteModal 
                isOpen={isNewNoteModalOpen}
                onClose={() => setIsNewNoteModalOpen(false)}
                onCreate={onCreateNote}
            />

            {noteToDelete && (
                 <Modal isOpen={!!noteToDelete} onClose={() => setNoteToDelete(null)} title="Confirm Deletion">
                    <p>Are you sure you want to delete the note "{noteToDelete.title}"?</p>
                    <div className="flex justify-end gap-4 mt-6">
                        <button onClick={() => setNoteToDelete(null)} className="bg-slate-200 font-bold py-2 px-6 rounded-lg">Cancel</button>
                        <button onClick={() => { onDeleteNote(noteToDelete.id); setNoteToDelete(null); }} className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg">Delete</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default DictationScreen;