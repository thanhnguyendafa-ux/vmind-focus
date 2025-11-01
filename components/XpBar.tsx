import React, { useState, useEffect, useRef } from 'react';
import { GlobalStats } from '../types';

interface XpBarProps {
  globalStats: GlobalStats;
  variant?: 'full' | 'compact';
}

const XpBar: React.FC<XpBarProps> = ({ globalStats, variant = 'full' }) => {
  const { xp, inQueueReal, quitQueueReal } = globalStats;
  
  const prevXpRef = useRef(xp);
  const [xpChangeInfo, setXpChangeInfo] = useState<{ value: number; key: number } | null>(null);
  const [flash, setFlash] = useState<'gain' | 'loss' | null>(null);

  useEffect(() => {
    // Check if the xp value has changed since the last render.
    if (prevXpRef.current !== xp) {
      const change = xp - prevXpRef.current;
      prevXpRef.current = xp;

      if (change !== 0) {
        // For the floating text, use a key to force a re-mount, which restarts the animation.
        setXpChangeInfo({ value: change, key: Date.now() });
        const hideTextTimer = setTimeout(() => setXpChangeInfo(null), 1500);

        // For the bar flash, toggle the state to re-trigger the CSS animation class.
        setFlash(null);
        const flashTimer = setTimeout(() => {
          setFlash(change > 0 ? 'gain' : 'loss');
        }, 10);
        
        return () => {
          clearTimeout(hideTextTimer);
          clearTimeout(flashTimer);
        };
      }
    }
  }, [xp]);

  const level = Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
  const xpForCurrentLevel = Math.pow(level - 1, 2) * 100;
  const xpForNextLevel = Math.pow(level, 2) * 100;
  const xpInCurrentLevel = xp - xpForCurrentLevel;
  const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;
  const progressPercentage = xpNeededForLevel > 0 ? (xpInCurrentLevel / xpNeededForLevel) * 100 : 100;

  const flashClass = flash === 'gain' ? 'animate-bar-flash-green' : flash === 'loss' ? 'animate-bar-flash-red' : '';

  const barItself = (
    <div className={`w-full bg-slate-200 rounded-full h-${variant === 'compact' ? '2.5' : '4'} overflow-hidden shadow-inner ${flashClass}`}>
      <div
        className="bg-teal-700 h-full rounded-full transition-all duration-500"
        style={{ width: `${progressPercentage}%` }}
      ></div>
    </div>
  );

  if (variant === 'compact') {
    return (
      <div className="relative">
        {xpChangeInfo !== null && (
          <div 
            key={xpChangeInfo.key}
            className={`absolute -top-6 right-1/2 translate-x-1/2 whitespace-nowrap text-lg font-extrabold animate-fade-out-up ${
              xpChangeInfo.value > 0 ? 'text-teal-500' : 'text-red-500'
            }`}
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
          >
            {xpChangeInfo.value > 0 ? '+' : ''}{xpChangeInfo.value} XP
          </div>
        )}
        <div className="flex items-center gap-2 w-full">
            <span className="font-bold text-teal-700 text-sm whitespace-nowrap">Lvl {level}</span>
            {barItself}
            <span className="text-xs font-medium text-slate-600 whitespace-nowrap">{xp.toLocaleString()} XP</span>
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <div className="relative bg-white p-5 rounded-xl shadow-lg border border-slate-200">
      {xpChangeInfo !== null && (
        <div 
          key={xpChangeInfo.key}
          className={`absolute top-0 right-8 text-2xl font-extrabold animate-fade-out-up ${
            xpChangeInfo.value > 0 ? 'text-teal-500' : 'text-red-500'
          }`}
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
        >
          {xpChangeInfo.value > 0 ? '+' : ''}{xpChangeInfo.value} XP
        </div>
      )}
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-teal-700 text-lg">Level {level}</span>
        <span className="text-sm font-semibold text-slate-500 hidden sm:block">Next Level: {xpForNextLevel.toLocaleString()} XP</span>
      </div>
      {barItself}
      <div className="text-right mt-1 text-sm font-medium text-slate-600">
        {xp.toLocaleString()} XP
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-4">
        <div className="text-center">
            <p className="text-xl font-bold text-teal-600">{inQueueReal}</p>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Sessions Done</p>
        </div>
        <div className="text-center">
            <p className="text-xl font-bold text-red-600">{quitQueueReal}</p>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Sessions Quit</p>
        </div>
      </div>
    </div>
  );
};

export default XpBar;