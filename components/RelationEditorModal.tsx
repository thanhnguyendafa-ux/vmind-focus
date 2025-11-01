import React, { useState, useEffect } from 'react';
import { Relation, StudyMode, VocabTable } from '../types';
import Modal from './Modal';
import { CheckCircleIcon, UncheckedCircleIcon } from './Icons';

const studyModes: { mode: StudyMode; label: string }[] = [
    { mode: 'MCQ', label: 'Multiple Choice' },
    { mode: 'TF', label: 'True / False' },
    { mode: 'Typing', label: 'Typing Answer' },
    { mode: 'Scrambled', label: 'Sentence Scramble' },
];

export interface RelationEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (relation: Omit<Relation, 'id' | 'isCustom'> & { id?: string }) => void;
    onDelete?: (relationId: string) => void;
    table: VocabTable | undefined;
    relationToEdit: Relation | null;
}

const RelationEditorModal: React.FC<RelationEditorModalProps> = ({ isOpen, onClose, onSave, onDelete, table, relationToEdit }) => {
    const [name, setName] = useState('');
    const [questionCols, setQuestionCols] = useState<string[]>([]);
    const [answerCols, setAnswerCols] = useState<string[]>([]);
    const [modes, setModes] = useState<StudyMode[]>([]);
    const [error, setError] = useState('');

    const isScrambleMode = modes.length === 1 && modes[0] === 'Scrambled';

    useEffect(() => {
        if (isOpen && relationToEdit) {
            setName(relationToEdit.name);
            setQuestionCols(relationToEdit.questionCols);
            setAnswerCols(relationToEdit.answerCols);
            setModes(relationToEdit.modes);
            setError('');
        } else if (isOpen) {
            setName('');
            setQuestionCols([]);
            setAnswerCols([]);
            setModes([]);
            setError('');
        }
    }, [isOpen, relationToEdit]);

    useEffect(() => {
        // When scramble mode is selected, enforce its rules
        if (isScrambleMode) {
            setAnswerCols([]);
            if (questionCols.length > 1) {
                setQuestionCols([questionCols[0]]);
            }
        }
    }, [isScrambleMode, questionCols]);


    const handleToggleColumn = (col: string, type: 'question' | 'answer') => {
        const state = type === 'question' ? questionCols : answerCols;
        const setter = type === 'question' ? setQuestionCols : setAnswerCols;
        
        if (type === 'question' && isScrambleMode) {
             setter(state.includes(col) ? [] : [col]);
        } else {
            if (state.includes(col)) {
                setter(state.filter(c => c !== col));
            } else {
                setter([...state, col]);
            }
        }
    };
    
    const handleToggleMode = (modeToToggle: StudyMode) => {
        const isCurrentlySelected = modes.includes(modeToToggle);

        if (modeToToggle === 'Scrambled') {
            // If selecting Scrambled, it becomes the *only* mode.
            // If deselecting, it's just removed.
            setModes(isCurrentlySelected ? [] : ['Scrambled']);
        } else {
            // If any other mode is selected, ensure 'Scrambled' is not present.
            const newModes = isCurrentlySelected
                ? modes.filter(m => m !== modeToToggle)
                : [...modes.filter(m => m !== 'Scrambled'), modeToToggle];
            setModes(newModes);
        }
    };
    
    const handleSave = () => {
        if (!table) return;
        if (!name.trim()) { setError('Relation name is required.'); return; }
        if (questionCols.length === 0) { setError('Select at least one question column.'); return; }
        if (modes.length === 0) { setError('Select at least one compatible study mode.'); return; }
        
        if (isScrambleMode) {
            if (questionCols.length !== 1) { setError('Scramble mode requires exactly one question column.'); return; }
        } else {
            if (answerCols.length === 0) { setError('Select at least one answer column.'); return; }
        }
        
        onSave({
            id: relationToEdit?.id,
            tableId: table.id,
            name,
            questionCols,
            answerCols: isScrambleMode ? [] : answerCols,
            modes,
        });
        onClose();
    };

    const handleDelete = () => {
        if (onDelete && relationToEdit && window.confirm(`Are you sure you want to delete the relation "${relationToEdit.name}"?`)) {
            onDelete(relationToEdit.id);
            onClose();
        }
    };

    if (!table) return null;

    return (
      <Modal isOpen={isOpen} onClose={onClose} title={relationToEdit ? 'Edit Relation' : 'Create New Relation'} size="lg">
          <div className="space-y-6">
              <div>
                  <label htmlFor="relation-name" className="block text-sm font-semibold text-slate-700 mb-1">Relation Name</label>
                  <input
                      type="text"
                      id="relation-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Word to Definition"
                      className="w-full px-3 py-2 text-slate-700 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <h4 className="font-semibold text-slate-700 mb-2">{isScrambleMode ? 'Sentence Column' : 'Question Columns'}</h4>
                      {isScrambleMode && <p className="text-xs text-slate-500 -mt-2 mb-2">Select one column containing sentences.</p>}
                      <div className="space-y-2 p-2 bg-slate-50 rounded-md border max-h-40 overflow-y-auto">
                          {table.columns.map(col => {
                              const isChecked = questionCols.includes(col);
                              return <div key={col} onClick={() => handleToggleColumn(col, 'question')} className="flex items-center p-2 rounded-md hover:bg-slate-100 cursor-pointer">
                                  {isChecked ? <CheckCircleIcon className="w-5 h-5 text-cyan-500 mr-3" /> : <UncheckedCircleIcon className="w-5 h-5 text-slate-300 mr-3" />}
                                  <span className="truncate">{col}</span>
                              </div>;
                          })}
                      </div>
                  </div>
                  <div className={isScrambleMode ? 'opacity-50' : ''}>
                      <h4 className="font-semibold text-slate-700 mb-2">Answer Columns</h4>
                      <div className={`space-y-2 p-2 rounded-md border max-h-40 overflow-y-auto ${isScrambleMode ? 'bg-slate-100 cursor-not-allowed' : 'bg-slate-50'}`}>
                          {table.columns.map(col => {
                              const isChecked = answerCols.includes(col);
                              return <div key={col} onClick={() => !isScrambleMode && handleToggleColumn(col, 'answer')} className={`flex items-center p-2 rounded-md ${!isScrambleMode ? 'hover:bg-slate-100 cursor-pointer' : ''}`}>
                                  {isChecked ? <CheckCircleIcon className="w-5 h-5 text-cyan-500 mr-3" /> : <UncheckedCircleIcon className="w-5 h-5 text-slate-300 mr-3" />}
                                  <span className="truncate">{col}</span>
                              </div>;
                          })}
                      </div>
                  </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-700 mb-2">Compatible Study Modes</h4>
                <div className="flex flex-wrap gap-4">
                    {studyModes.map(({mode, label}) => {
                        const isChecked = modes.includes(mode);
                        return <div key={mode} onClick={() => handleToggleMode(mode)} className={`flex-1 flex items-center p-3 border rounded-lg min-w-[150px] cursor-pointer ${isChecked ? 'border-cyan-500 bg-cyan-50' : ''}`}>
                             {isChecked ? <CheckCircleIcon className="w-5 h-5 text-cyan-500 mr-3" /> : <UncheckedCircleIcon className="w-5 h-5 text-slate-300 mr-3" />}
                            <h5 className="font-bold text-sm">{label}</h5>
                        </div>;
                    })}
                </div>
                <p className="text-xs text-slate-500 mt-2">Sentence Scramble mode cannot be combined with other modes in the same relation.</p>
              </div>
              
              {error && <div className="p-3 rounded-md text-sm bg-red-100 text-red-800">{error}</div>}

              <div className="flex justify-between items-center gap-4 pt-4 border-t">
                  <div>
                      {relationToEdit?.isCustom && onDelete && (
                          <button onClick={handleDelete} className="bg-red-50 hover:bg-red-100 text-red-700 font-bold py-2 px-6 rounded-lg">Delete</button>
                      )}
                  </div>
                  <div className="flex gap-4">
                    <button onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-6 rounded-lg">Cancel</button>
                    <button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg">Save Relation</button>
                  </div>
              </div>
          </div>
      </Modal>
    );
};

export default RelationEditorModal;