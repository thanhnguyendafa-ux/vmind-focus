import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Screen, TranscriptEntry, DictationNote } from '../../types';
import Icon from '../../components/ui/Icon';
import { useSessionStore } from '../../stores/useSessionStore';
import { useUIStore } from '../../stores/useUIStore';
import { extractVideoID, loadYouTubeAPI } from '../../utils/youtubeUtils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { useDictationNoteStore } from '../../stores/useDictationNoteStore';

const DictationEditorScreen: React.FC = () => {
    const { 
        editingDictationNote: partialNote, 
        handleUpdateDictationNote: handleUpdateInSession,
        handleStartDictationSession,
        setEditingDictationNote,
    } = useSessionStore();

    const { dictationNotes } = useDictationNoteStore();
    const editingDictationNote = dictationNotes.find(n => n.id === partialNote?.id);

    const { setCurrentScreen, showToast } = useUIStore();
    const { updateDictationNote } = useDictationNoteStore();

    // --- Data Fetching for Full Note ---
    const fetchTranscript = async () => {
        if (!editingDictationNote) return null;
        const { data, error } = await supabase.from('dictation_notes').select('transcript').eq('id', editingDictationNote.id).single();
        if (error) throw error;
        return data.transcript as TranscriptEntry[];
    };

    const { data: fetchedTranscript, isLoading: isTranscriptLoading } = useQuery({
        queryKey: ['dictationTranscript', editingDictationNote?.id],
        queryFn: fetchTranscript,
        enabled: !!editingDictationNote && editingDictationNote.transcript === undefined,
    });

    React.useEffect(() => {
        // FIX: Add a condition to prevent an infinite render loop.
        // This effect should only run once when the transcript is fetched and not yet present in the state.
        // The original code would re-trigger this effect on every render because `editingDictationNote` is a new object reference.
        if (fetchedTranscript && editingDictationNote && editingDictationNote.transcript === undefined) {
            const fullNote = { ...editingDictationNote, transcript: fetchedTranscript };
            updateDictationNote(fullNote);
            setEditingDictationNote(fullNote); // Also update session store
        }
    }, [fetchedTranscript, editingDictationNote, updateDictationNote, setEditingDictationNote]);
    // --- End Data Fetching ---

    if (!editingDictationNote) return null;

    const [title, setTitle] = useState(editingDictationNote.title);
    const [youtubeUrl, setYoutubeUrl] = useState(editingDictationNote.youtubeUrl);
    const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>(editingDictationNote.transcript || []);
    const [loopCount, setLoopCount] = useState<number>(1);
    const [playbackRate, setPlaybackRate] = useState<number>(1);
    
    const playerRef = useRef<any>(null); // To hold the YouTube player instance
    const segmentTimeoutRef = useRef<number | null>(null);
    const loopCounterRef = useRef(0);
    const videoId = useMemo(() => extractVideoID(youtubeUrl), [youtubeUrl]);

    useEffect(() => {
        if (editingDictationNote.transcript) {
            setTranscriptEntries(editingDictationNote.transcript);
        }
    }, [editingDictationNote.transcript]);

    useEffect(() => {
        if (videoId) {
            loadYouTubeAPI().then(() => {
                if (playerRef.current && playerRef.current.loadVideoById) {
                    playerRef.current.loadVideoById(videoId);
                } else if (!playerRef.current) {
                    playerRef.current = new window.YT.Player('yt-player-editor', {
                        height: '200',
                        width: '100%',
                        videoId,
                        playerVars: { 'playsinline': 1 }
                    });
                }
            });
        }
    }, [videoId]);
    
    const playSegment = (entry: TranscriptEntry) => {
        if (!playerRef.current || !playerRef.current.seekTo) {
            showToast("Video player is not ready.", "info");
            return;
        }

        if (segmentTimeoutRef.current) {
            clearTimeout(segmentTimeoutRef.current);
        }

        loopCounterRef.current = 1;
        playerRef.current.setPlaybackRate(playbackRate);

        const executePlay = () => {
            playerRef.current.seekTo(entry.start, true);
            playerRef.current.playVideo();

            segmentTimeoutRef.current = window.setTimeout(() => {
                if (loopCount === -1 || loopCounterRef.current < loopCount) {
                    loopCounterRef.current++;
                    executePlay();
                } else {
                    playerRef.current?.pauseVideo();
                }
            }, (entry.duration * 1000) / playbackRate);
        };

        executePlay();
    };
    
    const handleEntryChange = (index: number, field: keyof TranscriptEntry, value: string | number) => {
        const newEntries = [...transcriptEntries];
        const entryToUpdate = { ...newEntries[index] };
        
        if (field === 'text') {
            entryToUpdate.text = value as string;
        } else {
            const numValue = Number(value);
            if (!isNaN(numValue) && numValue >= 0) {
                 if (field === 'start') entryToUpdate.start = numValue;
                 if (field === 'duration') entryToUpdate.duration = numValue;
            }
        }
        newEntries[index] = entryToUpdate;
        setTranscriptEntries(newEntries);
    };

    const handleDeleteEntry = (index: number) => {
        setTranscriptEntries(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddEntry = () => {
        const lastEntry = transcriptEntries[transcriptEntries.length - 1];
        const newStart = lastEntry ? lastEntry.start + lastEntry.duration : 0;
        const newEntry: TranscriptEntry = { text: '', start: Math.round(newStart), duration: 3 };
        setTranscriptEntries([...transcriptEntries, newEntry]);
    };

    const formatTimestamp = (totalSeconds: number): string => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleSave = () => {
        const noteToSave: DictationNote = {
            ...editingDictationNote,
            title,
            youtubeUrl,
            transcript: transcriptEntries,
        };
        updateDictationNote(noteToSave);
        handleUpdateInSession(noteToSave);
        showToast("Changes saved!", "success");
    };

    const handleStartPractice = () => {
        const updatedNote: DictationNote = {
            ...editingDictationNote,
            title,
            youtubeUrl,
            transcript: transcriptEntries,
        };
        updateDictationNote(updatedNote);
        handleUpdateInSession(updatedNote);
        handleStartDictationSession(updatedNote);
    };

    const isPracticeReady = !!videoId && transcriptEntries.length > 0 && !isTranscriptLoading;

    return (
        <div className="p-4 sm:p-6 mx-auto animate-fadeIn">
            <header className="flex items-center gap-3 mb-6">
                <button onClick={() => setCurrentScreen(Screen.Dictation)} className="p-2 rounded-full hover:bg-secondary-200 dark:hover:bg-secondary-700 text-text-subtle">
                    <Icon name="arrowLeft" className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-text-main dark:text-secondary-100">Edit Dictation</h1>
                    <p className="text-sm text-text-subtle">Link a video and provide a timestamped transcript.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Title</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-secondary-100 dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md px-3 py-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">YouTube URL</label>
                        <input type="text" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="w-full bg-secondary-100 dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md px-3 py-2" />
                    </div>
                     <div className="bg-black rounded-lg overflow-hidden">
                        <div id="yt-player-editor"></div>
                        {!videoId && <div className="h-[200px] flex items-center justify-center bg-secondary-100 dark:bg-secondary-800 text-text-subtle">Video preview will appear here</div>}
                    </div>
                    <div className="flex items-center gap-4">
                        <div>
                            <label htmlFor="loop-select-editor" className="block text-xs font-medium text-secondary-600 dark:text-secondary-400 mb-1">Loop</label>
                            <select id="loop-select-editor" value={loopCount} onChange={e => setLoopCount(Number(e.target.value))} className="bg-surface dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md px-2 py-1.5 text-sm">
                                <option value="1">1x</option>
                                <option value="3">3x</option>
                                <option value="5">5x</option>
                                <option value="-1">∞</option>
                            </select>
                        </div>
                         <div>
                            <label htmlFor="speed-select-editor" className="block text-xs font-medium text-secondary-600 dark:text-secondary-400 mb-1">Speed</label>
                            <select id="speed-select-editor" value={playbackRate} onChange={e => setPlaybackRate(Number(e.target.value))} className="bg-surface dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md px-2 py-1.5 text-sm">
                                <option value="0.5">0.5x</option>
                                <option value="0.75">0.75x</option>
                                <option value="1">1x (Normal)</option>
                                <option value="1.5">1.5x</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col">
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Transcript</label>
                    <div className="relative flex-grow h-80 bg-secondary-100 dark:bg-secondary-900/50 rounded-md border border-secondary-200 dark:border-secondary-700">
                        {isTranscriptLoading ? (
                             <div className="absolute inset-0 flex items-center justify-center">
                                <Icon name="spinner" className="w-6 h-6 text-primary-500 animate-spin"/>
                             </div>
                        ) : (
                            <div className="absolute inset-0 overflow-y-auto p-2 space-y-2">
                                {transcriptEntries.map((entry, index) => (
                                    <div key={index} className="flex items-start gap-2 group p-1.5 rounded-md hover:bg-secondary-200 dark:hover:bg-secondary-700/50 cursor-pointer" onClick={() => playSegment(entry)}>
                                        <span className="font-mono text-sm text-text-subtle pt-1" title="Click to play segment">
                                            {formatTimestamp(entry.start)}
                                        </span>
                                        <textarea
                                            value={entry.text}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={e => handleEntryChange(index, 'text', e.target.value)}
                                            rows={1}
                                            className="flex-grow bg-surface dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none resize-none overflow-hidden"
                                            ref={el => {
                                                if (el) {
                                                    el.style.height = 'auto';
                                                    el.style.height = `${el.scrollHeight}px`;
                                                }
                                            }}
                                        />
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteEntry(index); }} className="p-1 rounded-full text-secondary-400 hover:text-error-500 hover:bg-error-500/10 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                                            <Icon name="trash" className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button onClick={handleAddEntry} className="mt-2 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 self-start">
                        <Icon name="plus" className="w-4 h-4"/> Add Segment
                    </button>
                </div>
            </div>
            
            <footer className="mt-6 flex justify-end items-center gap-3">
                <button onClick={handleSave} className="bg-surface dark:bg-secondary-700 text-text-main dark:text-secondary-100 font-semibold px-4 py-2 rounded-md hover:bg-secondary-50 dark:hover:bg-secondary-600 border border-secondary-300 dark:border-secondary-600 transition-colors flex items-center gap-1">
                    <Icon name="check" className="w-5 h-5"/>
                    Save Changes
                </button>
                <button onClick={handleStartPractice} disabled={!isPracticeReady} className="bg-primary-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                    <Icon name="play" className="w-5 h-5" />
                    Start Practice
                </button>
            </footer>
        </div>
    );
};

export default DictationEditorScreen;