import React, { useMemo, useState, useEffect } from 'react';
import { VocabTable, GlobalStats, VocabRow, HistoryLogItem, ReadingNote } from '../types';
import { Screen } from '../App';
import XpBar from '../components/XpBar';
import ActivityCalendar from '../components/ActivityCalendar';
import { ClockIcon, AlertTriangleIcon, ChevronDownIcon, TableIcon, TimeBadgeIcon01, BookOpenIcon, PlusIcon } from '../components/Icons';
import { timeMilestones } from '../data/timeMilestones';

// --- Helper Functions for Time Stats ---
const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}h`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
};

const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday being 0
    return new Date(d.setDate(diff));
};

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

const HistoryItem: React.FC<{ item: HistoryLogItem }> = ({ item }) => {
    const typeInfo = {
        session_complete: { icon: '🏆', color: 'text-teal-600', sign: '+' },
        session_quit: { icon: '🏃‍♂️', color: 'text-red-600', sign: '' },
        badge_gain: { icon: '🎖️', color: 'text-amber-500', sign: '' },
        badge_loss: { icon: '💔', color: 'text-slate-500', sign: '' },
        theater_session_complete: { icon: '🎭', color: 'text-cyan-600', sign: '+' },
        scramble_session_complete: { icon: '🧩', color: 'text-yellow-600', sign: '+' },
    };

    const info = typeInfo[item.type] || { icon: '🤔', color: 'text-slate-500', sign: '' };

    const xpDisplay = item.xpChange !== null ? `${info.sign}${item.xpChange} XP` : null;
    const minutes = item.durationSeconds ? Math.round(item.durationSeconds / 60) : 0;
    const durationDisplay = minutes > 0 ? `${minutes} mins` : null;
    const combinedDisplay = [xpDisplay, durationDisplay].filter(Boolean).join(' + ');

    return (
        <div className="flex items-center justify-between p-3 border-b border-slate-100 last:border-b-0">
            <div className="flex items-center">
                <span className="text-xl mr-4">{info.icon}</span>
                <div>
                    <p className="font-semibold text-slate-800">{item.description}</p>
                    <p className="text-xs text-slate-400">{timeSince(item.timestamp)}</p>
                </div>
            </div>
            {combinedDisplay && (
                <span className={`font-bold text-base ${info.color}`}>{combinedDisplay}</span>
            )}
        </div>
    );
};


// --- New UI Components for the Dashboard ---

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
            {icon}
        </div>
        <div>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
        </div>
    </div>
);

interface PracticeTimeDashboardProps {
  timeStats: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
  }
}

const PracticeTimeDashboard: React.FC<PracticeTimeDashboardProps> = ({ timeStats }) => {
    const stats = [
        { label: 'Today', value: formatDuration(timeStats.today) },
        { label: 'This Week', value: formatDuration(timeStats.thisWeek) },
        { label: 'This Month', value: formatDuration(timeStats.thisMonth) },
        { label: 'This Year', value: formatDuration(timeStats.thisYear) },
    ];

    return (
        <div className="space-y-3">
            {stats.map(stat => (
                <div key={stat.label} className="flex justify-between items-baseline p-2 rounded-md bg-slate-50/70">
                    <p className="text-sm font-semibold text-slate-500">{stat.label}</p>
                    <p className="text-lg font-bold text-slate-800">{stat.value}</p>
                </div>
            ))}
        </div>
    );
};

const TimeBar: React.FC<{ totalPracticeHours: number }> = ({ totalPracticeHours }) => {
    const levelInfo = useMemo(() => {
        let currentMilestone: (typeof timeMilestones[0] & { level: number }) | null = null;
        for (let i = timeMilestones.length - 1; i >= 0; i--) {
            if (totalPracticeHours >= timeMilestones[i].hoursThreshold) {
                currentMilestone = { ...timeMilestones[i], level: i + 1 };
                break;
            }
        }
        
        const nextMilestone = timeMilestones.find(m => m.hoursThreshold > totalPracticeHours) || null;
        
        const startHours = currentMilestone?.hoursThreshold || 0;
        const endHours = nextMilestone?.hoursThreshold || startHours;
        
        const progressInLevel = totalPracticeHours - startHours;
        const neededForLevel = endHours - startHours;
        
        const percentage = neededForLevel > 0 ? Math.min(100, (progressInLevel / neededForLevel) * 100) : 100;

        return {
            currentMilestone,
            nextMilestone,
            percentage,
            totalPracticeHours,
            endHours,
        };
    }, [totalPracticeHours]);

    const CurrentIcon = levelInfo.currentMilestone?.icon || TimeBadgeIcon01;

    return (
        <div className="relative">
            <div className="flex items-center gap-2 w-full">
                <div className="flex items-center gap-1.5 text-cyan-700 font-bold text-sm whitespace-nowrap">
                    <CurrentIcon className="w-5 h-5" />
                    <span>Lvl {levelInfo.currentMilestone?.level || 0}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden shadow-inner">
                    <div
                        className="bg-cyan-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${levelInfo.percentage}%` }}
                    ></div>
                </div>
                <span className="text-xs font-medium text-slate-600 whitespace-nowrap">{levelInfo.totalPracticeHours.toFixed(1)}h / {levelInfo.endHours}h</span>
            </div>
            <p className="text-xs text-center text-slate-500 mt-1 font-semibold">
                Next: {levelInfo.nextMilestone?.name || 'Max Level'}
            </p>
        </div>
    );
};


interface HomeScreenProps {
  setActiveScreen: (screen: Screen) => void;
  tables: VocabTable[];
  globalStats: GlobalStats;
  readingNotes: ReadingNote[];
  onSubScreenChange: (subScreen: string | null) => void;
  totalPracticeHours: number;
}

const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

const HomeScreen: React.FC<HomeScreenProps> = ({ setActiveScreen, tables, globalStats, readingNotes, onSubScreenChange, totalPracticeHours }) => {
    const [isHistoryVisible, setIsHistoryVisible] = useState(false);

    useEffect(() => {
      onSubScreenChange(isHistoryVisible ? 'Recent Activity Panel' : null);
      return () => onSubScreenChange(null);
    }, [isHistoryVisible, onSubScreenChange]);
    
    const timeStats = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Local date at midnight
        const startOfThisWeek = getStartOfWeek(now);
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfThisYear = new Date(now.getFullYear(), 0, 1);

        let todaySecs = 0, thisWeek = 0, thisMonth = 0, thisYear = 0;

        for (const item of globalStats.history) {
            if ((item.type === 'session_complete' || item.type === 'session_quit' || item.type === 'theater_session_complete' || item.type === 'scramble_session_complete') && item.durationSeconds) {
                const itemDate = new Date(item.timestamp);
                const itemDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());

                if (itemDay.getTime() === today.getTime()) {
                    todaySecs += item.durationSeconds;
                }
                if (itemDate >= startOfThisWeek) {
                    thisWeek += item.durationSeconds;
                }
                if (itemDate >= startOfThisMonth) {
                    thisMonth += item.durationSeconds;
                }
                if (itemDate >= startOfThisYear) {
                    thisYear += item.durationSeconds;
                }
            }
        }
        return { today: todaySecs, thisWeek, thisMonth, thisYear };
    }, [globalStats.history]);

    const dashboardStats = useMemo(() => {
        // --- Streak Calculation ---
        const studyDays = new Set(
            globalStats.history
                .filter(item => item.type === 'session_complete' || item.type === 'theater_session_complete' || item.type === 'scramble_session_complete')
                .map(item => new Date(item.timestamp).toISOString().split('T')[0])
        );

        let currentStreak = 0;
        if (studyDays.size > 0) {
            // New, more robust logic for streak calculation.
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);
            
            const todayStr = formatDate(today);
            const yesterdayStr = formatDate(yesterday);

            let startDateForStreak: Date | null = null;
            // A streak is valid if it ends today OR yesterday.
            if (studyDays.has(todayStr)) {
                startDateForStreak = today;
            } else if (studyDays.has(yesterdayStr)) {
                startDateForStreak = yesterday;
            }

            // If a valid starting point is found, count backwards.
            if (startDateForStreak) {
                const dateToTest = new Date(startDateForStreak);
                while (studyDays.has(formatDate(dateToTest))) {
                    currentStreak++;
                    dateToTest.setDate(dateToTest.getDate() - 1);
                }
            }
            // If startDateForStreak is null, it means no study today or yesterday, so streak is 0.
        }
        
        return {
            streak: currentStreak,
        };

    }, [globalStats.history]);

    const recentNotes = useMemo(() => {
        return [...readingNotes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3);
    }, [readingNotes]);

    const FireIcon = () => <svg className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 01-1.898-.632l4-12a1 1 0 011.265-.633zM10 18a1 1 0 01-1-1v-2a1 1 0 112 0v2a1 1 0 01-1 1zm5-1a1 1 0 00-1.447-.894l-2 1a1 1 0 00-.553.894V18a1 1 0 102 0v-1.106zM15 12a1 1 0 01-1 1h-2a1 1 0 110-2h2a1 1 0 011 1zm-5-1a1 1 0 00-1.447-.894l-2 1a1 1 0 00-.553.894V12a1 1 0 102 0v-1.106zM5 10a1 1 0 01-1 1H2a1 1 0 110-2h2a1 1 0 011 1z" clipRule="evenodd" /></svg>;
    const TrophyIcon = () => <svg className="w-6 h-6 text-teal-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a2.5 2.5 0 00-2.5 2.5V7h5V4.5A2.5 2.5 0 0010 2zM3.5 6A1.5 1.5 0 002 7.5v1A1.5 1.5 0 003.5 10H4v4a1 1 0 001 1h1a1 1 0 001-1v-4h4v4a1 1 0 001 1h1a1 1 0 001-1v-4h.5A1.5 1.5 0 0018 8.5v-1A1.5 1.5 0 0016.5 6H16v-.5A4.5 4.5 0 0011.5 1h-3A4.5 4.5 0 004 5.5V6H3.5zM6 16a1 1 0 00-1 1v.5A1.5 1.5 0 006.5 19h7a1.5 1.5 0 001.5-1.5V17a1 1 0 00-1-1H6z" /></svg>;

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Home</h1>
                <p className="mt-2 text-lg text-slate-500">Your personal learning dashboard.</p>
            </header>

            <div className="mb-6">
                <XpBar globalStats={globalStats} variant="compact" />
            </div>

            <div className="mb-8">
                <TimeBar totalPracticeHours={totalPracticeHours} />
            </div>

            <section className="mb-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                    <ActivityCalendar history={globalStats.history} todaySeconds={timeStats.today} />
                </div>
                <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <ClockIcon className="w-5 h-5"/> Practice Time
                    </h3>
                    <PracticeTimeDashboard timeStats={timeStats} />
                </div>
            </section>
            
            {/* --- Daily Dashboard Stats --- */}
            <section className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard title="Study Streak" value={`${dashboardStats.streak} Days`} icon={<FireIcon />} color="bg-amber-100" />
                <StatCard title="Sessions Completed" value={globalStats.inQueueReal} icon={<TrophyIcon />} color="bg-teal-100" />
                <StatCard title="Sessions Quit" value={globalStats.quitQueueReal} icon={<AlertTriangleIcon className="w-6 h-6 text-red-500" />} color="bg-red-100" />
            </section>
            
            <section className="mb-8">
                 <h2 className="text-2xl font-bold text-slate-900 mb-4">Reading Space</h2>
                 <div className="space-y-3">
                    {recentNotes.map(note => (
                         <div
                            key={note.id}
                            onClick={() => setActiveScreen('Reading')}
                            className="w-full bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex items-start gap-4 text-left transition-all duration-200 hover:shadow-md hover:border-cyan-500 cursor-pointer"
                          >
                            <BookOpenIcon className="w-8 h-8 text-cyan-600 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="font-bold text-cyan-700">{note.title}</h3>
                                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{note.content}</p>
                            </div>
                          </div>
                    ))}
                     <button
                        onClick={() => setActiveScreen('Reading')}
                        className="w-full bg-cyan-50 border-2 border-dashed border-cyan-300 text-cyan-700 p-4 rounded-lg flex items-center justify-center gap-2 text-left font-bold transition-all duration-200 hover:bg-cyan-100 hover:border-cyan-400"
                      >
                        <PlusIcon className="w-5 h-5" />
                        Go to Reading Space / Add New Note
                      </button>
                 </div>
            </section>

            {/* --- History Section --- */}
            <section className="mb-8">
                <div
                    className="flex justify-between items-center cursor-pointer p-4 bg-white rounded-lg shadow-sm border border-slate-200"
                    onClick={() => setIsHistoryVisible(!isHistoryVisible)}
                    role="button"
                    aria-expanded={isHistoryVisible}
                    aria-controls="history-panel"
                >
                    <h2 className="text-2xl font-bold text-slate-900">Recent Activity</h2>
                    <ChevronDownIcon className={`w-6 h-6 text-slate-400 transition-transform ${isHistoryVisible ? 'rotate-180' : ''}`} />
                </div>
                {isHistoryVisible && (
                    <div id="history-panel" className="mt-2 bg-white rounded-lg shadow-sm border border-slate-200 max-h-96 overflow-y-auto animate-scale-in">
                        {[...globalStats.history]
                            .filter(item => item.type === 'session_complete' || item.type === 'session_quit' || item.type === 'theater_session_complete' || item.type === 'scramble_session_complete')
                            .reverse()
                            .map(item => <HistoryItem key={item.id} item={item} />)
                        }
                        {globalStats.history.filter(item => item.type === 'session_complete' || item.type === 'session_quit' || item.type === 'theater_session_complete').length === 0 && (
                            <p className="text-center text-slate-500 p-8">No session history yet.</p>
                        )}
                    </div>
                )}
            </section>

            {/* --- Continue Learning --- */}
            <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Continue Learning</h2>
                <div className="space-y-3">
                  {tables.length > 0 ? tables.map(table => (
                     <button
                        key={table.id}
                        onClick={() => setActiveScreen('Tables')}
                        className="w-full bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4 text-left transition-all duration-200 hover:shadow-md hover:border-teal-500 cursor-pointer"
                      >
                        <TableIcon className="w-8 h-8 text-teal-600 flex-shrink-0" />
                        <h3 className="text-lg font-bold text-teal-700 truncate">{table.name}</h3>
                      </button>
                  )) : (
                    <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed w-full">
                        <h3 className="text-xl font-semibold text-slate-700">No Tables Found</h3>
                        <p className="text-slate-500 mt-2">Create or import a table to get started.</p>
                        <button onClick={() => setActiveScreen('Tables')} className="mt-4 bg-teal-700 text-white font-bold py-2 px-4 rounded-lg">Go to Tables</button>
                    </div>
                  )}
                </div>
            </section>
        </div>
    );
};

export default HomeScreen;
