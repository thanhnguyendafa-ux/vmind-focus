import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Screen } from '../App';
import { StudyMode, Relation, StudySettings, VocabTable, StudyQuestion, VocabRow, StudyPreset, SortRule, VocabRowStats } from '../types';
// FIX: Removed unused 'BrainIcon' import that was causing an error.
import { CheckCircleIcon, UncheckedCircleIcon, McqIcon, TfIcon, TypingIcon, PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon, ChevronDownIcon, ChevronLeftIcon, SaveIcon, FolderOpenIcon, RepeatIcon, TableIcon, TargetIcon, TrendingDownIcon, ClockRewindIcon, EyeIcon } from '../components/Icons';
import RelationEditorModal from '../components/RelationEditorModal';
import { generateStudySession } from '../utils/studySessionGenerator';
import Dropdown from '../components/Dropdown';
import Modal from '../components/Modal';
import { defaultStudySettings } from '../data/defaults';
import RelationPreviewModal from '../components/RelationPreviewModal';


// --- Reusable Components ---
const CircularProgressBar: React.FC<{ percentage: number }> = ({ percentage }) => {
  const size = 44; // w-11 h-11
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-11 h-11 flex-shrink-0 ml-4">
      <svg className="w-full h-full" viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="text-slate-200"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="text-teal-600"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-slate-700">{`${Math.round(percentage)}%`}</span>
      </div>
    </div>
  );
};

interface SelectionCardProps {
  isSelected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  stats?: { Hard: number; Good: number; Easy: number };
  completionPercentage?: number;
  disabled?: boolean;
}

const SelectionCard: React.FC<SelectionCardProps> = ({ isSelected, onClick, children, stats, completionPercentage, disabled = false }) => (
  <div
    onClick={!disabled ? onClick : undefined}
    role="checkbox"
    aria-checked={isSelected}
    tabIndex={disabled ? -1 : 0}
    onKeyDown={(e) => !disabled && (e.key === ' ' || e.key === 'Enter') && onClick()}
    className={`p-4 rounded-lg flex flex-col items-start transition-all duration-200 ${
      isSelected
        ? 'bg-teal-50 border-2 border-teal-500 shadow-md'
        : 'bg-white border border-slate-200'
    } ${
      disabled 
        ? 'opacity-50 cursor-not-allowed bg-slate-50'
        : 'cursor-pointer hover:border-slate-300 hover:shadow-sm'
    }`}
  >
    <div className="w-full flex items-center justify-between">
      <div className="flex-grow pr-4">{children}</div>
      {typeof completionPercentage === 'number' ? (
        <CircularProgressBar percentage={completionPercentage} />
      ) : (
        isSelected 
          ? <CheckCircleIcon className="w-7 h-7 text-teal-600 flex-shrink-0 ml-4" /> 
          : <UncheckedCircleIcon className="w-7 h-7 text-slate-300 flex-shrink-0 ml-4" />
      )}
    </div>
    {stats && (stats.Hard > 0 || stats.Good > 0 || stats.Easy > 0) && (
      <div className="mt-3 pt-3 border-t border-slate-200/80 w-full flex items-center gap-x-4 gap-y-1 text-xs flex-wrap">
          <span className="flex items-center gap-1.5 font-semibold text-red-600"><div className="w-2.5 h-2.5 rounded-full bg-red-400"></div> Hard: {stats.Hard}</span>
          <span className="flex items-center gap-1.5 font-semibold text-amber-600"><div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div> Good: {stats.Good}</span>
          <span className="flex items-center gap-1.5 font-semibold text-teal-600"><div className="w-2.5 h-2.5 rounded-full bg-teal-400"></div> Easy: {stats.Easy}</span>
      </div>
    )}
  </div>
);


const CollapsiblePanel: React.FC<{
    title: string;
    summary: string;
    isOpen: boolean;
    isComplete: boolean;
    isDisabled?: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}> = ({ title, summary, isOpen, isComplete, isDisabled, onToggle, children }) => (
    <div className={`bg-white rounded-lg border border-slate-200 shadow-sm transition-all hover:shadow-md ${isDisabled ? 'opacity-60 bg-slate-50' : ''}`}>
        <button onClick={onToggle} disabled={isDisabled} className="w-full flex justify-between items-center p-4 text-left disabled:cursor-not-allowed" aria-expanded={isOpen} aria-disabled={isDisabled}>
            <div className="flex items-center">
                <div className={`w-7 h-7 mr-4 rounded-full flex items-center justify-center transition-colors ${isComplete ? 'bg-teal-100' : 'bg-slate-100'}`}>
                    {isComplete ? <CheckCircleIcon className="w-5 h-5 text-teal-500"/> : <div className="w-2 h-2 bg-slate-400 rounded-full"/>}
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">{title}</h2>
                    {!isOpen && <p className="text-sm text-slate-500 mt-1 truncate max-w-xs sm:max-w-md md:max-w-lg">{summary}</p>}
                </div>
            </div>
            <ChevronDownIcon className={`w-6 h-6 text-slate-400 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && !isDisabled && (
            <div className="px-4 pb-4 border-t border-slate-200 animate-scale-in origin-top">
                <div className="pt-4">{children}</div>
            </div>
        )}
    </div>
);

// --- Preset Detail Component ---
const PresetDetail: React.FC<{ preset: StudyPreset; tables: VocabTable[] }> = ({ preset, tables }) => {
  const { settings } = preset;
  const selectedTables = tables.filter(t => settings.selectedTableIds.includes(t.id));

  return (
    <div className="p-3 text-xs text-slate-600 space-y-2">
      <h4 className="font-bold text-sm text-slate-900 border-b pb-1 mb-2">{preset.name}</h4>
      <div>
        <strong className="font-semibold text-slate-800">Tables:</strong>
        <p className="pl-1">{selectedTables.map(t => t.name).join(', ') || 'None'}</p>
      </div>
      <div>
        <strong className="font-semibold text-slate-800">Modes:</strong>
        <p className="pl-1">{settings.selectedModes.join(', ')}{settings.randomizeModes ? ' (Randomized)' : ''}</p>
      </div>
      {settings.wordSelectionStrategy === 'perTable' ? (
        <>
          {selectedTables.length > 1 && (
             <div>
                <strong className="font-semibold text-slate-800">Composition:</strong>
                <p className="pl-1 capitalize">{settings.queueCompositionStrategy} Mix</p>
                {settings.queueCompositionStrategy === 'percentage' && (
                  <div className="text-slate-500 pl-1">
                    {selectedTables.map(t => (
                      <span key={t.id} className="mr-2">{t.name}: {settings.tablePercentages[t.id] || 0}%</span>
                    ))}
                  </div>
                )}
              </div>
          )}
          <div>
            <strong className="font-semibold text-slate-800">Sorting Rules:</strong>
            {selectedTables.map(t => (
              <div key={t.id} className="mt-1 pl-1">
                <p className="font-medium text-slate-700">{t.name}:</p>
                <ul className="list-disc list-inside text-slate-500 pl-2">
                  {(settings.perTableSorts[t.id] || []).filter(s => s.column).map((sort, i) => (
                    <li key={i}>{sort.column} ({sort.direction === 'asc' ? 'Asc' : 'Desc'})</li>
                  ))}
                  {(settings.perTableSorts[t.id] || []).filter(s => s.column).length === 0 && <li>Default Priority</li>}
                </ul>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div>
          <strong className="font-semibold text-slate-800">Sorting:</strong>
          <p className="pl-1">Holistic Priority Score</p>
        </div>
      )}
    </div>
  );
};


// --- Panel Content Components ---

const PanelSelectTables: React.FC<{
  tables: VocabTable[];
  selectedTableIds: string[];
  onToggleTable: (tableId: string) => void;
  onGoToTables: () => void;
}> = ({ tables, selectedTableIds, onToggleTable, onGoToTables }) => {
    const tableStats = useMemo(() => {
        const stats: { [tableId: string]: { Hard: number; Good: number; Easy: number } } = {};
        tables.forEach(table => {
            const tableStat = { Hard: 0, Good: 0, Easy: 0 };
            table.rows.forEach(row => {
                if (row.stats.flashcardStatus) {
                    tableStat[row.stats.flashcardStatus]++;
                }
            });
            stats[table.id] = tableStat;
        });
        return stats;
    }, [tables]);

    return (
        <div>
            <div className="space-y-3">
                {tables.length > 0 ? tables.map(table => {
                    const stats = tableStats[table.id];
                    const completionPercentage = table.wordCount > 0 ? (stats.Easy / table.wordCount) * 100 : 0;
                    return (
                        <SelectionCard
                            key={table.id}
                            isSelected={selectedTableIds.includes(table.id)}
                            onClick={() => onToggleTable(table.id)}
                            stats={stats}
                            completionPercentage={completionPercentage}
                        >
                            <div>
                                <h3 className="font-semibold text-slate-800 text-lg truncate">{table.name}</h3>
                                <p className="text-sm text-slate-500">{table.wordCount} words</p>
                            </div>
                        </SelectionCard>
                    )
                }) : (
                    <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed">
                        <h3 className="text-xl font-semibold text-slate-700">No Tables Found</h3>
                        <p className="text-slate-500 mt-2">Create or import a table first to start studying.</p>
                        <button onClick={onGoToTables} className="mt-4 bg-teal-700 text-white font-bold py-2 px-4 rounded-lg">Go to Tables</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const studyModes: { mode: StudyMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'MCQ', label: 'Multiple Choice', icon: <McqIcon /> },
    { mode: 'TF', label: 'True / False', icon: <TfIcon /> },
    { mode: 'Typing', label: 'Typing Answer', icon: <TypingIcon /> },
];

const PanelSelectMode: React.FC<{
    selectedModes: StudyMode[];
    onToggleMode: (mode: StudyMode) => void;
    randomize: boolean;
    onToggleRandomize: () => void;
}> = ({ selectedModes, onToggleMode, randomize, onToggleRandomize }) => {
    const canRandomize = selectedModes.length >= 2;
    return (
        <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {studyModes.map(({ mode, label, icon }) => {
                    const isSelected = selectedModes.includes(mode);
                    return (
                        <div key={mode} onClick={() => onToggleMode(mode)} className={`p-4 rounded-lg flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${isSelected ? 'bg-teal-50 border-2 border-teal-500 shadow-md' : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}>
                            <div className={`mb-2 ${isSelected ? 'text-teal-700' : 'text-slate-500'}`}>{icon}</div>
                            <h3 className="font-semibold text-slate-800">{label}</h3>
                        </div>
                    );
                })}
            </div>
            <SelectionCard isSelected={randomize && canRandomize} onClick={onToggleRandomize} disabled={!canRandomize}>
                <div>
                    <h3 className="font-semibold text-slate-800">Randomize modes</h3>
                    <p className="text-sm text-slate-500">Mix different question types in the session.</p>
                </div>
            </SelectionCard>
        </div>
    );
};

const PanelSelectRelations: React.FC<{
  relations: Relation[]; selectedTableIds: string[]; selectedRelationIds: string[]; selectedModes: StudyMode[]; randomRelation: boolean;
  onToggleRelation: (relationId: string) => void; onToggleRandomRelation: () => void; tables: VocabTable[]; onCreate: (tableId: string) => void; onPreview: (relation: Relation) => void;
}> = ({ relations, selectedTableIds, selectedRelationIds, selectedModes, randomRelation, onToggleRelation, onToggleRandomRelation, tables, onCreate, onPreview }) => {
  const selectedTables = useMemo(() => tables.filter(table => selectedTableIds.includes(table.id)), [selectedTableIds, tables]);

  return (
    <div className="space-y-6">
      <SelectionCard isSelected={randomRelation} onClick={onToggleRandomRelation}>
          <div><h3 className="font-semibold text-slate-800">Use Random Relation</h3><p className="text-sm text-slate-500">Automatically pick a compatible relation for each word.</p></div>
      </SelectionCard>

      <div className={`transition-opacity duration-300 ${randomRelation ? 'opacity-50 pointer-events-none' : ''}`}>
        {selectedTables.map(table => {
          const relationsForTable = relations.filter(rel => rel.tableId === table.id);
          return (
            <div key={table.id} className="mb-6 last:mb-0">
              <div className="pb-2 mb-3 border-b-2 border-slate-200 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-slate-800">{table.name}</h3>
                  <button onClick={() => onCreate(table.id)} className="bg-teal-50 text-teal-700 hover:bg-teal-100 text-sm font-semibold py-1 px-3 rounded-md transition-colors">+ Create Relation</button>
              </div>
              <div className="space-y-3">
                {relationsForTable.length > 0 ? relationsForTable.map(relation => {
                  const isCompatible = relation.modes.some(m => selectedModes.includes(m));
                  return (
                    <div key={relation.id} className="relative group">
                      <SelectionCard isSelected={selectedRelationIds.includes(relation.id)} onClick={() => onToggleRelation(relation.id)} disabled={!isCompatible}>
                        <div>
                          <h4 className="text-md font-semibold text-slate-800">{relation.name}</h4>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">{relation.modes.map(mode => (<span key={mode} className={`px-2 py-0.5 text-xs font-semibold rounded-full ${selectedModes.includes(mode) ? 'text-teal-800 bg-teal-100' : 'text-slate-600 bg-slate-200'}`}>{mode}</span>))}</div>
                          {!isCompatible && <p className="text-xs text-red-500 mt-2">Requires a selected study mode.</p>}
                        </div>
                      </SelectionCard>
                      {!isCompatible || (
                          <button 
                              onClick={(e) => { e.stopPropagation(); onPreview(relation); }} 
                              className="absolute top-1/2 -translate-y-1/2 right-20 p-2 rounded-full bg-slate-100/80 text-slate-500 hover:bg-slate-200 hover:text-slate-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                              aria-label={`Preview relation ${relation.name}`}
                          >
                              <EyeIcon className="w-5 h-5" />
                          </button>
                      )}
                    </div>
                  );
                }) : <p className="text-center text-slate-500 py-4">No relations found for this table.</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PanelSessionComposition: React.FC<{
  settings: StudySettings;
  setSettings: React.Dispatch<React.SetStateAction<StudySettings>>;
  tables: VocabTable[];
  availableWordCount: number;
}> = ({ settings, setSettings, tables, availableWordCount }) => {
  const { wordCount, selectedTableIds, queueCompositionStrategy, tablePercentages } = settings;
  const wordCounts = [5, 8, 13, 21];

  const selectedTables = useMemo(() => tables.filter(t => selectedTableIds.includes(t.id)), [tables, selectedTableIds]);
  const isMultiTable = selectedTables.length > 1;

  const handlePercentageChange = (tableId: string, value: string) => {
    if (value === '') {
        setSettings(s => ({ ...s, tablePercentages: { ...s.tablePercentages, [tableId]: 0 } }));
        return;
    }
    if (!/^\d*$/.test(value)) return;

    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
        setSettings(s => ({ ...s, tablePercentages: { ...s.tablePercentages, [tableId]: numValue } }));
    }
  };

  const totalPercentage = Object.keys(tablePercentages).reduce((sum, key) => sum + (tablePercentages[key] || 0), 0);
  
  return (
    <div className="space-y-6">
        {isMultiTable && (
            <div>
              <h4 className="text-sm font-semibold text-slate-600 mb-2">Queue Composition</h4>
              <div className="grid grid-cols-2 gap-3">
                  <SelectionCard isSelected={queueCompositionStrategy === 'balanced'} onClick={() => setSettings(s => ({...s, queueCompositionStrategy: 'balanced'}))}>
                      <p className="font-semibold text-sm">Balanced Mix</p>
                  </SelectionCard>
                  <SelectionCard isSelected={queueCompositionStrategy === 'percentage'} onClick={() => setSettings(s => ({...s, queueCompositionStrategy: 'percentage'}))}>
                      <p className="font-semibold text-sm">Percentage Mix</p>
                  </SelectionCard>
              </div>
              {queueCompositionStrategy === 'balanced' && (
                  <div className="p-3 mt-2 bg-white border rounded-lg animate-scale-in">
                      <p className="text-xs font-semibold text-slate-500 mb-2">The <span className="font-bold text-slate-700">{wordCount}</span> words in your queue will be distributed as follows:</p>
                      <ul className="space-y-1">
                          {(() => {
                              const numTables = selectedTables.length;
                              if (numTables === 0) return null;
                              const wordsPerTable = Math.floor(wordCount / numTables);
                              let remainder = wordCount % numTables;
                              return selectedTables.map(table => {
                                  const takeCount = wordsPerTable + (remainder > 0 ? 1 : 0);
                                  if (remainder > 0) remainder--;
                                  return (
                                  <li key={table.id} className="text-sm flex justify-between">
                                      <span className="text-slate-700 truncate pr-4">{table.name}</span>
                                      <span className="font-bold text-slate-800 flex-shrink-0">{takeCount} words</span>
                                  </li>
                                  );
                              });
                          })()}
                      </ul>
                  </div>
              )}
              {queueCompositionStrategy === 'percentage' && (
                  <div className="p-3 mt-2 bg-white border rounded-lg space-y-2">
                      {selectedTables.map(t => (
                          <div key={t.id} className="flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-700">{t.name}</span>
                              <div className="relative w-20">
                                  <input type="text" pattern="\d*" value={tablePercentages[t.id] || ''} onChange={e => handlePercentageChange(t.id, e.target.value)} className="w-full p-1 text-right pr-6 border rounded-md"/>
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                              </div>
                          </div>
                      ))}
                      <div className={`pt-2 border-t flex justify-between items-center font-bold ${totalPercentage !== 100 ? 'text-red-600' : 'text-teal-600'}`}>
                          <span>Total</span>
                          <span>{totalPercentage}%</span>
                      </div>
                  </div>
              )}
            </div>
        )}
        
        <div>
            <h4 className="text-sm font-semibold text-slate-600 mb-2">Queue Size</h4>
            <div className="grid grid-cols-4 gap-3">
                {wordCounts.map(count => (<button key={count} onClick={() => setSettings(s => ({ ...s, wordCount: count }))} disabled={count > availableWordCount} className={`p-4 rounded-lg font-bold text-xl text-center transition-all ${wordCount === count ? 'bg-teal-700 text-white shadow-lg' : 'bg-white hover:bg-slate-100 border disabled:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50'}`}>{count}</button>))}
            </div>
            {wordCount > availableWordCount && <p className="text-xs text-red-500 mt-2 text-center">Not enough compatible words for this count. Please select fewer words or change other settings.</p>}
        </div>
    </div>
  );
};


const PanelWordSelection: React.FC<{
  settings: StudySettings;
  setSettings: React.Dispatch<React.SetStateAction<StudySettings>>;
  tables: VocabTable[];
  availableWordCount: number;
}> = ({ settings, setSettings, tables, availableWordCount }) => {
  const { isManualMode, manualWordIds, selectedTableIds, perTableSorts } = settings;

  const toggleManualWord = (wordId: string) => {
    const newSet = new Set(manualWordIds);
    if (newSet.has(wordId)) newSet.delete(wordId); else newSet.add(wordId);
    setSettings(s => ({ ...s, manualWordIds: Array.from(newSet) }));
  };

  const selectedTables = useMemo(() => tables.filter(t => selectedTableIds.includes(t.id)), [tables, selectedTableIds]);
  const isMultiTable = selectedTables.length > 1;

  const allColumnsForSort = useMemo(() => {
    const baseCols = new Set<string>();
    selectedTables.forEach(t => t.columns.forEach(c => baseCols.add(c)));
    const statCols = ['Priority Score', 'Rank Point', 'Success Rate', 'Level', 'Last Practiced', 'Flashcard Status', 'Passed1', 'Passed2', 'Failed', 'Attempts', 'In Queue Count', 'Quit Queue'];
    return [...Array.from(baseCols), ...statCols];
  }, [selectedTables]);

  const handleSortChange = (tableId: string, layerIndex: number, rule: Partial<SortRule>) => {
    setSettings(s => {
        const newSorts = [...(s.perTableSorts[tableId] || [])];
        newSorts[layerIndex] = { ...newSorts[layerIndex], ...rule };
        return { ...s, perTableSorts: { ...s.perTableSorts, [tableId]: newSorts }};
    });
  };
  
  const handleSameSortForAll = () => {
      if (selectedTableIds.length < 2) return;
      const firstTableId = selectedTableIds[0];
      const sourceSorts = perTableSorts[firstTableId] || [];
      const newPerTableSorts = { ...perTableSorts };
      selectedTableIds.slice(1).forEach(tableId => {
          newPerTableSorts[tableId] = sourceSorts;
      });
      setSettings(s => ({ ...s, perTableSorts: newPerTableSorts }));
  };

  const SortLayer: React.FC<{ tableId: string; layerIndex: number; }> = ({ tableId, layerIndex }) => (
      <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 w-12">{layerIndex === 0 ? 'Sort by' : 'Then by'}</span>
          <select value={perTableSorts[tableId]?.[layerIndex]?.column || ''} onChange={e => handleSortChange(tableId, layerIndex, { column: e.target.value })} className="flex-grow text-sm p-1 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600">
              <option value="">-- None --</option>
              {allColumnsForSort.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => handleSortChange(tableId, layerIndex, { direction: 'asc' })} className={`p-1 rounded-md ${perTableSorts[tableId]?.[layerIndex]?.direction === 'asc' ? 'bg-teal-100' : 'bg-slate-100'}`}><ArrowUpIcon className="w-3 h-3"/></button>
          <button onClick={() => handleSortChange(tableId, layerIndex, { direction: 'desc' })} className={`p-1 rounded-md ${perTableSorts[tableId]?.[layerIndex]?.direction === 'desc' ? 'bg-teal-100' : 'bg-slate-100'}`}><ArrowDownIcon className="w-3 h-3"/></button>
      </div>
  );

  return (
    <div>
        <SelectionCard isSelected={!isManualMode} onClick={() => setSettings(s => ({ ...s, isManualMode: false, wordSelectionStrategy: selectedTableIds.length > 0 ? 'perTable' : 'holistic' }))}>
            <h3 className="font-semibold text-slate-800">Automatic (Recommended)</h3>
            <p className="text-sm text-slate-500">Let the app choose words based on smart rules.</p>
        </SelectionCard>
        
        {!isManualMode && selectedTables.length > 0 && (
            <div className="p-4 bg-slate-50 border rounded-lg ml-10 space-y-6 animate-scale-in">
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-semibold text-slate-600">Sorting Strategy</h4>
                        {isMultiTable && (
                            <button onClick={handleSameSortForAll} className="text-xs font-bold text-teal-700 hover:bg-teal-100 p-1.5 rounded-md">Same Sort for All</button>
                        )}
                    </div>
                    <div className="space-y-4">
                        {selectedTables.map(table => (
                            <div key={table.id} className="p-3 bg-white border rounded-lg">
                                <p className="font-bold text-slate-800 mb-2">{table.name}</p>
                                <div className="space-y-2">
                                    {[0, 1, 2].map(i => <SortLayer key={i} tableId={table.id} layerIndex={i} />)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                <PanelSessionComposition 
                    settings={settings}
                    setSettings={setSettings}
                    tables={tables}
                    availableWordCount={availableWordCount}
                />
            </div>
        )}

        <div className="mt-4">
            <SelectionCard isSelected={isManualMode} onClick={() => setSettings(s => ({ ...s, isManualMode: true }))}>
                <h3 className="font-semibold text-slate-800">Manually Choose Words</h3>
                <p className="text-sm text-slate-500">Hand-pick the exact words you want to study.</p>
            </SelectionCard>
        </div>
        {isManualMode && (
            <div className="p-4 bg-slate-50 border rounded-lg ml-10 mt-4 animate-scale-in">
                <p className="text-sm font-semibold text-slate-600 mb-2">Select words from your chosen tables ({manualWordIds.length} / {availableWordCount} selected):</p>
                <div className="space-y-2 max-h-80 overflow-y-auto border bg-white rounded-md p-2">
                    {tables.filter(t => settings.selectedTableIds.includes(t.id)).flatMap(t => t.rows).map(word => (<SelectionCard key={word.id} isSelected={manualWordIds.includes(word.id)} onClick={() => toggleManualWord(word.id)}><p className="font-medium text-slate-700">{Object.values(word.cols)[0]}</p></SelectionCard>))}
                </div>
            </div>
        )}
    </div>
  );
};


// --- New Criteria Panel ---
const STATS_COLUMNS_FOR_SORT: { key: keyof VocabRowStats | 'priorityScore'; label: string; }[] = [
    { key: 'priorityScore', label: 'Priority Score' },
    { key: 'RankPoint', label: 'Rank Point' },
    { key: 'SuccessRate', label: 'Success Rate' },
    { key: 'Level', label: 'Level' },
    { key: 'LastPracticeDate', label: 'Last Practiced' },
    { key: 'flashcardStatus', label: 'Flashcard Status' },
    { key: 'Failed', label: 'Failed' },
    { key: 'TotalAttempt', label: 'Attempts' },
];

const PanelSelectCriteria: React.FC<{
  sorts: SortRule[];
  onSortChange: (layerIndex: number, rule: Partial<SortRule>) => void;
  isConfirmed: boolean;
  onConfirm: () => void;
  onEdit: () => void;
}> = ({ sorts, onSortChange, isConfirmed, onConfirm, onEdit }) => {
    const layerLabels = ["1st Priority", "2nd Priority", "3rd Priority"];

    return (
        <div className="p-3 bg-slate-50 border rounded-lg">
            <p className="text-sm text-slate-600 mb-4">Define the sorting logic to select words. Words will be sorted by the first priority, then the second, and so on.</p>
            <div className={`space-y-3 ${isConfirmed ? 'opacity-60' : ''}`}>
                {[0, 1, 2].map(i => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-white border rounded-md">
                        <span className="text-sm font-semibold text-slate-500 w-24">{layerLabels[i]}</span>
                        <select
                            value={sorts[i]?.column || ''}
                            onChange={e => onSortChange(i, { column: e.target.value })}
                            className="flex-grow text-sm p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600 disabled:bg-slate-100"
                            disabled={isConfirmed}
                        >
                            <option value="">-- None --</option>
                            {STATS_COLUMNS_FOR_SORT.map(c => <option key={c.key} value={c.label}>{c.label}</option>)}
                        </select>
                        <button onClick={() => onSortChange(i, { direction: 'asc' })} className={`p-2 rounded-md ${sorts[i]?.direction === 'asc' ? 'bg-teal-100' : 'bg-slate-100'}`} disabled={!sorts[i]?.column || isConfirmed}><ArrowUpIcon className="w-4 h-4"/></button>
                        <button onClick={() => onSortChange(i, { direction: 'desc' })} className={`p-2 rounded-md ${sorts[i]?.direction === 'desc' ? 'bg-teal-100' : 'bg-slate-100'}`} disabled={!sorts[i]?.column || isConfirmed}><ArrowDownIcon className="w-4 h-4"/></button>
                    </div>
                ))}
            </div>

            {sorts.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                    {isConfirmed ? (
                        <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircleIcon className="w-5 h-5 text-teal-500" />
                                        <h4 className="font-bold text-teal-800">Criteria Confirmed</h4>
                                    </div>
                                    <ul className="list-decimal list-inside mt-2 text-sm text-slate-700 space-y-1">
                                        {sorts.map(s => <li key={s.column}><b>{s.column}</b> ({s.direction}ending)</li>)}
                                    </ul>
                                </div>
                                <button onClick={onEdit} className="text-sm font-bold text-teal-700 hover:underline flex-shrink-0 ml-4">Edit</button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <h4 className="font-bold text-slate-800 mb-2">Please confirm your sorting criteria:</h4>
                             <ul className="list-decimal list-inside mb-4 text-sm text-slate-700 space-y-1">
                                {sorts.map(s => <li key={s.column}><b>{s.column}</b> ({s.direction}ending)</li>)}
                            </ul>
                            <button onClick={onConfirm} className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-2 px-4 rounded-lg">
                                Confirm Criteria
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


// --- Main StudyScreen Component ---
interface StudyScreenProps {
  studySettings: StudySettings;
  setStudySettings: React.Dispatch<React.SetStateAction<StudySettings>>;
  tables: VocabTable[];
  relations: Relation[];
  setRelations: React.Dispatch<React.SetStateAction<Relation[]>>;
  onStartSession: () => void;
  setActiveScreen: (screen: Screen) => void;
  studyPresets: StudyPreset[];
  setStudyPresets: React.Dispatch<React.SetStateAction<StudyPreset[]>>;
  onSubScreenChange: (subScreen: string | null) => void;
}

const StudyScreen: React.FC<StudyScreenProps> = ({ studySettings, setStudySettings, tables, relations, setRelations, onStartSession, setActiveScreen, studyPresets, setStudyPresets, onSubScreenChange }) => {
  const [openPanels, setOpenPanels] = useState<Set<string>>(new Set(['tables', 'criteria']));
  const [isRelationModalOpen, setIsRelationModalOpen] = useState(false);
  const [tableIdForNewRelation, setTableIdForNewRelation] = useState<string | null>(null);
  const [previewQueue, setPreviewQueue] = useState<StudyQuestion[]>([]);
  const [isCriteriaConfirmed, setIsCriteriaConfirmed] = useState(false);
  const [relationToPreview, setRelationToPreview] = useState<Relation | null>(null);

  // Presets State
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = useState(false);
  const [isLoadPresetDropdownOpen, setIsLoadPresetDropdownOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [isManagingPresets, setIsManagingPresets] = useState(false);
  
  const [hoveredPresetId, setHoveredPresetId] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<'right' | 'left'>('right');
  const tooltipRef = useRef<HTMLDivElement>(null);


  // --- Summaries & Validation ---
  const { studyMode, selectedTableIds, selectedModes, randomRelation, selectedRelationIds, isManualMode, manualWordIds, wordCount, criteriaSorts } = studySettings;
  
  // Reset confirmation if criteria are changed
  useEffect(() => {
    setIsCriteriaConfirmed(false);
  }, [studySettings.criteriaSorts]);

  const isTableMode = studyMode === 'table';
  const isCriteriaMode = studyMode === 'criteria';

  const isTablesComplete = selectedTableIds.length > 0;
  const isModesComplete = selectedModes.length > 0;
  const isRelationsComplete = randomRelation || selectedRelationIds.length > 0;
  
  // Table Mode specifics
  const isWordCountComplete = isManualMode ? manualWordIds.length >= 1 : wordCount >= 5;
  
  // Criteria Mode specifics
  const isCriteriaSortsComplete = criteriaSorts.length > 0 && criteriaSorts.some(s => s.column) && isCriteriaConfirmed;

  const availableWordsCount = useMemo(() => {
    // A word is available if it belongs to a selected table and has at least one relation
    // that is compatible with the selected quiz modes.
    const allCandidateRows = tables
      .filter(t => selectedTableIds.includes(t.id))
      .flatMap(t => t.rows.map(r => ({ ...r, tableId: t.id })));

    const compatibleRows = allCandidateRows.filter(row => {
        const applicableRelations = randomRelation
            // Random mode: find any relation for this row's table that works with a selected mode
            ? relations.filter(r => r.tableId === row.tableId && r.modes.some(m => selectedModes.includes(m)))
            // Specific relations mode: find if any of the selected relations are for this row's table
            : relations.filter(r => selectedRelationIds.includes(r.id) && r.tableId === row.tableId);
        
        return applicableRelations.length > 0;
    });

    return compatibleRows.length;
  }, [selectedTableIds, selectedRelationIds, selectedModes, randomRelation, tables, relations]);

  const canStart = previewQueue.length > 0 && 
    (isTableMode 
        ? (isTablesComplete && isModesComplete && isRelationsComplete && isWordCountComplete) 
        : (isCriteriaSortsComplete && isTablesComplete && isRelationsComplete && isModesComplete)
    );
  
  // Initialize multi-table settings when table selection changes
  useEffect(() => {
    // Only apply for table mode or when criteria mode has multiple tables
    if (studyMode === 'criteria' && selectedTableIds.length <= 1) return;

    if (selectedTableIds.length > 1) { 
        setStudySettings(s => {
            const newSorts = { ...s.perTableSorts };
            const newPercentages = { ...s.tablePercentages };
            const balancedPercent = Math.floor(100 / selectedTableIds.length);
            
            selectedTableIds.forEach((id, index) => {
                if (studyMode === 'table' && !newSorts[id]) { 
                    newSorts[id] = [{ column: 'Priority Score', direction: 'desc' }, {column: '', direction: 'asc'}, {column: '', direction: 'asc'}];
                }
                if (!newPercentages[id]) {
                     newPercentages[id] = index === selectedTableIds.length -1 
                        ? 100 - (balancedPercent * (selectedTableIds.length - 1))
                        : balancedPercent;
                }
            });
            Object.keys(newSorts).forEach(id => !selectedTableIds.includes(id) && delete newSorts[id]);
            Object.keys(newPercentages).forEach(id => !selectedTableIds.includes(id) && delete newPercentages[id]);

            return { 
                ...s, 
                perTableSorts: newSorts, 
                tablePercentages: newPercentages,
                wordSelectionStrategy: studyMode === 'table' && s.isManualMode ? s.wordSelectionStrategy : 'perTable' 
            };
        });
    } else if (selectedTableIds.length === 1 && studyMode === 'table') { 
        setStudySettings(s => {
            const tableId = selectedTableIds[0];
            const newSorts = { ...s.perTableSorts };
            if (!newSorts[tableId]) {
                 newSorts[tableId] = [{ column: 'Priority Score', direction: 'desc' }, {column: '', direction: 'asc'}, {column: '', direction: 'asc'}];
            }
            const finalSorts : { [tableId: string]: SortRule[] } = {[tableId]: newSorts[tableId]};
            return { ...s, wordSelectionStrategy: s.isManualMode ? s.wordSelectionStrategy : 'perTable', perTableSorts: finalSorts, tablePercentages: {} };
        });
    } else { 
        setStudySettings(s => ({ ...s, wordSelectionStrategy: 'holistic', perTableSorts: {}, tablePercentages: {} }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTableIds, studyMode, setStudySettings]);

  // --- Handlers ---
  const togglePanel = (panelName: string) => setOpenPanels(prev => {
    const newSet = new Set<string>(); // Single panel open at a time now
    if (!prev.has(panelName)) {
      newSet.add(panelName);
    }
    return newSet;
  });

  const toggleTableSelection = (tableId: string) => setStudySettings(prev => {
    const newSelection = prev.selectedTableIds.includes(tableId) ? prev.selectedTableIds.filter(id => id !== tableId) : [...prev.selectedTableIds, tableId];
    const newSelectedRelations = prev.selectedRelationIds.filter(relId => relations.find(r => r.id === relId)?.tableId && newSelection.includes(relations.find(r => r.id === relId)!.tableId));
    const wordsInSelectedTables = tables.filter(t => newSelection.includes(t.id)).flatMap(t => t.rows.map(r => r.id));
    const newManualWordIds = prev.manualWordIds.filter(wordId => wordsInSelectedTables.includes(wordId));
    return { ...prev, selectedTableIds: newSelection, selectedRelationIds: newSelectedRelations, manualWordIds: newManualWordIds };
  });
  const toggleModeSelection = (mode: StudyMode) => setStudySettings(prev => {
    const newModes = prev.selectedModes.includes(mode) ? prev.selectedModes.filter(m => m !== mode) : [...prev.selectedModes, mode];
    const newRandomize = newModes.length < 2 ? false : prev.randomizeModes;
    const newSelectedRelations = prev.selectedRelationIds.filter(relId => relations.find(r => r.id === relId)?.modes.some(m => newModes.includes(m)));
    return { ...prev, selectedModes: newModes, randomizeModes: newRandomize, selectedRelationIds: newSelectedRelations };
  });
  const toggleRelationSelection = (relationId: string) => setStudySettings(prev => ({...prev, selectedRelationIds: prev.selectedRelationIds.includes(relationId) ? prev.selectedRelationIds.filter(id => id !== relationId) : [...prev.selectedRelationIds, relationId]}));
  const handleCreateRelation = (tableId: string) => { setTableIdForNewRelation(tableId); setIsRelationModalOpen(true); };
  const handleSaveRelation = (relationData: Omit<Relation, 'id' | 'isCustom'> & { id?: string }) => {
    if (relationData.id) setRelations(prev => prev.map(r => r.id === relationData.id ? { ...r, ...relationData } as Relation : r));
    else setRelations(prev => [...prev, { ...relationData, id: `rel-custom-${Date.now()}`, isCustom: true }]);
  };

  const handleCriteriaSortChange = (layerIndex: number, rule: Partial<SortRule>) => {
    setStudySettings(s => {
        const newSorts = [...(s.criteriaSorts || [])];
        while (newSorts.length <= layerIndex) {
            newSorts.push({ column: '', direction: 'desc' });
        }
        
        newSorts[layerIndex] = { ...newSorts[layerIndex], ...rule };
        // Don't filter here, allow empty columns so the UI is stable
        // const finalSorts = newSorts.filter(s => s.column);

        return { ...s, criteriaSorts: newSorts };
    });
  };

  useEffect(() => {
    const session = generateStudySession(studySettings, tables, relations);
    setPreviewQueue(session);
  }, [studySettings, tables, relations]);

  useEffect(() => {
    if (hoveredPresetId && tooltipRef.current) {
        const rect = tooltipRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        if (rect.right > viewportWidth) {
             setTooltipPosition('left');
        } else {
             setTooltipPosition('right');
        }
    }
  }, [hoveredPresetId]);
  
  const handleStart = () => {
    if (isTableMode && !studySettings.isManualMode) {
      setStudySettings(s => ({...s, isManualMode: true, manualWordIds: previewQueue.map(q => q.vocabRow.id)}));
    }
    setTimeout(onStartSession, 50);
  };

  // --- Preset Handlers ---
  const handleOpenSavePresetModal = () => {
    setPresetName('');
    setIsSavePresetModalOpen(true);
  };
  
  const handleSavePreset = () => {
    if (presetName.trim()) {
      const newPreset: StudyPreset = {
        id: `preset-${Date.now()}`,
        name: presetName.trim(),
        settings: studySettings,
      };
      setStudyPresets(prev => [...prev, newPreset]);
      setIsSavePresetModalOpen(false);
    }
  };

  const handleLoadPreset = (preset: StudyPreset) => {
    setStudySettings(preset.settings);
    // When loading a criteria preset, it should be considered confirmed.
    if (preset.settings.studyMode === 'criteria' && preset.settings.criteriaSorts.some(s => s.column)) {
        setIsCriteriaConfirmed(true);
    }
    setIsLoadPresetDropdownOpen(false);
  };

  const handleDeletePreset = (id: string) => {
    setStudyPresets(prev => prev.filter(p => p.id !== id));
  };
  
  const summaries = {
    tables: isTablesComplete ? `${selectedTableIds.length} table(s) selected` : 'Select one or more tables',
    modes: isModesComplete ? selectedModes.join(', ') + (studySettings.randomizeModes ? ' (Randomized)' : '') : 'Choose at least one study mode',
    relations: isRelationsComplete ? (randomRelation ? 'Random relation' : `${selectedRelationIds.length} relation(s) selected`) : 'Choose relations or enable random mode',
    count: isManualMode ? `${manualWordIds.length} words chosen` : `Automatic selection of ${wordCount} words`,
    criteriaSorts: isCriteriaSortsComplete ? 'Criteria confirmed' : (criteriaSorts.some(s => s.column) ? 'Please confirm criteria' : 'Define your word sorting priority'),
    sessionSize: `${wordCount} words`,
    locked: 'Complete the previous step',
  };
  const tableForModal = useMemo(() => tables.find(t => t.id === tableIdForNewRelation), [tableIdForNewRelation, tables]);
  const tableForPreview = useMemo(() => {
    if (!relationToPreview) return null;
    return tables.find(t => t.id === relationToPreview.tableId) || null;
  }, [relationToPreview, tables]);
  
  const tablePresets = studyPresets.filter(p => p.settings.studyMode === 'table');
  const criteriaPresets = studyPresets.filter(p => p.settings.studyMode === 'criteria');

  const tooltipDesktopClasses = tooltipPosition === 'right'
    ? 'md:left-full md:right-auto md:ml-2 md:origin-top-left'
    : 'md:right-full md:left-auto md:mr-2 md:origin-top-right';
  
  const renderPresetList = (presets: StudyPreset[]) => {
      return presets.map(preset => (
          <div 
              key={preset.id} 
              className="flex items-center justify-between group p-2 rounded-md hover:bg-slate-50 relative"
              onMouseEnter={() => setHoveredPresetId(preset.id)}
              onMouseLeave={() => setHoveredPresetId(null)}
          >
               <button onClick={() => handleLoadPreset(preset)} className="text-left flex-grow truncate">{preset.name}</button>
               {isManagingPresets && <button onClick={() => handleDeletePreset(preset.id)} className="p-1 text-slate-400 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>}
               {hoveredPresetId === preset.id && (
                   <div
                       ref={tooltipRef}
                       className={`absolute top-full left-0 right-0 mt-2 w-auto md:w-64 md:top-0 md:mt-0 bg-white border rounded-lg shadow-xl z-30 animate-scale-in origin-top ${tooltipDesktopClasses}`}
                   >
                       <PresetDetail preset={preset} tables={tables} />
                   </div>
               )}
          </div>
      ));
  };

  return (
    <div className="flex flex-col h-full">
      <header className="mb-6">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Study Setup</h1>
        <p className="mt-2 text-lg text-slate-500">Configure your session and start learning.</p>
      </header>

      <main className="flex-grow pb-24 space-y-3">
        <div className="mb-4 flex items-center gap-2">
            <Dropdown
                isOpen={isLoadPresetDropdownOpen}
                onToggle={() => { setIsLoadPresetDropdownOpen(p => !p); setIsManagingPresets(false); }}
                className="w-72"
                trigger={
                    <button className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-sm font-semibold py-2 px-3 rounded-md transition-colors flex items-center gap-2">
                        <FolderOpenIcon /> Load Preset
                    </button>
                }
            >
                <div className="space-y-1">
                    {studyPresets.length > 0 ? (
                      <div>
                        {tablePresets.length > 0 && (
                          <div className="mb-2">
                            <h4 className="px-2 pt-1 pb-1 text-xs font-bold text-slate-400 uppercase tracking-wider">Table Presets</h4>
                            {renderPresetList(tablePresets)}
                          </div>
                        )}
                        {criteriaPresets.length > 0 && (
                          <div className={tablePresets.length > 0 ? "pt-2 border-t" : ""}>
                            <h4 className="px-2 pt-1 pb-1 text-xs font-bold text-slate-400 uppercase tracking-wider">Criteria Presets</h4>
                            {renderPresetList(criteriaPresets)}
                          </div>
                        )}
                      </div>
                    ) : <p className="text-center text-sm text-slate-500 p-4">No presets saved yet.</p>}
                     <div className="pt-2 mt-2 border-t">
                        <button onClick={() => setIsManagingPresets(p => !p)} className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-800 p-1">
                            {isManagingPresets ? 'Done Managing' : 'Manage Presets'}
                        </button>
                    </div>
                </div>
            </Dropdown>
             <button 
                onClick={() => setStudySettings(defaultStudySettings)}
                className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-sm font-semibold py-2 px-3 rounded-md transition-colors flex items-center gap-2"
                aria-label="Reset all settings to default"
            >
                <RepeatIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Reset Settings</span>
            </button>
        </div>

        <div className="p-4 bg-slate-100 rounded-xl">
             <h2 className="text-lg font-bold text-slate-800 mb-3">Choose Your Study Method</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div onClick={() => setStudySettings(s => ({...s, studyMode: 'table'}))} className={`p-5 rounded-lg text-left cursor-pointer transition-all border-2 ${isTableMode ? 'bg-teal-50 border-teal-500 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                    <div className="flex items-center gap-4"><TableIcon className="w-8 h-8 text-teal-700"/><div><h3 className="font-bold text-slate-800 text-lg">Study by Table</h3><p className="text-sm text-slate-500">Manually choose specific tables and relations.</p></div></div>
                </div>
                <div onClick={() => setStudySettings(s => ({...s, studyMode: 'criteria'}))} className={`p-5 rounded-lg text-left cursor-pointer transition-all border-2 ${isCriteriaMode ? 'bg-teal-50 border-teal-500 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                    <div className="flex items-center gap-4"><TargetIcon className="w-8 h-8 text-teal-700"/><div><h3 className="font-bold text-slate-800 text-lg">Study by Criteria</h3><p className="text-sm text-slate-500">Let the app build a session based on performance.</p></div></div>
                </div>
             </div>
        </div>

        {isTableMode && (
            <div className="space-y-3 animate-scale-in">
                <CollapsiblePanel title="1. Select Tables" summary={summaries.tables} isOpen={openPanels.has('tables')} onToggle={() => togglePanel('tables')} isComplete={isTablesComplete}>
                    <PanelSelectTables tables={tables} selectedTableIds={selectedTableIds} onToggleTable={toggleTableSelection} onGoToTables={() => setActiveScreen('Tables')} />
                </CollapsiblePanel>
                <CollapsiblePanel title="2. Quiz mode Selection" summary={isTablesComplete ? summaries.modes : summaries.locked} isOpen={openPanels.has('modes')} onToggle={() => togglePanel('modes')} isComplete={isModesComplete} isDisabled={!isTablesComplete}>
                    <PanelSelectMode selectedModes={selectedModes} onToggleMode={toggleModeSelection} randomize={studySettings.randomizeModes} onToggleRandomize={() => setStudySettings(p => ({...p, randomizeModes: !p.randomizeModes}))} />
                </CollapsiblePanel>
                <CollapsiblePanel title="3. Relation Selection" summary={isModesComplete ? summaries.relations : summaries.locked} isOpen={openPanels.has('relations')} onToggle={() => togglePanel('relations')} isComplete={isRelationsComplete} isDisabled={!isTablesComplete || !isModesComplete}>
                    <PanelSelectRelations tables={tables} relations={relations} selectedTableIds={selectedTableIds} selectedRelationIds={selectedRelationIds} selectedModes={selectedModes} randomRelation={randomRelation} onToggleRelation={toggleRelationSelection} onToggleRandomRelation={() => setStudySettings(p => ({...p, randomRelation: !p.randomRelation}))} onCreate={handleCreateRelation} onPreview={setRelationToPreview} />
                </CollapsiblePanel>
                <CollapsiblePanel title="4. Word Selection &amp; Queue Size" summary={isRelationsComplete ? summaries.count : summaries.locked} isOpen={openPanels.has('count')} onToggle={() => togglePanel('count')} isComplete={isWordCountComplete} isDisabled={!isTablesComplete || !isModesComplete || !isRelationsComplete}>
                    <PanelWordSelection settings={studySettings} setSettings={setStudySettings} tables={tables} availableWordCount={availableWordsCount} />
                </CollapsiblePanel>
            </div>
        )}
        
        {isCriteriaMode && (
             <div className="space-y-3 animate-scale-in">
                <CollapsiblePanel title="1. Set Priority Criteria" summary={summaries.criteriaSorts} isOpen={openPanels.has('criteria')} onToggle={() => togglePanel('criteria')} isComplete={isCriteriaSortsComplete}>
                    <PanelSelectCriteria
                        sorts={criteriaSorts}
                        onSortChange={handleCriteriaSortChange}
                        isConfirmed={isCriteriaConfirmed}
                        onConfirm={() => setIsCriteriaConfirmed(true)}
                        onEdit={() => setIsCriteriaConfirmed(false)}
                    />
                </CollapsiblePanel>
                <CollapsiblePanel title="2. Select Tables" summary={isCriteriaSortsComplete ? summaries.tables : summaries.locked} isOpen={openPanels.has('tables')} onToggle={() => togglePanel('tables')} isComplete={isTablesComplete} isDisabled={!isCriteriaSortsComplete}>
                    <PanelSelectTables tables={tables} selectedTableIds={selectedTableIds} onToggleTable={toggleTableSelection} onGoToTables={() => setActiveScreen('Tables')} />
                </CollapsiblePanel>
                <CollapsiblePanel title="3. Quiz Mode Selection" summary={isTablesComplete ? summaries.modes : summaries.locked} isOpen={openPanels.has('modes')} onToggle={() => togglePanel('modes')} isComplete={isModesComplete} isDisabled={!isCriteriaSortsComplete || !isTablesComplete}>
                    <PanelSelectMode selectedModes={selectedModes} onToggleMode={toggleModeSelection} randomize={studySettings.randomizeModes} onToggleRandomize={() => setStudySettings(p => ({...p, randomizeModes: !p.randomizeModes}))} />
                </CollapsiblePanel>
                <CollapsiblePanel title="4. Select Relations" summary={isModesComplete ? summaries.relations : summaries.locked} isOpen={openPanels.has('relations')} onToggle={() => togglePanel('relations')} isComplete={isRelationsComplete} isDisabled={!isCriteriaSortsComplete || !isModesComplete}>
                     <PanelSelectRelations tables={tables} relations={relations} selectedTableIds={selectedTableIds} selectedRelationIds={selectedRelationIds} selectedModes={selectedModes} randomRelation={randomRelation} onToggleRelation={toggleRelationSelection} onToggleRandomRelation={() => setStudySettings(p => ({...p, randomRelation: !p.randomRelation}))} onCreate={handleCreateRelation} onPreview={setRelationToPreview} />
                </CollapsiblePanel>
                <CollapsiblePanel title="5. Set Session Size" summary={isRelationsComplete ? summaries.sessionSize : summaries.locked} isOpen={openPanels.has('size')} onToggle={() => togglePanel('size')} isComplete={true} isDisabled={!isCriteriaSortsComplete || !isRelationsComplete}>
                    <PanelSessionComposition
                        settings={studySettings}
                        setSettings={setStudySettings}
                        tables={tables}
                        availableWordCount={availableWordsCount}
                    />
                </CollapsiblePanel>
             </div>
        )}
          
          <div className="pt-4">
              <button onClick={handleOpenSavePresetModal} className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-sm font-semibold py-2 px-3 rounded-md transition-colors flex items-center gap-2">
                  <SaveIcon /> Save Preset
              </button>
          </div>
      </main>

      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white/80 backdrop-blur-sm border-t border-slate-200 z-10">
        <div className="max-w-5xl mx-auto flex gap-4">
          <button onClick={handleStart} disabled={!canStart} className="w-full bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white font-bold py-3 px-4 rounded-lg text-lg shadow-md disabled:cursor-not-allowed">
            Start Session ({previewQueue.length} words)
          </button>
        </div>
      </div>
      <RelationEditorModal isOpen={isRelationModalOpen} onClose={() => setIsRelationModalOpen(false)} onSave={handleSaveRelation} table={tableForModal} relationToEdit={null} />
      <RelationPreviewModal
        isOpen={!!relationToPreview}
        onClose={() => setRelationToPreview(null)}
        relation={relationToPreview}
        table={tableForPreview}
      />
      <Modal isOpen={isSavePresetModalOpen} onClose={() => setIsSavePresetModalOpen(false)} title="Save Preset">
          <div className="space-y-4">
              <div>
                  <label htmlFor="preset-name" className="block text-sm font-semibold text-slate-700 mb-1">Preset Name</label>
                  <input type="text" id="preset-name" value={presetName} onChange={e => setPresetName(e.target.value)}
                      className="w-full px-3 py-2 text-slate-700 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
                      placeholder="e.g., Daily C2 Review"
                      autoFocus
                  />
              </div>
              <div className="flex justify-end gap-4 pt-4 border-t">
                <button onClick={() => setIsSavePresetModalOpen(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-6 rounded-lg">Cancel</button>
                <button onClick={handleSavePreset} disabled={!presetName.trim()} className="bg-teal-700 hover:bg-teal-800 text-white font-bold py-2 px-6 rounded-lg disabled:bg-slate-300">Save</button>
            </div>
          </div>
      </Modal>
    </div>
  );
};

export default StudyScreen;