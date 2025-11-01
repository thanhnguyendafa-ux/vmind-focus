import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DictationNote, TranscriptEntry } from '../types';
import { SpinnerIcon, CheckCircleIcon, XCircleIcon, PlayIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon, EyeOffIcon, SparklesIcon, BookmarkIcon, BookmarkFilledIcon } from '../components/Icons';
import { loadYouTubeAPI } from '../utils/youtubeApiLoader';

interface DictationSessionScreenProps {
  note: DictationNote;
  onSessionFinish: (correctCount: number, totalCount: number, durationSeconds: number) => void;
  onVmindLookup: (text: string) => void;
  onAddToJournal: (content: string, source: string, contextInfo: string) => void;
}

const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
};

const normalizeText = (text: string) => {
    let normalized = text.toLowerCase().trim();
    normalized = normalized.replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "");
    return normalized.replace(/\s{2,}/g, " ");
};

const DictationSessionScreen: React.FC<DictationSessionScreenProps> = ({ note, onSessionFinish, onVmindLookup, onAddToJournal }) => {
    const { youtubeUrl, transcript, title } = note;
    const [activeIndex, setActiveIndex] = useState(0);
    const [userInputs, setUserInputs] = useState<Record<number, string>>({});
    const [results, setResults] = useState<Record<number, 'correct' | 'incorrect' | 'untouched'>>({});
    const [showAnswer, setShowAnswer] = useState(false);
    
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const playerRef = useRef<any>(null);
    const timeoutRef = useRef<number | null>(null);
    const activeItemRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const [isTranscriptVisible, setIsTranscriptVisible] = useState(false);
    const [journaledIndices, setJournaledIndices] = useState<Set<number>>(new Set());
    const [toast, setToast] = useState<{ message: string; key: number } | null>(null);
    
    const showLocalToast = (message: string) => {
        setToast({ message, key: Date.now() });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        const timer = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
        return () => clearInterval(timer);
    }, []);

     useEffect(() => {
        const initialResults: Record<number, 'correct' | 'incorrect' | 'untouched'> = {};
        note.transcript.forEach((_, index) => {
            initialResults[index] = 'untouched';
        });
        setResults(initialResults);
    }, [note.transcript]);

    useEffect(() => {
        const setupYTPlayer = () => {
            const videoIdMatch = youtubeUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
            const videoId = videoIdMatch ? videoIdMatch[1] : null;
            if (videoId && !playerRef.current) {
                playerRef.current = new window.YT.Player('yt-player-session', {
                    height: '100%',
                    width: '100%',
                    videoId: videoId,
                    playerVars: { playsinline: 1, controls: 1, modestbranding: 1, rel: 0 },
                    events: { 'onReady': () => setIsPlayerReady(true) }
                });
            }
        };

        loadYouTubeAPI().then(setupYTPlayer);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (playerRef.current && typeof playerRef.current.destroy === 'function') {
                playerRef.current.destroy();
                playerRef.current = null;
            }
        };
    }, [youtubeUrl]);

    useEffect(() => {
        activeItemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [activeIndex]);

    useEffect(() => {
        textareaRef.current?.focus();
    }, [activeIndex]);

    const playCurrentSegment = useCallback(() => {
        if (playerRef.current && typeof playerRef.current.seekTo === 'function' && isPlayerReady) {
            const segment = transcript[activeIndex];
            if (!segment) return;

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            playerRef.current.seekTo(segment.start, true);
            playerRef.current.playVideo();
            
            timeoutRef.current = window.setTimeout(() => {
                if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
                    playerRef.current.pauseVideo();
                }
            }, segment.duration * 1000);
        }
    }, [activeIndex, transcript, isPlayerReady]);

    const handleCheck = () => {
        const originalText = normalizeText(transcript[activeIndex].text);
        const userText = normalizeText(userInputs[activeIndex] || '');
        const isAnswerCorrect = originalText === userText;
        
        setResults(prev => ({ ...prev, [activeIndex]: isAnswerCorrect ? 'correct' : 'incorrect' }));
    };

    const handleFinish = () => {
        const correctCount = Object.values(results).filter(r => r === 'correct').length;
        const totalCount = transcript.length;
        onSessionFinish(correctCount, totalCount, elapsedSeconds);
    };

    const navigate = (direction: 'next' | 'prev' | 'jump', index?: number) => {
        const newIndex = direction === 'next'
            ? Math.min(activeIndex + 1, transcript.length - 1)
            : direction === 'prev'
            ? Math.max(activeIndex - 1, 0)
            : index!;
        
        if (newIndex !== activeIndex) {
            setActiveIndex(newIndex);
            setShowAnswer(false);
        }
    };

    const handleVmindClick = () => {
        onVmindLookup(transcript[activeIndex].text);
    };

    const handleJournalClick = () => {
        const entry = transcript[activeIndex];
        const minutes = Math.floor(entry.start / 60).toString().padStart(2, '0');
        const seconds = Math.floor(entry.start % 60).toString().padStart(2, '0');
        const timeString = `${minutes}:${seconds}`;

        onAddToJournal(entry.text, `Dictation: ${title}`, `*[${timeString}]*`);
        setJournaledIndices(prev => new Set(prev).add(activeIndex));
        showLocalToast("Added to journal!");
    };
    
    const correctCount = Object.values(results).filter(r => r === 'correct').length;
    const attemptedCount = Object.values(results).filter(r => r !== 'untouched').length;
    const currentResult = results[activeIndex];
    const isAttempted = currentResult === 'correct' || currentResult === 'incorrect';
    const isJournaled = journaledIndices.has(activeIndex);
    
    let textareaClasses = "w-full flex-grow p-3 text-lg border rounded-lg focus:outline-none focus:ring-2 resize-none";
    if (isAttempted) {
        textareaClasses += currentResult === 'correct' ? ' border-green-500 ring-green-200 bg-green-50' : ' border-red-500 ring-red-200 bg-red-50';
    } else {
        textareaClasses += " border-slate-300 focus:ring-cyan-500";
    }

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col p-4">
            {toast && (
                <div key={toast.key} className="fixed top-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-sm font-semibold py-2 px-4 rounded-full shadow-lg z-50 animate-toast-in-out">
                    {toast.message}
                </div>
            )}
            <header className="w-full max-w-7xl mx-auto mb-4 flex-shrink-0">
                <div className="flex justify-between items-center mb-2">
                    <h1 className="text-xl font-bold text-slate-800 truncate pr-4">{title}</h1>
                    <div className="flex items-center gap-4">
                        <span className="font-mono text-slate-500">{formatTime(elapsedSeconds)}</span>
                        <button onClick={handleFinish} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg">Finish Session</button>
                    </div>
                </div>
                <div className="w-full bg-slate-300 rounded-full h-2.5">
                    <div className="bg-cyan-600 h-2.5 rounded-full" style={{ width: `${(attemptedCount / transcript.length) * 100}%`, transition: 'width 0.3s' }}></div>
                </div>
                 <p className="text-sm font-semibold text-slate-500 mt-1 text-right">Correct: {correctCount} / {transcript.length}</p>
            </header>
            
            <main className="w-full max-w-7xl mx-auto flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <div id="yt-player-container" className="w-full aspect-video bg-black rounded-lg shadow-lg overflow-hidden">
                        {youtubeUrl ? (
                            <div id="yt-player-session" className="w-full h-full"></div>
                        ) : null}
                         {!isPlayerReady && (
                            <div className="w-full h-full flex flex-col items-center justify-center text-white bg-slate-900">
                                <SpinnerIcon className="w-8 h-8 animate-spin-fast mb-4" />
                                <p>Loading Video Player...</p>
                            </div>
                         )}
                    </div>
                    <div className="p-4 bg-white rounded-lg shadow-sm border flex-grow flex flex-col items-center justify-center">
                        <button onClick={playCurrentSegment} className="w-20 h-20 bg-cyan-600 text-white rounded-full flex items-center justify-center shadow-lg mb-4 transition-transform transform hover:scale-110">
                            <PlayIcon className="w-10 h-10" />
                        </button>
                        <textarea
                            ref={textareaRef}
                            value={userInputs[activeIndex] || ''}
                            onChange={(e) => setUserInputs(prev => ({...prev, [activeIndex]: e.target.value}))}
                            placeholder="Type what you hear..."
                            className={textareaClasses}
                            readOnly={isAttempted}
                        />
                         {isAttempted ? (
                            <div className="mt-3 w-full space-y-3 animate-scale-in">
                                <div className="flex justify-center items-center gap-2">
                                    {currentResult === 'correct' ? <CheckCircleIcon className="w-6 h-6 text-green-500"/> : <XCircleIcon className="w-6 h-6 text-red-500"/>}
                                    <span className={`font-bold text-lg ${currentResult === 'correct' ? 'text-green-600' : 'text-red-600'}`}>
                                        {currentResult === 'correct' ? 'Correct!' : 'Incorrect'}
                                    </span>
                                </div>
                                
                                <div className="flex items-center justify-center gap-4">
                                    <button onClick={() => setShowAnswer(p => !p)} className="text-sm font-semibold text-cyan-600 hover:underline">
                                        {showAnswer ? 'Hide' : 'Show'} Answer
                                    </button>
                                    <button onClick={handleVmindClick} className="flex items-center gap-1 text-sm font-semibold text-cyan-600 hover:underline">
                                        <SparklesIcon className="w-4 h-4" /> Explain
                                    </button>
                                    <button onClick={handleJournalClick} className="flex items-center gap-1 text-sm font-semibold text-cyan-600 hover:underline">
                                        {isJournaled ? <BookmarkFilledIcon className="w-4 h-4" /> : <BookmarkIcon className="w-4 h-4" />}
                                        {isJournaled ? 'Saved' : 'Save'}
                                    </button>
                                </div>

                                {showAnswer && (
                                    <div className="p-3 bg-slate-100 rounded-md text-slate-800 text-center animate-scale-in">
                                        {transcript[activeIndex].text}
                                    </div>
                                )}
                            </div>
                         ) : (
                            <button onClick={handleCheck} disabled={!userInputs[activeIndex]?.trim()} className="mt-3 w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-lg disabled:bg-slate-300">
                                Check Answer
                            </button>
                         )}
                        <div className="mt-4 w-full flex justify-between items-center">
                            <button onClick={() => navigate('prev')} disabled={activeIndex === 0} className="p-3 bg-slate-200 rounded-full disabled:opacity-50"><ChevronLeftIcon /></button>
                            <span className="font-semibold text-slate-500">{activeIndex + 1} / {transcript.length}</span>
                            <button onClick={() => navigate('next')} disabled={activeIndex === transcript.length - 1} className="p-3 bg-slate-200 rounded-full disabled:opacity-50"><ChevronRightIcon /></button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-2 flex flex-col min-h-0 lg:col-span-1">
                    <div className="flex justify-between items-center p-2">
                        <h2 className="font-bold text-slate-800">Transcript Index</h2>
                        <button onClick={() => setIsTranscriptVisible(p => !p)} title={isTranscriptVisible ? "Hide Full Transcript" : "Show Full Transcript"} className="p-2 rounded-full hover:bg-slate-200 text-slate-500">
                            {isTranscriptVisible ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                        </button>
                    </div>
                    <div className="flex-grow overflow-y-auto pr-2 space-y-1">
                        {transcript.map((entry, index) => {
                            const isActive = index === activeIndex;
                            const result = results[index];
                            let stateClasses = "hover:bg-slate-100";
                            if (isActive) stateClasses = "bg-cyan-50 border-2 border-cyan-400";
                            else if (result === 'correct') stateClasses = "bg-green-50";
                            else if (result === 'incorrect') stateClasses = "bg-red-50";

                            return (
                                <div key={index} ref={isActive ? activeItemRef : null}>
                                    <button onClick={() => navigate('jump', index)} className={`w-full text-left p-3 rounded-md transition-all cursor-pointer ${stateClasses}`}>
                                        <div className="flex items-center gap-3">
                                            {result === 'correct' && <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0"/>}
                                            {result === 'incorrect' && <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0"/>}
                                            {result === 'untouched' && <div className="w-5 h-5 flex items-center justify-center flex-shrink-0"><div className="w-2 h-2 rounded-full bg-slate-400"></div></div>}
                                            <span className="font-mono text-sm text-cyan-600">{formatTime(Math.floor(entry.start))}</span>
                                            {isTranscriptVisible && <p className="text-sm text-slate-600 flex-1">{entry.text}</p>}
                                        </div>
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DictationSessionScreen;