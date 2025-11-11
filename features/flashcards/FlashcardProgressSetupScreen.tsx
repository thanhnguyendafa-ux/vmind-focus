import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Table, Relation, FlashcardStatus, VocabRow, Column, Screen, FlashcardProgress } from '../../types';
import Icon from '../../components/ui/Icon';
import Modal from '../../components/ui/Modal';
import { useTableStore } from '../../stores/useTableStore';
import { useSessionDataStore } from '../../stores/useSessionDataStore';
import { useUIStore } from '../../stores/useUIStore';
import { useSessionStore } from '../../stores/useSessionStore';

const statusColors: { [key in FlashcardStatus]: { bg: string; text: string } } = {
  [FlashcardStatus.New]: { bg: 'bg-secondary-200 dark:bg-secondary-700', text: 'text-secondary-600 dark:text-secondary-300' },
  [FlashcardStatus.Again]: { bg: 'bg-error-200 dark:bg-error-900', text: 'text-error-700 dark:text-error-300' },
  [FlashcardStatus.Hard]: { bg: 'bg-orange-200 dark:bg-orange-900', text: 'text-orange-700 dark:text-orange-300' },
  [FlashcardStatus.Good]: { bg: 'bg-blue-200 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300' },
  [FlashcardStatus.Easy]: { bg: 'bg-green-200 dark:bg-green-900', text: 'text-green-700 dark:text-green-300' },
  [FlashcardStatus.Perfect]: { bg: 'bg-purple-200 dark:bg-purple-900', text: 'text-purple-700 dark:text-purple-300' },
  [FlashcardStatus.Superb]: { bg: 'bg-purple-200 dark:bg-purple-900', text: 'text-purple-700 dark:text-purple-300' },
};

const findTagColumn = (columns: Column[]): Column | undefined => {
    return columns.find(c => /^tags$/i.test(c.name)) || columns.find(c => /^tag$/i.test(c.name));
};

function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

const FlashcardProgressSetupScreen: React.FC = () => {
  const { tables } = useTableStore();
  const { setFlashcardProgresses } = useSessionDataStore();
  const { setCurrentScreen } = useUIStore();
  const { studySetupSourceTableId, setStudySetupSourceTableId } = useSessionStore();
  
  const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(new Set());
  const [selectedRelationIds, setSelectedRelationIds] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [progressName, setProgressName] = useState('');
  const hasEditedNameRef = useRef(false);

  useEffect(() => {
    if (studySetupSourceTableId) {
        setSelectedTableIds(new Set([studySetupSourceTableId]));
        setStudySetupSourceTableId(null);
        hasEditedNameRef.current = false;
    }
  }, [studySetupSourceTableId, setStudySetupSourceTableId]);
  
  useEffect(() => {
    if (selectedTableIds.size > 0) {
      if (!hasEditedNameRef.current) {
        const tableNames = tables
            .filter(t => selectedTableIds.has(t.id))
            .map(t => t.name)
            .join(' & ');
        setProgressName(`FC+ ${tableNames}`);
      }
    } else {
        setProgressName('');
        hasEditedNameRef.current = false;
    }
  }, [selectedTableIds, tables]);


  const { availableRelations, globalStats, totalRows, availableTags, tagColumnByTable } = useMemo(() => {
    if (selectedTableIds.size === 0) {
      return { availableRelations: [], globalStats: {}, totalRows: 0, availableTags: [], tagColumnByTable: new Map() };
    }
    const stats: { [key in FlashcardStatus]: number } = { [FlashcardStatus.New]: 0, [FlashcardStatus.Again]: 0, [FlashcardStatus.Hard]: 0, [FlashcardStatus.Good]: 0, [FlashcardStatus.Easy]: 0, [FlashcardStatus.Perfect]: 0, [FlashcardStatus.Superb]: 0 };
    let total = 0;
    const relations: (Relation & { tableName: string })[] = [];
    const tags = new Set<string>();
    const tagColumnMap = new Map<string, Column>();

    tables.forEach(table => {
      if (selectedTableIds.has(table.id)) {
        table.rows.forEach(row => { stats[row.stats.flashcardStatus]++; total++; });
        table.relations.forEach(rel => relations.push({ ...rel, tableName: table.name }));
        const tagColumn = findTagColumn(table.columns);
        if (tagColumn) {
          tagColumnMap.set(table.id, tagColumn);
          table.rows.forEach(row => { const tagValue = row.cols[tagColumn.id]; if (tagValue) { tagValue.split(',').forEach(tag => { const trimmed = tag.trim(); if (trimmed) tags.add(trimmed); }); } });
        }
      }
    });
    return { availableRelations: relations, globalStats: stats, totalRows: total, availableTags: Array.from(tags).sort(), tagColumnByTable: tagColumnMap };
  }, [tables, selectedTableIds]);
  
  useEffect(() => {
    setSelectedRelationIds(prev => {
        const newSet = new Set<string>();
        const availableIds = new Set(availableRelations.map(r => r.id));
        prev.forEach(id => { if (availableIds.has(id)) newSet.add(id); });
        return newSet;
    });
  }, [availableRelations]);

  const filteredRowCount = useMemo(() => {
    if (selectedTags.size === 0) return totalRows;
    let count = 0;
    tables.forEach(table => {
        if (selectedTableIds.has(table.id)) {
            const tagColumn = tagColumnByTable.get(table.id);
            if (!tagColumn) return;
            table.rows.forEach(row => {
                const rowTagsRaw = row.cols[tagColumn.id] || '';
                const rowTags = new Set(rowTagsRaw.split(',').map(t => t.trim()));
                for (const selectedTag of selectedTags) { if (rowTags.has(selectedTag)) { count++; break; } }
            });
        }
    });
    return count;
  }, [totalRows, selectedTags, selectedTableIds, tables, tagColumnByTable]);

  const handleToggleTable = (tableId: string) => {
    const newSet = new Set(selectedTableIds);
    if (newSet.has(tableId)) newSet.delete(tableId); else newSet.add(tableId);
    setSelectedTableIds(newSet);
    setSelectedTags(new Set());
    hasEditedNameRef.current = false;
  };

  const handleToggleRelation = (relationId: string) => {
    const newSet = new Set(selectedRelationIds);
    if (newSet.has(relationId)) newSet.delete(relationId); else newSet.add(relationId);
    setSelectedRelationIds(newSet);
  };

  const handleToggleTag = (tag: string) => {
    const newSet = new Set(selectedTags);
    if (newSet.has(tag)) newSet.delete(tag); else newSet.add(tag);
    setSelectedTags(newSet);
  };

  const handleSaveProgress = () => {
      if (!progressName.trim() || !isReady) return;

      const allRows = tables.filter(t => selectedTableIds.has(t.id)).flatMap(t => t.rows);
      let filteredRows = allRows;

      if (selectedTags.size > 0) {
          filteredRows = allRows.filter(row => {
              const tableOfRow = tables.find(t => t.rows.some(r => r.id === row.id));
              if (!tableOfRow) return false;
              const tagColumn = tagColumnByTable.get(tableOfRow.id);
              if (!tagColumn) return false;
              const rowTagsRaw = row.cols[tagColumn.id] || '';
              const rowTags = new Set(rowTagsRaw.split(',').map(t => t.trim()));
              for (const selectedTag of selectedTags) { if (rowTags.has(selectedTag)) return true; }
              return false;
          });
      }

      // 1. Tags from selected table names
      const tableNameTags = tables
          .filter(t => selectedTableIds.has(t.id))
          .map(t => `FC+${t.name}`);

      // 2. Tags from the table.tags property
      const intrinsicTableTags = tables
          .filter(t => selectedTableIds.has(t.id))
          .flatMap(t => t.tags || []);

      // 3. User-selected tags (from filtering), prefixed
      const userFilterTags = Array.from(selectedTags).map(tag => `FC+${tag}`);
      
      // Combine and remove duplicates
      // FIX: Explicitly specify the generic type for `new Set` to ensure TypeScript correctly infers the type as `Set<string>`, preventing it from becoming `Set<unknown>`.
      const allTags: string[] = [...new Set<string>([...tableNameTags, ...intrinsicTableTags, ...userFilterTags])];
      
      const initialQueue = shuffleArray(filteredRows.map((r: VocabRow) => r.id));

      const newProgress: FlashcardProgress = {
          id: crypto.randomUUID(),
          name: progressName.trim(),
          tableIds: Array.from(selectedTableIds),
          relationIds: Array.from(selectedRelationIds),
          tags: allTags,
          createdAt: Date.now(),
          queue: initialQueue,
          currentIndex: 0,
      };

      setFlashcardProgresses(prev => [...prev, newProgress]);
      
      setIsSaveModalOpen(false);
      setProgressName('');
      setCurrentScreen(Screen.Flashcards);
  };
  
  const isReady = selectedTableIds.size > 0 && selectedRelationIds.size > 0 && filteredRowCount > 0;
  
  return (
    <div className="p-4 sm:p-6 mx-auto animate-fadeIn">
      <header className="flex items-center gap-3 mb-6">
        <button onClick={() => setCurrentScreen(Screen.Flashcards)} className="p-2 rounded-full hover:bg-secondary-200 dark:hover:bg-secondary-700 text-text-subtle">
            <Icon name="arrowLeft" className="w-6 h-6" />
        </button>
        <div>
            <h1 className="text-2xl font-bold text-text-main dark:text-secondary-100">New Flashcard Progress</h1>
            <p className="text-sm text-text-subtle">Select tables, relations, and optional tags to create a new study set.</p>
        </div>
      </header>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-text-main dark:text-secondary-100 mb-3">1. Select Tables</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tables.map(table => (
              <div key={table.id} onClick={() => handleToggleTable(table.id)} className={`border rounded-lg p-3 cursor-pointer transition-all ${selectedTableIds.has(table.id) ? 'border-primary-500 bg-primary-500/10 dark:bg-primary-900/20 shadow-md' : 'bg-surface dark:bg-secondary-800 border-secondary-200/80 dark:border-secondary-700/50 hover:border-secondary-300 dark:hover:border-secondary-600'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-text-main dark:text-secondary-100">{table.name}</h3>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedTableIds.has(table.id) ? 'border-primary-500 bg-primary-500' : 'border-secondary-300 dark:border-secondary-600'}`}>
                    {selectedTableIds.has(table.id) && <Icon name="check" className="w-3 h-3 text-white"/>}
                  </div>
                </div>
                <p className="text-xs text-text-subtle">{table.rows.length} cards</p>
              </div>
            ))}
          </div>
        </div>
        
        {selectedTableIds.size > 0 && (
          <div className="animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                <h2 className="text-xl font-bold text-text-main dark:text-secondary-100 mb-3">Card Stats</h2>
                <div className="bg-surface dark:bg-secondary-800 border border-secondary-200/80 dark:border-secondary-700/50 rounded-lg p-4">
                    <p className="text-sm font-semibold mb-3">Total Cards: {totalRows}</p>
                    <div className="space-y-1">
                    {(Object.keys(globalStats) as FlashcardStatus[]).map(status => {
                        const count = globalStats[status];
                        if (count === 0) return null;
                        return (
                        <div key={status} className="flex justify-between items-center text-xs">
                            <span className={`px-2 py-0.5 rounded-full font-semibold ${statusColors[status].bg} ${statusColors[status].text}`}>{status}</span>
                            <span className="font-medium text-secondary-600 dark:text-secondary-300">{count}</span>
                        </div>
                        );
                    })}
                    </div>
                </div>
                </div>
                
                <div className="md:col-span-2">
                <h2 className="text-xl font-bold text-text-main dark:text-secondary-100 mb-3">2. Select Relations</h2>
                {availableRelations.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {availableRelations.map(rel => {
                        const isSelected = selectedRelationIds.has(rel.id);
                        return (
                            <div key={rel.id} onClick={() => handleToggleRelation(rel.id)} className={`border rounded-lg p-3 cursor-pointer transition-all flex items-center justify-between ${isSelected ? 'border-primary-500 bg-primary-500/10' : 'bg-surface dark:bg-secondary-800 border-secondary-200/80 dark:border-secondary-700/50'}`}>
                                <div><h4 className="font-semibold text-text-main dark:text-secondary-100">{rel.name}</h4><p className="text-xs text-text-subtle">from "{rel.tableName}"</p></div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary-500 bg-primary-500' : 'border-secondary-300 dark:border-secondary-600'}`}>{isSelected && <Icon name="check" className="w-3 h-3 text-white"/>}</div>
                            </div>
                        );
                    })}
                    </div>
                ) : ( <p className="text-sm text-text-subtle">Select a table to see available relations.</p> )}
                </div>
            </div>
            {availableTags.length > 0 && (
                <div className="mt-6 animate-fadeIn">
                    <h2 className="text-xl font-bold text-text-main dark:text-secondary-100 mb-3">3. Filter by Tag (Optional)</h2>
                    <div className="p-4 bg-surface dark:bg-secondary-800/50 rounded-lg border border-secondary-200/80 dark:border-secondary-700/50">
                        <div className="flex flex-wrap gap-2">
                            {availableTags.map(tag => { const isSelected = selectedTags.has(tag); return ( <button key={tag} onClick={() => handleToggleTag(tag)} className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${ isSelected ? 'bg-primary-500 text-white border-primary-500' : 'bg-surface dark:bg-secondary-700 text-text-subtle border-secondary-300 dark:border-secondary-600 hover:border-primary-400' }`}>{tag}</button> ); })}
                        </div>
                    </div>
                </div>
            )}
          </div>
        )}
      </div>

      <button onClick={() => setIsSaveModalOpen(true)} disabled={!isReady} className="w-full bg-primary-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 mt-6">
        Save Progress ({filteredRowCount} cards)
      </button>

      <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="Save New Progress">
          <div className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); handleSaveProgress(); }}>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Progress Name</label>
                  <input
                      type="text"
                      value={progressName}
                      onChange={(e) => {
                          setProgressName(e.target.value);
                          hasEditedNameRef.current = true;
                      }}
                      autoFocus
                      className="w-full bg-secondary-100 dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md px-3 py-2 text-text-main dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., Japanese Verbs (JLPT N5)"
                  />
                  <div className="mt-6 flex justify-end gap-2">
                      <button type="button" onClick={() => setIsSaveModalOpen(false)} className="bg-surface dark:bg-secondary-700 text-text-main dark:text-secondary-100 font-semibold px-4 py-2 rounded-md hover:bg-secondary-50 dark:hover:bg-secondary-600 border border-secondary-300 dark:border-secondary-600">Cancel</button>
                      <button type="submit" disabled={!progressName.trim()} className="bg-primary-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50">Save</button>
                  </div>
              </form>
          </div>
      </Modal>
    </div>
  );
};

export default FlashcardProgressSetupScreen;
