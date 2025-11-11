import * as React from 'react';
import { Table, VocabRow, Relation, Column, StudyMode, RelationDesign, CardFaceDesign, TypographyDesign, Theme, TextBox } from '../../../types';
import Icon from '../../../components/ui/Icon';
import Modal from '../../../components/ui/Modal';
import { useUIStore } from '../../../stores/useUIStore';
import { DESIGN_TEMPLATES, DEFAULT_TYPOGRAPHY, DARK_MODE_DEFAULT_TYPOGRAPHY, DEFAULT_RELATION_DESIGN } from '../designConstants';


// --- [NEW] Smart Layout Generator ---
function generateDefaultLayout(relation: Relation, table: Table, theme: Theme): RelationDesign {
    const defaultTypo = theme === 'dark' ? DARK_MODE_DEFAULT_TYPOGRAPHY : DEFAULT_TYPOGRAPHY;
    const newDesign = JSON.parse(JSON.stringify(DEFAULT_RELATION_DESIGN));

    // Define Styles
    const labelTypo: TypographyDesign = { ...defaultTypo, color: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: '0.875rem', fontWeight: 'normal', textAlign: 'left' };
    const separatorTypo: TypographyDesign = { ...defaultTypo, color: theme === 'dark' ? '#475569' : '#cbd5e1', fontSize: '0.75rem', fontWeight: 'normal' };

    // Process Front Face
    const questionLabelBox: TextBox = { id: `txt-q-label-${Date.now()}`, text: 'Question:', typography: labelTypo };
    const separatorBox: TextBox = { id: `txt-sep-${Date.now()}`, text: '--------------------', typography: separatorTypo };
    const answerColumnNames = relation.answerColumnIds.map(id => table.columns.find(c => c.id === id)?.name).filter(Boolean);
    const answerHintBox: TextBox = {
        id: `txt-a-hint-${Date.now()}`,
        text: `Answer = ${answerColumnNames.join(' + ')} = ????`,
        // @ts-ignore
        typography: { ...labelTypo, fontStyle: 'italic' }
    };

    newDesign.front.textBoxes = [questionLabelBox, separatorBox, answerHintBox];
    relation.questionColumnIds.forEach(id => {
        newDesign.front.typography[id] = { ...defaultTypo };
    });
    newDesign.front.elementOrder = [questionLabelBox.id, ...relation.questionColumnIds, separatorBox.id, answerHintBox.id];
    newDesign.front.layout = 'vertical';

    // Process Back Face
    const answerLabelBox: TextBox = { id: `txt-a-label-${Date.now()}`, text: 'Answer:', typography: labelTypo };
    newDesign.back.textBoxes = [answerLabelBox];
    relation.answerColumnIds.forEach(id => {
        newDesign.back.typography[id] = { ...defaultTypo };
    });
    newDesign.back.elementOrder = [answerLabelBox.id, ...relation.answerColumnIds];
    newDesign.back.layout = 'vertical';
    
    newDesign.designLinked = true;

    return newDesign;
}


const TextElementPreview: React.FC<{
    text: string;
    typography: TypographyDesign;
}> = ({ text, typography }) => {
    const textRef = React.useRef<HTMLDivElement>(null);
    const [isOverflowing, setIsOverflowing] = React.useState(false);
    const { overflowBehavior, maxLines } = typography;

    React.useLayoutEffect(() => {
        const checkOverflow = () => {
            if (textRef.current) {
                setIsOverflowing(textRef.current.scrollHeight > textRef.current.clientHeight);
            }
        };
        checkOverflow();
        const timeoutId = setTimeout(checkOverflow, 100);
        return () => clearTimeout(timeoutId);
    }, [text, typography, maxLines]);

    const style: React.CSSProperties = { ...typography, wordBreak: 'break-word' };

    if (overflowBehavior === 'truncate') {
        style.display = '-webkit-box';
        style.WebkitBoxOrient = 'vertical';
        style.WebkitLineClamp = maxLines || 3;
        style.overflow = 'hidden';
        style.textOverflow = 'ellipsis';
    } else if (overflowBehavior === 'scroll') {
        style.overflowY = 'auto';
        style.maxHeight = '7em';
        style.paddingRight = '8px';
    }

    return (
        <div className="relative w-full">
            <div ref={textRef} style={style}>
                {text}
            </div>
            {overflowBehavior === 'truncate' && isOverflowing && (
                <div className="absolute bottom-0 right-0 bg-white/50 dark:bg-slate-800/50 rounded-full p-1 backdrop-blur-sm">
                    <Icon name="arrows-pointing-out" className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </div>
            )}
        </div>
    );
};


const FlashcardPreview: React.FC<{ design: CardFaceDesign, columns: {id: string, name: string}[], textBoxes: TextBox[], face: 'front' | 'back', onSelectElement: (id: string | null) => void, elementOrder: string[], onReorder: (newOrder: string[]) => void, selectedElementId?: string | null, sampleDataRow: VocabRow | null, onAddTextBox: () => void }> = ({ design, columns, textBoxes, onSelectElement, elementOrder, onReorder, selectedElementId, sampleDataRow, onAddTextBox }) => { const draggedItem = React.useRef<string | null>(null); const [isDragOver, setIsDragOver] = React.useState(false); const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => { draggedItem.current = id; e.dataTransfer.setData('vmind/element-id', id); e.dataTransfer.effectAllowed = 'move'; }; const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }; const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => { e.preventDefault(); const draggedId = e.dataTransfer.getData('vmind/element-id'); if (!draggedId || draggedId === targetId) return; const currentIndex = elementOrder.indexOf(draggedId); const targetIndex = elementOrder.indexOf(targetId); if (currentIndex === -1 || targetIndex === -1) return; const newOrder = [...elementOrder]; newOrder.splice(currentIndex, 1); newOrder.splice(targetIndex, 0, draggedId); onReorder(newOrder); draggedItem.current = null; }; const handleContainerDragOver = (e: React.DragEvent<HTMLDivElement>) => { if (e.dataTransfer.types.includes('vmind/new-element')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setIsDragOver(true); } }; const handleContainerDrop = (e: React.DragEvent<HTMLDivElement>) => { if (e.dataTransfer.getData('vmind/new-element') === 'textbox') { e.preventDefault(); onAddTextBox(); } setIsDragOver(false); }; return ( <div className={`w-full h-full flex flex-col p-4 relative transition-all ${isDragOver ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-900' : ''}`} onClick={(e) => { e.stopPropagation(); onSelectElement(null); }} onDragEnter={handleContainerDragOver} onDragOver={handleContainerDragOver} onDragLeave={() => setIsDragOver(false)} onDrop={handleContainerDrop}> <div className={`flex-1 flex items-center justify-center ${design.layout === 'vertical' ? 'flex-col gap-2' : 'flex-row gap-4'}`}> {elementOrder.length > 0 ? elementOrder.map(id => { const col = columns.find(c => c.id === id); const txt = textBoxes.find(t => t.id === id); if (col) { const typography = design.typography[col.id] || DEFAULT_TYPOGRAPHY; const sampleText = sampleDataRow ? (sampleDataRow.cols[col.id] || '...') : '[Sample Data]'; return ( <div key={col.id} onClick={(e) => { e.stopPropagation(); onSelectElement(col.id) }} draggable onDragStart={(e) => handleDragStart(e, col.id)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.id)} className={`p-2 rounded-md cursor-pointer transition-all w-full ${selectedElementId === col.id ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-800' : ''}`}> <span className="font-semibold" style={{ opacity: 0.7, fontSize: '0.7em', marginRight: '0.5em', color: typography.color }}>{col.name}:</span> <TextElementPreview text={sampleText} typography={typography} /> </div> ); } if (txt) { return ( <div key={txt.id} onClick={(e) => { e.stopPropagation(); onSelectElement(txt.id) }} draggable onDragStart={(e) => handleDragStart(e, txt.id)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, txt.id)} className={`p-2 rounded-md cursor-pointer transition-all w-full ${selectedElementId === txt.id ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-800' : ''}`}> <TextElementPreview text={txt.text} typography={txt.typography} /> </div> ); } return null; }) : <span className="text-sm text-slate-400 dark:text-slate-500">No elements selected for this face.</span>} </div> </div> ); };

// --- Setup Tab ---
const RelationSetupTab: React.FC<{
    relation: Relation;
    table: Table;
    onFieldChange: (field: keyof Relation, value: any) => void;
}> = ({ relation, table, onFieldChange }) => {
    const handleColumnToggle = (type: 'question' | 'answer', columnId: string) => {
        const key = type === 'question' ? 'questionColumnIds' : 'answerColumnIds';
        const currentIds = new Set(relation[key]);
        if (currentIds.has(columnId)) currentIds.delete(columnId); else currentIds.add(columnId);
        onFieldChange(key, Array.from(currentIds));
    };
    const handleModeToggle = (mode: StudyMode) => {
        const currentModes = new Set(relation.compatibleModes || []);
        if (currentModes.has(mode)) { currentModes.delete(mode); } else { if (mode === StudyMode.Scrambled) { currentModes.clear(); } else { currentModes.delete(StudyMode.Scrambled); } currentModes.add(mode); }
        onFieldChange('compatibleModes', Array.from(currentModes));
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Relation Name</label>
                <input type="text" value={relation.name} onChange={e => onFieldChange('name', e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-medium text-slate-700 dark:text-slate-300 text-sm mb-2">Question Columns</h4>
                    <div className="space-y-2">{table.columns.map(col => (<label key={col.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={relation.questionColumnIds.includes(col.id)} onChange={() => handleColumnToggle('question', col.id)} /> {col.name}</label>))}</div>
                </div>
                <div>
                    <h4 className="font-medium text-slate-700 dark:text-slate-300 text-sm mb-2">Answer Columns</h4>
                    <div className="space-y-2">{table.columns.map(col => (<label key={col.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={relation.answerColumnIds.includes(col.id)} onChange={() => handleColumnToggle('answer', col.id)} /> {col.name}</label>))}</div>
                </div>
            </div>
            <div>
                <h4 className="font-medium text-slate-700 dark:text-slate-300 text-sm mb-2">Compatible Study Modes</h4>
                <div className="flex flex-wrap gap-2">
                    {Object.values(StudyMode).map(mode => (
                        <button key={mode} onClick={() => handleModeToggle(mode)} className={`px-2 py-1 rounded-full text-xs font-semibold border transition-colors ${(relation.compatibleModes || []).includes(mode) ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700' : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'}`}>{mode}</button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- Design Tab ---
const RelationDesignTab: React.FC<{
    relation: Relation;
    table: Table;
    onRelationUpdate: (updater: (draft: Relation) => void) => void;
}> = ({ relation, table, onRelationUpdate }) => {
    const [activeFace, setActiveFace] = React.useState<'front' | 'back'>('front');
    const [selectedElementId, setSelectedElementId] = React.useState<string | null>(null);
    const [bgTab, setBgTab] = React.useState<'solid' | 'gradient' | 'image'>('solid');
    const { theme } = useUIStore();
    const sampleDataRow = (table.rows && table.rows.length > 0) ? table.rows[0] : null;
    const [textInputValue, setTextInputValue] = React.useState('');
    const [fontSizeInputValue, setFontSizeInputValue] = React.useState('');

    React.useEffect(() => {
        if (!relation.design) {
            onRelationUpdate(draft => { draft.design = generateDefaultLayout(draft, table, theme); });
        } else {
            setBgTab(relation.design[activeFace].backgroundType);
        }
        setSelectedElementId(null);
    }, [relation.id, theme]);

    React.useEffect(() => { if(relation.design) { setBgTab(relation.design[activeFace].backgroundType); } }, [activeFace, relation.design]);
    
    React.useEffect(() => {
        if (!relation.design || !selectedElementId) { setTextInputValue(''); setFontSizeInputValue(''); return; }
        const faceDesign = relation.design[activeFace];
        const textBox = faceDesign.textBoxes?.find(t => t.id === selectedElementId);
        if (textBox) { setTextInputValue(textBox.text); setFontSizeInputValue(textBox.typography.fontSize); return; }
        const column = (activeFace === 'front' ? relation.questionColumnIds : relation.answerColumnIds).includes(selectedElementId);
        if (column) { const typography = faceDesign.typography[selectedElementId] || (theme === 'dark' ? DARK_MODE_DEFAULT_TYPOGRAPHY : DEFAULT_TYPOGRAPHY); setFontSizeInputValue(typography.fontSize); setTextInputValue(''); }
    }, [selectedElementId, relation, activeFace, theme]);

    if (!relation.design) return null;

    const isFlipped = activeFace === 'back';
    
    const handleFlip = () => {
        setActiveFace(f => f === 'front' ? 'back' : 'front');
        setSelectedElementId(null);
    };

    const handleFaceSelect = (face: 'front' | 'back') => {
        setActiveFace(face);
        setSelectedElementId(null);
    }
    
    const getCardStyle = (design: CardFaceDesign): React.CSSProperties => {
        let background = design.backgroundValue;
        if (design.backgroundType === 'gradient' && design.backgroundValue.includes(',')) {
            const [color1, color2] = design.backgroundValue.split(',');
            background = `linear-gradient(${design.gradientAngle}deg, ${color1 || '#ffffff'}, ${color2 || '#e0e0e0'})`;
        } else if (design.backgroundType === 'image') {
            background = `url("${design.backgroundValue}") center/cover no-repeat, #f0f0f0`;
        }
        return { background };
    };

    const faceDesign = relation.design[activeFace];
    const columnsForFace = (activeFace === 'front' ? relation.questionColumnIds : relation.answerColumnIds).map(id => table.columns.find(c => c.id === id)).filter(Boolean) as Column[];
    
    const handleDesignChange = (field: keyof CardFaceDesign, value: any) => { onRelationUpdate(draft => { if (!draft.design) return; if (draft.design.designLinked) { (draft.design.front as any)[field] = value; (draft.design.back as any)[field] = value; } else { (draft.design[activeFace] as any)[field] = value; } }); };
    const handleTypographyChange = (field: keyof TypographyDesign, value: any) => { if (!selectedElementId) return; const elementId = selectedElementId; onRelationUpdate(draft => { if (!draft.design) return; const updateStyleForFace = (faceDesign: CardFaceDesign) => { const isColumn = table.columns.some(c => c.id === elementId); if (isColumn) { const typo = faceDesign.typography[elementId] || (theme === 'dark' ? DARK_MODE_DEFAULT_TYPOGRAPHY : DEFAULT_TYPOGRAPHY); faceDesign.typography[elementId] = { ...typo, [field]: value }; } else { const textBox = faceDesign.textBoxes?.find((t: TextBox) => t.id === elementId); if (textBox) { textBox.typography = { ...textBox.typography, [field]: value }; } } }; if (draft.design.designLinked) { updateStyleForFace(draft.design.front); updateStyleForFace(draft.design.back); } else { updateStyleForFace(draft.design[activeFace]); } }); };
    const handleBackgroundChange = (type: 'solid' | 'gradient' | 'image', value: string) => { handleDesignChange('backgroundValue', value); handleDesignChange('backgroundType', type); };
    const applyTemplate = (template: typeof DESIGN_TEMPLATES[0]) => { onRelationUpdate(draft => { if (!draft.design) return; draft.design.front = { ...draft.design.front, backgroundType: template.design.front.backgroundType, backgroundValue: template.design.front.backgroundValue, gradientAngle: template.design.front.gradientAngle, layout: template.design.front.layout }; draft.design.back = { ...draft.design.back, backgroundType: template.design.back.backgroundType, backgroundValue: template.design.back.backgroundValue, gradientAngle: template.design.back.gradientAngle, layout: template.design.back.layout }; draft.questionColumnIds.forEach(id => { draft.design!.front.typography[id] = template.frontTypography; }); draft.design.front.textBoxes?.forEach(tb => tb.typography = template.frontTypography); draft.answerColumnIds.forEach(id => { draft.design!.back.typography[id] = template.backTypography; }); draft.design.back.textBoxes?.forEach(tb => tb.typography = template.backTypography); draft.design.designLinked = true; }); };
    const handleReorder = (newOrder: string[]) => { onRelationUpdate(draft => { if (draft.design) draft.design[activeFace].elementOrder = newOrder; }); };
    const handleAddTextBox = () => { onRelationUpdate(draft => { if (!draft.design) return; const face = draft.design[activeFace]; if (!face.textBoxes) face.textBoxes = []; if (!face.elementOrder) face.elementOrder = (activeFace === 'front' ? draft.questionColumnIds : draft.answerColumnIds); const newTextBox: TextBox = { id: crypto.randomUUID(), text: 'New Text', typography: theme === 'dark' ? DARK_MODE_DEFAULT_TYPOGRAPHY : DEFAULT_TYPOGRAPHY }; face.textBoxes.push(newTextBox); face.elementOrder.push(newTextBox.id); }); };
    const handleDeleteTextBox = () => { if (!selectedElementId) return; const elementId = selectedElementId; onRelationUpdate(draft => { if (!draft.design) return; const face = draft.design[activeFace]; face.textBoxes = face.textBoxes?.filter(t => t.id !== elementId) || []; face.elementOrder = face.elementOrder?.filter(id => id !== elementId) || []; }); setSelectedElementId(null); };
    
    const handleTextBoxTextBlur = () => { if (!selectedElementId || !relation.design) return; const isTextBox = relation.design[activeFace].textBoxes?.some(t => t.id === selectedElementId); if (isTextBox) { onRelationUpdate(draft => { if (!draft.design) return; const tb = draft.design[activeFace].textBoxes?.find(t => t.id === selectedElementId); if (tb) tb.text = textInputValue; }); } };
    const handleFontSizeInputBlur = () => { if (!selectedElementId || !fontSizeInputValue) return; handleTypographyChange('fontSize', fontSizeInputValue); };
    
    const handleToggleDesignLink = () => { onRelationUpdate(draft => { if (!draft.design) return; const currentlyLinked = draft.design.designLinked ?? false; draft.design.designLinked = !currentlyLinked; if (!currentlyLinked) { if (activeFace === 'front') { const frontDesign = JSON.parse(JSON.stringify(draft.design.front)); draft.design.back = frontDesign; } else { const backDesign = JSON.parse(JSON.stringify(draft.design.back)); draft.design.front = backDesign; } } }); };

    const selectedTextBox = faceDesign.textBoxes?.find(t => t.id === selectedElementId);
    const selectedColumn = columnsForFace.find(c => c.id === selectedElementId);
    const selectedTypography = selectedColumn ? faceDesign.typography[selectedElementId!] || (theme === 'dark' ? DARK_MODE_DEFAULT_TYPOGRAPHY : DEFAULT_TYPOGRAPHY) : selectedTextBox?.typography;
    const gradientColors = faceDesign.backgroundType === 'gradient' ? faceDesign.backgroundValue.split(',') : ['#FFFFFF', '#E0E0E0'];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
            <div className="md:col-span-1 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 space-y-4 self-start">
                <div className="space-y-4">
                    <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">Tools & Templates</h4>
                    <div className="space-y-3 border-b dark:border-slate-700 pb-3">
                        <h5 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Elements</h5>
                        <div draggable onDragStart={e => { e.dataTransfer.setData('vmind/new-element', 'textbox'); e.dataTransfer.effectAllowed = 'copy'; }} className="flex items-center gap-2 p-2 rounded-md bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 cursor-grab active:cursor-grabbing"> <Icon name="font" className="w-5 h-5 text-slate-500" /> <span className="text-sm font-semibold">Text Box</span> </div>
                    </div>
                    <div className="space-y-3">
                        <h5 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Templates</h5>
                        <div className="grid grid-cols-3 gap-3"> {DESIGN_TEMPLATES.map(template => { const style: React.CSSProperties = {}; if (template.design.front.backgroundType === 'gradient') { const [color1, color2] = template.design.front.backgroundValue.split(','); style.background = `linear-gradient(${template.design.front.gradientAngle}deg, ${color1}, ${color2})`; } else { style.background = template.design.front.backgroundValue; } return ( <div key={template.name} onClick={() => applyTemplate(template)} className="cursor-pointer group text-center space-y-1"> <div style={style} className="h-10 w-full rounded-md border border-slate-300 dark:border-slate-600 group-hover:ring-2 ring-emerald-500 transition-all"></div> <span className="text-xs text-slate-500 dark:text-slate-400">{template.name}</span> </div> ); })} </div>
                    </div>
                </div>
                <div>
                    <h4 className="font-bold text-sm mb-2 text-slate-700 dark:text-slate-300">{selectedElementId ? `Styling: "${selectedColumn?.name || selectedTextBox?.text}"` : 'Styling: Card Face'}</h4>
                    {!selectedElementId ? (
                        <div className="space-y-3">
                            <div className="flex rounded-full bg-slate-200 dark:bg-slate-700 p-1 text-sm"><button onClick={()=>setBgTab('solid')} className={`px-2 py-1 rounded-full flex-1 ${bgTab==='solid' && 'bg-white dark:bg-slate-600 shadow'}`}>Solid</button><button onClick={()=>setBgTab('gradient')} className={`px-2 py-1 rounded-full flex-1 ${bgTab==='gradient' && 'bg-white dark:bg-slate-600 shadow'}`}>Gradient</button><button onClick={()=>setBgTab('image')} className={`px-2 py-1 rounded-full flex-1 ${bgTab==='image' && 'bg-white dark:bg-slate-600 shadow'}`}>Image</button></div>
                            {bgTab === 'solid' && <input type="color" value={faceDesign.backgroundType === 'solid' ? faceDesign.backgroundValue : '#FFFFFF'} onChange={e => handleBackgroundChange('solid', e.target.value)} className="w-full h-8 p-0 border-none rounded cursor-pointer"/>}
                            {bgTab === 'gradient' && <div className="space-y-2"><div className="flex gap-2"><input type="color" value={gradientColors[0]} onChange={e => handleBackgroundChange('gradient', `${e.target.value},${gradientColors[1]}`)} className="w-full h-8 p-0 border-none rounded cursor-pointer"/><input type="color" value={gradientColors[1]} onChange={e => handleBackgroundChange('gradient', `${gradientColors[0]},${e.target.value}`)} className="w-full h-8 p-0 border-none rounded cursor-pointer"/></div><input type="range" min="0" max="360" value={faceDesign.gradientAngle} onChange={e => handleDesignChange('gradientAngle', Number(e.target.value))} className="w-full"/></div>}
                            {bgTab === 'image' && <input type="text" placeholder="Image URL..." value={faceDesign.backgroundType === 'image' ? faceDesign.backgroundValue : ''} onChange={e => handleBackgroundChange('image', e.target.value)} className="w-full text-sm bg-white dark:bg-slate-700 border rounded-md px-2 py-1"/>}
                            <div className="flex items-center justify-between pt-2"><label className="text-sm">Layout</label><div className="flex rounded-full bg-slate-200 dark:bg-slate-700 p-1"><button onClick={() => handleDesignChange('layout', 'vertical')} className={`px-2 py-1 rounded-full text-xs ${faceDesign.layout === 'vertical' && 'bg-white dark:bg-slate-600 shadow'}`}>Vertical</button><button onClick={() => handleDesignChange('layout', 'horizontal')} className={`px-2 py-1 rounded-full text-xs ${faceDesign.layout === 'horizontal' && 'bg-white dark:bg-slate-600 shadow'}`}>Horizontal</button></div></div>
                        </div>
                    ) : (
                        <div className="space-y-3 text-sm">
                            {selectedTextBox && ( <div className="flex items-center justify-between"><label>Text</label><input type="text" value={textInputValue} onChange={e => setTextInputValue(e.target.value)} onBlur={handleTextBoxTextBlur} className="w-32 bg-white dark:bg-slate-700 border rounded-md px-2 py-1"/></div> )}
                            <div className="flex items-center justify-between"><label>Color</label><input type="color" value={selectedTypography?.color} onChange={e => handleTypographyChange('color', e.target.value)} className="w-16 h-8 p-0 border-none rounded cursor-pointer"/></div>
                            <div className="flex items-center justify-between"><label>Font Size</label><input type="text" value={fontSizeInputValue} onChange={e => setFontSizeInputValue(e.target.value)} onBlur={handleFontSizeInputBlur} className="w-20 bg-white dark:bg-slate-700 border rounded-md px-2 py-1 text-right"/></div>
                            <div className="flex items-center justify-between"><label>Weight</label><div className="flex rounded-full bg-slate-200 dark:bg-slate-700 p-1"><button onClick={() => handleTypographyChange('fontWeight', 'normal')} className={`px-2 py-1 rounded-full text-xs ${selectedTypography?.fontWeight === 'normal' && 'bg-white dark:bg-slate-600 shadow'}`}>Normal</button><button onClick={() => handleTypographyChange('fontWeight', 'bold')} className={`px-2 py-1 rounded-full text-xs ${selectedTypography?.fontWeight === 'bold' && 'bg-white dark:bg-slate-600 shadow'}`}>Bold</button></div></div>
                            <div className="flex items-center justify-between"><label>Align</label><div className="flex rounded-full bg-slate-200 dark:bg-slate-700 p-1"><button onClick={() => handleTypographyChange('textAlign', 'left')} className={`p-1 rounded-full ${selectedTypography?.textAlign === 'left' && 'bg-white dark:bg-slate-600 shadow'}`}><Icon name="align-left" className="w-5 h-5"/></button><button onClick={() => handleTypographyChange('textAlign', 'center')} className={`p-1 rounded-full ${selectedTypography?.textAlign === 'center' && 'bg-white dark:bg-slate-600 shadow'}`}><Icon name="align-center" className="w-5 h-5"/></button><button onClick={() => handleTypographyChange('textAlign', 'right')} className={`p-1 rounded-full ${selectedTypography?.textAlign === 'right' && 'bg-white dark:bg-slate-600 shadow'}`}><Icon name="align-right" className="w-5 h-5"/></button></div></div>
                            <div className="pt-2 border-t dark:border-slate-700">
                                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Overflow</label>
                                <div className="flex rounded-full bg-slate-200 dark:bg-slate-700 p-1">
                                    <button onClick={() => handleTypographyChange('overflowBehavior', 'visible')} className={`px-2 py-1 rounded-full text-xs flex-1 ${(!selectedTypography?.overflowBehavior || selectedTypography.overflowBehavior === 'visible') && 'bg-white dark:bg-slate-600 shadow'}`}>Visible</button>
                                    <button onClick={() => handleTypographyChange('overflowBehavior', 'truncate')} className={`px-2 py-1 rounded-full text-xs flex-1 ${selectedTypography?.overflowBehavior === 'truncate' && 'bg-white dark:bg-slate-600 shadow'}`}>Truncate</button>
                                    <button onClick={() => handleTypographyChange('overflowBehavior', 'scroll')} className={`px-2 py-1 rounded-full text-xs flex-1 ${selectedTypography?.overflowBehavior === 'scroll' && 'bg-white dark:bg-slate-600 shadow'}`}>Scroll</button>
                                </div>
                                {selectedTypography?.overflowBehavior === 'truncate' && (
                                    <div className="flex items-center justify-between mt-2">
                                        <label>Max Lines</label>
                                        <input 
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={selectedTypography?.maxLines || 3}
                                            onChange={e => handleTypographyChange('maxLines', Number(e.target.value))}
                                            className="w-16 bg-white dark:bg-slate-700 border rounded-md px-2 py-1 text-right"
                                        />
                                    </div>
                                )}
                            </div>
                            {selectedTextBox && <div className="pt-2 border-t dark:border-slate-700"><button onClick={handleDeleteTextBox} className="w-full text-red-500 font-semibold text-xs py-1 hover:bg-red-500/10 rounded">Delete Text Box</button></div>}
                        </div>
                    )}
                </div>
            </div>
            <div className="md:col-span-2 space-y-3">
                <div className="flex items-center justify-center gap-4">
                    <div className="flex rounded-full bg-slate-200 dark:bg-slate-700 p-1 text-sm font-semibold w-fit">
                        <button onClick={() => handleFaceSelect('front')} className={`px-4 py-1.5 rounded-full ${activeFace === 'front' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>Front</button>
                        <button onClick={() => handleFaceSelect('back')} className={`px-4 py-1.5 rounded-full ${activeFace === 'back' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>Back</button>
                    </div>
                    <button onClick={handleToggleDesignLink} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${relation.design.designLinked ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700' : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'}`} title={relation.design.designLinked ? "Unlink designs (edit separately)" : "Link designs (edit together)"}>
                        <Icon name={relation.design.designLinked ? 'link' : 'unlink'} className="w-4 h-4" />
                        <span>{relation.design.designLinked ? 'Linked' : 'Separate'}</span>
                    </button>
                </div>
                <div className={`card-container w-full h-80 perspective-1000 ${isFlipped ? 'flipped' : ''}`} onClick={handleFlip}>
                    <div className="card-flip relative w-full h-full transform-style-3d">
                        <div className="card-front absolute w-full h-full rounded-lg shadow-lg border dark:border-slate-700" style={getCardStyle(relation.design.front)}>
                            <FlashcardPreview
                                design={relation.design.front}
                                columns={(relation.questionColumnIds).map(id => table.columns.find(c => c.id === id)).filter(Boolean) as Column[]}
                                textBoxes={relation.design.front.textBoxes || []}
                                face="front"
                                onSelectElement={setSelectedElementId}
                                elementOrder={relation.design.front.elementOrder || []}
                                onReorder={handleReorder}
                                selectedElementId={activeFace === 'front' ? selectedElementId : null}
                                sampleDataRow={sampleDataRow}
                                onAddTextBox={handleAddTextBox}
                            />
                        </div>
                        <div className="card-back absolute w-full h-full rounded-lg shadow-lg border dark:border-slate-700" style={getCardStyle(relation.design.back)}>
                            <FlashcardPreview
                                design={relation.design.back}
                                columns={(relation.answerColumnIds).map(id => table.columns.find(c => c.id === id)).filter(Boolean) as Column[]}
                                textBoxes={relation.design.back.textBoxes || []}
                                face="back"
                                onSelectElement={setSelectedElementId}
                                elementOrder={relation.design.back.elementOrder || []}
                                onReorder={handleReorder}
                                selectedElementId={activeFace === 'back' ? selectedElementId : null}
                                sampleDataRow={sampleDataRow}
                                onAddTextBox={handleAddTextBox}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Modal ---
interface RelationSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (relation: Relation) => void;
    relation: Relation | null;
    table: Table;
    initialTab?: 'setup' | 'design';
}

const RelationSettingsModal: React.FC<RelationSettingsModalProps> = ({ isOpen, onClose, onSave, relation, table, initialTab = 'setup' }) => {
    const [activeTab, setActiveTab] = React.useState(initialTab);
    const [editedRelation, setEditedRelation] = React.useState<Relation | null>(null);
    const { theme } = useUIStore();

    React.useEffect(() => {
        if (isOpen && relation) {
            const newEditedRelation = JSON.parse(JSON.stringify(relation));

            // If no design exists, generate the smart default.
            if (!newEditedRelation.design) {
                newEditedRelation.design = generateDefaultLayout(newEditedRelation, table, theme);
            } 
            // Handle legacy relations that might have a design but no `designLinked` property.
            else if (newEditedRelation.design.designLinked === undefined) {
                // Default to false for existing, customized designs to avoid breaking changes.
                newEditedRelation.design.designLinked = false; 
            }
            
            setEditedRelation(newEditedRelation);
            setActiveTab(initialTab);
        }
    }, [isOpen, relation, initialTab, table, theme]);

    if (!isOpen || !editedRelation) return null;

    const handleFieldChange = (field: keyof Relation, value: any) => {
        setEditedRelation(prev => {
            if (!prev) return null;
            const newRelation = { ...prev, [field]: value };

            // When question/answer columns are changed in the Setup tab,
            // update the elementOrder in the Design tab to reflect the changes immediately.
            if ((field === 'questionColumnIds' || field === 'answerColumnIds') && newRelation.design) {
                const face: 'front' | 'back' = field === 'questionColumnIds' ? 'front' : 'back';
                const faceDesign = newRelation.design[face];
                const previousColumnIds = field === 'questionColumnIds' ? prev.questionColumnIds : prev.answerColumnIds;

                // Start with the current order, or create a default one from previous columns
                let newOrder = faceDesign.elementOrder || [...previousColumnIds];
                
                // Find columns that were removed
                const removedIds = previousColumnIds.filter(id => !(value as string[]).includes(id));
                // Find columns that were added
                const addedIds = (value as string[]).filter(id => !previousColumnIds.includes(id));

                // Filter out the removed IDs and append the new IDs
                newOrder = newOrder.filter(id => !removedIds.includes(id));
                newOrder.push(...addedIds);
                
                faceDesign.elementOrder = newOrder;
            }
            
            return newRelation;
        });
    };


    const handleRelationUpdate = (updater: (draft: Relation) => void) => {
        setEditedRelation(prev => {
            if (!prev) return null;
            const draft = JSON.parse(JSON.stringify(prev));
            updater(draft);
            return draft;
        });
    };
    
    const handleSave = () => {
        if (editedRelation) onSave(editedRelation);
    };

    const title = editedRelation.id.startsWith('new-rel-') ? "Create Relation" : "Edit Relation";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} containerClassName="max-w-7xl w-full h-[95vh]">
            <div className="flex flex-col h-full">
                <div className="border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <div className="flex space-x-4 px-6">
                        <button onClick={() => setActiveTab('setup')} className={`px-1 py-3 font-semibold text-sm ${activeTab === 'setup' ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Setup</button>
                        <button onClick={() => setActiveTab('design')} className={`px-1 py-3 font-semibold text-sm ${activeTab === 'design' ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Design</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'setup' && <RelationSetupTab relation={editedRelation} table={table} onFieldChange={handleFieldChange} />}
                    {activeTab === 'design' && <RelationDesignTab relation={editedRelation} table={table} onRelationUpdate={handleRelationUpdate} />}
                </div>

                <div className="p-4 border-t dark:border-slate-700 flex justify-end gap-2 flex-shrink-0 bg-slate-50 dark:bg-slate-800/50">
                    <button onClick={onClose} className="bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-semibold px-4 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600">Cancel</button>
                    <button onClick={handleSave} className="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-emerald-700">Save Relation</button>
                </div>
            </div>
        </Modal>
    );
};

export default RelationSettingsModal;