import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DictationNote, TranscriptEntry } from '../types';
import { ChevronLeftIcon, SaveIcon, PlayIcon, AlertTriangleIcon, YouTubeIcon, SpinnerIcon } from '../components/Icons';
import { loadYouTubeAPI } from '../utils/youtubeApiLoader';

interface DictationEditorScreenProps {
  note: DictationNote;
  onBack: () => void;
  onSave: (noteId: string, updates: Partial<DictationNote>) => void;
  onStartPractice: (note: DictationNote) => void;
}

const extractVideoID = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const parseTimestampedTranscript = (text: string): { transcript: TranscriptEntry[], error: string | null } => {
  const lines = text.trim().split('\n');
  const transcript: Omit<TranscriptEntry, 'duration'>[] = [];
  const timestampRegex = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s*(.*)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const match = line.match(timestampRegex);
    if (!match) {
      return { transcript: [], error: `Invalid format on line ${i + 1}: "${line}". Expected [HH:MM:SS] or [MM:SS] format.` };
    }
    
    const [, hours, minutes, seconds, textContent] = match;
    const totalSeconds = (parseInt(hours || '0', 10) * 3600) + (parseInt(minutes, 10) * 60) + parseInt(seconds, 10);
    
    transcript.push({
      start: totalSeconds,
      text: textContent.trim(),
    });
  }

  if (transcript.length === 0 && text.trim().length > 0) {
    return { transcript: [], error: 'No valid transcript lines found.' };
  }
  
  transcript.sort((a, b) => a.start - b.start);

  const finalTranscript: TranscriptEntry[] = transcript.map((entry, index) => {
    let duration = 5; // Default duration for the last item
    if (index < transcript.length - 1) {
      duration = transcript[index + 1].start - entry.start;
    }
    return { ...entry, duration: Math.max(0.1, duration) }; // Ensure duration is positive
  });

  return { transcript: finalTranscript, error: null };
};

const transcriptToString = (transcript: TranscriptEntry[]): string => {
    return transcript.map(entry => {
        const totalSeconds = entry.start;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);

        const hh = hours > 0 ? `${hours.toString().padStart(2, '0')}:` : '';
        const mm = `${minutes.toString().padStart(2, '0')}:`;
        const ss = seconds.toString().padStart(2, '0');
        
        return `${hh}${mm}${ss} ${entry.text}`;
    }).join('\n');
};

const YouTubePlayerPlaceholder: React.FC = () => (
    <div className="w-full aspect-video bg-slate-800 text-slate-400 flex flex-col items-center justify-center rounded-lg shadow-inner">
        <YouTubeIcon className="w-16 h-16 text-slate-600 mb-4" />
        <h3 className="text-lg font-bold">YouTube Video Preview</h3>
        <p className="text-sm">Paste a valid YouTube URL to see the video here.</p>
    </div>
);


const DictationEditorScreen: React.FC<DictationEditorScreenProps> = ({ note, onBack, onSave, onStartPractice }) => {
    const [title, setTitle] = useState(note.title);
    const [youtubeUrl, setYoutubeUrl] = useState(note.youtubeUrl);
    const [transcriptText, setTranscriptText] = useState(() => transcriptToString(note.transcript));
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const playerRef = useRef<any>(null);
    const videoId = useMemo(() => extractVideoID(youtubeUrl), [youtubeUrl]);

    useEffect(() => {
        const setupYTPlayer = () => {
            if (!videoId) {
                if (playerRef.current && typeof playerRef.current.destroy === 'function') {
                    playerRef.current.destroy();
                    playerRef.current = null;
                }
                return;
            }
            if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
                playerRef.current.loadVideoById(videoId);
            } else {
                playerRef.current = new window.YT.Player('yt-player-editor', {
                    height: '100%',
                    width: '100%',
                    videoId: videoId,
                    playerVars: { playsinline: 1, controls: 1, modestbranding: 1, rel: 0 },
                    events: { onReady: () => {} }
                });
            }
        };

        loadYouTubeAPI().then(setupYTPlayer);
    }, [videoId]);


    const canStartPractice = videoId && parseTimestampedTranscript(transcriptText).transcript.length > 0;

    const handleSave = () => {
        setError(null);
        setIsSaving(true);
        
        const { transcript: parsedTranscript, error: parseError } = parseTimestampedTranscript(transcriptText);
        if (parseError) {
            setError(parseError);
            setIsSaving(false);
            return;
        }

        const updates: Partial<DictationNote> = {
            title: title.trim(),
            youtubeUrl: youtubeUrl.trim(),
            transcript: parsedTranscript,
        };
        
        onSave(note.id, updates);
        
        setTimeout(() => setIsSaving(false), 1000); // Visual feedback
    };

    const handleStart = () => {
        if (!canStartPractice) return;
        
        const { transcript: parsedTranscript, error: parseError } = parseTimestampedTranscript(transcriptText);
        if (parseError) {
             setError(parseError);
             return;
        }

        const updatedNote = {
            ...note,
            title: title.trim(),
            youtubeUrl: youtubeUrl.trim(),
            transcript: parsedTranscript,
        };
        onStartPractice(updatedNote);
    };

    return (
        <div className="animate-scale-in max-w-7xl mx-auto">
            <header className="mb-6 flex items-center gap-2">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100"><ChevronLeftIcon /></button>
                <div className="flex-grow min-w-0">
                    <input 
                        type="text" 
                        value={title} 
                        onChange={e => setTitle(e.target.value)}
                        className="text-3xl font-extrabold text-slate-900 tracking-tight bg-transparent border-b-2 border-transparent focus:border-cyan-500 focus:outline-none w-full"
                    />
                </div>
            </header>
            
            <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-1/2 flex flex-col gap-4">
                    <div className="w-full aspect-video bg-black rounded-lg shadow-lg overflow-hidden">
                        {videoId ? (
                            <div id="yt-player-editor" className="w-full h-full"></div>
                        ) : (
                            <YouTubePlayerPlaceholder />
                        )}
                    </div>
                    {error && <div className="p-4 bg-red-50 text-red-700 border rounded-lg flex gap-3"><AlertTriangleIcon className="w-5 h-5 mt-0.5"/><div><h3 className="font-bold">Error</h3><p>{error}</p></div></div>}
                </div>

                <div className="lg:w-1/2 p-6 bg-white rounded-lg shadow-sm border space-y-4">
                     <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">YouTube URL</label>
                        <input type="text" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://www.youtube.com/..." className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Timestamped Transcript</label>
                         <p className="text-xs text-slate-500 mb-2">
                            Paste the transcript here. Each line should start with a timestamp like `MM:SS` or `HH:MM:SS`.
                        </p>
                        <textarea
                            value={transcriptText}
                            onChange={e => setTranscriptText(e.target.value)}
                            placeholder={"00:14 This past December,\n00:15 I was sitting around a table..."}
                            className="w-full h-48 p-3 border border-slate-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                    </div>
                </div>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-4">
                <button onClick={handleSave} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2">
                    <SaveIcon /> {isSaving ? 'Saved!' : 'Save Changes'}
                </button>
                <button onClick={handleStart} disabled={!canStartPractice} className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 disabled:bg-slate-300">
                    <PlayIcon className="w-5 h-5" /> Start Practice
                </button>
            </div>
        </div>
    );
};

export default DictationEditorScreen;
