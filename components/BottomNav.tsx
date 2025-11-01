import React from 'react';
import { Screen } from '../App';
import { HomeIcon, TableIcon, RewardIcon, SettingsIcon, LibraryIcon, VmindIcon } from './Icons';

interface BottomNavProps {
  activeScreen: Screen;
  setActiveScreen: (screen: Screen) => void;
}

const NavItem: React.FC<{
  label: Screen;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center flex-grow h-14 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-600 focus:ring-opacity-50 ${
      isActive
        ? 'bg-teal-700 text-white shadow-lg'
        : 'text-slate-500 hover:bg-teal-50 hover:text-teal-700'
    }`}
    aria-label={`Go to ${label}`}
    aria-current={isActive ? 'page' : undefined}
  >
    {icon}
    <span className="text-xs mt-1 font-semibold">{label}</span>
  </button>
);

const BottomNav: React.FC<BottomNavProps> = ({ activeScreen, setActiveScreen }) => {
  const navItems: { label: Screen; icon: (isActive: boolean) => React.ReactNode }[] = [
    { label: 'Home', icon: () => <HomeIcon /> },
    { label: 'Tables', icon: () => <TableIcon /> },
    { label: 'Library', icon: () => <LibraryIcon /> },
    { label: 'Vmind', icon: (isActive) => <VmindIcon isActive={isActive} /> },
    { label: 'Rewards', icon: () => <RewardIcon /> },
    { label: 'Settings', icon: () => <SettingsIcon /> },
  ];

  const vmindScreens: Screen[] = ['Vmind', 'Study', 'FlashCards', 'Journal', 'Reading', 'TheaterSetup', 'ScrambleSetup', 'Dictation'];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 shadow-[0_-1px_3px_rgba(0,0,0,0.05)] z-40">
      <div className="flex justify-around items-center h-full max-w-5xl mx-auto px-2 gap-1">
        {navItems.map((item) => {
          const isActive = item.label === 'Vmind'
            ? vmindScreens.includes(activeScreen)
            : activeScreen === item.label;
          
          return (
            <NavItem
              key={item.label}
              label={item.label}
              icon={item.icon(isActive)}
              isActive={isActive}
              onClick={() => setActiveScreen(item.label)}
            />
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;