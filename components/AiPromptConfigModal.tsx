import React, { useState, useEffect, useRef } from 'react';
import { VocabTable } from '../types';
import Modal from './Modal';
import { TrashIcon } from './Icons';

interface AiPromptConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    columnName: string | null;
    table: VocabTable;
    onSavePrompt: (column: string, prompt: string) => void;
    onRemovePrompt: (column: string) => void;
}

const AiPromptConfigModal: React.FC<AiPromptConfigModalProps> = ({ isOpen, onClose, columnName, table, onSavePrompt, onRemovePrompt }) => {
    const [prompt, setPrompt] = useState('');
    const promptTextareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen && columnName) {
            setPrompt(table.aiPrompts?.[columnName] || '');
        }
    }, [isOpen, columnName, table.aiPrompts]);

    if (!isOpen || !columnName) return null;

    const handleInsertPlaceholder = (placeholder: string) => {
        const textarea = promptTextareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            const newText = `${text.substring(0, start)}{${placeholder}}${text.substring(end)}`;
            setPrompt(newText);
            setTimeout(() => {
                textarea.focus();
                textarea.selectionStart = textarea.selectionEnd = start + placeholder.length + 2;
            }, 0);
        }
    };

    const handleSave = () => {
        if (prompt.trim()) {
            onSavePrompt(columnName, prompt);
        } else {
            onRemovePrompt(columnName);
        }
        onClose();
    };
    
    const handleRemove = () => {
        onRemovePrompt(columnName);
        onClose();
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Configure AI for "${columnName}"`} size="lg">
            <div className="space-y-4">
                <div>
                    <label htmlFor="ai-prompt" className="block text-sm font-semibold text-slate-700 mb-1">AI Prompt</label>
                    <p className="text-xs text-slate-500 mb-2">Write instructions for the AI. Use placeholders to include data from other columns in the same row.</p>
                    <textarea
                        id="ai-prompt"
                        ref={promptTextareaRef}
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        className="w-full h-32 px-3 py-2 text-slate-700 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        placeholder={`e.g., Write a simple example sentence using the word "{${table.columns[0]}}".`}
                    />
                </div>
                <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Available Placeholders</h4>
                    <div className="flex flex-wrap gap-2">
                        {table.columns.map(col => (
                            <button key={col} onClick={() => handleInsertPlaceholder(col)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono py-1 px-2 rounded-md">
                                {`{${col}}`}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex justify-between items-center gap-4 pt-4 border-t">
                    <button onClick={handleRemove} className="bg-red-50 hover:bg-red-100 text-red-700 font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                        <TrashIcon className="w-5 h-5" /> Remove AI Config
                    </button>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-6 rounded-lg">Cancel</button>
                        <button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg">Save Prompt</button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default AiPromptConfigModal;
