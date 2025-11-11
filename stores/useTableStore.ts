import { create } from 'zustand';
import { Table, Folder, Column, SessionWordResult, FlashcardStatus, VocabRow, StudyMode, Relation, RelationDesign, TypographyDesign, TextBox } from '../types';
import { useUserStore } from './useUserStore';
import { supabase } from '../services/supabaseClient';
import { useUIStore } from './useUIStore';
import { DESIGN_TEMPLATES, DARK_MODE_DEFAULT_TYPOGRAPHY, DEFAULT_TYPOGRAPHY } from '../features/tables/designConstants';


interface TableState {
  tables: Table[];
  folders: Folder[];
  createTable: (name: string, columnsStr: string) => Promise<void>;
  createAnkiStyleTable: (name: string, tags: string[]) => Promise<Table | null>;
  deleteTable: (tableId: string) => Promise<void>;
  updateTable: (updatedTable: Table) => Promise<boolean>;
  upsertRow: (tableId: string, row: VocabRow) => Promise<boolean>;
  importTables: (importedTables: Table[], appendToTableId?: string) => void;
  createFolder: (name: string) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  moveTableToFolder: (tableId: string, folderId: string | null) => Promise<void>;
  reorderFolders: (draggedId: string, targetId: string) => void;
  setTables: (tables: Table[]) => void;
  setInitialData: (data: { tables: Table[], folders: Folder[] }) => void;
  
  // New actions for updating rows from sessions
  updateRowsFromSession: (results: SessionWordResult[], remainingQuestionIds?: Set<string>) => void;
  updateRowsFromFlashcardSession: (history: { rowId: string; status: FlashcardStatus; timestamp: number }[], tableIds: string[]) => void;
  updateRowsFromScrambleSession: (history: { rowId: string; status: FlashcardStatus; timestamp: number }[]) => void;
  updateRowsFromTheaterSession: (history: { rowId: string; timestamp: number }[]) => void;
}

const vocabRowToDb = (row: VocabRow, table_id: string, user_id: string) => {
    const { stats, ...rest } = row;
    const { lastStudied, flashcardStatus, flashcardEncounters, isFlashcardReviewed, lastPracticeDate, scrambleEncounters, scrambleRatings, theaterEncounters, ...restStats } = stats;
    const statsForDb = {
        ...restStats,
        last_studied: lastStudied,
        flashcard_status: flashcardStatus,
        flashcard_encounters: flashcardEncounters,
        is_flashcard_reviewed: isFlashcardReviewed,
        last_practice_date: lastPracticeDate,
        scramble_encounters: scrambleEncounters,
        scramble_ratings: scrambleRatings,
        theater_encounters: theaterEncounters,
    };
    return { ...rest, stats: statsForDb, table_id, user_id };
};


export const useTableStore = create<TableState>()(
    (set, get) => ({
      tables: [],
      folders: [],
      createTable: async (name, columnsStr) => {
        const { session, isGuest } = useUserStore.getState();
        const columnNames = columnsStr.split(',').map(s => s.trim()).filter(Boolean);
        if (columnNames.length === 0) return;

        const newColumns: Column[] = columnNames.map((colName) => ({ id: crypto.randomUUID(), name: colName }));
        const newTable: Table = { id: crypto.randomUUID(), name, columns: newColumns, rows: [], relations: [], createdAt: Date.now(), modifiedAt: Date.now() };
        
        // Optimistic update
        set(state => ({ tables: [...state.tables, newTable] }));

        if (isGuest || !session) return;

        // Save to supabase
        try {
            const { rows, rowCount, imageConfig, audioConfig, aiPrompts, isPublic, createdAt, modifiedAt, ...tableMetadata } = newTable;
            const dataForDb = {
                ...tableMetadata,
                image_config: imageConfig,
                audio_config: audioConfig,
                ai_prompts: aiPrompts,
                is_public: isPublic,
                user_id: session.user.id,
                created_at: new Date(createdAt!).toISOString(),
                modified_at: new Date(modifiedAt!).toISOString(),
            };

            const { error } = await supabase.from('tables').insert(dataForDb);
            if (error) throw error;
        } catch (error: any) {
            console.error("Failed to create table:", error.message || error);
            // Revert on error
            set(state => ({ tables: state.tables.filter(t => t.id !== newTable.id) }));
            useUIStore.getState().showToast("Failed to create table.", "error");
        }
      },
      createAnkiStyleTable: async (name, tags) => {
        const { session, isGuest } = useUserStore.getState();
        const frontCol: Column = { id: crypto.randomUUID(), name: 'Front' };
        const backCol: Column = { id: crypto.randomUUID(), name: 'Back' };

        const randomTemplate = DESIGN_TEMPLATES[Math.floor(Math.random() * DESIGN_TEMPLATES.length)];

        const createDesignForRelation = (relation: Relation): RelationDesign => {
            const theme = useUIStore.getState().theme;
            const defaultTypo = theme === 'dark' ? DARK_MODE_DEFAULT_TYPOGRAPHY : DEFAULT_TYPOGRAPHY;
            const labelTypo: TypographyDesign = { ...defaultTypo, color: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: '0.875rem', fontWeight: 'normal', textAlign: 'left' };

            const design: RelationDesign = JSON.parse(JSON.stringify(randomTemplate.design));
            design.front.typography = {};
            design.back.typography = {};
            
            relation.questionColumnIds.forEach(id => {
                design.front.typography[id] = { ...randomTemplate.frontTypography };
            });
            relation.answerColumnIds.forEach(id => {
                design.back.typography[id] = { ...randomTemplate.backTypography };
            });
            
            const frontLabelBox: TextBox = { id: crypto.randomUUID(), text: 'Question:', typography: labelTypo };
            design.front.textBoxes = [frontLabelBox];
            design.front.elementOrder = [frontLabelBox.id, ...relation.questionColumnIds];
            
            const backLabelBox: TextBox = { id: crypto.randomUUID(), text: 'Answer:', typography: labelTypo };
            design.back.textBoxes = [backLabelBox];
            design.back.elementOrder = [backLabelBox.id, ...relation.answerColumnIds];

            design.designLinked = true;
            return design;
        };

        const relation1: Relation = {
            id: crypto.randomUUID(),
            name: 'Front -> Back',
            questionColumnIds: [frontCol.id],
            answerColumnIds: [backCol.id],
            compatibleModes: [StudyMode.Flashcards]
        };
        relation1.design = createDesignForRelation(relation1);

        const relation2: Relation = {
            id: crypto.randomUUID(),
            name: 'Back -> Front',
            questionColumnIds: [backCol.id],
            answerColumnIds: [frontCol.id],
            compatibleModes: [StudyMode.Flashcards]
        };
        relation2.design = createDesignForRelation(relation2);

        const newTable: Table = {
            id: crypto.randomUUID(),
            name,
            columns: [frontCol, backCol],
            rows: [],
            relations: [relation1, relation2],
            tags: tags,
            createdAt: Date.now(),
            modifiedAt: Date.now(),
        };
        
        // Optimistic update
        set(state => ({ tables: [...state.tables, newTable] }));

        if (isGuest || !session) {
            return newTable;
        }

        // Save to supabase
        try {
            const { rows, rowCount, imageConfig, audioConfig, aiPrompts, isPublic, createdAt, modifiedAt, ...tableMetadata } = newTable;
            const dataForDb = {
                ...tableMetadata,
                image_config: imageConfig,
                audio_config: audioConfig,
                ai_prompts: aiPrompts,
                is_public: isPublic,
                user_id: session.user.id,
                created_at: new Date(createdAt!).toISOString(),
                modified_at: new Date(modifiedAt!).toISOString(),
            };

            const { error } = await supabase.from('tables').insert(dataForDb);
            if (error) throw error;
            return newTable;
        } catch (error: any) {
            console.error("Failed to create Anki-style table:", error.message || error);
            // Revert on error
            set(state => ({ tables: state.tables.filter(t => t.id !== newTable.id) }));
            useUIStore.getState().showToast("Failed to create Anki-style table.", "error");
            return null;
        }
      },
      deleteTable: async (tableId) => {
        const { session, isGuest } = useUserStore.getState();
        const originalTables = get().tables;

        // Optimistic update
        set(state => ({
          tables: state.tables.filter(t => t.id !== tableId),
          folders: state.folders.map(f => ({ ...f, tableIds: f.tableIds.filter(id => id !== tableId) }))
        }));

        if (isGuest || !session) return;
        
        try {
            // On the backend, RLS and cascading deletes should handle removing associated vocab_rows
            const { error } = await supabase.from('tables').delete().eq('id', tableId);
            if (error) throw error;
        } catch (error: any) {
            console.error("Failed to delete table:", error.message || error);
            // Revert on error
            set({ tables: originalTables });
            useUIStore.getState().showToast("Failed to delete table.", "error");
        }
      },
      updateTable: async (updatedTable) => {
        const { session, isGuest } = useUserStore.getState();
        const originalTables = get().tables;
        
        const tableWithTimestamp = {
            ...updatedTable,
            createdAt: updatedTable.createdAt || Date.now(), // Set createdAt if it doesn't exist (for migrating old tables)
            modifiedAt: Date.now(),
        };

        useUIStore.getState().setSyncStatus('saving');

        // Optimistic update
        set(state => ({ tables: state.tables.map(t => t.id === tableWithTimestamp.id ? tableWithTimestamp : t) }));

        if (isGuest || !session) {
            useUIStore.getState().setSyncStatus('saved');
            setTimeout(() => useUIStore.getState().setSyncStatus('idle'), 2000);
            return true;
        }

        try {
            const { rows, rowCount, imageConfig, audioConfig, aiPrompts, isPublic, createdAt, modifiedAt, ...tableMetadata } = tableWithTimestamp;
             const dataForDb = {
                ...tableMetadata,
                image_config: imageConfig,
                audio_config: audioConfig,
                ai_prompts: aiPrompts,
                is_public: isPublic,
                created_at: new Date(createdAt!).toISOString(),
                modified_at: new Date(modifiedAt!).toISOString(),
            };
            
            // 1. Update the table metadata (without rows)
            const { error: tableError } = await supabase.from('tables').update(dataForDb).eq('id', tableMetadata.id);
            if (tableError) throw tableError;

            // 2. Upsert rows
            const rowsToSave = rows.map(r => vocabRowToDb(r, tableWithTimestamp.id, session.user.id));
            if (rowsToSave.length > 0) {
              const { error: rowsError } = await supabase.from('vocab_rows').upsert(rowsToSave);
              if (rowsError) throw rowsError;
            }

            // 3. Handle deleted rows
            const originalRowIds = new Set(originalTables.find(t => t.id === tableWithTimestamp.id)?.rows.map(r => r.id));
            const updatedRowIds = new Set(tableWithTimestamp.rows.map(r => r.id));
            const deletedRowIds = [...originalRowIds].filter(id => !updatedRowIds.has(id));
            
            if (deletedRowIds.length > 0) {
                const { error: deleteError } = await supabase.from('vocab_rows').delete().in('id', deletedRowIds);
                if (deleteError) throw deleteError;
            }

            useUIStore.getState().setSyncStatus('saved');
            setTimeout(() => useUIStore.getState().setSyncStatus('idle'), 2000);
            return true;

        } catch (error: any) {
            console.error("Failed to update table:", error.message || error);
            // Revert on error
            set({ tables: originalTables });
            useUIStore.getState().setSyncStatus('error');
            useUIStore.getState().showToast(`Save failed: ${error.message}. Reverting changes.`, "error");
            return false;
        }
      },
      upsertRow: async (tableId, row) => {
        const { session, isGuest } = useUserStore.getState();
        const originalTables = get().tables;
        const originalTable = originalTables.find(t => t.id === tableId);
        if (!originalTable) return false;

        useUIStore.getState().setSyncStatus('saving');
        const modifiedAt = Date.now();
        const isNew = !originalTable.rows.some(r => r.id === row.id);

        // Optimistic update
        set(state => ({
            tables: state.tables.map(t => {
                if (t.id !== tableId) return t;
                const newRows = isNew ? [...t.rows, row] : t.rows.map(r => r.id === row.id ? row : r);
                return { ...t, rows: newRows, modifiedAt };
            })
        }));

        if (isGuest || !session) {
            useUIStore.getState().setSyncStatus('saved');
            setTimeout(() => useUIStore.getState().setSyncStatus('idle'), 2000);
            return true;
        }

        try {
            // Save row to Supabase
            const rowForDb = vocabRowToDb(row, tableId, session.user.id);
            const { error: rowError } = await supabase.from('vocab_rows').upsert(rowForDb);
            if (rowError) throw rowError;
            
            // Also update the table's modified_at timestamp
            const { error: tableError } = await supabase.from('tables').update({ modified_at: new Date(modifiedAt).toISOString() }).eq('id', tableId);
            if (tableError) console.error("Failed to update table modified_at timestamp:", tableError);

            useUIStore.getState().setSyncStatus('saved');
            setTimeout(() => useUIStore.getState().setSyncStatus('idle'), 2000);
            return true;
        } catch (error: any) {
            console.error("Failed to upsert row:", error.message || error);
            set({ tables: originalTables }); // Revert on error
            useUIStore.getState().setSyncStatus('error');
            useUIStore.getState().showToast("Failed to save row.", "error");
            return false;
        }
    },
      importTables: (importedTables, appendToTableId) => {
        set(state => {
          if (appendToTableId) {
            const rowsToAppend = importedTables[0]?.rows || [];
            return {
              tables: state.tables.map(t =>
                t.id === appendToTableId ? { ...t, rows: [...t.rows, ...rowsToAppend] } : t
              )
            };
          } else {
            const existingIds = new Set(state.tables.map(t => t.id));
            const newTables = importedTables.map(t =>
              existingIds.has(t.id) ? { ...t, id: crypto.randomUUID() } : t
            );
            return { tables: [...state.tables, ...newTables] };
          }
        });
      },
      createFolder: async (name) => {
        const { session, isGuest, settings, setSettings } = useUserStore.getState();
        const newFolder: Folder = { id: crypto.randomUUID(), name, tableIds: [], createdAt: Date.now() };
    
        // Optimistic update
        set(state => ({ folders: [...state.folders, newFolder] }));
        const newOrder = [...(settings.folderOrder || []), newFolder.id];
        setSettings({ ...settings, folderOrder: newOrder });
        
        if (isGuest || !session) return;
        
        try {
            const { id, name, tableIds, createdAt } = newFolder;
            const { error } = await supabase.from('folders').insert({ id, name, table_ids: tableIds, created_at: new Date(createdAt).toISOString(), user_id: session.user.id });
            if (error) throw error;
        } catch(error: any) {
            console.error("Failed to create folder:", error.message || error);
            // Revert local state
            set(state => ({ folders: state.folders.filter(f => f.id !== newFolder.id) }));
            setSettings({ ...settings, folderOrder: settings.folderOrder?.filter(id => id !== newFolder.id) });
            useUIStore.getState().showToast("Failed to create folder.", "error");
        }
      },
      deleteFolder: async (folderId) => {
        const { session, isGuest } = useUserStore.getState();
        const originalFolders = get().folders;
        const { settings, setSettings } = useUserStore.getState();
        const originalSettings = settings;
    
        // Optimistic update
        set(state => ({ folders: state.folders.filter(f => f.id !== folderId) }));
        const newOrder = (settings.folderOrder || []).filter(id => id !== folderId);
        setSettings({ ...settings, folderOrder: newOrder });
        
        if (isGuest || !session) return;
    
        try {
            const { error } = await supabase.from('folders').delete().eq('id', folderId);
            if (error) throw error;
        } catch (error: any) {
            console.error("Failed to delete folder:", error.message || error);
            // Revert
            set({ folders: originalFolders });
            setSettings(originalSettings);
            useUIStore.getState().showToast("Failed to delete folder.", "error");
        }
      },
      moveTableToFolder: async (tableId, folderId) => {
        const { session, isGuest } = useUserStore.getState();
        const originalFolders = get().folders;

        // Optimistic update
        set(state => {
            const newFolders = state.folders.map(f => ({ ...f, tableIds: f.tableIds.filter(id => id !== tableId) }));
            if (folderId) {
                const folder = newFolders.find(f => f.id === folderId);
                if (folder) folder.tableIds.push(tableId);
            }
            return { folders: newFolders };
        });

        if (isGuest || !session) return;
        
        try {
            const oldFolder = originalFolders.find(f => f.tableIds.includes(tableId));
            const newFolder = get().folders.find(f => f.id === folderId);

            if (oldFolder?.id === newFolder?.id) return;

            const updates: Promise<any>[] = [];

            if (oldFolder) {
                updates.push(supabase.from('folders').update({ table_ids: oldFolder.tableIds.filter(id => id !== tableId) }).eq('id', oldFolder.id));
            }
            if (newFolder) {
                 updates.push(supabase.from('folders').update({ table_ids: newFolder.tableIds }).eq('id', newFolder.id));
            }
            
            const results = await Promise.all(updates);
            const firstError = results.map(res => res.error).find(Boolean);
            if (firstError) throw firstError;

        } catch (error: any) {
            console.error("Failed to move table:", error.message || error);
            set({ folders: originalFolders });
            useUIStore.getState().showToast("Failed to move table.", "error");
        }
      },
      reorderFolders: (draggedId, targetId) => {
        const { folders } = get();
        const { settings, setSettings } = useUserStore.getState();
        // Use existing order, or create one from current folders as a fallback.
        const currentOrder = settings.folderOrder && settings.folderOrder.length > 0 
            ? settings.folderOrder 
            : [...folders].sort((a,b) => a.createdAt - b.createdAt).map(f => f.id);
    
        const draggedIndex = currentOrder.indexOf(draggedId);
        const targetIndex = currentOrder.indexOf(targetId);
    
        if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;
    
        const newOrder = [...currentOrder];
        const [draggedItem] = newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedItem);
        
        // Optimistically update and trigger save via useUserStore.
        // The save is handled inside setSettings -> saveUserProfile.
        // No direct supabase call needed here.
        setSettings({ ...settings, folderOrder: newOrder });
      },
      setTables: (tables) => set({ tables }),
      setInitialData: (data) => {
        set({ tables: data.tables, folders: data.folders });
      },

      updateRowsFromSession: (results, remainingQuestionIds) => set(state => ({
        tables: state.tables.map(table => {
            let hasUpdates = false;
            const newRows = table.rows.map(row => {
                const rowResults = results.filter(r => r.rowId === row.id);
                const wasQuit = remainingQuestionIds?.has(row.id);
                if (rowResults.length === 0 && !wasQuit) return row;
                hasUpdates = true;
                const correct = rowResults.filter(r => r.isCorrect).length;
                const incorrect = rowResults.length - correct;
                return { ...row, stats: { ...row.stats, correct: row.stats.correct + correct, incorrect: row.stats.incorrect + incorrect, lastStudied: Date.now(), wasQuit } };
            });
            return hasUpdates ? { ...table, rows: newRows } : table;
        })
      })),

      updateRowsFromFlashcardSession: (history, tableIds) => set(state => ({
        tables: state.tables.map(table => {
            if (!tableIds.includes(table.id)) return table;
            const updatedRows = table.rows.map(row => {
                const rowHistory = history.filter(h => h.rowId === row.id);
                if (rowHistory.length === 0) return row;
                const lastStatus = rowHistory[rowHistory.length - 1].status;
                return { ...row, stats: { ...row.stats, flashcardStatus: lastStatus, flashcardEncounters: row.stats.flashcardEncounters + rowHistory.length, isFlashcardReviewed: true, lastPracticeDate: Date.now() } };
            });
            return { ...table, rows: updatedRows };
        })
      })),

      updateRowsFromScrambleSession: (history) => set(state => ({
        tables: state.tables.map(table => {
            let hasUpdates = false;
            const newRows = table.rows.map(row => {
                const rowHistory = history.filter(h => h.rowId === row.id);
                if (rowHistory.length === 0) return row;
                hasUpdates = true;
                const newStats = { ...row.stats };
                newStats.scrambleEncounters = (newStats.scrambleEncounters || 0) + rowHistory.length;
                if (!newStats.scrambleRatings) newStats.scrambleRatings = {};
                rowHistory.forEach(h => { newStats.scrambleRatings![h.status] = (newStats.scrambleRatings![h.status] || 0) + 1; });
                return { ...row, stats: newStats };
            });
            return hasUpdates ? { ...table, rows: newRows } : table;
        })
      })),
      
      updateRowsFromTheaterSession: (history) => set(state => ({
        tables: state.tables.map(table => {
            let hasUpdates = false;
            const viewedRowIds = new Set(history.map(h => h.rowId));
            const newRows = table.rows.map(row => {
                if (!viewedRowIds.has(row.id)) return row;
                hasUpdates = true;
                const newStats = { ...row.stats, theaterEncounters: (row.stats.theaterEncounters || 0) + 1 };
                return { ...row, stats: newStats };
            });
            return hasUpdates ? { ...table, rows: newRows } : table;
        })
      })),
    })
);