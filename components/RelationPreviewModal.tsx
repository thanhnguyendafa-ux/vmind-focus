import React, { useState, useEffect, useMemo } from 'react';
import { Relation, VocabTable } from '../types';
import Modal from './Modal';
import { SparklesIcon, SaveIcon } from './Icons';

interface RelationPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    relation: Relation | null;
    table: VocabTable | null;
    onUpdateRelation?: (updatedRelation: Relation) => void;
    startInDesignMode?: boolean;
}

const fonts = ['Arial', 'Verdana', 'Times New Roman', 'Georgia', 'Courier New', 'sans-serif', 'serif', 'monospace'];

const RelationPreviewModal: React.FC<RelationPreviewModalProps> = ({ isOpen, onClose, relation, table, onUpdateRelation, startInDesignMode = false }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isDesignMode, setIsDesignMode] = useState(startInDesignMode);
    const [editedRelation, setEditedRelation] = useState<Relation | null>(relation);
    const [designerTab, setDesignerTab] = useState<'layout' | 'typography' | 'background'>('layout');
    const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
    const [draggedItem, setDraggedItem] = useState<{ col: string; from: 'q' | 'a' } | null>(null);

    useEffect(() => {
        if (isOpen) {
            setIsDesignMode(startInDesignMode);
            setEditedRelation(relation);
            setIsFlipped(false);
            setSelectedColumn(null);
        }
    }, [isOpen, startInDesignMode, relation]);
    
    const handleSaveDesign = () => {
        if (editedRelation && onUpdateRelation) {
            onUpdateRelation(editedRelation);
            onClose();
        }
    };
    
    if (!isOpen || !editedRelation || !table) return null;

    const sampleRow = table.rows[0];

    const getBackgroundStyle = (rel: Relation) => {
        const design = rel.design;
        if (!design?.background) return {};
        const { type, value, color1, color2, angle } = design.background;
        if (type === 'image') return { backgroundImage: `url(${value})`, backgroundSize: 'cover', backgroundPosition: 'center' };
        if (type === 'gradient' && color1 && color2) return { background: `linear-gradient(${angle || 180}deg, ${color1}, ${color2})` };
        return { background: value };
    };
    
    const getColumnStyle = (rel: Relation, columnName: string) => {
        const style = rel.design?.columnStyles?.[columnName] || {};
        const textShadow = rel.design?.background ? '0px 1px 3px rgba(0,0,0,0.1)' : 'none';
        return {...style, textShadow};
    };

    const handleDesignChange = (path: string, value: any) => {
        setEditedRelation(prev => {
            if (!prev) return null;
            const keys = path.split('.');
            const newRelation = JSON.parse(JSON.stringify(prev));
            let current = newRelation;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) current[keys[i]] = {};
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newRelation;
        });
    };

    const handleDragStart = (col: string, from: 'q' | 'a') => setDraggedItem({ col, from });
    const handleDrop = (targetCol: string, targetFrom: 'q' | 'a') => {
        if (!draggedItem || (draggedItem.from !== targetFrom)) { setDraggedItem(null); return; }

        const listKey = targetFrom === 'q' ? 'questionCols' : 'answerCols';
        const currentList = [...editedRelation[listKey]];
        const dragIndex = currentList.indexOf(draggedItem.col);
        const targetIndex = currentList.indexOf(targetCol);

        if (dragIndex > -1 && targetIndex > -1) {
            const [removed] = currentList.splice(dragIndex, 1);
            currentList.splice(targetIndex, 0, removed);
            handleDesignChange(listKey, currentList);
        }
        setDraggedItem(null);
    };

    const renderFrontContent = () => {
        return (
            <div className="text-left w-full space-y-2">
                {editedRelation.questionCols.map(col => {
                    const value = sampleRow ? sampleRow.cols[col] || '' : `{${col}}`;
                    const style = getColumnStyle(editedRelation, col);
    
                    if (isDesignMode) {
                        return (
                            <div 
                                key={col} 
                                className={`p-2 my-1 border-2 rounded-md transition-all cursor-pointer ${selectedColumn === col ? 'border-cyan-500 bg-cyan-50' : 'border-transparent'}`}
                                onClick={(e) => {e.stopPropagation(); setSelectedColumn(col); setDesignerTab('typography');}}
                                draggable={isDesignMode}
                                onDragStart={() => handleDragStart(col, 'q')}
                                onDrop={() => handleDrop(col, 'q')}
                                onDragOver={(e) => e.preventDefault()}
                            >
                                <p className="text-xs font-semibold text-slate-400">{col}:</p>
                                <p style={style} className="whitespace-pre-wrap font-sans">{value}</p>
                            </div>
                        );
                    } else {
                        return (
                            <div key={col}>
                                <span className="text-sm font-semibold text-slate-500">{col}:</span>
                                <p style={style} className="text-lg text-slate-800 whitespace-pre-wrap font-sans">{value}</p>
                            </div>
                        );
                    }
                })}
                <div className={`pt-4 border-t border-dashed ${isDesignMode ? 'border-slate-300' : 'border-slate-200'}`}>
                     <p className="text-base font-semibold text-slate-600">Question: {editedRelation.answerCols.join(', ')} = ???</p>
                </div>
            </div>
        );
    };

    const renderBackContent = () => {
        return editedRelation.answerCols.map(col => {
            const value = sampleRow ? sampleRow.cols[col] || '' : `{${col}}`;
            const style = getColumnStyle(editedRelation, col);
    
            if (isDesignMode) {
                return (
                    <div 
                        key={col} 
                        className={`p-2 my-1 border-2 rounded-md transition-all cursor-pointer ${selectedColumn === col ? 'border-cyan-500 bg-cyan-50' : 'border-transparent'}`}
                        onClick={(e) => {e.stopPropagation(); setSelectedColumn(col); setDesignerTab('typography');}}
                        draggable={isDesignMode}
                        onDragStart={() => handleDragStart(col, 'a')}
                        onDrop={() => handleDrop(col, 'a')}
                        onDragOver={(e) => e.preventDefault()}
                    >
                        <p className="text-xs font-semibold text-slate-400">{col}</p>
                        <p style={style} className="whitespace-pre-wrap font-sans">{value}</p>
                    </div>
                );
            } else {
                return <p key={col} style={style} className="text-lg text-slate-800 whitespace-pre-wrap font-sans">{value}</p>;
            }
        });
    };
    
    const designerSidebar = (
        <div className="w-full md:w-80 flex-shrink-0 bg-slate-50 p-4 border-l rounded-r-lg">
            <div className="flex border-b mb-4">
                {['layout', 'typography', 'background'].map(tab => <button key={tab} onClick={() => setDesignerTab(tab as any)} className={`capitalize py-2 px-4 text-sm font-semibold ${designerTab === tab ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-slate-500'}`}>{tab}</button>)}
            </div>
            {designerTab === 'layout' && <div className="text-sm text-slate-600 bg-slate-100 p-3 rounded-md">Drag and drop columns on the card to change their order within the question or answer sections.</div>}
            {designerTab === 'typography' && (
                !selectedColumn ? <div className="text-sm text-slate-600 bg-slate-100 p-3 rounded-md">Click a column on the card to edit its style.</div> :
                <div className="space-y-3 text-sm">
                    <h4 className="font-bold text-slate-800">Styling: "{selectedColumn}"</h4>
                    <div><label className="font-semibold">Font Family</label><select value={editedRelation.design?.columnStyles?.[selectedColumn]?.fontFamily || ''} onChange={e => handleDesignChange(`design.columnStyles.${selectedColumn}.fontFamily`, e.target.value)} className="w-full mt-1 p-1 border rounded-md"><option value="">Default</option>{fonts.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
                    <div className="flex items-center gap-4">
                        <div className="flex-1"><label className="font-semibold">Font Size</label><input type="number" value={editedRelation.design?.columnStyles?.[selectedColumn]?.fontSize || ''} onChange={e => handleDesignChange(`design.columnStyles.${selectedColumn}.fontSize`, parseInt(e.target.value))} className="w-full mt-1 p-1 border rounded-md" placeholder="16" /></div>
                        <div><label className="font-semibold">Font Weight</label><div className="flex mt-1"><button onClick={() => handleDesignChange(`design.columnStyles.${selectedColumn}.fontWeight`, 'normal')} className={`px-2 py-1 border rounded-l-md ${editedRelation.design?.columnStyles?.[selectedColumn]?.fontWeight !== 'bold' ? 'bg-cyan-100' : ''}`}>Normal</button><button onClick={() => handleDesignChange(`design.columnStyles.${selectedColumn}.fontWeight`, 'bold')} className={`px-2 py-1 border-t border-b border-r rounded-r-md ${editedRelation.design?.columnStyles?.[selectedColumn]?.fontWeight === 'bold' ? 'bg-cyan-100' : ''}`}>Bold</button></div></div>
                    </div>
                     <div><label className="font-semibold">Color</label><input type="color" value={editedRelation.design?.columnStyles?.[selectedColumn]?.color || '#000000'} onChange={e => handleDesignChange(`design.columnStyles.${selectedColumn}.color`, e.target.value)} className="w-full mt-1 p-0 h-8 border rounded-md" /></div>
                </div>
            )}
            {designerTab === 'background' && (
                <div className="space-y-3 text-sm">
                    <div className="flex gap-2"><button onClick={() => handleDesignChange('design.background.type', 'color')} className={`flex-1 p-2 rounded-md font-semibold ${editedRelation.design?.background?.type === 'color' ? 'bg-cyan-100' : 'bg-slate-200'}`}>Color</button><button onClick={() => handleDesignChange('design.background.type', 'gradient')} className={`flex-1 p-2 rounded-md font-semibold ${editedRelation.design?.background?.type === 'gradient' ? 'bg-cyan-100' : 'bg-slate-200'}`}>Gradient</button><button onClick={() => handleDesignChange('design.background.type', 'image')} className={`flex-1 p-2 rounded-md font-semibold ${editedRelation.design?.background?.type === 'image' ? 'bg-cyan-100' : 'bg-slate-200'}`}>Image</button></div>
                    {editedRelation.design?.background?.type === 'color' && <div><label>Color</label><input type="color" value={editedRelation.design?.background?.value || '#FFFFFF'} onChange={e => handleDesignChange('design.background.value', e.target.value)} className="w-full h-8 mt-1" /></div>}
                    {editedRelation.design?.background?.type === 'gradient' && <div className="space-y-2">
                        <div><label>Color 1</label><input type="color" value={editedRelation.design?.background?.color1 || '#FFFFFF'} onChange={e => handleDesignChange('design.background.color1', e.target.value)} className="w-full h-8 mt-1" /></div>
                        <div><label>Color 2</label><input type="color" value={editedRelation.design?.background?.color2 || '#FFFFFF'} onChange={e => handleDesignChange('design.background.color2', e.target.value)} className="w-full h-8 mt-1" /></div>
                        <div><label>Angle</label><input type="range" min="0" max="360" value={editedRelation.design?.background?.angle || 180} onChange={e => handleDesignChange('design.background.angle', parseInt(e.target.value))} className="w-full mt-1" /></div>
                    </div>}
                    {editedRelation.design?.background?.type === 'image' && <div><label>Image URL</label><input type="text" value={editedRelation.design?.background?.value || ''} onChange={e => handleDesignChange('design.background.value', e.target.value)} placeholder="https://..." className="w-full mt-1 p-1 border rounded-md" /></div>}
                     <button onClick={() => handleDesignChange('design.background', undefined)} className="text-xs text-red-500 hover:underline">Remove Background</button>
                </div>
            )}
            {onUpdateRelation && <button onClick={handleSaveDesign} className="w-full mt-6 bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2"><SaveIcon/> Save Design</button>}
        </div>
    );
    
    const title = isDesignMode ? 'Relation Designer' : `Preview: ${relation.name}`;
    const size = isDesignMode ? 'xl' : 'lg';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-grow flex flex-col items-center">
                    <div className="w-full max-w-2xl h-[450px]">
                         <div className="w-full h-full" style={{ perspective: '1000px' }} onClick={() => !isDesignMode && setIsFlipped(f => !f)}>
                            <div className="relative w-full h-full" style={{transformStyle: 'preserve-3d', transition: 'transform 0.6s', transform: isFlipped ? 'rotateY(180deg)' : ''}}>
                                <div style={{...getBackgroundStyle(editedRelation), backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden'}} className="absolute w-full h-full bg-white rounded-2xl shadow-xl flex flex-col items-start justify-center p-6 border border-slate-200 overflow-hidden">
                                    {renderFrontContent()}
                                </div>
                                <div style={{...getBackgroundStyle(editedRelation), backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)'}} className="absolute w-full h-full bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center p-8 border border-slate-200">
                                    <div className="text-center w-full space-y-2">{renderBackContent()}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {!isDesignMode && <p className="mt-4 text-sm text-slate-500">Click card to flip. This uses the first word in your table.</p>}
                    {!startInDesignMode && <button onClick={() => setIsDesignMode(p => !p)} className="mt-4 bg-slate-100 hover:bg-slate-200 font-semibold py-2 px-4 rounded-lg flex items-center gap-2"><SparklesIcon className="w-5 h-5"/> {isDesignMode ? 'Exit Designer' : 'Open Designer'}</button>}
                </div>
                {isDesignMode && designerSidebar}
            </div>
        </Modal>
    );
};

export default RelationPreviewModal;
