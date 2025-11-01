import React, { useState, useMemo } from 'react';
import { VocabTable, Relation, TheaterSessionContext } from '../types';
import { CheckCircleIcon, UncheckedCircleIcon } from '../components/Icons';
import { Screen } from '../App';

interface SelectionCardProps {
  isSelected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const SelectionCard: React.FC<SelectionCardProps> = ({ isSelected, onClick, children }) => (
  <div
    onClick={onClick}
    role="checkbox"
    aria-checked={isSelected}
    className={`p-4 rounded-lg flex items-center justify-between transition-all duration-200 cursor-pointer ${
      isSelected
        ? 'bg-indigo-50 border-2 border-indigo-500 shadow-md'
        : 'bg-white border border-slate-200 hover:border-slate-300'
    }`}
  >
    <div className="flex-grow">{children}</div>
    {isSelected 
      ? <CheckCircleIcon className="w-6 h-6 text-indigo-600 flex-shrink-0 ml-4" /> 
      : <UncheckedCircleIcon className="w-6 h-6 text-slate-300 flex-shrink-0 ml-4" />
    }
  </div>
);


interface TheaterSetupScreenProps {
  tables: VocabTable[];
  relations: Relation[];
  onStartTheaterSession: (context: TheaterSessionContext) => void;
  setActiveScreen: (screen: Screen) => void;
}

const TheaterSetupScreen: React.FC<TheaterSetupScreenProps> = ({ tables, relations, onStartTheaterSession, setActiveScreen }) => {
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [selectedRelationIds, setSelectedRelationIds] = useState<string[]>([]);
  const [delay, setDelay] = useState(3);
  const [cardInterval, setCardInterval] = useState(5);
  const [duration, setDuration] = useState(0); // 0 for unlimited

  const availableRelations = useMemo(() => {
    return relations.filter(r => selectedTableIds.includes(r.tableId));
  }, [relations, selectedTableIds]);

  const toggleTable = (id: string) => {
    const newTableIds = selectedTableIds.includes(id)
      ? selectedTableIds.filter(tId => tId !== id)
      : [...selectedTableIds, id];
    
    setSelectedTableIds(newTableIds);
    setSelectedRelationIds(prev => prev.filter(relId => {
      const relation = relations.find(r => r.id === relId);
      return relation && newTableIds.includes(relation.tableId);
    }));
  };

  const toggleRelation = (id: string) => {
    setSelectedRelationIds(prev => prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]);
  };
  
  const handleStart = () => {
    onStartTheaterSession({
      tableIds: selectedTableIds,
      relationIds: selectedRelationIds,
      settings: {
        delaySeconds: delay,
        cardIntervalSeconds: cardInterval,
        durationMinutes: duration,
      }
    });
  };
  
  const canStart = selectedTableIds.length > 0 && selectedRelationIds.length > 0;

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Theater Mode Setup</h1>
        <p className="mt-2 text-lg text-slate-500">Configure your passive learning session.</p>
      </header>

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">1. Select Tables</h2>
          <div className="space-y-2">{tables.map(table => (
            <SelectionCard key={table.id} isSelected={selectedTableIds.includes(table.id)} onClick={() => toggleTable(table.id)}>
                <div><h3 className="font-semibold text-slate-800 truncate">{table.name}</h3><p className="text-sm text-slate-500 mt-1">{table.wordCount} words</p></div>
            </SelectionCard>))}
          </div>
        </div>
        {selectedTableIds.length > 0 && (<div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">2. Select Relations</h2>
          <div className="space-y-2">{availableRelations.map(relation => (<SelectionCard key={relation.id} isSelected={selectedRelationIds.includes(relation.id)} onClick={() => toggleRelation(relation.id)}><h3 className="font-semibold text-slate-800">{relation.name}</h3></SelectionCard>))}
          {availableRelations.length === 0 && <p className="text-slate-500 text-center p-4">No relations found for selected table(s).</p>}</div>
        </div>)}
        {canStart && (
            <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-3">3. Configure Session</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-slate-200">
                        <label className="text-sm font-semibold text-slate-600 block mb-2">Part Delay (seconds)</label>
                        <div className="flex justify-between gap-2">{[2, 3, 4, 5].map(d => <button key={d} onClick={() => setDelay(d)} className={`flex-1 py-2 rounded-md font-bold ${delay === d ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>{d}s</button>)}</div>
                    </div>
                     <div className="bg-white p-4 rounded-lg border border-slate-200">
                        <label className="text-sm font-semibold text-slate-600 block mb-2">Card Interval (seconds)</label>
                        <div className="flex justify-between gap-2">{[3, 5, 8, 10].map(d => <button key={d} onClick={() => setCardInterval(d)} className={`flex-1 py-2 rounded-md font-bold ${cardInterval === d ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>{d}s</button>)}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-slate-200 md:col-span-2">
                        <label className="text-sm font-semibold text-slate-600 block mb-2">Session Duration</label>
                        <div className="flex justify-between gap-2">{[{l: '10m', v: 10}, {l: '30m', v: 30}, {l: '∞', v: 0}].map(d => <button key={d.v} onClick={() => setDuration(d.v)} className={`flex-1 py-2 rounded-md font-bold ${duration === d.v ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>{d.l}</button>)}</div>
                    </div>
                </div>
            </div>
        )}
      </div>
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white/80 backdrop-blur-sm border-t border-slate-200 z-10">
        <div className="max-w-5xl mx-auto flex gap-4">
            <button onClick={() => setActiveScreen('Vmind')} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 px-6 rounded-lg">
                Back
            </button>
            <button onClick={handleStart} disabled={!canStart} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg text-lg shadow-md transition-transform transform hover:scale-105 disabled:bg-slate-300 disabled:cursor-not-allowed">
                Start Theater
            </button>
        </div>
      </div>
    </div>
  );
};

export default TheaterSetupScreen;