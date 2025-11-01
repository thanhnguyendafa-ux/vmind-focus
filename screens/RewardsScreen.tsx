import React, { useState, useMemo, useEffect, useRef } from 'react';
import { GlobalStats, HistoryLogItem } from '../types';
import XpBar from '../components/XpBar';
import { milestones } from '../data/milestones';
import { timeMilestones } from '../data/timeMilestones';
import { TrophyIcon } from '../components/Icons';

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


    return (
        <div className="flex items-center justify-between p-3 border-b border-slate-100 last:border-b-0">
            <div className="flex items-center">
                <span className="text-xl mr-4">{info.icon}</span>
                <div>
                    <p className="font-semibold text-slate-800">{item.description}</p>
                    <p className="text-xs text-slate-400">{timeSince(item.timestamp)}</p>
                </div>
            </div>
            {item.xpChange !== null && (
                <span className={`font-bold text-lg ${info.color}`}>{info.sign}{item.xpChange} XP</span>
            )}
        </div>
    );
};

// FIX: Add 'iconColor' property to the returned objects to resolve TypeScript errors.
const getStatusClasses = (status: 'unlocked' | 'next' | 'locked', theme: 'xp' | 'time') => {
    const themeColors = {
        xp: { nextContainer: 'from-teal-100 to-teal-200 border-teal-400 ring-teal-500/20', iconColor: 'text-teal-700', text: 'text-teal-900', threshold: 'text-teal-800/90' },
        time: { nextContainer: 'from-cyan-100 to-cyan-200 border-cyan-400 ring-cyan-500/20', iconColor: 'text-cyan-700', text: 'text-cyan-900', threshold: 'text-cyan-800/90' }
    };

    const common = {
        unlocked: { container: 'bg-gradient-to-br from-amber-200 to-yellow-200 border border-amber-300/80 shadow-md', iconBg: 'bg-white/50', textColor: 'text-amber-900', thresholdColor: 'text-amber-800/90', iconColor: 'text-amber-700' },
        locked: { container: 'bg-slate-100 border border-slate-200 filter grayscale opacity-70', iconBg: 'bg-slate-200', textColor: 'text-slate-500', thresholdColor: 'text-slate-400', iconColor: 'text-slate-400' }
    };
    
    if (status === 'unlocked') return common.unlocked;
    if (status === 'locked') return common.locked;

    const t = themeColors[theme];
    // FIX: Add 'iconColor' property to the returned objects to resolve TypeScript errors.
    return { container: `bg-gradient-to-br ${t.nextContainer} border-2 shadow-lg ring-4`, iconBg: 'bg-white/60', textColor: t.text, thresholdColor: t.threshold, iconColor: t.iconColor };
};


const BadgeItem: React.FC<{
    id?: string;
    name: string;
    thresholdLabel: string;
    status: 'unlocked' | 'next' | 'locked';
    isNew: boolean;
    icon: React.ReactNode;
    theme: 'xp' | 'time';
}> = ({ id, name, thresholdLabel, status, isNew, icon, theme }) => {
    const classes = getStatusClasses(status, theme);

    return (
        <div id={id} className={`p-3 rounded-lg flex flex-col items-center justify-start text-center transition-all duration-300 transform hover:scale-105 ${classes.container} ${isNew ? 'animate-celebrate-badge' : ''}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 shadow-inner ${classes.iconBg}`}>
                {icon}
            </div>
            <div className="h-12 flex flex-col justify-center">
                 <p className={`font-semibold text-xs leading-tight ${classes.textColor}`}>{name}</p>
            </div>
            <p className={`text-[10px] mt-1.5 font-medium ${classes.thresholdColor}`}>{thresholdLabel}</p>
        </div>
    );
};

interface RewardsScreenProps {
    globalStats: GlobalStats;
    setGlobalStats: React.Dispatch<React.SetStateAction<GlobalStats>>;
    onSubScreenChange: (subScreen: string | null) => void;
    totalPracticeHours: number;
}

const RewardsScreen: React.FC<RewardsScreenProps> = ({ globalStats, setGlobalStats, onSubScreenChange, totalPracticeHours }) => {
    const [activeTab, setActiveTab] = useState<'xp' | 'time' | 'history'>('xp');
    const [newlyUnlockedIds, setNewlyUnlockedIds] = useState<Set<string>>(new Set());
    const galleryRef = useRef<HTMLDivElement>(null);

    const { unlockedMilestoneIds, xp } = globalStats;
    const unlockedSet = new Set(unlockedMilestoneIds);
    
    useEffect(() => {
        const { unlockedMilestoneIds, lastViewedMilestoneCount } = globalStats;
        const newCount = unlockedMilestoneIds.length;
        const oldCount = lastViewedMilestoneCount ?? 0;

        if (newCount > oldCount) {
            const newIds = unlockedMilestoneIds.slice(oldCount);
            setNewlyUnlockedIds(new Set(newIds));

            const firstNewId = newIds[0];
            if (firstNewId) {
                setTimeout(() => {
                    const badgeElement = galleryRef.current?.querySelector(`#badge-${firstNewId}`);
                    if (badgeElement) {
                        badgeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }, 100);
            }

            const markAsViewedTimer = setTimeout(() => {
                setGlobalStats(prev => ({
                    ...prev,
                    lastViewedMilestoneCount: newCount,
                }));
                setNewlyUnlockedIds(new Set());
            }, 3000);

            return () => clearTimeout(markAsViewedTimer);
        }
    }, [globalStats, setGlobalStats]);

    const nextMilestone = useMemo(() => {
        return milestones.find(m => m.xpThreshold > xp) || null;
    }, [xp]);

    // Time-based rewards logic
    const unlockedTimeMilestones = useMemo(() => {
        return new Set(
            timeMilestones.filter(m => m.hoursThreshold <= totalPracticeHours).map(m => m.id)
        );
    }, [totalPracticeHours]);

    const nextTimeMilestone = useMemo(() => {
        return timeMilestones.find(m => m.hoursThreshold > totalPracticeHours) || null;
    }, [totalPracticeHours]);

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Rewards</h1>
                <p className="mt-2 text-lg text-slate-500">View your achievements and progress.</p>
            </header>

            {activeTab === 'xp' && (
                <>
                    <div className="mb-8 animate-scale-in">
                        <XpBar globalStats={globalStats} />
                    </div>
                    {nextMilestone && (
                        <div className="mb-8 p-4 bg-white rounded-lg border border-slate-200 shadow-sm text-center animate-scale-in">
                            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Next XP Badge</h2>
                            <p className="text-xl font-bold text-teal-700 mt-1">{nextMilestone.name}</p>
                            <div className="w-full bg-slate-200 rounded-full h-2.5 my-3">
                                <div className="bg-teal-600 h-2.5 rounded-full" style={{ width: `${Math.min(100, (xp / nextMilestone.xpThreshold) * 100)}%` }}></div>
                            </div>
                            <p className="text-sm text-slate-600"><span className="font-bold">{nextMilestone.xpThreshold - xp}</span> XP to go!</p>
                        </div>
                    )}
                </>
            )}

            {activeTab === 'time' && (
                 <>
                    <div className="mb-8 p-5 bg-white rounded-xl shadow-lg border border-slate-200 animate-scale-in">
                        <h2 className="font-bold text-cyan-700 text-lg mb-2">Total Practice Time</h2>
                        <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden shadow-inner">
                            <div className="bg-cyan-600 h-full rounded-full" style={{ width: '100%' }}></div>
                        </div>
                         <div className="text-right mt-1 text-sm font-medium text-slate-600">
                           {totalPracticeHours.toFixed(2)} Hours Logged
                        </div>
                    </div>
                    {nextTimeMilestone && (
                         <div className="mb-8 p-4 bg-white rounded-lg border border-slate-200 shadow-sm text-center animate-scale-in">
                            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Next Time Badge</h2>
                            <p className="text-xl font-bold text-cyan-700 mt-1">{nextTimeMilestone.name}</p>
                             <div className="w-full bg-slate-200 rounded-full h-2.5 my-3">
                                <div className="bg-cyan-600 h-2.5 rounded-full" style={{ width: `${Math.min(100, (totalPracticeHours / nextTimeMilestone.hoursThreshold) * 100)}%` }}></div>
                            </div>
                            <p className="text-sm text-slate-600"><span className="font-bold">{(nextTimeMilestone.hoursThreshold - totalPracticeHours).toFixed(2)}</span> hours to go!</p>
                        </div>
                    )}
                </>
            )}
            
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-slate-200">
                <div className="flex border-b border-slate-200 mb-4">
                    <button onClick={() => setActiveTab('xp')} className={`py-2 px-4 text-sm font-semibold ${activeTab === 'xp' ? 'text-teal-700 border-b-2 border-teal-700' : 'text-slate-500'}`}>XP Badges</button>
                    <button onClick={() => setActiveTab('time')} className={`py-2 px-4 text-sm font-semibold ${activeTab === 'time' ? 'text-cyan-700 border-b-2 border-cyan-700' : 'text-slate-500'}`}>Time Badges</button>
                    <button onClick={() => setActiveTab('history')} className={`py-2 px-4 text-sm font-semibold ${activeTab === 'history' ? 'text-slate-700 border-b-2 border-slate-700' : 'text-slate-500'}`}>History</button>
                </div>

                {activeTab === 'xp' && (
                    <div ref={galleryRef} className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-96 overflow-y-auto pr-2 animate-scale-in">
                        {milestones.map(m => {
                            const status = unlockedSet.has(m.id) ? 'unlocked' : (nextMilestone && m.id === nextMilestone.id) ? 'next' : 'locked';
                            const classes = getStatusClasses(status, 'xp');
                            return (
                                <BadgeItem
                                    id={`badge-${m.id}`}
                                    key={m.id}
                                    name={m.name}
                                    thresholdLabel={`${m.xpThreshold.toLocaleString()} XP`}
                                    status={status}
                                    isNew={newlyUnlockedIds.has(m.id)}
                                    icon={<TrophyIcon className={`w-7 h-7 ${classes.iconColor}`} />}
                                    theme="xp"
                                />
                            );
                        })}
                    </div>
                )}
                
                {activeTab === 'time' && (
                     <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-96 overflow-y-auto pr-2 animate-scale-in">
                        {timeMilestones.map(m => {
                            const status = unlockedTimeMilestones.has(m.id) ? 'unlocked' : (nextTimeMilestone && m.id === nextTimeMilestone.id) ? 'next' : 'locked';
                            const IconComponent = m.icon;
                            const classes = getStatusClasses(status, 'time');
                            return (
                                <BadgeItem
                                    id={`time-badge-${m.id}`}
                                    key={m.id}
                                    name={m.name}
                                    thresholdLabel={`${m.hoursThreshold.toLocaleString()} h`}
                                    status={status}
                                    isNew={false}
                                    icon={<IconComponent className={`w-7 h-7 ${classes.iconColor}`} />}
                                    theme="time"
                                />
                            )
                        })}
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="max-h-96 overflow-y-auto animate-scale-in">
                        {globalStats.history.length > 0 ? (
                           [...globalStats.history].reverse().map(item => (
                               <HistoryItem key={item.id} item={item} />
                           ))
                        ) : (
                            <p className="text-center text-slate-500 py-8">No history yet.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RewardsScreen;
