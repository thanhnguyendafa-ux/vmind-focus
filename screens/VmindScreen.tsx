import React from 'react';
import { Screen } from '../App';
import { StudyIcon, FlashcardIcon, BookOpenIcon, JournalIcon, TheaterModeIcon, ScrambleIcon, DictationIcon } from '../components/Icons';

interface VmindScreenProps {
  setActiveScreen: (screen: Screen) => void;
}

const FeatureCard: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  iconBgClass: string;
}> = ({ title, description, icon, onClick, iconBgClass }) => (
  <button
    onClick={onClick}
    className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-left transition-all duration-300 hover:shadow-lg hover:border-cyan-400 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
  >
    <div className="flex items-start gap-4">
      <div className={`${iconBgClass} p-3 rounded-lg flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  </button>
);


const VmindScreen: React.FC<VmindScreenProps> = ({ setActiveScreen }) => {
  const features = [
    {
      screen: 'Study' as Screen,
      title: 'Study Session',
      description: 'Configure and start focused study sessions.',
      icon: <StudyIcon />,
      iconBgClass: 'bg-green-100',
    },
    {
      screen: 'FlashCards' as Screen,
      title: 'Flashcards',
      description: 'Quickly review your vocabulary with interactive cards.',
      icon: <FlashcardIcon />,
      iconBgClass: 'bg-purple-100',
    },
    {
      screen: 'ScrambleSetup' as Screen,
      title: 'Sentence Scramble',
      description: 'Unscramble sentences to practice structure and context.',
      icon: <ScrambleIcon />,
      iconBgClass: 'bg-yellow-100',
    },
    {
      screen: 'Dictation' as Screen,
      title: 'Dictation',
      description: 'Practice listening and spelling with YouTube videos.',
      icon: <DictationIcon />,
      iconBgClass: 'bg-blue-100',
    },
    {
      screen: 'TheaterSetup' as Screen,
      title: 'Theater Mode',
      description: 'A passive, movie-like way to absorb your vocabulary.',
      icon: <TheaterModeIcon />,
      iconBgClass: 'bg-indigo-100',
    },
    {
      screen: 'Reading' as Screen,
      title: 'Reading Space',
      description: 'Read, take notes, and add vocabulary from texts.',
      icon: <BookOpenIcon />,
      iconBgClass: 'bg-blue-100',
    },
    {
      screen: 'Journal' as Screen,
      title: 'Journal',
      description: 'Review learned words and personal notes.',
      icon: <JournalIcon />,
      iconBgClass: 'bg-orange-100',
    },
  ];

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Vmind Learning Center</h1>
        <p className="mt-2 text-lg text-slate-500">Your hub for all learning activities.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature) => (
          <FeatureCard
            key={feature.screen}
            title={feature.title}
            description={feature.description}
            icon={feature.icon}
            onClick={() => setActiveScreen(feature.screen)}
            iconBgClass={feature.iconBgClass}
          />
        ))}
      </div>
    </div>
  );
};

export default VmindScreen;