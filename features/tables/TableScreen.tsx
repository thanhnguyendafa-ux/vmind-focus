import * as React from 'react';
import { Table, VocabRow, Relation, Column, AIPrompt, Filter, Sort, Screen, StudyMode, FlashcardStatus } from '../../types';
import { useTableStore } from '../../stores/useTableStore';
import { useUIStore } from '../../stores/useUIStore';
import { useUserStore } from '../../stores/useUserStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { generateForPrompt } from '../../services/geminiService';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';


import ConfirmationModal from '../../components/ui/ConfirmationModal';
import TableScreenHeader from './components/TableScreenHeader';
import ViewTab from './components/ViewTab';
import RelationsTab from './components/RelationsTab';
import SettingsTab from './components/SettingsTab';
import WordDetailModal from './WordDetailModal';
import ShareModal from './components/ShareModal';
import ColumnEditorModal from './components/ColumnEditorModal';
import RelationSettingsModal from './components/RelationSettingsModal';
import AIPromptModal from './components/AIPromptModal';
import BatchAiModal from './components/BatchAiModal';
import PasteImportModal from './components/PasteImportModal';
import { TableViewProvider, useTableView } from './contexts/TableViewContext';

const sortableStats = [ { key: 'stat:successRate', label: 'Success %' }, { key: 'stat:encounters', label: 'Encounters' }, { key: 'stat:lastStudied', label: 'Last Studied' }, ];

const dbRowToVocabRow = (row: any): VocabRow => {
    const { stats, table_id, user_id, ...rest } = row;
    const { last_studied, flashcard_status, flashcard_encounters, is_flashcard_reviewed, last_practice_date, scramble_encounters, scramble_ratings, theater_encounters, ...restStats } = stats;
    const statsCamel = {
        ...restStats,
        lastStudied: last_studied,
        flashcardStatus: flashcard_status,
        flashcardEncounters: flashcard_encounters,
        isFlashcardReviewed: is_flashcard_reviewed,
        lastPracticeDate: last_practice_date,
        scrambleEncounters: scramble_encounters,
        scrambleRatings: scramble_ratings,
        theaterEncounters: theater_encounters,
    };
    return { ...rest, stats: statsCamel };
};

const BatchDeleteConfirmation: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (rowsToDelete: Set<string>) => void;
}> = ({ isOpen, onClose, onConfirm }) => {
    const { state, dispatch } = useTableView();
    const { selectedRows } = state;

    const handleConfirm = () => {
        onConfirm(selectedRows);
        dispatch({ type: 'SET_SELECTED_ROWS', payload: new Set() });
    };

    return (
        <ConfirmationModal
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={handleConfirm}
            title="Delete Selected Rows"
            message={`Are you sure you want to delete the ${selectedRows.size} selected rows?`}
            warning="This action cannot be undone."
            confirmText="Delete"
        />
    );
};


const TableScreenContent: React.FC<{ table: Table }> = ({ table: tableFromProp }) => {
    const { tables, updateTable, upsertRow } = useTableStore();
    const table = tables.find(t => t.id === tableFromProp.id) || tableFromProp;
    const { showToast, setCurrentScreen } = useUIStore();
    const { isGuest, settings } = useUserStore();
    const { setStudySetupSourceTableId } = useSessionStore();
    const { state, dispatch } = useTableView();
    const [activeTab, setActiveTab] = React.useState<'view' | 'relations' | 'settings'>('view');
    
    // State for modals
    const [rowToEdit, setRowToEdit] = React.useState<VocabRow | null>(null);
    const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);
    const [isColumnEditorOpen, setIsColumnEditorOpen] = React.useState(false);
    const [relationToEdit, setRelationToEdit] = React.useState<Relation | null>(null);
    const [relationToDelete, setRelationToDelete] = React.useState<Relation | null>(null);
    const [columnToConfigureAI, setColumnToConfigureAI] = React.useState<Column | null>(null);
    const [isBatchAiModalOpen, setIsBatchAiModalOpen] = React.useState(false);
    const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = React.useState(false);
    const [pasteData, setPasteData] = React.useState<{ rows: string[][] } | null>(null);
    const [isQuickAddMode, setIsQuickAddMode] = React.useState(false);


    // --- Data Fetching for Rows ---
    const fetchTableRows = async () => {
        const { data, error } = await supabase.from('vocab_rows').select('*').eq('table_id', table.id);
        if (error) throw new Error(error.message);
        return (data as any[]).map(dbRowToVocabRow);
    };

    const { data: fetchedRows, isLoading: areRowsLoading } = useQuery({
        queryKey: ['tableRows', table.id],
        queryFn: fetchTableRows,
        enabled: (table.rowCount ?? 0) > 0 && table.rows.length === 0,
    });

    React.useEffect(() => {
        if (fetchedRows) {
            // Get the latest table state from the store to avoid dependency loops.
            const currentTable = useTableStore.getState().tables.find(t => t.id === table.id);
            if (currentTable) {
                updateTable({ ...currentTable, rows: fetchedRows });
            }
        }
    }, [fetchedRows, table.id, updateTable]);
    // --- End Data Fetching ---

    // --- View Settings Persistence ---
    const viewSettingsKey = `vmind-table-view-settings-${table.id}`;

    React.useEffect(() => {
        try {
            const savedSettings = localStorage.getItem(viewSettingsKey);
            if (savedSettings) {
                dispatch({ type: 'INITIALIZE_VIEW_SETTINGS', payload: JSON.parse(savedSettings) });
            } else {
                dispatch({ type: 'INITIALIZE_VIEW_SETTINGS', payload: {} }); 
            }
        } catch (e) {
            console.error("Failed to load view settings from storage", e);
        }
    }, [table.id, dispatch]);

    React.useEffect(() => {
        const settingsToSave = {
            columnWidths: state.columnWidths,
            rowHeight: state.rowHeight,
            isTextWrapEnabled: state.isTextWrapEnabled,
        };
        localStorage.setItem(viewSettingsKey, JSON.stringify(settingsToSave));
    }, [state.columnWidths, state.rowHeight, state.isTextWrapEnabled, viewSettingsKey]);
    // --- End View Settings Persistence ---


    const handleUpdateTable = (updated: Partial<Table>) => updateTable({ ...table, ...updated });

    const handleAddNewRow = () => { 
        const newRow: VocabRow = { 
            id: crypto.randomUUID(), 
            cols: {}, 
            stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } 
        }; 
        setIsQuickAddMode(true);
        setRowToEdit(newRow); 
    };
    
    const handleUpdateRow = async (updatedRow: VocabRow): Promise<boolean> => {
        const success = await upsertRow(table.id, updatedRow);

        if (success && !isQuickAddMode) {
            const isNew = !table.rows.some(r => r.id === updatedRow.id);
            showToast(isNew ? 'Row added successfully.' : 'Row updated successfully.', 'success');
            setRowToEdit(null);
        }
        return success;
    };

    const handleDeleteRow = (rowId: string) => { handleUpdateTable({ rows: table.rows.filter(r => r.id !== rowId) }); showToast('Row deleted.', 'success'); };
    const handleConfirmBatchDelete = (rowsToDelete: Set<string>) => { handleUpdateTable({ rows: table.rows.filter(r => !rowsToDelete.has(r.id)) }); showToast(`${rowsToDelete.size} rows deleted.`, 'success'); setIsBatchDeleteConfirmOpen(false); };
    
    const handleAddNewColumn = async (name: string): Promise<boolean> => {
        if (!name.trim()) return false;
        const newColumn: Column = { id: crypto.randomUUID(), name: name.trim() };
        const newColumns = [...table.columns, newColumn];
        const success = await updateTable({ ...table, columns: newColumns });
        if (success) {
            showToast('Column added successfully.', 'success');
        }
        return success;
    };
    
    const handleUpdateTags = (newTags: string[]) => {
        handleUpdateTable({ tags: newTags });
    };

    const handleSaveColumns = (newColumns: Column[]) => {
        const deletedColIds = new Set(table.columns.filter(c => !newColumns.some(nc => nc.id === c.id)).map(c => c.id));
        const updatedRows = table.rows.map(row => {
            const newCols = { ...row.cols };
            deletedColIds.forEach((id: string) => delete newCols[id]);
            return { ...row, cols: newCols };
        });
        handleUpdateTable({ columns: newColumns, rows: updatedRows });
        setIsColumnEditorOpen(false);
        showToast('Columns updated.', 'success');
    };
    const handleSaveRelation = (rel: Relation) => { const isNew = !table.relations.some(r => r.id === rel.id); handleUpdateTable({ relations: isNew ? [...(table.relations || []), rel] : (table.relations || []).map(r => r.id === rel.id ? rel : r) }); setRelationToEdit(null); showToast(isNew ? 'Relation created.' : 'Relation updated.', 'success'); };
    const handleDeleteRelation = (relId: string) => { handleUpdateTable({ relations: (table.relations || []).filter(r => r.id !== relId) }); setRelationToDelete(null); showToast('Relation deleted.', 'success'); };
    const handleSaveAIPrompt = (prompt: AIPrompt) => { const prompts = (table.aiPrompts || []).filter(p => p.id !== prompt.id); handleUpdateTable({ aiPrompts: [...prompts, prompt] }); setColumnToConfigureAI(null); showToast('AI prompt saved.', 'success'); };
    const handleDeleteAIPrompt = (promptId: string) => { handleUpdateTable({ aiPrompts: (table.aiPrompts || []).filter(p => p.id !== promptId) }); setColumnToConfigureAI(null); showToast('AI prompt deleted.', 'success'); };
    
    const fillablePrompts = React.useMemo(() => {
        return (table.aiPrompts || [])
            .map(prompt => {
                const fillableCells = table.rows.map(row => {
                    const targetEmpty = !row.cols[prompt.targetColumnId];
                    const sourcesPresent = prompt.sourceColumnIds.every(srcId => row.cols[srcId]);
                    return (targetEmpty && sourcesPresent) ? { rowId: row.id, columnId: prompt.targetColumnId } : null;
                }).filter((c): c is { rowId: string, columnId: string } => c !== null);
                return { prompt, fillableCells };
            })
            .filter(p => p.fillableCells.length > 0);
    }, [table.aiPrompts, table.rows]);

    const handleRunAiClick = () => {
        if (fillablePrompts.length > 0) {
            setIsBatchAiModalOpen(true);
        } else {
            const allPromptTargetIds = new Set((table.aiPrompts || []).map(p => p.targetColumnId));
            const unconfiguredColumnWithEmptyCell = table.columns.find(col =>
                !allPromptTargetIds.has(col.id) && table.rows.some(row => !row.cols[col.id])
            );

            if (unconfiguredColumnWithEmptyCell) {
                showToast(`Column '${unconfiguredColumnWithEmptyCell.name}' has empty cells but no AI prompt is configured.`, 'info');
            } else {
                showToast('All AI-fillable cells already have data.', 'info');
            }
        }
    };
    
    const handleBatchGenerate = async (selectedPromptIds: Set<string>) => {
        setIsBatchAiModalOpen(false);
        showToast("Starting AI generation...", 'info');
        let totalFilled = 0;
        const fillable = fillablePrompts.filter(p => selectedPromptIds.has(p.prompt.id));
        
        const generationPromises = [];
        for (const { prompt, fillableCells } of fillable) {
            for (const cell of fillableCells.slice(0, 5 - totalFilled)) { // Limit to 5 total
                const row = table.rows.find(r => r.id === cell.rowId);
                if (!row) continue;
                const sourceValues = prompt.sourceColumnIds.reduce((acc, srcId) => { const colName = table.columns.find(c => c.id === srcId)?.name; if (colName) acc[colName] = row.cols[srcId] || ''; return acc; }, {} as Record<string, string>);
                generationPromises.push(generateForPrompt(prompt.prompt, sourceValues).then(result => ({ rowId: cell.rowId, columnId: cell.columnId, result })));
                totalFilled++;
            }
        }

        try {
            const results = await Promise.all(generationPromises);
            handleUpdateTable({
                rows: table.rows.map(row => {
                    const updates = results.filter(res => res.rowId === row.id);
                    if (updates.length === 0) return row;
                    const newCols = { ...row.cols };
                    updates.forEach(u => newCols[u.columnId] = u.result);
                    return { ...row, cols: newCols };
                })
            });
            showToast(`Successfully generated ${results.length} cells.`, 'success');
        } catch (error: any) {
            if (error.message === "API_KEY_MISSING") showToast("Please set your Gemini API key.", "error");
            else showToast("An AI error occurred during batch generation.", "error");
        }
    };

    const handleStudyNavigation = (mode: 'StudySession' | 'Flashcards' | 'Scramble' | 'Theater') => {
        setStudySetupSourceTableId(table.id);
        switch (mode) {
            case 'StudySession':
                setCurrentScreen(Screen.StudySetup);
                break;
            case 'Flashcards':
                setCurrentScreen(Screen.Flashcards);
                break;
            case 'Scramble':
                setCurrentScreen(Screen.ScrambleSetup);
                break;
            case 'Theater':
                setCurrentScreen(Screen.TheaterSetup);
                break;
        }
    };

    const handleConfirmPasteImport = (newRows: VocabRow[]) => {
        if (newRows.length > 0) {
            handleUpdateTable({
                rows: [...table.rows, ...newRows]
            });
            showToast(`Imported ${newRows.length} new rows.`, 'success');
        }
        setPasteData(null);
    };

    const handlePasteClick = () => {
        showToast("Copied from a spreadsheet? Just paste to import.", 'info');
    };

    return (
        <div className="p-4 sm:p-6 mx-auto">
            <TableScreenHeader
                tableName={table.name}
                isGuest={isGuest}
                isPublic={table.isPublic}
                onBack={() => setCurrentScreen(Screen.Tables)}
                onUpdateName={(name) => handleUpdateTable({ name })}
                onShareClick={() => setIsShareModalOpen(true)}
                onStudyClick={handleStudyNavigation}
                tags={table.tags || []}
                onUpdateTags={handleUpdateTags}
                tagColors={settings.tagColors || {}}
            />
            <div className="border-b border-slate-200 dark:border-slate-700 mb-4"><div className="flex space-x-4"><button onClick={() => setActiveTab('view')} className={`px-1 py-3 font-semibold text-sm ${activeTab === 'view' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-slate-500'}`}>View</button><button onClick={() => setActiveTab('relations')} className={`px-1 py-3 font-semibold text-sm ${activeTab === 'relations' ? 'border-b-2 border-primary-500 text-primary-600' : 'text-slate-500'}`}>Relations</button><button onClick={() => setActiveTab('settings')} className={`px-1 py-3 font-semibold text-sm ${activeTab === 'settings' ? 'border-b-2 border-primary-500 text-primary-600' : 'text-slate-500'}`}>Settings</button></div></div>
            
            {activeTab === 'view' && (
                <div className="animate-fadeIn">
                    <ViewTab 
                        table={table} 
                        isLoading={areRowsLoading}
                        sortableStats={sortableStats} 
                        fillablePrompts={fillablePrompts} 
                        onAddNewRow={handleAddNewRow} 
                        onEditRow={setRowToEdit} 
                        onManageColumns={() => setIsColumnEditorOpen(true)}
                        onConfigureAI={setColumnToConfigureAI} 
                        onBatchDelete={() => setIsBatchDeleteConfirmOpen(true)}
                        onConfirmBatchGenerate={() => setIsBatchAiModalOpen(true)} 
                        onRunAiClick={handleRunAiClick}
                        onPasteData={setPasteData}
                        onPasteClick={handlePasteClick}
                    />
                     <BatchDeleteConfirmation 
                        isOpen={isBatchDeleteConfirmOpen}
                        onClose={() => setIsBatchDeleteConfirmOpen(false)}
                        onConfirm={handleConfirmBatchDelete}
                    />
                </div>
            )}
            {activeTab === 'relations' && <div className="animate-fadeIn"><RelationsTab table={table} onOpenNewRelation={() => setRelationToEdit({id: crypto.randomUUID(), name: 'New Relation', questionColumnIds: [], answerColumnIds: [], compatibleModes: [StudyMode.Flashcards, StudyMode.MultipleChoice, StudyMode.Typing]})} onOpenRelationSettings={(relation, tab) => setRelationToEdit(relation)} setRelationToDelete={setRelationToDelete} /></div>}
            {activeTab === 'settings' && <div className="animate-fadeIn"><SettingsTab table={table} onManageColumns={() => setIsColumnEditorOpen(true)} onConfigureAI={setColumnToConfigureAI} onUpdateTable={(t) => updateTable(t)}/></div>}
            
            <WordDetailModal 
                isOpen={!!rowToEdit} 
                row={rowToEdit} 
                columns={table.columns} 
                aiPrompts={table.aiPrompts} 
                imageConfig={table.imageConfig} 
                audioConfig={table.audioConfig} 
                onClose={() => { setRowToEdit(null); setIsQuickAddMode(false); }} 
                onSave={handleUpdateRow} 
                onDelete={handleDeleteRow} 
                onConfigureAI={setColumnToConfigureAI} 
                onAddColumn={handleAddNewColumn} 
                quickAddMode={isQuickAddMode}
            />
            <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} table={table} onShare={(desc, tags) => { handleUpdateTable({ description: desc, tags: tags.split(',').map(t => t.trim()), isPublic: true }); setIsShareModalOpen(false); showToast('Sharing settings updated.', 'success'); }} />
            <ColumnEditorModal isOpen={isColumnEditorOpen} onClose={() => setIsColumnEditorOpen(false)} columns={table.columns} onSave={handleSaveColumns} />
            <RelationSettingsModal isOpen={!!relationToEdit} onClose={() => setRelationToEdit(null)} onSave={handleSaveRelation} relation={relationToEdit} table={table} />
            <ConfirmationModal isOpen={!!relationToDelete} onClose={() => setRelationToDelete(null)} onConfirm={() => handleDeleteRelation(relationToDelete!.id)} title="Delete Relation" message={`Delete "${relationToDelete?.name}"?`} />
            <AIPromptModal isOpen={!!columnToConfigureAI} onClose={() => setColumnToConfigureAI(null)} onSave={handleSaveAIPrompt} onDelete={handleDeleteAIPrompt} targetColumn={columnToConfigureAI} tableColumns={table.columns} promptToEdit={(table.aiPrompts || []).find(p => p.targetColumnId === columnToConfigureAI?.id) || null} />
            <BatchAiModal isOpen={isBatchAiModalOpen} onClose={() => setIsBatchAiModalOpen(false)} onGenerate={handleBatchGenerate} fillablePrompts={fillablePrompts} columns={table.columns} />
            {pasteData && (
                <PasteImportModal
                    isOpen={!!pasteData}
                    onClose={() => setPasteData(null)}
                    onConfirm={handleConfirmPasteImport}
                    pastedData={pasteData}
                    table={table}
                />
            )}
        </div>
    );
};

// Wrap TableScreenContent with the context provider
const TableScreen: React.FC<{ table: Table }> = ({ table }) => {
    return (
        <TableViewProvider columns={table.columns}>
            <TableScreenContent table={table} />
        </TableViewProvider>
    );
};

export default TableScreen;