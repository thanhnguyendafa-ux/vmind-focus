

import React, { useMemo } from 'react';
import { GlobalStats, VocabTable, VocabRow, HistoryLogItem } from '../types';
import { ClockIcon, RepeatIcon, TrendingUpIcon, AlertTriangleIcon } from '../components/Icons';
import { calculatePriorityScore } from '../utils/priorityScore';
import ActivityCalendar from '../components/ActivityCalendar';


// --- Types & Interfaces ---
interface StatsScreenProps {
  globalStats: GlobalStats;
  tables: VocabTable[];
}

// --- Helper Functions ---
const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    return new Date(d.setDate(diff));
};

const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
};


// --- UI Components ---

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4">
    <div className="w-12 h-12 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0">
        {icon}
    </div>
    <div>
        <p className="text-2xl font-bold text-slate-800 truncate">{value}</p>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
    </div>
  </div>
);

const PracticeTimeStats: React.FC<{ history: HistoryLogItem[] }> = ({ history }) => {
    const timeStats = useMemo(() => {
        const now = new Date();
        const startOfThisWeek = getStartOfWeek(now);
        const startOfLastWeek = new Date(startOfThisWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        let thisWeek = 0, lastWeek = 0, thisMonth = 0;

        for (const item of history) {
            if ((item.type === 'session_complete' || item.type === 'session_quit' || item.type === 'theater_session_complete') && item.durationSeconds) {
                const itemDate = new Date(item.timestamp);
                if (itemDate >= startOfThisWeek) thisWeek += item.durationSeconds;
                if (itemDate >= startOfLastWeek && itemDate < startOfThisWeek) lastWeek += item.durationSeconds;
                if (itemDate >= startOfThisMonth) thisMonth += item.durationSeconds;
            }
        }
        return { thisWeek, lastWeek, thisMonth };
    }, [history]);
    
    const comparison = useMemo(() => {
        if (timeStats.lastWeek === 0) {
            return timeStats.thisWeek > 0 ? { change: 100, text: 'Up from none last week', color: 'text-teal-600' } : { change: 0, text: 'No activity', color: 'text-slate-500' };
        }
        const change = ((timeStats.thisWeek - timeStats.lastWeek) / timeStats.lastWeek) * 100;
        return {
            change: change,
            text: `${change >= 0 ? '+' : ''}${change.toFixed(0)}% from last week`,
            color: change >= 0 ? 'text-teal-600' : 'text-red-600'
        };
    }, [timeStats]);

    const TimeStat: React.FC<{ label: string, value: string, sub?: string, subColor?: string }> = ({ label, value, sub, subColor }) => (
        <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
            {sub && <p className={`text-sm font-semibold mt-1 ${subColor}`}>{sub}</p>}
        </div>
    );

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Practice Time</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <TimeStat label="This Week" value={formatDuration(timeStats.thisWeek)} sub={comparison.text} subColor={comparison.color} />
                <TimeStat label="Last Week" value={formatDuration(timeStats.lastWeek)} />
                <TimeStat label="This Month" value={formatDuration(timeStats.thisMonth)} />
                <TimeStat label="Total" value={formatDuration(history.reduce((sum, item) => sum + (item.durationSeconds || 0), 0))} />
            </div>
        </div>
    );
};


const WordFocus: React.FC<{ tables: VocabTable[] }> = ({ tables }) => {
    const wordLists = useMemo(() => {
        const allWords = tables.flatMap(t => t.rows);
        if (allWords.length === 0) {
            return { strongest: [], weakest: [] };
        }
        const sortedByRank = [...allWords].sort((a, b) => b.stats.RankPoint - a.stats.RankPoint);
        const sortedByFailure = [...allWords].sort((a, b) => b.stats.FailureRate - a.stats.FailureRate);
        return {
            strongest: sortedByRank.slice(0, 5),
            weakest: sortedByFailure.slice(0, 5)
        };
    }, [tables]);

    const WordItem: React.FC<{ row: VocabRow, metric: string, value: string | number }> = ({ row, metric, value }) => (
        <div className="flex justify-between items-center p-2 bg-slate-50 rounded-md">
            <p className="font-semibold text-slate-700 truncate">{row.cols[Object.keys(row.cols)[0]]}</p>
            <p className="text-sm font-bold text-slate-800">{metric}: {value}</p>
        </div>
    );
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><TrendingUpIcon className="w-5 h-5 text-teal-600"/> Strongest Words</h3>
                <div className="space-y-2">
                    {wordLists.strongest.map(row => <WordItem key={row.id} row={row} metric="Rank" value={row.stats.RankPoint} />)}
                    {wordLists.strongest.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No data yet.</p>}
                </div>
            </div>
             <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><AlertTriangleIcon className="w-5 h-5 text-red-500"/> Weakest Words</h3>
                <div className="space-y-2">
                    {wordLists.weakest.map(row => <WordItem key={row.id} row={row} metric="Fail %" value={`${(row.stats.FailureRate * 100).toFixed(0)}%`} />)}
                    {wordLists.weakest.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No data yet.</p>}
                </div>
            </div>
        </div>
    );
};

const StatsScreen: React.FC<StatsScreenProps> = ({ globalStats, tables }) => {
    const totalWords = useMemo(() => tables.reduce((sum, table) => sum + table.wordCount, 0), [tables]);

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Statistics</h1>
                <p className="mt-2 text-lg text-slate-500">A detailed look at your learning journey.</p>
            </header>

            <div className="space-y-6">
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <StatCard title="Total Words" value={totalWords} icon={<span className="text-2xl">📖</span>} />
                    <StatCard title="Sessions Done" value={globalStats.inQueueReal} icon={<ClockIcon className="w-6 h-6"/>} />
                    <StatCard title="Sessions Quit" value={globalStats.quitQueueReal} icon={<RepeatIcon className="w-6 h-6"/>} />
                 </div>
                 <PracticeTimeStats history={globalStats.history} />
                 <WordFocus tables={tables} />
            </div>
        </div>
    );
};

// In a real app, you would pass this screen to your main App component router.
// For this environment, we just export it.
export default StatsScreen;