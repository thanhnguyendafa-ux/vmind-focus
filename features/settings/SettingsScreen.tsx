import React, { useState, useEffect } from 'react';
import Icon from '../../components/ui/Icon';
import { useUserStore } from '../../stores/useUserStore';
import { useUIStore } from '../../stores/useUIStore';
import { AppSettings } from '../../types';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import ImportModal from '../tables/components/ImportModal';
import ExportModal from '../tables/components/ExportModal';


const SettingsScreen: React.FC = () => {
  const { handleLogout, isGuest, settings, setSettings } = useUserStore();
  const { toggleTheme, theme } = useUIStore();

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings({ ...settings, ...newSettings });
  };

  return (
    <div className="p-4 sm:p-6 mx-auto animate-fadeIn">
      <h1 className="text-2xl font-bold text-text-main dark:text-white mb-6">Settings</h1>
      
      <div className="space-y-6">
        <Card>
            <CardHeader className="p-4">
                <CardTitle className="text-lg">Account</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                {isGuest ? (
                    <p className="text-sm text-text-subtle">You are currently using Vmind as a guest. Sign up to sync your data across devices.</p>
                ) : (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-text-subtle">You are logged in.</p>
                        <Button variant="destructive" size="md" onClick={handleLogout}>
                            Log Out
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="p-4">
                <CardTitle className="text-lg">Appearance</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-text-subtle">Theme</p>
                    <button onClick={toggleTheme} className="flex items-center gap-2 bg-secondary-200 dark:bg-secondary-700 px-3 py-1.5 rounded-full font-semibold text-sm">
                        <Icon name={theme === 'dark' ? 'moon' : 'sun'} className="w-5 h-5" />
                        <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
                    </button>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="p-4">
                <CardTitle className="text-lg">Journaling</CardTitle>
                <CardDescription>Choose how items are added to your study journal.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-text-subtle">Journal Logging Mode</p>
                    <div className="flex rounded-full bg-secondary-200 dark:bg-secondary-700 p-1 text-sm font-semibold">
                        <button
                            onClick={() => handleUpdateSettings({ journalMode: 'manual' })}
                            className={`px-3 py-1 rounded-full ${settings.journalMode === 'manual' ? 'bg-white dark:bg-secondary-600 shadow' : ''}`}
                        >
                            Manual
                        </button>
                        <button
                            onClick={() => handleUpdateSettings({ journalMode: 'automatic' })}
                            className={`px-3 py-1 rounded-full ${settings.journalMode === 'automatic' ? 'bg-white dark:bg-secondary-600 shadow' : ''}`}
                        >
                            Automatic
                        </button>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="p-4">
                <CardTitle className="text-lg">Data Management</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => setIsImportModalOpen(true)}>
                        <Icon name="arrow-down-tray" className="w-4 h-4 mr-2"/>
                        Import
                    </Button>
                    <Button variant="secondary" onClick={() => setIsExportModalOpen(true)}>
                        <Icon name="arrow-up-tray" className="w-4 h-4 mr-2"/>
                        Export
                    </Button>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="p-4">
                <CardTitle className="text-lg">Keyboard Shortcuts</CardTitle>
                <CardDescription>Define shortcuts for quick actions. Use modifiers like Ctrl, Cmd, Alt, Shift.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="flex items-center justify-between">
                    <label htmlFor="search-shortcut" className="text-sm text-text-subtle">Open Search</label>
                    <Input
                      id="search-shortcut"
                      type="text"
                      value={settings.searchShortcut || 'Ctrl+K'}
                      onChange={(e) => handleUpdateSettings({ searchShortcut: e.target.value })}
                      className="w-32"
                      placeholder="e.g., Ctrl+K"
                    />
                </div>
            </CardContent>
        </Card>
      </div>
      
      <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
      <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
    </div>
  );
};

export default SettingsScreen;