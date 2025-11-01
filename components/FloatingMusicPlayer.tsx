import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackgroundMusicLink } from '../types';
import { MusicNoteIcon, PlayIcon, PauseIcon, SkipBackIcon, SkipForwardIcon, RepeatIcon, RepeatOneIcon } from './Icons';

interface FloatingMusicPlayerProps {
  activeMusicUrl: string;
  allMusicTracks: BackgroundMusicLink[];
  onTrackChange: (url: string) => void;
  repeatMode: 'none' | 'all' | 'one';
  onRepeatModeChange: (mode: 'none' | 'all' | 'one') => void;
}

const FloatingMusicPlayer: React.FC<FloatingMusicPlayerProps> = ({ activeMusicUrl, allMusicTracks, onTrackChange, repeatMode, onRepeatModeChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const playableTracks = allMusicTracks.filter(track => track.url && track.url !== 'off');

  const findCurrentIndex = useCallback(() => {
    return playableTracks.findIndex(track => track.url === activeMusicUrl);
  }, [playableTracks, activeMusicUrl]);
  
  const handleNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (playableTracks.length <= 1 && repeatMode !== 'all') return;
    const currentIndex = findCurrentIndex();
    const nextIndex = (currentIndex + 1) % playableTracks.length;
    onTrackChange(playableTracks[nextIndex].url);
    setIsPlaying(true); // Always play on next/prev
  }, [playableTracks, repeatMode, findCurrentIndex, onTrackChange]);

  const handleEnded = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (repeatMode === 'one') {
      audio.currentTime = 0;
      audio.play();
    } else if (repeatMode === 'all') {
      handleNext();
    } else { // repeatMode === 'none'
      const currentIndex = findCurrentIndex();
      if (currentIndex === playableTracks.length - 1) {
        setIsPlaying(false); // Stop if it's the last track
      } else {
        handleNext();
      }
    }
  }, [repeatMode, handleNext, findCurrentIndex, playableTracks.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [handleEnded]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (activeMusicUrl && activeMusicUrl !== 'off') {
      if (audio.src !== activeMusicUrl) {
        audio.src = activeMusicUrl;
      }
      if (isPlaying) {
        audio.play().catch(() => setIsPlaying(false));
      } else {
        audio.pause();
      }
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [activeMusicUrl, isPlaying]);


  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeMusicUrl === 'off' && playableTracks.length > 0) {
        onTrackChange(playableTracks[0].url);
        setIsPlaying(true);
    } else {
        setIsPlaying(prev => !prev);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playableTracks.length <= 1) return;
    const currentIndex = findCurrentIndex();
    const prevIndex = (currentIndex - 1 + playableTracks.length) % playableTracks.length;
    onTrackChange(playableTracks[prevIndex].url);
    setIsPlaying(true);
  };
  
  const handleMainButtonClick = () => {
    setIsExpanded(prev => !prev);
  }

  const handleRepeatToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const modes: ('none' | 'all' | 'one')[] = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    onRepeatModeChange(modes[nextIndex]);
  };

  const getRepeatIcon = () => {
    if (repeatMode === 'one') {
      return <RepeatOneIcon className="w-6 h-6 text-cyan-600" />;
    }
    if (repeatMode === 'all') {
      return <RepeatIcon className="w-6 h-6 text-cyan-600" />;
    }
    return <RepeatIcon className="w-6 h-6 text-slate-400" />;
  };

  const repeatModeTitles = {
    none: 'Repeat: Off',
    all: 'Repeat: All',
    one: 'Repeat: One',
  };

  const PlayerButton: React.FC<{ onClick: (e: React.MouseEvent) => void, children: React.ReactNode, 'aria-label': string, className?: string, title?: string }> = ({ onClick, children, 'aria-label': ariaLabel, className = '', title }) => (
    <button onClick={onClick} aria-label={ariaLabel} title={title} className={`w-12 h-12 bg-white text-slate-700 rounded-full shadow-md flex items-center justify-center transition-all transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 ${className}`}>
      {children}
    </button>
  );

  return (
    <div className="fixed bottom-20 left-4 z-50 flex flex-col items-center gap-3">
      <audio ref={audioRef} />
      {isExpanded && (
        <div className="flex flex-col items-center gap-3 animate-slide-in-bottom">
            <PlayerButton onClick={handleRepeatToggle} aria-label={`Repeat mode: ${repeatMode}`} title={repeatModeTitles[repeatMode]}>
                {getRepeatIcon()}
            </PlayerButton>
            <PlayerButton onClick={handleNext} aria-label="Next track">
                <SkipForwardIcon className="w-6 h-6" />
            </PlayerButton>
            <PlayerButton onClick={handlePlayPause} aria-label={isPlaying ? "Pause music" : "Play music"}>
                {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
            </PlayerButton>
            <PlayerButton onClick={handlePrev} aria-label="Previous track">
                <SkipBackIcon className="w-6 h-6" />
            </PlayerButton>
        </div>
      )}
      <button
        onClick={handleMainButtonClick}
        className={`w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition-all transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 z-10 ${isPlaying ? 'bg-cyan-600 text-white animate-pulse-slow' : 'bg-white text-cyan-600'}`}
        aria-label="Toggle music player"
        aria-expanded={isExpanded}
      >
        <MusicNoteIcon className="w-8 h-8" />
      </button>
    </div>
  );
};

export default FloatingMusicPlayer;