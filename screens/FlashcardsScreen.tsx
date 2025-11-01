
import React, { useState, useMemo } from 'react';
import { VocabTable, Relation, VocabRow, VocabRowStats } from '../types';
import { CheckCircleIcon, UncheckedCircleIcon, EyeIcon, EyeOffIcon, ClockIcon, FlashcardIcon } from '../components/Icons';

interface FlashcardsScreenProps {
  tables: VocabTable[];
  relations: Relation[];
  onStartSession: (tableIds: string[], relationIds: string[]) => void;
}

const StatCard: React.FC<{ title: string; value: number; color: string; }> = ({ title, value, color }) => (
  <div className={`p-3 rounded-lg shadow-sm text-center ${color}`}>
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-xs font-semibold uppercase tracking-wider">{title}</p>
  </div>
);

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

type RatingStats = { again: number; hard: number; good: number; easy: number; perfect: number; };

interface SelectionCardProps {
  isSelected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  stats?: RatingStats;
  completionPercentage?: number;
}

const SelectionCard: React.FC<SelectionCardProps> = ({ isSelected, onClick, children, stats, completionPercentage }) => (
  <div
    onClick={onClick}
    role="checkbox"
    aria-checked={isSelected}
    className={`p-4 rounded-lg flex flex-col items-start transition-all duration-200 cursor-pointer ${
      isSelected
        ? 'bg-teal-50 border-2 border-teal-500 shadow-md'
        : 'bg-white border border-slate-200 hover:border-slate-300'
    }`}
  >
    <div className="w-full flex items-center justify-between">
      <div className="flex-grow">{children}</div>
      {typeof completionPercentage === 'number' ? (
        <CircularProgressBar percentage={completionPercentage} />
      ) : (
        isSelected 
          ? <CheckCircleIcon className="w-6 h-6 text-teal-600 flex-shrink-0 ml-4" /> 
          : <UncheckedCircleIcon className="w-6 h-6 text-slate-300 flex-shrink-0 ml-4" />
      )}
    </div>
    {/* FIX: Cast value to number to fix TypeScript error where 'v' is inferred as 'unknown'. */}
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


const FlashcardsScreen: React.FC<FlashcardsScreenProps> = ({ tables, relations, onStartSession }) => {
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [selectedRelationIds, setSelectedRelationIds] = useState<string[]>([]);
  const [areDetailsVisible, setAreDetailsVisible] = useState(true);
  
  const flashcardStats = useMemo(() => {
    const stats: RatingStats = { again: 0, hard: 0, good: 0, easy: 0, perfect: 0 };
    tables.forEach(table => {
      table.rows.forEach(row => {
        if (row.stats.flashcardRatings) {
          stats.again += row.stats.flashcardRatings.again || 0;
          stats.hard += row.stats.flashcardRatings.hard || 0;
          stats.good += row.stats.flashcardRatings.good || 0;
          stats.easy += row.stats.flashcardRatings.easy || 0;
          stats.perfect += row.stats.flashcardRatings.perfect || 0;
        }
      });
    });
    return stats;
  }, [tables]);

  const tableStats = useMemo(() => {
    const stats: { [tableId: string]: RatingStats } = {};
    tables.forEach(table => {
        const tableStat: RatingStats = { again: 0, hard: 0, good: 0, easy: 0, perfect: 0 };
        table.rows.forEach(row => {
            if (row.stats.flashcardRatings) {
                tableStat.again += row.stats.flashcardRatings.again || 0;
                tableStat.hard += row.stats.flashcardRatings.hard || 0;
                tableStat.good += row.stats.flashcardRatings.good || 0;
                tableStat.easy += row.stats.flashcardRatings.easy || 0;
                tableStat.perfect += row.stats.flashcardRatings.perfect || 0;
            }
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
    onStartSession(selectedTableIds, selectedRelationIds);
  };
  
  const canStart = selectedTableIds.length > 0 && selectedRelationIds.length > 0;

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Flashcards</h1>
        <p className="mt-2 text-lg text-slate-500">A quick and simple way to review your vocabulary.</p>
      </header>
      
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <StatCard title="Again" value={flashcardStats.again} color="bg-red-100 text-red-800" />
            <StatCard title="Hard" value={flashcardStats.hard} color="bg-orange-100 text-orange-800" />
            <StatCard title="Good" value={flashcardStats.good} color="bg-amber-100 text-amber-800" />
            <StatCard title="Easy" value={flashcardStats.easy} color="bg-sky-100 text-sky-800" />
            <StatCard title="Perfect" value={flashcardStats.perfect} color="bg-teal-100 text-teal-800" />
        </div>
        <div className="space-y-6">
            <div>
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-2xl font-bold text-slate-800">1. Select Tables</h2>
                    <button onClick={() => setAreDetailsVisible(!areDetailsVisible)} className="text-sm font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 p-2 rounded-lg hover:bg-teal-50">
                        {areDetailsVisible ? <EyeOffIcon className="w-5 h-5"/> : <EyeIcon className="w-5 h-5" />}
                        {areDetailsVisible ? 'Hide Details' : 'Show Details'}
                    </button>
                </div>
                <div className="space-y-2">{tables.map(table => { const stats = tableStats[table.id]; const reviewedCount = table.rows.filter(row => row.stats.isFlashcardReviewed).length; const totalEncounters = table.rows.reduce((sum, row) => { const ratings = row.stats.flashcardRatings; if (ratings) { sum += (ratings.again || 0) + (ratings.hard || 0) + (ratings.good || 0) + (ratings.easy || 0) + (ratings.perfect || 0); } return sum; }, 0); const completionPercentage = table.wordCount > 0 ? (reviewedCount / table.wordCount) * 100 : 0; const lastPracticedDate = lastPracticedDates[table.id]; const lastPracticedText = lastPracticedDate ? timeSince(lastPracticedDate) : 'Never'; return (
                <SelectionCard key={table.id} isSelected={selectedTableIds.includes(table.id)} onClick={() => toggleTable(table.id)} stats={areDetailsVisible ? stats : undefined} completionPercentage={completionPercentage}>
                    <div><h3 className="font-semibold text-slate-800 truncate">{table.name}</h3>{areDetailsVisible ? (<div className="animate-scale-in origin-top-left"><div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-sm text-slate-500 mt-1"><span>{table.wordCount} words</span><span>Encounters: <span className="font-bold text-slate-700">{totalEncounters}</span></span><span>Reviewed: <span className="font-bold text-slate-700">{reviewedCount} / {table.wordCount}</span></span></div><div className="flex items-center gap-1 text-sm text-slate-500 mt-2"><ClockIcon className="w-4 h-4 flex-shrink-0" /><span>Last practiced: <span className="font-bold text-slate-700">{lastPracticedText}</span></span></div></div>) : (<p className="text-sm text-slate-500 mt-1">{table.wordCount} words</p>)}</div>
                </SelectionCard>)})}</div>
            </div>
            {selectedTableIds.length > 0 && (
                <div><h2 className="text-2xl font-bold text-slate-800 mb-3">2. Select Relations</h2><div className="space-y-2">{availableRelations.map(relation => (<SelectionCard key={relation.id} isSelected={selectedRelationIds.includes(relation.id)} onClick={() => toggleRelation(relation.id)}><h3 className="font-semibold text-slate-800">{relation.name}</h3></SelectionCard>))}{availableRelations.length === 0 && <p className="text-slate-500 text-center p-4">No relations found for selected table(s).</p>}</div></div>
            )}
        </div>
        <div className="mt-8">
            <button onClick={handleStart} disabled={!canStart} className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-3 px-4 rounded-lg text-lg shadow-md transition-transform transform hover:scale-105 disabled:bg-slate-300 disabled:cursor-not-allowed">Start Review</button>
        </div>
    </div>
  );
};

export default FlashcardsScreen;