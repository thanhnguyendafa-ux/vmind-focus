import React from 'react';
import { Screen } from '../../types';
import Icon from '../ui/Icon';
import VmindIcon from '../ui/VmindIcon';
import TableIcon from '../ui/TableIcon';
import HomeIcon from '../ui/HomeIcon';
import SearchIcon from '../ui/SearchIcon';
import RewardsIcon from '../ui/RewardsIcon';
import { useUIStore } from '../../stores/useUIStore';
import { playNavigateSound } from '../../services/soundService';

interface NavItemProps {
  screen: Screen;
  label: string;
  icon: string;
}

const NavItem: React.FC<NavItemProps> = ({ screen, label, icon }) => {
  const { currentScreen, setCurrentScreen } = useUIStore();
  const isActive = currentScreen === screen;
  
  const handleClick = () => {
    if (!isActive) {
        playNavigateSound();
    }
    setCurrentScreen(screen);
  };

  return (
    <button
      onClick={handleClick}
      className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${
        isActive ? 'text-primary-500' : 'text-text-subtle hover:text-primary-500'
      }`}
    >
      <Icon name={icon} className="w-6 h-6" />
      <span className="text-xs mt-1">{label}</span>
    </button>
  );
};

const BottomNavBar: React.FC = () => {
  const { currentScreen, setCurrentScreen, setIsSearchOpen } = useUIStore();
  
  const navItems = [
    // Home is now a special case
    // Tables is now a special case
    // Search is now a special case
    // Vmind is now a special case
    // Rewards is now a special case
    { screen: Screen.Settings, label: 'Settings', icon: 'sliders' },
  ];

  // Logic for the custom Home button
  const isHomeActive = currentScreen === Screen.Home;
  const handleHomeClick = () => {
    if (!isHomeActive) {
      playNavigateSound();
    }
    setCurrentScreen(Screen.Home);
  };

  // Logic for the custom Vmind button
  const isVmindActive = currentScreen === Screen.Vmind;
  const handleVmindClick = () => {
    if (!isVmindActive) {
      playNavigateSound();
    }
    setCurrentScreen(Screen.Vmind);
  };
  
  // Logic for the custom Tables button
  const isTablesActive = currentScreen === Screen.Tables;
  const handleTablesClick = () => {
      if(!isTablesActive) {
          playNavigateSound();
      }
      setCurrentScreen(Screen.Tables);
  }

  // Logic for the custom Rewards button
  const isRewardsActive = currentScreen === Screen.Rewards;
  const handleRewardsClick = () => {
      if(!isRewardsActive) {
          playNavigateSound();
      }
      setCurrentScreen(Screen.Rewards);
  }


  return (
    <footer className="fixed bottom-0 left-0 right-0 h-16 bg-secondary-100 dark:bg-secondary-800 border-t border-secondary-200 dark:border-secondary-700 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.2)] z-30">
      <nav className="flex justify-around h-full">
        {/* Custom Home Button */}
        <button
          onClick={handleHomeClick}
          className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${
            isHomeActive ? 'text-primary-500' : 'text-text-subtle hover:text-primary-500'
          }`}
        >
          <HomeIcon className="w-6 h-6" />
          <span className="text-xs mt-1">Home</span>
        </button>
        
        {/* Custom Tables Button */}
        <button
          onClick={handleTablesClick}
          className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${
            isTablesActive ? 'text-primary-500' : 'text-text-subtle hover:text-primary-500'
          }`}
        >
          <TableIcon className={`w-6 h-6 ${isTablesActive ? 'text-primary-500' : 'text-current'}`} />
          <span className="text-xs mt-1">Tables</span>
        </button>

        <button
          onClick={() => {
            playNavigateSound();
            setIsSearchOpen(true);
          }}
          className="flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 text-text-subtle hover:text-primary-500"
          aria-label="Search"
        >
          <SearchIcon className="w-6 h-6" />
          <span className="text-xs mt-1">Search</span>
        </button>

        {/* Custom Vmind Button */}
        <button
          onClick={handleVmindClick}
          className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${
            isVmindActive ? 'text-primary-500' : 'text-text-subtle hover:text-primary-500'
          }`}
        >
          <VmindIcon className="w-6 h-6" />
          <span className="text-xs mt-1">Vmind</span>
        </button>
        
        {/* Custom Rewards Button */}
        <button
          onClick={handleRewardsClick}
          className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${
            isRewardsActive ? 'text-primary-500' : 'text-text-subtle hover:text-primary-500'
          }`}
        >
          <RewardsIcon className="w-6 h-6" />
          <span className="text-xs mt-1">Rewards</span>
        </button>

        {navItems.map(item => <NavItem key={item.screen} {...item} />)}
      </nav>
    </footer>
  );
};

export default BottomNavBar;