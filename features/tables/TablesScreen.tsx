import * as React from 'react';
import { Table, Folder, Screen, VocabRow, FlashcardStatus } from '../../types';
import { useTableStore } from '../../stores/useTableStore';
import { useUIStore } from '../../stores/useUIStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { useUserStore } from '../../stores/useUserStore';
import Icon from '../../components/ui/Icon';
import TableIcon from '../../components/ui/TableIcon';
import { Button } from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { getTagStyle } from '../../utils/colorUtils';
import TagFilterItem from './components/TagFilterItem';
import Popover from '../../components/ui/Popover';
import WordDetailModal from './WordDetailModal';

// Helper function for formatting dates
const formatDate = (timestamp?: number) => timestamp ? new Date(timestamp).toLocaleDateString(undefined, { year: '2-digit', month: 'short', day: 'numeric' }) : 'N/A';

interface CreateAnkiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, tags: string[]) => void;
  allTags: string[];
  tagColors: Record<string, string>;
}

const CreateAnkiModal: React.FC<CreateAnkiModalProps> = ({ isOpen, onClose, onCreate, allTags, tagColors }) => {
  const [name, setName] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState('');

  React.useEffect(() => {
    if (!isOpen) {
      setName('');
      setTags([]);
      setTagInput('');
    } else {
      setName('New Anki Deck'); // Default name
    }
  }, [isOpen]);

  const handleAddTag = (tagToAdd: string) => {
    const newTag = tagToAdd.trim();
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name.trim(), tags);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Anki Deck">
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1" htmlFor="deck-name">Deck Name</label>
          <Input
            id="deck-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Japanese Vocabulary"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1" htmlFor="deck-tags">Tags</label>
          <div className="p-2 border border-secondary-300 dark:border-secondary-600 rounded-md bg-secondary-100 dark:bg-secondary-700 flex flex-wrap items-center gap-2">
            {tags.map(tag => (
              <span key={tag} style={getTagStyle(tag, tagColors)} className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full">
                {tag}
                <button onClick={() => handleRemoveTag(tag)} className="text-white/70 hover:text-white">
                  <Icon name="x" className="w-3 h-3"/>
                </button>
              </span>
            ))}
            <Input
              id="deck-tags"
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 text-sm bg-transparent border-none focus:ring-0 h-auto p-0 min-w-[80px]"
              placeholder="Add a tag..."
            />
          </div>
          {allTags.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-text-subtle mb-1">Click to add existing tags:</p>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                {allTags.filter(t => !tags.includes(t)).map(tag => (
                  <button key={tag} onClick={() => handleAddTag(tag)} style={getTagStyle(tag, tagColors)} className="text-xs font-semibold px-2 py-1 rounded-full">
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>Create & Add Cards</Button>
        </div>
      </div>
    </Modal>
  );
};

// TableCard component
const TableCard: React.FC<{ table: Table; onMoveClick: () => void; }> = ({ table, onMoveClick }) => {
    const { handleSelectTable } = useSessionStore();
    const { settings } = useUserStore();
    const wordCount = table.rowCount ?? table.rows.length;
    const relationsCount = table.relations?.length || 0;

    return (
        <div 
            onClick={() => handleSelectTable(table.id)} 
            className="bg-surface dark:bg-secondary-800 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer group p-4 relative flex flex-col justify-between"
        >
            <div>
                <h3 className="font-bold text-text-main dark:text-secondary-100 truncate pr-8">{table.name}</h3>
                
                {/* Stats row */}
                <div className="mt-2 flex items-center gap-4 text-xs text-text-subtle">
                    <span className="flex items-center gap-1"><TableIcon className="w-3.5 h-3.5" /> {wordCount} words</span>
                    <span className="flex items-center gap-1"><Icon name="link" className="w-3.5 h-3.5" /> {relationsCount} relations</span>
                </div>

                {/* Tags row */}
                {table.tags && table.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Tags">
                        {table.tags.slice(0, 3).map(tag => (
                            <div key={tag} style={getTagStyle(tag, settings.tagColors || {})} className="text-xs font-semibold px-2 py-0.5 rounded-full">
                                {tag}
                            </div>
                        ))}
                        {table.tags.length > 3 && (
                            <div className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary-200 dark:bg-secondary-700 text-text-subtle">
                                +{table.tags.length - 3}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer with dates */}
            <div className="mt-4 pt-3 border-t border-secondary-200 dark:border-secondary-700/50 text-xs text-text-subtle flex justify-between items-center">
                <span>Created: {formatDate(table.createdAt)}</span>
                <span>Modified: {formatDate(table.modifiedAt)}</span>
            </div>
            
            {/* Move button */}
            <button 
                onClick={(e) => { e.stopPropagation(); onMoveClick(); }} 
                className="absolute top-2 right-2 p-2 rounded-full text-text-subtle bg-surface/50 dark:bg-secondary-800/50 opacity-0 group-hover:opacity-100 hover:text-primary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-opacity"
                title="Move table"
            >
                <Icon name="dots-horizontal" className="w-5 h-5"/>
            </button>
        </div>
    );
};


// Folder component
const FolderRow: React.FC<{ folder: Folder; tables: Table[]; onMoveTable: (table: Table) => void; }> = ({ folder, tables, onMoveTable }) => {
    const [isExpanded, setIsExpanded] = React.useState(true);
    const tablesInFolder = tables.filter(t => folder.tableIds.includes(t.id));

    if (tablesInFolder.length === 0) {
        // Still render the folder, but note that it's empty
    }

    return (
        <div>
            <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-2 w-full text-left p-2 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-800/50">
                <Icon name="chevron-down" className={`w-5 h-5 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                <Icon name="folder" className="w-6 h-6 text-warning-500" />
                <h2 className="text-lg font-bold">{folder.name}</h2>
                <span className="text-sm text-text-subtle ml-2">{tablesInFolder.length}</span>
            </button>
            {isExpanded && (
                <div className="pl-8 pt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tablesInFolder.map(table => <TableCard key={table.id} table={table} onMoveClick={() => onMoveTable(table)} />)}
                </div>
            )}
        </div>
    );
};

const TablesScreen: React.FC = () => {
    const { tables, folders, createTable, createFolder, createAnkiStyleTable, moveTableToFolder, updateTable } = useTableStore();
    const { settings, setTagColor } = useUserStore();
    const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
    const [newTableName, setNewTableName] = React.useState('');
    const [newTableColumns, setNewTableColumns] = React.useState('');
    const [allTags, setAllTags] = React.useState<string[]>([]);
    const [activeTags, setActiveTags] = React.useState<Set<string>>(new Set());
    const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = React.useState(false);
    const [newFolderName, setNewFolderName] = React.useState('');
    const [tableToMove, setTableToMove] = React.useState<Table | null>(null);
    const [quickAddTable, setQuickAddTable] = React.useState<Table | null>(null);
    const [rowForQuickAdd, setRowForQuickAdd] = React.useState<VocabRow | null>(null);
    const [isCreateAnkiModalOpen, setIsCreateAnkiModalOpen] = React.useState(false);

    React.useEffect(() => {
        const tags = new Set<string>();
        tables.forEach(table => { (table.tags || []).forEach(tag => tags.add(tag)); });
        setAllTags(Array.from(tags).sort());
    }, [tables]);

    const handleCreateTable = async () => {
        if (newTableName) {
            await createTable(newTableName, newTableColumns || 'Word,Definition');
            setIsCreateModalOpen(false);
            setNewTableName('');
            setNewTableColumns('');
        }
    };
    
    const handleCreateFolder = async () => {
        if (newFolderName) {
            await createFolder(newFolderName);
            setIsCreateFolderModalOpen(false);
            setNewFolderName('');
        }
    };
    
    const handleMoveTable = async (folderId: string | null) => {
        if (tableToMove) {
            await moveTableToFolder(tableToMove.id, folderId);
            setTableToMove(null);
        }
    };

    const handleOpenCreateAnkiModal = () => {
        setIsCreateAnkiModalOpen(true);
    };

    const handleCreateAnkiDeck = async (name: string, tags: string[]) => {
        setIsCreateAnkiModalOpen(false);
        const newTable = await createAnkiStyleTable(name, tags);
        if (newTable) {
            setQuickAddTable(newTable);
            setRowForQuickAdd({
                id: crypto.randomUUID(),
                cols: {},
                stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null }
            });
        }
    };

    const handleQuickAddSave = async (newRow: VocabRow): Promise<boolean> => {
        const currentTable = useTableStore.getState().tables.find(t => t.id === quickAddTable!.id);
        if (!currentTable) return false;
        
        const updatedTable: Table = {
            ...currentTable,
            rows: [...currentTable.rows, newRow]
        };

        return updateTable(updatedTable);
    };

    const handleToggleTag = (tag: string) => {
        const newSet = new Set(activeTags);
        if (newSet.has(tag)) newSet.delete(tag); else newSet.add(tag);
        setActiveTags(newSet);
    };

    const filteredTables = React.useMemo(() => {
        if (activeTags.size === 0) return tables;
        return tables.filter(table => (table.tags || []).some(tag => activeTags.has(tag)));
    }, [tables, activeTags]);

    const sortedFolders = React.useMemo(() => {
        const folderMap = new Map(folders.map(f => [f.id, f]));
        const order = settings.folderOrder || [];
        const ordered = order.map(id => folderMap.get(id)).filter((f): f is Folder => !!f);
        const unordered = folders.filter(f => !order.includes(f.id)).sort((a, b) => {
            const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
            const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;
            return timeB - timeA;
        });
        return [...ordered, ...unordered];
    }, [folders, settings.folderOrder]);

    const tablesWithoutFolder = React.useMemo(() => {
        const tablesInFolders = new Set(folders.flatMap(f => f.tableIds));
        return tables.filter(t => !tablesInFolders.has(t.id));
    }, [tables, folders]);

    return (
        <div className="p-4 sm:p-6 mx-auto animate-fadeIn">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text-main dark:text-secondary-100">Tables</h1>
                    <p className="text-sm text-text-subtle">Your vocabulary collections.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setIsCreateModalOpen(true)}>New Table</Button>
                    <Button onClick={handleOpenCreateAnkiModal} variant="secondary">New Anki Deck</Button>
                    <Button onClick={() => setIsCreateFolderModalOpen(true)} variant="secondary">New Folder</Button>
                </div>
            </header>

            {allTags.length > 0 && (
                <div className="mb-6 p-4 bg-surface dark:bg-secondary-800/50 rounded-lg border border-secondary-200/80 dark:border-secondary-700/50">
                    <h3 className="text-sm font-semibold mb-2">Filter by Tags</h3>
                    <div className="flex flex-wrap gap-2">
                        {allTags.map(tag => (
                            <TagFilterItem 
                                key={tag}
                                tag={tag}
                                isChecked={activeTags.has(tag)}
                                onToggle={handleToggleTag}
                                onColorChange={setTagColor}
                                customColors={settings.tagColors || {}}
                            />
                        ))}
                    </div>
                </div>
            )}

            <main className="space-y-6">
                 {activeTags.size > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredTables.map(table => <TableCard key={table.id} table={table} onMoveClick={() => setTableToMove(table)} />)}
                    </div>
                ) : (
                    <>
                        {sortedFolders.map(folder => <FolderRow key={folder.id} folder={folder} tables={tables} onMoveTable={setTableToMove} />)}

                        {tablesWithoutFolder.length > 0 && (
                             <div>
                                <h2 className="text-lg font-bold text-text-subtle mb-3 ml-2">Uncategorized</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {tablesWithoutFolder.map(table => <TableCard key={table.id} table={table} onMoveClick={() => setTableToMove(table)} />)}
                                </div>
                             </div>
                        )}
                    </>
                )}
            </main>

            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Table">
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Table Name</label>
                        <input type="text" value={newTableName} onChange={e => setNewTableName(e.target.value)} className="w-full bg-secondary-100 dark:bg-secondary-700 border rounded-md px-3 py-2" placeholder="e.g., Spanish Verbs" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Columns (comma-separated)</label>
                        <input type="text" value={newTableColumns} onChange={e => setNewTableColumns(e.target.value)} className="w-full bg-secondary-100 dark:bg-secondary-700 border rounded-md px-3 py-2" placeholder="e.g., Word, Definition, Example" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateTable} disabled={!newTableName}>Create Table</Button>
                    </div>
                </div>
            </Modal>
            
            <Modal isOpen={isCreateFolderModalOpen} onClose={() => setIsCreateFolderModalOpen(false)} title="Create New Folder">
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Folder Name</label>
                        <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} className="w-full bg-secondary-100 dark:bg-secondary-700 border rounded-md px-3 py-2" placeholder="e.g., Languages" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" onClick={() => setIsCreateFolderModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateFolder} disabled={!newFolderName}>Create Folder</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={!!tableToMove} onClose={() => setTableToMove(null)} title={`Move "${tableToMove?.name}"`}>
                <div className="p-6">
                    <p className="text-sm text-text-subtle mb-4">Select a destination folder:</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                         <button onClick={() => handleMoveTable(null)} className="w-full text-left flex items-center gap-2 p-3 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700">
                            <TableIcon className="w-5 h-5 text-text-subtle"/>
                            <span className="font-semibold">Uncategorized</span>
                        </button>
                        {sortedFolders.map(folder => (
                            <button key={folder.id} onClick={() => handleMoveTable(folder.id)} className="w-full text-left flex items-center gap-2 p-3 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700">
                                <Icon name="folder" className="w-5 h-5 text-warning-500"/>
                                <span className="font-semibold">{folder.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </Modal>
            <CreateAnkiModal
                isOpen={isCreateAnkiModalOpen}
                onClose={() => setIsCreateAnkiModalOpen(false)}
                onCreate={handleCreateAnkiDeck}
                allTags={allTags}
                tagColors={settings.tagColors || {}}
            />
            {quickAddTable && (
                <WordDetailModal
                    isOpen={!!rowForQuickAdd}
                    row={rowForQuickAdd}
                    columns={quickAddTable.columns}
                    onClose={() => { setQuickAddTable(null); setRowForQuickAdd(null); }}
                    onSave={handleQuickAddSave}
                    onDelete={() => {}}
                    onConfigureAI={() => {}}
                    quickAddMode={true}
                />
            )}
        </div>
    );
};

export default TablesScreen;
