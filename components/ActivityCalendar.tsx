import React, { useMemo, useState, useEffect, useRef } from 'react';
import { HistoryLogItem } from '../types';

// Helper to get all days of the current year with padding for the first week
const getYearCalendarDays = () => {
  const year = new Date().getFullYear();
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  const days = [];

  // Add padding for the first week to align with Sunday being the start of the week in the grid
  const startDayOfWeek = startDate.getDay(); // 0 for Sunday
  for (let i = 0; i < startDayOfWeek; i++) {
    const padDate = new Date(startDate);
    padDate.setDate(padDate.getDate() - (startDayOfWeek - i));
    days.push(padDate);
  }

  // Add all days of the year
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    days.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return days;
};

const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatDurationCompact = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h${remainingMinutes}m`;
};

const ProgressRing: React.FC<{ progress: number }> = ({ progress }) => {
    const size = 32;
    const strokeWidth = 3.5;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - progress * circumference;

    return (
        <svg className="w-8 h-8" viewBox={`0 0 ${size} ${size}`}>
            {/* Background circle - Yellow for unfinished */}
            <circle
                className="text-amber-200"
                strokeWidth={strokeWidth}
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx={size / 2}
                cy={size / 2}
            />
            {/* Progress circle - Green for finished */}
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
                style={{
                    transform: 'rotate(-90deg)',
                    transformOrigin: '50% 50%',
                    transition: 'stroke-dashoffset 0.5s ease-out'
                }}
            />
        </svg>
    );
};

const ActivityCalendar: React.FC<{ history: HistoryLogItem[], todaySeconds: number }> = ({ history, todaySeconds }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [cellSize, setCellSize] = useState({ square: 16, gap: 4 });
    
    const activityMap = useMemo(() => {
        const map: Map<string, number> = new Map();
        history.forEach(item => {
            if ((item.type === 'session_complete' || item.type === 'session_quit') && item.durationSeconds) {
                const itemDate = new Date(item.timestamp);
                const dateStr = formatDate(itemDate);
                map.set(dateStr, (map.get(dateStr) || 0) + item.durationSeconds);
            }
        });
        return map;
    }, [history]);

    const calendarData = useMemo(() => {
        const days = getYearCalendarDays();
        const monthStarts: { label: string, weekIndex: number }[] = [];
        let lastMonth = -1;

        days.forEach((day, index) => {
            const month = day.getMonth();
            if (month !== lastMonth && day.getFullYear() === new Date().getFullYear()) {
                monthStarts.push({
                    label: day.toLocaleString('default', { month: 'short' }),
                    weekIndex: Math.floor(index / 7)
                });
                lastMonth = month;
            }
        });
        return { days, monthStarts };
    }, []);
    
    const numWeeks = Math.ceil(calendarData.days.length / 7);

    useEffect(() => {
        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                const width = entry.contentRect.width;
                if (width > 0) {
                    // Formula: width = (numWeeks + 1) * square + numWeeks * gap
                    // Let gap = square * 0.25
                    // width = (numWeeks + 1) * square + numWeeks * (square * 0.25)
                    // width = square * (numWeeks * 1.25 + 1)
                    const calculatedSquare = width / (numWeeks * 1.25 + 1);
                    const calculatedGap = calculatedSquare * 0.25;

                    setCellSize({
                        square: Math.max(2, calculatedSquare),
                        gap: Math.max(1, calculatedGap)
                    });
                }
            }
        });

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => {
            observer.disconnect();
        };
    }, [numWeeks]);
    
    const getIntensityClass = (seconds: number) => {
        if (seconds <= 0) return 'bg-slate-200/80';
        if (seconds < 300) return 'bg-teal-100';    // < 5m
        if (seconds < 900) return 'bg-teal-300';   // 5m to 15m
        if (seconds < 1800) return 'bg-teal-400';  // 15m to 30m
        if (seconds < 3600) return 'bg-teal-500';  // 30m to 1h
        if (seconds < 7200) return 'bg-teal-600'; // 1h to 2h
        return 'bg-teal-700'; // > 2h
    };
    
    const todayStr = formatDate(new Date());
    const dailyGoalSeconds = 5 * 60;
    const todayProgress = Math.min(todaySeconds / dailyGoalSeconds, 1);
    const isTodayGoalMet = todayProgress >= 1;

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 h-full flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Activity Heatmap</h3>
            <div ref={containerRef} className="flex-grow flex flex-col" style={{ overflow: 'hidden' }}>
                <div style={{ paddingLeft: cellSize.square + cellSize.gap, marginBottom: cellSize.gap }}>
                    <div className="relative h-4">
                        {calendarData.monthStarts.map((month) => (
                            <div
                                key={month.label}
                                className="absolute text-xs text-slate-400 font-semibold"
                                style={{ left: month.weekIndex * (cellSize.square + cellSize.gap) }}
                            >
                                {month.label}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex" style={{ gap: cellSize.gap }}>
                    <div className="flex flex-col text-xs text-slate-400 font-semibold shrink-0" style={{ gap: cellSize.gap }}>
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                             <div key={i} className="text-center" style={{ width: cellSize.square, height: cellSize.square, lineHeight: `${cellSize.square}px` }}>
                                {i % 2 !== 0 ? day : ''}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-flow-col grid-rows-7" style={{ gap: cellSize.gap }}>
                        {calendarData.days.map((day, index) => {
                            const dateStr = formatDate(day);
                            const seconds = activityMap.get(dateStr) || 0;
                            const isToday = dateStr === todayStr;
                            const isCurrentYear = day.getFullYear() === new Date().getFullYear();

                            let ringClass = '';
                            if (isToday) {
                                ringClass = 'ring-2 ring-offset-1 ring-cyan-500';
                            }
                            
                            return (
                                <div
                                    key={index}
                                    style={{ width: cellSize.square, height: cellSize.square }}
                                    className={`rounded-sm ${getIntensityClass(seconds)} ${!isCurrentYear ? 'bg-transparent' : ''} ${ringClass}`}
                                    title={`${dateStr}: ${formatDurationCompact(seconds)}`}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
             <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap justify-between items-center gap-y-2 gap-x-4">
                <div className="flex items-center gap-2">
                    <div className="relative w-8 h-8 flex items-center justify-center">
                        <ProgressRing progress={todayProgress} />
                        <span className="absolute text-xs font-bold text-slate-700">
                            {formatDurationCompact(todaySeconds)}
                        </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                        {isTodayGoalMet ? 'Daily Goal Met!' : `Today's Goal (5m)`}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Less</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-sm bg-slate-200/80" title="No activity"></div>
                        <div className="w-3 h-3 rounded-sm bg-teal-100" title="< 5 min"></div>
                        <div className="w-3 h-3 rounded-sm bg-teal-300" title="Goal Met (5-15 min)"></div>
                        <div className="w-3 h-3 rounded-sm bg-teal-500" title="More activity (~1 hr)"></div>
                        <div className="w-3 h-3 rounded-sm bg-teal-700" title="Lots of activity (>2 hrs)"></div>
                    </div>
                    <span>More</span>
                </div>
            </div>
        </div>
    );
};

export default ActivityCalendar;