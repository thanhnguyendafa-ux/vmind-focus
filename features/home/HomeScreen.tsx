import * as React from 'react';
import { UserStats } from '../../types';
import Icon from '../../components/ui/Icon';
import { useUserStore } from '../../stores/useUserStore';
import { useTableStore } from '../../stores/useTableStore';
import { useUIStore } from '../../stores/useUIStore';
import { useSessionStore } from '../../stores/useSessionStore';

const XP_PER_LEVEL = 1000;

const SyncStatusIndicator: React.FC = () => {
  const { syncStatus } = useUIStore();
  const statusMap = {
    idle: { text: 'Up to date', icon: 'check-circle', color: 'text-text-subtle' },
    saving: { text: 'Saving...', icon: 'spinner', color: 'text-text-subtle' },
    saved: { text: 'Saved', icon: 'check-circle', color: 'text-success-500' },
    error: { text: 'Sync error', icon: 'error-circle', color: 'text-error-500' },
  };
  const current = statusMap[syncStatus];
  return (
    <div className={`flex items-center gap-2 text-sm ${current.color} transition-colors`}>
      <Icon name={current.icon} className={`w-5 h-5 ${syncStatus === 'saving' ? 'animate-spin' : ''}`} />
      <span>{current.text}</span>
    </div>
  );
};

const ActivityHeatmap: React.FC<{ activity: UserStats['activity'] }> = ({ activity }) => {
  const days = React.useMemo(() => {
    const today = new Date();
    const endDate = new Date(today);
    const startDate = new Date(today);
    startDate.setFullYear(startDate.getFullYear() - 1);
    startDate.setDate(startDate.getDate() + 1);
    
    const dayArray = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dayArray.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dayArray;
  }, []);
  
  const firstDayOfWeek = days[0]?.getDay() || 0;
  
  const getColor = (count: number | undefined) => {
    if (!count || count === 0) return 'bg-secondary-200 dark:bg-secondary-700/60';
    if (count < 300) return 'bg-primary-200 dark:bg-primary-900';
    if (count < 900) return 'bg-primary-300 dark:bg-primary-700';
    if (count < 1800) return 'bg-primary-400 dark:bg-primary-500';
    return 'bg-primary-500 dark:bg-primary-400';
  };

  return (
    <div className="bg-surface dark:bg-secondary-800 rounded-xl p-4 sm:p-5 mb-6 shadow-lg">
      <h2 className="text-base font-semibold text-primary-600 dark:text-primary-400 mb-3">Activity Heatmap</h2>
      <div className="flex justify-end text-xs text-text-subtle gap-1 mb-2 items-center">
        <span>Less</span>
        <div className="w-2.5 h-2.5 rounded-sm bg-secondary-200 dark:bg-secondary-700/60"></div>
        <div className="w-2.5 h-2.5 rounded-sm bg-primary-200 dark:bg-primary-900"></div>
        <div className="w-2.5 h-2.5 rounded-sm bg-primary-300 dark:bg-primary-700"></div>
        <div className="w-2.5 h-2.5 rounded-sm bg-primary-400 dark:bg-primary-500"></div>
        <div className="w-2.5 h-2.5 rounded-sm bg-primary-500 dark:bg-primary-400"></div>
        <span>More</span>
      </div>
      <div className="grid grid-flow-col grid-rows-7 gap-0.5 justify-start">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`pad-${i}`}></div>)}
        {days.map(day => {
          const dateString = day.toISOString().split('T')[0];
          const count = activity[dateString] || 0;
          return (
            <div 
              key={dateString}
              className={`w-2.5 h-2.5 rounded-sm ${getColor(count)}`}
              title={`${dateString}: ${Math.round(count/60)} minutes`}
            ></div>
          );
        })}
      </div>
    </div>
  );
};

const HomeScreen: React.FC = () => {
  const { stats, isGuest, handleLogout } = useUserStore();
  const { tables } = useTableStore();
  const { theme, handleNavigation, toggleTheme } = useUIStore();
  const { handleSelectTable } = useSessionStore();

  const currentLevelXp = stats.xp % XP_PER_LEVEL;
  const progressPercentage = (currentLevelXp / XP_PER_LEVEL) * 100;

  const recentlyStudiedTables = React.useMemo(() => {
    return tables
      .map(table => {
        const lastStudiedTimes = table.rows.map(w => w.stats.lastStudied).filter(Boolean) as number[];
        const mostRecent = Math.max(0, ...lastStudiedTimes);
        return { ...table, mostRecent };
      })
      .filter(table => table.mostRecent > 0)
      .sort((a, b) => b.mostRecent - a.mostRecent)
      .slice(0, 4);
  }, [tables]);

  return (
    <div className="p-4 sm:p-6 mx-auto animate-fadeIn">
      <header className="mb-6 flex justify-between items-center gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-primary-400">Vmind</h1>
          <p className="text-sm text-text-subtle">Your personal vocabulary space.</p>
        </div>
        <div className='flex items-center gap-2'>
            {!isGuest && <SyncStatusIndicator />}
            <button onClick={toggleTheme} className="p-2 rounded-full text-text-subtle hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors">
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="w-6 h-6" />
            </button>
            {!isGuest && (
                 <button onClick={handleLogout} title="Logout" className="p-2 rounded-full text-text-subtle hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors">
                    <Icon name="logout" className="w-6 h-6" />
                </button>
            )}
        </div>
      </header>

      <div className="bg-surface dark:bg-secondary-800 rounded-xl p-4 sm:p-5 shadow-lg mb-6">
          <h2 className="text-base font-semibold text-primary-600 dark:text-primary-400 mb-3">Your Progress</h2>
          <div>
              <div className="flex justify-between items-baseline mb-1">
                  <span className="font-bold text-text-main dark:text-secondary-100">Level {stats.level}</span>
                  <span className="text-xs text-text-subtle">{stats.xp.toLocaleString()} XP Total</span>
              </div>
              <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
                  <div className="bg-primary-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
              </div>
              <p className="text-right text-xs text-text-subtle mt-1">{currentLevelXp} / {XP_PER_LEVEL} XP</p>
          </div>
      </div>
      
      <ActivityHeatmap activity={stats.activity} />

      <div className="mb-6">
        <h2 className="text-xl font-bold mb-3 text-text-main dark:text-secondary-100">Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div 
            onClick={() => handleNavigation('Vmind')}
            className="bg-surface dark:bg-secondary-800 rounded-xl p-4 flex items-center gap-4 shadow-lg hover:shadow-xl hover:ring-2 hover:ring-primary-500/30 hover:-translate-y-0.5 cursor-pointer transition-all group"
            >
                <Icon name="brain" className="w-8 h-8 text-secondary-400 dark:text-secondary-500 group-hover:text-primary-500 transition-colors" />
                <div>
                    <h3 className="font-semibold text-sm sm:text-base text-secondary-700 dark:text-secondary-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">Start Studying</h3>
                    <p className="text-xs text-text-subtle hidden sm:block">Choose a mode</p>
                </div>
            </div>
            <div 
            onClick={() => handleNavigation('Reading')}
            className="bg-surface dark:bg-secondary-800 rounded-xl p-4 flex items-center gap-4 shadow-lg hover:shadow-xl hover:ring-2 hover:ring-primary-500/30 hover:-translate-y-0.5 cursor-pointer transition-all group"
            >
                <Icon name="file-text" className="w-8 h-8 text-secondary-400 dark:text-secondary-500 group-hover:text-primary-500 transition-colors" />
                <div>
                    <h3 className="font-semibold text-sm sm:text-base text-secondary-700 dark:text-secondary-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">Reading Space</h3>
                     <p className="text-xs text-text-subtle hidden sm:block">Extract vocabulary</p>
                </div>
            </div>
        </div>
      </div>
      
      {recentlyStudiedTables.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-3 text-text-main dark:text-secondary-100">Recently Studied</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentlyStudiedTables.map(table => (
              <div key={table.id} onClick={() => handleSelectTable(table.id)} className="bg-surface dark:bg-secondary-800 rounded-xl p-3 flex items-center justify-between shadow-md hover:shadow-lg transition-all group cursor-pointer hover:-translate-y-0.5">
                  <div>
                    <h3 className="font-semibold text-text-main dark:text-secondary-100 mb-0.5 truncate">{table.name}</h3>
                    <p className="text-xs text-text-subtle">{table.rowCount ?? table.rows.length} words</p>
                  </div>
                   <Icon name="arrowRight" className="w-5 h-5 text-secondary-400 dark:text-secondary-500 group-hover:text-primary-500 transition-colors" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;