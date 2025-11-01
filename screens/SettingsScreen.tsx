import React, { useRef, useState, useEffect } from 'react';
import { UserIcon, UploadIcon, SaveIcon, FolderOpenIcon, SparklesIcon, MailIcon, LockClosedIcon, EyeIcon, EyeOffIcon, SpinnerIcon, AudioWaveIcon, JournalIcon, MusicNoteIcon, PlayIcon, CheckCircleIcon, XCircleIcon, CloseIcon } from '../components/Icons';
import { AppSettings, BackgroundMusicLink } from '../types';
import { Screen } from '../App';
import { supabase } from '../utils/supabase';
import { User } from '@supabase/supabase-js';

interface SettingsScreenProps {
  user: User | null;
  profilePicture: string | null;
  setProfilePicture: (pic: string | null) => void;
  appSettings: AppSettings;
  setAppSettings: (settings: AppSettings) => void;
  setActiveScreen: (screen: Screen) => void;
  onSaveBackup: () => void;
  onLoadBackup: () => void;
  onSubScreenChange: (subScreen: string | null) => void;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const Card: React.FC<{ title: string; children: React.ReactNode; icon?: React.ReactNode }> = ({ title, children, icon }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
    <h2 className="text-2xl font-bold text-slate-800 border-b pb-4 mb-6 flex items-center gap-3">
        {icon} {title}
    </h2>
    {children}
  </div>
);

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; }> = ({ checked, onChange }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-cyan-600' : 'bg-slate-300'}`}
    >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
);

const PasswordInput: React.FC<{ value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string }> = ({ value, onChange, placeholder = "••••••••" }) => {
    const [showPassword, setShowPassword] = useState(false);
    return (
        <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <LockClosedIcon className="h-5 w-5 text-slate-400" />
            </span>
            <input
                type={showPassword ? "text" : "password"}
                value={value}
                onChange={onChange}
                className="w-full pl-10 pr-10 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder={placeholder}
                required
            />
            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
            >
                {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
        </div>
    );
};


const SettingsScreen: React.FC<SettingsScreenProps> = ({ user, profilePicture, setProfilePicture, appSettings, setAppSettings, setActiveScreen, onSaveBackup, onLoadBackup, onSubScreenChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOnline = !!user;

  // Auth form state
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  // API Key state
  const [apiKeyInput, setApiKeyInput] = useState(appSettings.userApiKey || '');

  // Music state
  const [musicLinks, setMusicLinks] = useState<BackgroundMusicLink[]>(
    [...(appSettings.backgroundMusicLinks || [])]
      .concat(Array.from({ length: 6 }, () => ({ title: '', url: '' })))
      .slice(0, 6)
  );
  const [testStatus, setTestStatus] = useState<Record<number, 'idle' | 'testing' | 'success' | 'error'>>({});
  const testAudioRef = useRef<HTMLAudioElement>(null);
  const testTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    onSubScreenChange(null); // This screen doesn't have complex sub-views
    return () => onSubScreenChange(null);
  }, [onSubScreenChange]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert("File is too large. Please select an image under 2MB.");
        return;
      }
      const base64 = await fileToBase64(file);
      setProfilePicture(base64);
    }
  };

  const handleUploadClick = () => { fileInputRef.current?.click(); };
  const handleRemoveClick = () => { setProfilePicture(null); };
  
  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (authMode === 'signUp') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setMessage('Success! Please check your email for the confirmation link to complete your registration.');
      }
    } else { // signIn
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      }
      // On success, the onAuthStateChange listener in App.tsx will handle the rest.
    }
    setLoading(false);
  };

  const handleLogout = () => {
    supabase.auth.signOut();
  };

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    setAppSettings({ ...appSettings, [key]: value });
  };
  
  const handleSaveApiKey = () => {
    handleSettingChange('userApiKey', apiKeyInput.trim());
    alert('API Key saved!');
  };
  
  const handleRemoveApiKey = () => {
      setApiKeyInput('');
      handleSettingChange('userApiKey', null);
  };

  const handleLinkChange = (index: number, field: 'title' | 'url', value: string) => {
    const newLinks = [...musicLinks];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setMusicLinks(newLinks);
  };

  const handleSaveLinks = () => {
    const nonEmptyLinks = musicLinks.filter(link => link.url.trim() !== '');
    handleSettingChange('backgroundMusicLinks', nonEmptyLinks);
    alert('Custom music links saved!');
  };

  const handleTestLink = (index: number) => {
    const url = musicLinks[index].url;
    if (!url.trim()) return;

    if (testTimeoutRef.current) {
      clearTimeout(testTimeoutRef.current);
    }

    setTestStatus(prev => ({ ...prev, [index]: 'testing' }));

    const audio = testAudioRef.current;
    if (!audio) {
      setTestStatus(prev => ({ ...prev, [index]: 'error' }));
      return;
    }

    const cleanup = () => {
      audio.removeEventListener('error', errorHandler);
      audio.removeEventListener('canplaythrough', canPlayHandler);
      audio.src = '';
    };
    
    const errorHandler = () => {
      setTestStatus(prev => ({ ...prev, [index]: 'error' }));
      testTimeoutRef.current = window.setTimeout(() => setTestStatus(prev => ({ ...prev, [index]: 'idle' })), 3000);
      cleanup();
    };
    
    const canPlayHandler = () => {
      setTestStatus(prev => ({ ...prev, [index]: 'success' }));
      audio.play();
      testTimeoutRef.current = window.setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
        setTestStatus(prev => ({ ...prev, [index]: 'idle' }));
      }, 2000); // Play for 2 seconds
      cleanup();
    };
    
    audio.addEventListener('error', errorHandler);
    audio.addEventListener('canplaythrough', canPlayHandler);

    audio.src = url;
    audio.load();
  };


  return (
    <div>
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Settings</h1>
        <p className="mt-2 text-lg text-slate-500">Configure your profile and app settings.</p>
      </header>
      
      <div className="space-y-8">
        <Card title="Account">
          {isOnline ? (
            <div>
              <div className="flex items-center gap-6 mb-4">
                <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden ring-4 ring-slate-100">
                  {profilePicture ? (
                    <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                  ) : user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-16 h-16 text-slate-400" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-xl text-slate-800">{user.user_metadata?.full_name || user.email}</p>
                  <p className="text-slate-500">{user.email}</p>
                   <p className="text-xs text-teal-600 font-semibold mt-1">Online - Synced with Supabase</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-center border-t pt-4">
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/gif, image/webp"/>
                  <button onClick={handleUploadClick} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm flex items-center gap-2">
                      <UploadIcon /> Change Picture
                  </button>
                  {profilePicture && (
                      <button onClick={handleRemoveClick} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-2 px-4 rounded-lg">
                          Remove
                      </button>
                  )}
                  <div className="flex-grow"></div>
                  <button onClick={handleLogout} className="bg-red-50 text-red-700 hover:bg-red-100 font-bold py-2 px-4 rounded-lg">Sign Out</button>
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto">
                <div className="flex border-b border-slate-200 mb-6">
                    <button onClick={() => setAuthMode('signIn')} className={`flex-1 py-2 text-center font-semibold transition-colors ${authMode === 'signIn' ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-slate-500 hover:text-slate-800'}`}>Sign In</button>
                    <button onClick={() => setAuthMode('signUp')} className={`flex-1 py-2 text-center font-semibold transition-colors ${authMode === 'signUp' ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-slate-500 hover:text-slate-800'}`}>Sign Up</button>
                </div>

                <form onSubmit={handleAuthAction} className="space-y-4">
                    <div>
                        <label className="text-sm font-semibold text-slate-600" htmlFor="email">Email</label>
                        <div className="relative mt-1">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <MailIcon className="h-5 w-5 text-slate-400" />
                            </span>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-600" htmlFor="password">Password</label>
                        <div className="mt-1">
                           <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>
                    </div>

                    {error && <p className="text-sm text-center text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}
                    {message && <p className="text-sm text-center text-teal-700 bg-teal-50 p-3 rounded-md">{message}</p>}

                    <button type="submit" disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg shadow-md disabled:bg-slate-400 disabled:cursor-wait flex items-center justify-center">
                        {loading ? <SpinnerIcon className="w-6 h-6 animate-spin-fast" /> : (authMode === 'signIn' ? 'Sign In' : 'Sign Up')}
                    </button>
                </form>
            </div>
          )}
        </Card>
        
        <Card title="Gemini API Key" icon={<SparklesIcon className="w-6 h-6 text-cyan-500" />}>
            <p className="text-sm text-slate-500 mb-4">
                To use AI features like the Chatbot, you need to provide your own Gemini API key. You can get a free key from Google AI Studio.
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-cyan-600 font-semibold hover:underline ml-1">Get an API Key</a>
            </p>
            <div className="flex items-center gap-2">
                <PasswordInput value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} placeholder="Enter your Gemini API key" />
            </div>
            <div className="flex flex-wrap justify-between items-center mt-4 gap-4">
                <p className={`text-sm font-semibold ${appSettings.userApiKey ? 'text-teal-600' : 'text-amber-600'}`}>
                    {appSettings.userApiKey ? 'Status: API Key is set' : 'Status: API Key not set'}
                </p>
                <div className="flex gap-2">
                    {appSettings.userApiKey && <button onClick={handleRemoveApiKey} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg">Remove Key</button>}
                    <button onClick={handleSaveApiKey} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg">Save Key</button>
                </div>
            </div>
        </Card>

        <Card title="Background Music" icon={<MusicNoteIcon className="w-6 h-6 text-cyan-500" />}>
            <audio ref={testAudioRef} className="hidden" />
            <p className="text-sm text-slate-500 mb-4">Select a background track for your sessions. Click an item to make it active.</p>
            <div className="space-y-3">
                {/* Off Option */}
                <div
                    onClick={() => handleSettingChange('backgroundMusic', 'off')}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                        appSettings.backgroundMusic === 'off' ? 'bg-cyan-50 border-cyan-500' : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                >
                    <h4 className="font-bold text-slate-800">Off</h4>
                    {appSettings.backgroundMusic === 'off' && <CheckCircleIcon className="w-6 h-6 text-cyan-600" />}
                </div>

                {/* Custom Links */}
                {(appSettings.backgroundMusicLinks || []).map((link, index) => {
                    if (!link.url.trim()) return null;
                    const isActive = appSettings.backgroundMusic === link.url;
                    const displayText = link.title.trim() || link.url;
                    return (
                        <div
                            key={`select-${index}`}
                            onClick={() => handleSettingChange('backgroundMusic', link.url.trim())}
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                                isActive ? 'bg-cyan-50 border-cyan-500' : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <h4 className="font-bold text-slate-800 truncate">{displayText}</h4>
                            {isActive && <CheckCircleIcon className="w-6 h-6 text-cyan-600" />}
                        </div>
                    );
                })}
            </div>
            <div className="mt-6 pt-6 border-t space-y-3">
                <h3 className="font-bold text-slate-800">Edit Custom Links</h3>
                {musicLinks.map((link, index) => (
                    <div key={index} className="p-2 rounded-lg bg-slate-50">
                        <div className="flex-grow flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-500">{index + 1}.</span>
                            <div className="flex-grow grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <input
                                    type="text"
                                    value={link.title}
                                    onChange={(e) => handleLinkChange(index, 'title', e.target.value)}
                                    placeholder="Title (e.g., Relaxing Rain)"
                                    className="w-full px-3 py-1.5 text-slate-700 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 sm:col-span-1"
                                />
                                <div className="relative sm:col-span-2">
                                    <input
                                        type="text"
                                        value={link.url}
                                        onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                                        placeholder="https://.../music.mp3"
                                        className="w-full pl-3 pr-20 py-1.5 text-slate-700 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleTestLink(index); }}
                                            disabled={!link.url.trim() || testStatus[index] === 'testing'}
                                            className="p-1.5 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 disabled:opacity-50"
                                            aria-label="Test link"
                                        >
                                            {testStatus[index] === 'testing' && <SpinnerIcon className="w-4 h-4 animate-spin-fast" />}
                                            {testStatus[index] === 'success' && <CheckCircleIcon className="w-4 h-4 text-green-500" />}
                                            {testStatus[index] === 'error' && <XCircleIcon className="w-4 h-4 text-red-500" />}
                                            {(!testStatus[index] || testStatus[index] === 'idle') && <PlayIcon className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleLinkChange(index, 'url', ''); handleLinkChange(index, 'title', ''); }}
                                            className="p-1.5 rounded-full text-slate-400 hover:bg-slate-200 hover:text-red-500"
                                            aria-label="Clear link"
                                        >
                                            <XCircleIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                <button onClick={handleSaveLinks} className="mt-4 w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2">
                    <SaveIcon /> Save Custom Links
                </button>
            </div>
        </Card>
        
        <Card title="Journal Settings" icon={<JournalIcon className="w-6 h-6 text-cyan-500" />}>
          <div>
            <label className="text-lg font-semibold text-slate-700">Journal Logging Mode</label>
            <p className="text-sm text-slate-500 mb-4">Choose how vocabulary cards are added to your journal.</p>
            <div className="space-y-3">
              <div onClick={() => handleSettingChange('journalLoggingMode', 'manual')} className={`p-4 border rounded-lg cursor-pointer transition-all ${appSettings.journalLoggingMode === 'manual' ? 'bg-cyan-50 border-cyan-500' : 'hover:border-slate-300'}`}>
                  <h4 className="font-bold text-slate-800">Manual (Default)</h4>
                  <p className="text-sm text-slate-600">Only log cards you explicitly save. This keeps your journal focused and saves space.</p>
              </div>
              <div onClick={() => handleSettingChange('journalLoggingMode', 'automatic')} className={`p-4 border rounded-lg cursor-pointer transition-all ${appSettings.journalLoggingMode === 'automatic' ? 'bg-cyan-50 border-cyan-500' : 'hover:border-slate-300'}`}>
                  <h4 className="font-bold text-slate-800">Automatic</h4>
                  <p className="text-sm text-slate-600">Automatically log every card you encounter in a study session for a complete history.</p>
              </div>
            </div>
          </div>
        </Card>
        
        <Card title="Audio Settings" icon={<AudioWaveIcon className="w-6 h-6 text-cyan-500"/>}>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-700">Auto-play audio in sessions</h3>
                        <p className="text-sm text-slate-500">Automatically play pronunciation when a card appears.</p>
                    </div>
                    <ToggleSwitch checked={appSettings.audioAutoPlay ?? true} onChange={(checked) => handleSettingChange('audioAutoPlay', checked)} />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Repetitions</h3>
                    <p className="text-sm text-slate-500 mb-3">How many times to repeat audio when played.</p>
                    <div className="flex gap-2">
                        {[1, 2, 3].map(val => (
                            <button key={val} onClick={() => handleSettingChange('audioRepeat', val)} className={`px-4 py-2 rounded-md font-semibold text-sm ${appSettings.audioRepeat === val ? 'bg-cyan-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>{val}x</button>
                        ))}
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Playback Speed</h3>
                    <p className="text-sm text-slate-500 mb-3">Adjust the speed of audio playback.</p>
                    <div className="flex gap-2">
                        {[0.75, 1.0, 1.25, 1.5].map(val => (
                            <button key={val} onClick={() => handleSettingChange('audioPlaybackRate', val)} className={`px-4 py-2 rounded-md font-semibold text-sm ${appSettings.audioPlaybackRate === val ? 'bg-cyan-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>{val}x</button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-200">
                <h3 className="text-lg font-semibold text-slate-700">Text-to-Speech Source</h3>
                <p className="text-sm text-slate-500 mt-2 mb-4">
                    To enable text-to-speech, you must specify a source column (e.g., 'Word') and language for each table. This is configured in the 'Settings' tab of each individual table.
                </p>
                <button 
                    onClick={() => setActiveScreen('Tables')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 px-4 rounded-lg"
                >
                  Go to Table Settings
                </button>
            </div>
        </Card>

        <Card title="Data & Sync">
            <div className="space-y-6">
                <div className="pt-4">
                    <h3 className="text-lg font-semibold text-slate-700">Manual Full Backup</h3>
                    <p className="text-sm text-slate-500 mb-2">Save your entire app state to a single file, or load from one. This is useful for transferring data between accounts.</p>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={onSaveBackup} className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg flex items-center gap-2">
                            <SaveIcon /> Save Full Backup (JSON)
                        </button>
                        <button onClick={onLoadBackup} className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg flex items-center gap-2">
                            <FolderOpenIcon /> Load Full Backup (JSON)
                        </button>
                    </div>
                </div>

                 <div className="pt-4 border-t">
                    <h3 className="text-lg font-semibold text-slate-700">Table Import / Export</h3>
                    <p className="text-sm text-slate-500 mb-2">Manually export specific tables to JSON/CSV or import from a file.</p>
                    <button onClick={() => setActiveScreen('Tables')} className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 px-4 rounded-lg">
                      Go to Table Import/Export
                    </button>
                </div>
            </div>
        </Card>

        <Card title="Gamification">
          <div>
            <label className="text-lg font-semibold text-slate-700">Quit Session Penalty</label>
            <p className="text-sm text-slate-500 mb-4">Choose what happens when you abandon a study session.</p>
            <div className="space-y-3">
              <div onClick={() => handleSettingChange('quitPenalty', 'none')} className={`p-4 border rounded-lg cursor-pointer transition-all ${appSettings.quitPenalty === 'none' ? 'bg-cyan-50 border-cyan-500' : 'hover:border-slate-300'}`}>
                  <h4 className="font-bold text-slate-800">None</h4>
                  <p className="text-sm text-slate-600">No penalty other than the standard XP loss.</p>
              </div>
              <div onClick={() => handleSettingChange('quitPenalty', 'lose_badge')} className={`p-4 border rounded-lg cursor-pointer transition-all ${appSettings.quitPenalty === 'lose_badge' ? 'bg-cyan-50 border-cyan-500' : 'hover:border-slate-300'}`}>
                  <h4 className="font-bold text-slate-800">Lose Latest Badge</h4>
                  <p className="text-sm text-slate-600">Your most recently earned badge will be removed.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SettingsScreen;