

import React from 'react';
import Icon from '../../components/ui/Icon';
import { useUIStore } from '../../stores/useUIStore';
import { Screen } from '../../types';

const VmindScreen: React.FC = () => {
  const { setCurrentScreen } = useUIStore();

  const learningModes = [
    { name: 'Study Session', icon: 'progress-arrows', colorClasses: { bg: 'bg-primary-100 dark:bg-primary-900/50', text: 'text-primary-600 dark:text-primary-400' }, description: 'Customizable quiz with various question types.', enabled: true, action: () => setCurrentScreen(Screen.StudySetup) },
    { name: 'Reading Space', icon: 'book', colorClasses: { bg: 'bg-info-100 dark:bg-info-900/50', text: 'text-info-600 dark:text-info-400' }, description: 'Extract vocabulary from texts and notes.', enabled: true, action: () => setCurrentScreen(Screen.Reading) },
    { name: 'Flashcards', icon: 'flashcards', colorClasses: { bg: 'bg-warning-100 dark:bg-warning-900/50', text: 'text-warning-600 dark:text-warning-400' }, description: 'Classic review with Spaced Repetition.', enabled: true, action: () => setCurrentScreen(Screen.Flashcards) },
    { name: 'Journal', icon: 'pencil', colorClasses: { bg: 'bg-purple-100 dark:bg-purple-900/50', text: 'text-purple-600 dark:text-purple-400' }, description: 'View your automated study log.', enabled: true, action: () => setCurrentScreen(Screen.Journal) },
    { name: 'Sentence Scramble', icon: 'puzzle-piece', colorClasses: { bg: 'bg-sky-100 dark:bg-sky-900/50', text: 'text-sky-600 dark:text-sky-400' }, description: 'Unscramble sentence fragments to test recall.', enabled: true, action: () => setCurrentScreen(Screen.ScrambleSetup) },
    { name: 'Theater Mode', icon: 'film', colorClasses: { bg: 'bg-secondary-100 dark:bg-secondary-700', text: 'text-secondary-600 dark:text-secondary-400' }, description: 'Passive, auto-playing "movie mode" for review.', enabled: true, action: () => setCurrentScreen(Screen.TheaterSetup) },
    { name: 'Dictation', icon: 'headphones', colorClasses: { bg: 'bg-error-100 dark:bg-error-900/50', text: 'text-error-600 dark:text-error-400' }, description: 'Listen to audio and type what you hear.', enabled: true, action: () => setCurrentScreen(Screen.Dictation) },
  ];

  return (
    <div className="p-4 sm:p-6 mx-auto animate-fadeIn">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-text-main dark:text-secondary-100">Learning Center</h1>
        <p className="text-sm text-text-subtle">Choose your learning mode</p>
      </header>
      
      <main className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {learningModes.map(mode => (
          <div
            key={mode.name}
            onClick={mode.enabled ? mode.action : undefined}
            className={`
              bg-surface dark:bg-secondary-800 shadow-md
              rounded-xl p-4 flex flex-col items-start text-left
              group transition-all
              ${mode.enabled 
                ? 'hover:shadow-xl hover:-translate-y-0.5 cursor-pointer hover:ring-2 hover:ring-primary-500/30' 
                : 'opacity-50 cursor-not-allowed'}
            `}
          >
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center mb-3
              transition-colors
              ${mode.enabled 
                ? `${mode.colorClasses.bg} ${mode.colorClasses.text}` 
                : 'bg-secondary-100 dark:bg-secondary-700 text-text-subtle'}
            `}>
              <Icon name={mode.icon} className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-base text-text-main dark:text-secondary-100 mb-1">{mode.name}</h3>
            <p className="text-xs text-text-subtle flex-grow">{mode.description}</p>
            {!mode.enabled && (
                <span className="text-xs font-semibold text-secondary-400 dark:text-secondary-500 mt-3">Coming Soon</span>
            )}
          </div>
        ))}
      </main>
    </div>
  );
};

export default VmindScreen;