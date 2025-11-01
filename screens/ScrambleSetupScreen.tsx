import React, { useState, useMemo } from 'react';
import { VocabTable, Relation, ScrambleSessionContext } from '../types';
import { CheckCircleIcon, UncheckedCircleIcon, EyeIcon, EyeOffIcon, ClockIcon } from '../components/Icons';
import { Screen } from '../App';

const timeSince = (dateStr: string): string => {
    const date = new Date(dateStr);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
};

type RatingStats = { again: number; hard: number; good: number; easy: number; perfect: number; reviewedCount: number; totalEncounters: number; };

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
          className="text-yellow-500"
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
  disabled?: boolean;
  stats?: Omit<RatingStats, 'reviewedCount' | 'totalEncounters'>;
  completionPercentage?: number;
}

const SelectionCard: React.FC<SelectionCardProps> = ({ isSelected, onClick, children, disabled, stats, completionPercentage }) => (
  <div
    onClick={!disabled ? onClick : undefined}
    role="checkbox"
    aria-checked={isSelected}
    className={`p-4 rounded-lg flex flex-col items-start transition-all duration-200 ${
      disabled ? 'opacity-50 bg-slate-50 cursor-not-allowed' : 'cursor-pointer'
    } ${
      isSelected
        ? 'bg-yellow-50 border-2 border-yellow-500 shadow-md'
        : 'bg-white border border-slate-200 hover:border-slate-300'
    }`}
  >
    <div className="w-full flex items-center justify-between">
      <div className="flex-grow pr-2">{children}</div>
      {typeof completionPercentage === 'number' ? (
        <CircularProgressBar percentage={completionPercentage} />
      ) : (
        isSelected 
          ? <CheckCircleIcon className="w-6 h-6 text-yellow-600 flex-shrink-0 ml-4" /> 
          : <UncheckedCircleIcon className="w-6 h-6 text-slate-300 flex-shrink-0 ml-4" />
      )}
    </div>
    {stats && (Object.values(stats).some(v => (v as number) > 0)) && (
      <div className="mt-3 pt-3 border-t border-slate-200/80 w-full flex items-center gap-x-3 gap-y-1 text-xs flex-wrap animate-scale-in">
          <span className="flex items-center gap-1 font-semibold text-red-600">Again: {stats.again}</span>
          <span className="flex items-center gap-1 font-semibold text-orange-600">Hard: {stats.hard}</span>
          <span className="flex items-center gap-1 font-semibold text-amber-600">Good: {stats.good}</span>
          <span className="flex items-center gap-1 font-semibold text-sky-600">Easy: {stats.easy}</span>
          <span className="flex items-center gap-1 font-semibold text-teal-600">Perfect: {stats.perfect}</span>
      </div>
    )}
  </div>
);


interface ScrambleSetupScreenProps {
  tables: VocabTable[];
  relations: Relation[];
  onStartScrambleSession: (context: ScrambleSessionContext) => void;
  setActiveScreen: (screen: Screen) => void;
}

const ScrambleSetupScreen: React.FC<ScrambleSetupScreenProps> = ({ tables, relations, onStartScrambleSession, setActiveScreen }) => {
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [selectedRelationIds, setSelectedRelationIds] = useState<string[]>([]);
  const [splitInto, setSplitInto] = useState<number>(5);
  const [interactionMode, setInteractionMode] = useState<'drag' | 'type'>('drag');
  const [areDetailsVisible, setAreDetailsVisible] = useState(true);

  const tableStats = useMemo(() => {
    const stats: { [tableId: string]: RatingStats } = {};
    tables.forEach(table => {
        const tableStat: RatingStats = { again: 0, hard: 0, good: 0, easy: 0, perfect: 0, reviewedCount: 0, totalEncounters: 0 };
        table.rows.forEach(row => {
            if (row.stats.scrambleRatings) {
                tableStat.again += row.stats.scrambleRatings.again || 0;
                tableStat.hard += row.stats.scrambleRatings.hard || 0;
                tableStat.good += row.stats.scrambleRatings.good || 0;
                tableStat.easy += row.stats.scrambleRatings.easy || 0;
                tableStat.perfect += row.stats.scrambleRatings.perfect || 0;
            }
            if (row.stats.isScrambleReviewed) {
                tableStat.reviewedCount++;
            }
            tableStat.totalEncounters += row.stats.scrambleEncounters || 0;
        });
        stats[table.id] = tableStat;
    });
    return stats;
  }, [tables]);

  const lastPracticedDates = useMemo(() => {
    const dates: { [tableId: string]: string | null } = {};
    tables.forEach(table => {
        const practiceDates = table.rows
            .map(row => row.stats.LastPracticeDate)
            .filter((date): date is string => !!date)
            .map(dateStr => new Date(dateStr).getTime());

        if (practiceDates.length > 0) {
            const latestTimestamp = Math.max(...practiceDates);
            dates[table.id] = new Date(latestTimestamp).toISOString();
        } else {
            dates[table.id] = null;
        }
    });
    return dates;
  }, [tables]);

  const availableRelations = useMemo(() => {
    return relations.filter(r => selectedTableIds.includes(r.tableId) && r.modes.includes('Scrambled'));
  }, [relations, selectedTableIds]);

  const toggleTable = (id: string) => {
    const newTableIds = selectedTableIds.includes(id)
      ? selectedTableIds.filter(tId => tId !== id)
      : [...selectedTableIds, id];
    
    setSelectedTableIds(newTableIds);
    // Deselect relations from the deselected table
    const newRelationIds = selectedRelationIds.filter(relId => {
      const relation = relations.find(r => r.id === relId);
      return relation && newTableIds.includes(relation.tableId);
    });
    setSelectedRelationIds(newRelationIds);
  };

  const toggleRelation = (id: string) => {
    setSelectedRelationIds(prev => prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]);
  };
  
  const handleStart = () => {
    onStartScrambleSession({
      tableIds: selectedTableIds,
      relationIds: selectedRelationIds,
      settings: {
        splitInto,
        interactionMode,
      }
    });
  };
  
  const canStart = selectedTableIds.length > 0 && selectedRelationIds.length > 0;

  return (
    <div className="flex flex-col h-full">
      <header className="mb-8 flex-shrink-0">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Sentence Scramble</h1>
        <p className="mt-2 text-lg text-slate-500">Configure your sentence unscrambling session.</p>
      </header>

      <div className="flex-grow overflow-y-auto pb-24">
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-2xl font-bold text-slate-800">1. Select Tables</h2>
              <button onClick={() => setAreDetailsVisible(!areDetailsVisible)} className="text-sm font-semibold text-yellow-700 hover:text-yellow-800 flex items-center gap-1 p-2 rounded-lg hover:bg-yellow-50">
                  {areDetailsVisible ? <EyeOffIcon className="w-5 h-5"/> : <EyeIcon className="w-5 h-5" />}
                  {areDetailsVisible ? 'Hide Details' : 'Show Details'}
              </button>
            </div>
            <div className="space-y-2">{tables.map(table => {
                const stats = tableStats[table.id];
                const completionPercentage = table.wordCount > 0 ? (stats.reviewedCount / table.wordCount) * 100 : 0;
                const lastPracticedDate = lastPracticedDates[table.id];
                const lastPracticedText = lastPracticedDate ? timeSince(lastPracticedDate) : 'Never';
                
                return (
              <SelectionCard 
                key={table.id} 
                isSelected={selectedTableIds.includes(table.id)} 
                onClick={() => toggleTable(table.id)}
                stats={areDetailsVisible ? stats : undefined}
                completionPercentage={completionPercentage}
              >
                  <div>
                      <h3 className="font-semibold text-slate-800 truncate">{table.name}</h3>
                       {areDetailsVisible ? (
                        <div className="animate-scale-in origin-top-left">
                            <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-sm text-slate-500 mt-1">
                                <span>{table.wordCount} words</span>
                                <span>Encounters: <span className="font-bold text-slate-700">{stats.totalEncounters}</span></span>
                                <span>Reviewed: <span className="font-bold text-slate-700">{stats.reviewedCount} / {table.wordCount}</span></span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-slate-500 mt-2">
                                <ClockIcon className="w-4 h-4 flex-shrink-0" />
                                <span>Last practiced: <span className="font-bold text-slate-700">{lastPracticedText}</span></span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 mt-1">{table.wordCount} words</p>
                    )}
                  </div>
              </SelectionCard>
              )})}
            </div>
          </div>

          <div className={selectedTableIds.length === 0 ? 'opacity-50' : ''}>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">2. Select Relations</h2>
            <p className="text-sm text-slate-500 -mt-2 mb-3">Only relations specifically created for 'Sentence Scramble' mode will appear here.</p>
            <div className="space-y-2">{availableRelations.map(relation => (<SelectionCard key={relation.id} isSelected={selectedRelationIds.includes(relation.id)} onClick={() => toggleRelation(relation.id)} disabled={selectedTableIds.length === 0}><h3 className="font-semibold text-slate-800">{relation.name}</h3></SelectionCard>))}
            {selectedTableIds.length > 0 && availableRelations.length === 0 && <p className="text-slate-500 text-center p-4">No 'Scrambled' relations found for the selected table(s).</p>}</div>
          </div>
          
          <div className={!canStart ? 'opacity-50' : ''}>
              <h2 className="text-2xl font-bold text-slate-800 mb-3">3. Configure Session</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-slate-200">
                      <label className="text-sm font-semibold text-slate-600 block mb-2">Split Sentence Into</label>
                      <div className="flex justify-between gap-2">{[3, 4, 5, 6, 7].map(d => <button key={d} onClick={() => setSplitInto(d)} disabled={!canStart} className={`flex-1 py-2 rounded-md font-bold ${splitInto === d ? 'bg-yellow-500 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>{d}</button>)}</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-slate-200">
                      <label className="text-sm font-semibold text-slate-600 block mb-2">Interaction Mode</label>
                      <div className="flex justify-between gap-2">
                          <button onClick={() => setInteractionMode('drag')} disabled={!canStart} className={`flex-1 py-2 rounded-md font-bold ${interactionMode === 'drag' ? 'bg-yellow-500 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>Click to Move</button>
                          <button onClick={() => setInteractionMode('type')} disabled={!canStart} className={`flex-1 py-2 rounded-md font-bold ${interactionMode === 'type' ? 'bg-yellow-500 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>Typing</button>
                      </div>
                  </div>
              </div>
          </div>
        </div>
      </div>


      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white/80 backdrop-blur-sm border-t border-slate-200 z-10">
        <div className="max-w-5xl mx-auto flex gap-4">
            <button onClick={() => setActiveScreen('Vmind')} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 px-6 rounded-lg">
                Back
            </button>
            <button onClick={handleStart} disabled={!canStart} className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg text-lg shadow-md transition-transform transform hover:scale-105 disabled:bg-slate-300 disabled:cursor-not-allowed">
                Start Scramble
            </button>
        </div>
      </div>
    </div>
  );
};

export default ScrambleSetupScreen;