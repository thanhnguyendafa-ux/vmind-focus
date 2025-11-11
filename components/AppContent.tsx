import * as React from 'react';
import { Screen } from '../types';
import { useUIStore } from '../stores/useUIStore';
import { useUserStore } from '../stores/useUserStore';
import { useTableStore } from '../stores/useTableStore';
import { useSessionStore } from '../stores/useSessionStore';

import Icon from './ui/Icon';
import BottomNavBar from './layout/BottomNavBar';
import Notification from './ui/Notification';
import Toast from './ui/Toast';
import GalleryViewModal from '../features/tables/components/GalleryViewModal';
import DataSyncManager from '../features/data/DataSyncManager';

// Lazy load screens for code splitting and improved initial performance
const AuthScreen = React.lazy(() => import('../features/auth/AuthScreen'));
const HomeScreen = React.lazy(() => import('../features/home/HomeScreen'));
const TablesScreen = React.lazy(() => import('../features/tables/TablesScreen'));
const TableScreen = React.lazy(() => import('../features/tables/TableScreen'));
const LibraryScreen = React.lazy(() => import('../features/library/LibraryScreen'));
const VmindScreen = React.lazy(() => import('../features/vmind/VmindScreen'));
const RewardsScreen = React.lazy(() => import('../features/rewards/RewardsScreen'));
const SettingsScreen = React.lazy(() => import('../features/settings/SettingsScreen'));
const ReadingScreen = React.lazy(() => import('../features/reading/ReadingScreen'));
const JournalScreen = React.lazy(() => import('../features/journal/JournalScreen'));
const StudySetupScreen = React.lazy(() => import('../features/study/StudySetupScreen'));
const StudySessionScreen = React.lazy(() => import('../features/study/StudySessionScreen'));
const FlashcardsScreen = React.lazy(() => import('../features/flashcards/FlashcardsScreen'));
const FlashcardProgressSetupScreen = React.lazy(() => import('../features/flashcards/FlashcardProgressSetupScreen'));
const FlashcardSessionScreen = React.lazy(() => import('../features/flashcards/FlashcardSessionScreen'));
const ScrambleSetupScreen = React.lazy(() => import('../features/scramble/ScrambleSetupScreen'));
const ScrambleSessionScreen = React.lazy(() => import('../features/scramble/ScrambleSessionScreen'));
const TheaterSetupScreen = React.lazy(() => import('../features/theater/TheaterSetupScreen'));
const TheaterSessionScreen = React.lazy(() => import('../features/theater/TheaterSessionScreen'));
const DictationScreen = React.lazy(() => import('../features/dictation/DictationScreen'));
const DictationEditorScreen = React.lazy(() => import('../features/dictation/DictationEditorScreen'));
const DictationSessionScreen = React.lazy(() => import('../features/dictation/DictationSessionScreen'));
const SearchScreen = React.lazy(() => import('../features/search/SearchScreen'));

const LoadingFallback = () => (
    <div className="min-h-screen bg-background dark:bg-secondary-900 flex items-center justify-center">
        <Icon name="spinner" className="w-10 h-10 text-primary-500 animate-spin" />
    </div>
);

export const AppContent: React.FC = () => {
    const {
        currentScreen,
        toast,
        setToast,
        unlockedBadgeNotification,
        setUnlockedBadgeNotification,
        galleryViewData,
        setGalleryViewData,
        theme,
        isSearchOpen,
        setIsSearchOpen,
    } = useUIStore();
    
    const { loading, settings } = useUserStore();
    const { tables } = useTableStore();
    const {
        activeSession,
        activeFlashcardSession,
        activeScrambleSession,
        activeTheaterSession,
        activeDictationSession,
        editingDictationNote,
        activeTableId
    } = useSessionStore();

    const activeTable = React.useMemo(() => tables.find(t => t.id === activeTableId), [tables, activeTableId]);

    React.useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);
    
    // Keyboard shortcut for search
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            // Ignore if user is typing in an input, textarea, or contenteditable element
            if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) {
                return;
            }
            
            const shortcut = settings.searchShortcut || 'Ctrl+K';
            // Simple parser: assumes last part is the key, and modifier is Ctrl/Cmd.
            const key = shortcut.split('+').pop()?.toLowerCase();
            if (!key) return;

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === key) {
                e.preventDefault();
                setIsSearchOpen(true);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [settings.searchShortcut, setIsSearchOpen]);


    if (loading) {
        return <LoadingFallback />;
    }

    const renderContent = () => {
        if (activeDictationSession) return <DictationSessionScreen />;
        if (activeTheaterSession) return <TheaterSessionScreen />;
        if (activeScrambleSession) return <ScrambleSessionScreen />;
        if (activeFlashcardSession) return <FlashcardSessionScreen />;
        if (activeSession) return <StudySessionScreen />;

        switch (currentScreen) {
            case Screen.Auth: return <AuthScreen />;
            case Screen.Home: return <HomeScreen />;
            case Screen.Tables: return <TablesScreen />;
            case Screen.Library: return <LibraryScreen />;
            case Screen.Vmind: return <VmindScreen />;
            case Screen.Rewards: return <RewardsScreen />;
            case Screen.Settings: return <SettingsScreen />;
            case Screen.TableDetail: return activeTable ? <TableScreen table={activeTable} /> : <TablesScreen />;
            case Screen.Flashcards: return <FlashcardsScreen />;
            case Screen.FlashcardProgressSetup: return <FlashcardProgressSetupScreen />;
            case Screen.StudySetup: return <StudySetupScreen />;
            case Screen.ScrambleSetup: return <ScrambleSetupScreen />;
            case Screen.TheaterSetup: return <TheaterSetupScreen />;
            case Screen.Reading: return <ReadingScreen />;
            case Screen.Journal: return <JournalScreen />;
            case Screen.Dictation: return <DictationScreen />;
            case Screen.DictationEditor: return editingDictationNote ? <DictationEditorScreen /> : <DictationScreen />;
            default: return <HomeScreen />;
        }
    };

    const isSessionActive = !!(activeSession || activeFlashcardSession || activeScrambleSession || activeTheaterSession || activeDictationSession);
    const showNavBar = currentScreen !== Screen.Auth && !isSessionActive;

    return (
        <div className="min-h-screen bg-background dark:bg-secondary-900 text-text-main dark:text-secondary-100 transition-colors duration-300">
            <DataSyncManager />
            <main className={showNavBar ? 'pb-20' : ''}>
                <React.Suspense fallback={<LoadingFallback />}>
                    {renderContent()}
                </React.Suspense>
            </main>
            {showNavBar && <BottomNavBar />}
            {isSearchOpen && (
                <React.Suspense fallback={<div />}>
                    <SearchScreen onClose={() => setIsSearchOpen(false)} />
                </React.Suspense>
            )}
            {galleryViewData && (
                <GalleryViewModal
                    table={galleryViewData.table}
                    initialRowId={galleryViewData.initialRowId}
                    onClose={() => setGalleryViewData(null)}
                />
            )}
            {unlockedBadgeNotification && (
                <Notification
                    message={unlockedBadgeNotification.name}
                    icon={unlockedBadgeNotification.icon}
                    onClose={() => setUnlockedBadgeNotification(null)}
                />
            )}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    actionText={toast.actionText}
                    onAction={toast.onAction}
                    onClose={() => setToast(null)}
                    duration={7000}
                />
            )}
        </div>
    );
};