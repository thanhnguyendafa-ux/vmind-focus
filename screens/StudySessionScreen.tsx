
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { StudyQuestion, SessionItemState, SessionWordResult, VocabTable, Relation, StudySettings, VocabRowStats, GlobalStats, AppSettings, JournalData, VocabRow } from '../types';
import { CloseIcon, EyeIcon, EyeOffIcon, ClockIcon, SpeakerIcon, BookmarkIcon, BookmarkFilledIcon } from '../components/Icons';
import Modal from '../components/Modal';
import { regenerateQuestionForRow } from '../utils/studySessionGenerator';
import XpBar from '../components/XpBar';
import { playSpeech, stopSpeech } from '../utils/gemini';

// --- UI Components for different question modes ---

const getBackgroundStyle = (rel: Relation) => {
    const design = rel.design;
    if (!design?.background) return {};
    const { type, value, color1, color2, angle } = design.background;
    if (type === 'image') return { backgroundImage: `url(${value})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    if (type === 'gradient' && color1 && color2) return { background: `linear-gradient(${angle || 180}deg, ${color1}, ${color2})` };
    return { background: value };
};

const getColumnStyle = (rel: Relation, columnName: string) => {
    const style = rel.design?.columnStyles?.[columnName] || {};
    const textShadow = rel.design?.background ? '0px 1px 3px rgba(0,0,0,0.1)' : 'none';
    return {...style, textShadow};
};


const StatusIcon: React.FC<{ state: SessionItemState }> = ({ state }) => {
    switch(state) {
        case 'unseen':
            return <div className="w-3 h-3 rounded-full bg-slate-300" title="Status: Unseen"></div>;
        case 'fail':
            return <div className="w-3 h-3 rounded-full bg-red-500" title="Status: Failed"></div>;
        case 'pass1':
            return <div className="w-3 h-3 rounded-full bg-amber-400" title="Status: Passed Once"></div>;
        case 'pass2':
            return (
                <div className="flex items-center gap-0.5" title="Status: Mastered">
                    <div className="w-3 h-3 rounded-full bg-teal-500"></div>
                    <div className="w-3 h-3 rounded-full bg-teal-500"></div>
                </div>
            );
        default:
            return null;
    }
};

const TopTracker: React.FC<{
    activeQueue: StudyQuestion[];
    masteredWords: StudyQuestion[];
    states: { [id: string]: SessionItemState };
    showWords: boolean;
    onToggleShowWords: () => void;
}> = ({ activeQueue, masteredWords, states, showWords, onToggleShowWords }) => {
    
    const WordItem: React.FC<{ q: StudyQuestion, stateOverride?: SessionItemState }> = ({ q, stateOverride }) => (
        <div className="flex items-center gap-2 p-1 bg-slate-50 rounded">
            <StatusIcon state={stateOverride || states[q.vocabRow.id] || 'unseen'} />
            {showWords && <p className="text-xs text-slate-600 truncate">{Object.values(q.vocabRow.cols)[0]}</p>}
        </div>
    );

    const gridClasses = `grid gap-2 transition-all duration-300 ${showWords ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5' : 'grid-cols-5 md:grid-cols-10'}`;

    return (
        <div className="w-full bg-white/80 backdrop-blur-sm p-2 rounded-lg border shadow-sm">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-slate-700">Session Progress</h3>
                <button onClick={onToggleShowWords} className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1">
                    {showWords ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    {showWords ? 'Hide Words' : 'Show Words'}
                </button>
            </div>
            
            {activeQueue.length > 0 && (
                <>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 mt-1">In Progress ({activeQueue.length})</h4>
                    <div className={gridClasses}>
                        {activeQueue.map(q => <WordItem key={q.vocabRow.id} q={q} />)}
                    </div>
                </>
            )}

            {masteredWords.length > 0 && (
                <>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 mt-2">Mastered ({masteredWords.length})</h4>
                    <div className={gridClasses}>
                        {masteredWords.map(q => <WordItem key={q.vocabRow.id} q={q} stateOverride="pass2" />)}
                    </div>
                </>
            )}
        </div>
    );
};

const FullExplanationPanel: React.FC<{
    cols: { [key: string]: string };
    stats: VocabRowStats;
    isCorrect: boolean;
    hasAnswerAudio: boolean;
    onPlayAudio: () => void;
    relation: Relation;
}> = ({ cols, stats, isCorrect, hasAnswerAudio, onPlayAudio, relation }) => {
    return (
        <div style={getBackgroundStyle(relation)} className={`mt-4 text-left p-4 rounded-md border animate-scale-in border-slate-200`}>
            <div className="flex justify-between items-center mb-3 border-b pb-2">
                <h4 className="text-md font-bold text-slate-800">Full Explanation</h4>
                {hasAnswerAudio && (
                    <button onClick={onPlayAudio} className="p-1 text-slate-500 hover:text-teal-700">
                        <SpeakerIcon className="w-5 h-5"/>
                    </button>
                )}
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                {Object.entries(cols).map(([key, value]) => {
                    if (!value) return null;
                    const style = getColumnStyle(relation, key);
                    const labelStyle: React.CSSProperties = {};
                    if(style.color) {
                        labelStyle.color = style.color as string;
                        labelStyle.opacity = 0.7;
                    }
                    return (
                        <div key={key}>
                           <p className="text-xs font-semibold text-slate-500" style={labelStyle}>{key}</p>
                           <p style={style} className="text-slate-800 whitespace-pre-wrap">{value}</p>
                        </div>
                    );
                })}
                <div className="pt-3 border-t">
                    <p className="text-xs font-semibold text-slate-500">Stats</p>
                    <p className="text-sm text-slate-700">
                        Level {stats.Level} • Rank {stats.RankPoint} • {(stats.SuccessRate * 100).toFixed(0)}% Success
                    </p>
                </div>
            </div>
        </div>
    );
};


const AnswerFeedbackPanel: React.FC<{
  isCorrect: boolean;
  correctAnswer: string;
  question: StudyQuestion;
  speedMode: boolean;
  onNext: () => void;
  hasAnswerAudio: boolean;
  onPlayAudio: () => void;
}> = ({ isCorrect, correctAnswer, question, speedMode, onNext, hasAnswerAudio, onPlayAudio }) => {
    
    useEffect(() => {
        if (speedMode) {
            const timer = setTimeout(() => onNext(), 800);
            return () => clearTimeout(timer);
        }
    }, [speedMode, onNext]);

    return (
        <div className={`w-full p-6 rounded-lg text-center animate-scale-in transition-all ${ isCorrect ? 'bg-teal-50' : 'bg-red-50'}`}>
            <h3 className={`text-3xl font-bold ${ isCorrect ? 'text-teal-700' : 'text-red-700'}`}>
                {isCorrect ? 'Correct!' : 'Incorrect'}
            </h3>
            
            {!isCorrect && (
                <div className="mt-4">
                    <p className="text-sm font-semibold text-slate-500">The correct answer was:</p>
                    <p className="text-xl font-bold text-slate-800">{correctAnswer}</p>
                </div>
            )}

            {!speedMode && (
                <FullExplanationPanel 
                    cols={question.vocabRow.cols} 
                    stats={question.vocabRow.stats} 
                    isCorrect={isCorrect} 
                    hasAnswerAudio={hasAnswerAudio}
                    onPlayAudio={onPlayAudio}
                    relation={question.relation}
                />
            )}
            
            {!speedMode && (
                <button
                    onClick={onNext}
                    autoFocus
                    className="w-full mt-6 py-3 px-4 bg-teal-700 text-white font-bold text-lg rounded-lg shadow-md hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-600"
                >
                    Next
                </button>
            )}
        </div>
    );
};

const McqQuestionUI: React.FC<{
  question: StudyQuestion;
  onAnswer: (answer: string) => void;
}> = ({ question, onAnswer }) => (
  <div className="flex flex-col items-center gap-4">
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
      {question.mcqOptions?.map((option, index) => (
        <button
          key={index}
          onClick={() => onAnswer(option)}
          className="p-4 rounded-lg text-left text-lg font-semibold border-2 transition-all duration-300 transform hover:scale-105 bg-white hover:bg-slate-100 border-slate-300 text-slate-800"
        >
          {option}
        </button>
      ))}
    </div>
  </div>
);

const TfQuestionUI: React.FC<{
    onAnswer: (answer: 'True' | 'False') => void;
}> = ({ onAnswer }) => {
    const options = useMemo<('True' | 'False')[]>(() => {
        return Math.random() > 0.5 ? ['True', 'False'] : ['False', 'True'];
    }, []);

    return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
          {options.map(option => (
              <button
                  key={option}
                  onClick={() => onAnswer(option)}
                  className="py-6 rounded-lg text-2xl font-bold border-2 transition-all duration-300 transform hover:scale-105 bg-white hover:bg-slate-100 border-slate-300 text-slate-800"
              >
                  {option}
              </button>
          ))}
      </div>
    </div>
)};

const TypingQuestionUI: React.FC<{
  onAnswer: (answer: string) => void;
}> = ({ onAnswer }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onAnswer(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        autoFocus
        className="w-full max-w-md p-4 text-xl text-center border-2 rounded-lg focus:outline-none focus:ring-2 transition-colors border-slate-300 focus:ring-teal-600"
        placeholder="Type your answer..."
      />
      <button
        type="submit"
        disabled={!inputValue.trim()}
        className="w-full max-w-md py-3 px-4 bg-teal-700 text-white font-bold text-lg rounded-lg shadow-md hover:bg-teal-800 disabled:bg-slate-300 disabled:cursor-not-allowed"
      >
        Submit
      </button>
    </form>
  );
};


// --- Main Study Session Component ---
const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
};

interface StudySessionScreenProps {
  queue: StudyQuestion[];
  onSessionFinish: (results: SessionWordResult[], sessionXp: number, durationSeconds: number) => void;
  onSessionQuit: (abandonedWords: { rowId: string, tableId: string }[], durationSeconds: number) => void;
  tables: VocabTable[];
  relations: Relation[];
  settings: StudySettings;
  globalStats: GlobalStats;
  appSettings: AppSettings;
  onAddToJournal: (entryData: { vocabRow: VocabRow, relation: Relation, sourceSessionType: 'study' | 'flashcard' | 'theater' }) => void;
  journal: JournalData;
  onWordChange: (word: VocabRow | null) => void;
}

const StudySessionScreen: React.FC<StudySessionScreenProps> = ({ queue, onSessionFinish, onSessionQuit, tables, relations, settings, globalStats, appSettings, onAddToJournal, journal, onWordChange }) => {
  const [originalQueue, setOriginalQueue] = useState<StudyQuestion[]>([]);
  const [sessionQueue, setSessionQueue] = useState<StudyQuestion[]>([]);
  const [wordStates, setWordStates] = useState<{ [id: string]: SessionItemState }>({});
  const [wordResults, setWordResults] = useState<{ [id: string]: { passed1: number; passed2: number; failed: number } }>({});
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [userAnswer, setUserAnswer] = useState<string | null>(null);
  const [answeredQuestionSnapshot, setAnsweredQuestionSnapshot] = useState<StudyQuestion | null>(null);

  const [isComplete, setIsComplete] = useState(false);
  const [isConfirmingEnd, setIsConfirmingEnd] = useState(false);
  
  const [speedMode, setSpeedMode] = useState(false);
  const [showWords, setShowWords] = useState(false);

  const [sessionXp, setSessionXp] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [journalToast, setJournalToast] = useState<{ message: string; key: number } | null>(null);
  const [journalButtonState, setJournalButtonState] = useState<'idle' | 'saving'>('idle');

  const displayStats = useMemo(() => ({
    ...globalStats,
    xp: globalStats.xp + sessionXp
  }), [globalStats, sessionXp]);
  
  useEffect(() => {
    const timer = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setOriginalQueue([...queue]);
    setSessionQueue([...queue]);
    const initialStates: { [id: string]: SessionItemState } = {};
    const initialResults: { [id: string]: { passed1: number, passed2: number, failed: number } } = {};
    queue.forEach(q => {
      initialStates[q.vocabRow.id] = 'unseen';
      initialResults[q.vocabRow.id] = { passed1: 0, passed2: 0, failed: 0 };
    });
    setWordStates(initialStates);
    setWordResults(initialResults);
    setSessionXp(0);
  }, [queue]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (!isComplete) {
            e.preventDefault();
            e.returnValue = ''; // Required for Chrome
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isComplete]);

  const currentQuestion = sessionQueue.length > 0 ? sessionQueue[currentIndex] : null;
  const questionToDisplay = isAnswered && answeredQuestionSnapshot ? answeredQuestionSnapshot : currentQuestion;

  useEffect(() => {
    onWordChange(questionToDisplay?.vocabRow ?? null);
    return () => {
        if (!isComplete) {
            onWordChange(null);
        }
    }
  }, [questionToDisplay, onWordChange, isComplete]);

  useEffect(() => {
    setJournalButtonState('idle');
  }, [currentQuestion]);
  
  const getAudioConfigForQuestion = useCallback((question: StudyQuestion | null) => {
      if (!question) return null;
      const table = tables.find(t => t.id === question.tableId);
      return table?.audioConfig || null;
  }, [tables]);

  const playQuestionAudio = useCallback((question: StudyQuestion) => {
    const audioConfig = getAudioConfigForQuestion(question);
    if (!audioConfig) return;

    const text = question.vocabRow.cols[audioConfig.sourceColumn];
    if (text) {
        playSpeech(text, audioConfig.language, appSettings.audioPlaybackRate)
            .catch(err => console.error("Speech playback error:", err));
    }
  }, [getAudioConfigForQuestion, appSettings.audioPlaybackRate]);

  useEffect(() => {
    stopSpeech(); // Stop any previous speech when question changes
    
    if (currentQuestion && !isAnswered && (appSettings.audioAutoPlay ?? true)) {
        const audioConfig = getAudioConfigForQuestion(currentQuestion);
        if (audioConfig && currentQuestion.relation.questionCols.includes(audioConfig.sourceColumn)) {
            playQuestionAudio(currentQuestion);
        }
    }
    
    if (isAnswered && answeredQuestionSnapshot && (appSettings.audioAutoPlay ?? true)) {
        const audioConfig = getAudioConfigForQuestion(answeredQuestionSnapshot);
        if (audioConfig && answeredQuestionSnapshot.relation.answerCols.includes(audioConfig.sourceColumn)) {
            playQuestionAudio(answeredQuestionSnapshot);
        }
    }
    
    return () => stopSpeech();
  }, [currentQuestion, isAnswered, answeredQuestionSnapshot, appSettings.audioAutoPlay, getAudioConfigForQuestion, playQuestionAudio]);


  const advanceQueue = useCallback(() => {
    setIsAnswered(false);
    setUserAnswer(null);
    setAnsweredQuestionSnapshot(null);
    setCurrentIndex(prev => Math.min(prev, sessionQueue.length - 1));
  }, [sessionQueue.length]);

  const handleAnswer = (answer: string) => {
    if (isAnswered || !currentQuestion) return;
    
    if (appSettings.journalLoggingMode === 'automatic') {
        onAddToJournal({ vocabRow: currentQuestion.vocabRow, relation: currentQuestion.relation, sourceSessionType: 'study' });
    }

    setAnsweredQuestionSnapshot(currentQuestion);

    let isCorrectResponse = false;
    if (currentQuestion.mode === 'MCQ' || currentQuestion.mode === 'Typing') {
        isCorrectResponse = answer.toLowerCase() === currentQuestion.answerContent.toLowerCase();
    } else if (currentQuestion.mode === 'TF') {
        const correctTfAnswer = currentQuestion.tfIsCorrect ? 'True' : 'False';
        isCorrectResponse = answer === correctTfAnswer;
    }
    
    setUserAnswer(answer);
    setIsAnswered(true);

    const rowId = currentQuestion.vocabRow.id;
    let nextQueue = [...sessionQueue];
    
    const reQueueItem = (item: StudyQuestion, newQueue: StudyQuestion[]): StudyQuestion[] => {
        if (settings.randomRelation || settings.randomizeModes) {
            const newQuestion = regenerateQuestionForRow({ ...item.vocabRow, tableId: item.tableId }, settings, tables, relations);
            if (newQuestion) {
                const itemIndex = newQueue.findIndex(q => q.vocabRow.id === item.vocabRow.id);
                if (itemIndex > -1) {
                    newQueue[itemIndex] = newQuestion;
                }
            }
        }
        return newQueue;
    };

    if (isCorrectResponse) {
        setSessionXp(prev => prev + 10);
        const currentState = wordStates[rowId];
        
        if (currentState === 'pass1') {
            setWordStates(prev => ({ ...prev, [rowId]: 'pass2' }));
            setWordResults(prev => ({ ...prev, [rowId]: { ...prev[rowId], passed1: prev[rowId].passed1 + 1, passed2: prev[rowId].passed2 + 1 } }));
            nextQueue.splice(currentIndex, 1);
        } else {
            setWordStates(prev => ({ ...prev, [rowId]: 'pass1' }));
            setWordResults(prev => ({ ...prev, [rowId]: { ...prev[rowId], passed1: prev[rowId].passed1 + 1 } }));
            
            const item = nextQueue.splice(currentIndex, 1)[0];
            nextQueue.push(item);
            nextQueue = reQueueItem(item, nextQueue);
        }
    } else {
        setSessionXp(prev => prev - 5);
        setWordStates(prev => ({ ...prev, [rowId]: 'fail' }));
        setWordResults(prev => ({ ...prev, [rowId]: { ...prev[rowId], failed: prev[rowId].failed + 1 } }));
        
        const item = nextQueue.splice(currentIndex, 1)[0];
        const newPosition = Math.min(currentIndex + 2, nextQueue.length);
        nextQueue.splice(newPosition, 0, item);
        nextQueue = reQueueItem(item, nextQueue);
    }

    if (nextQueue.length === 0) {
      setTimeout(() => setIsComplete(true), speedMode ? 800 : 100);
    } else {
      setSessionQueue(nextQueue);
    }
  };

  const isCorrect = useMemo<boolean | null>(() => {
    if (!isAnswered || userAnswer === null || !answeredQuestionSnapshot) return null;
    if (answeredQuestionSnapshot.mode === 'TF') {
      return userAnswer === (answeredQuestionSnapshot.tfIsCorrect ? 'True' : 'False');
    }
    return userAnswer.toLowerCase() === answeredQuestionSnapshot.answerContent.toLowerCase();
  }, [isAnswered, userAnswer, answeredQuestionSnapshot]);

  const correctAnswerText = useMemo(() => {
    if (!answeredQuestionSnapshot) return '';
    if (answeredQuestionSnapshot.mode === 'TF') return answeredQuestionSnapshot.tfIsCorrect ? 'True' : 'False';
    return answeredQuestionSnapshot.answerContent;
  }, [answeredQuestionSnapshot]);
  
  const handleFinish = () => {
    const finalResults: SessionWordResult[] = originalQueue.map(q => ({
      rowId: q.vocabRow.id,
      tableId: q.tableId,
      ...wordResults[q.vocabRow.id],
    }));
    onSessionFinish(finalResults, sessionXp, elapsedSeconds);
  };
  
  const handleQuit = () => {
    const abandoned = originalQueue
        .filter(q => wordStates[q.vocabRow.id] !== 'pass2')
        .map(q => ({ rowId: q.vocabRow.id, tableId: q.tableId }));
    onSessionQuit(abandoned, elapsedSeconds);
  };
  
  const masteredWords = useMemo(() => {
    return originalQueue.filter(q => wordStates[q.vocabRow.id] === 'pass2');
  }, [originalQueue, wordStates]);
  
  const difficultWords = useMemo(() => {
    return queue
        .filter(q => (wordResults[q.vocabRow.id]?.failed || 0) > 0)
        .sort((a, b) => (wordResults[b.vocabRow.id]?.failed || 0) - (wordResults[a.vocabRow.id]?.failed || 0));
  }, [isComplete, wordResults, queue]);

  const hasQuestionAudio = useMemo(() => {
    const audioConfig = getAudioConfigForQuestion(questionToDisplay);
    return !!(audioConfig && questionToDisplay?.relation.questionCols.includes(audioConfig.sourceColumn));
  }, [questionToDisplay, getAudioConfigForQuestion]);

  const hasAnswerAudio = useMemo(() => {
      const audioConfig = getAudioConfigForQuestion(answeredQuestionSnapshot);
      return !!(audioConfig && answeredQuestionSnapshot?.relation.answerCols.includes(audioConfig.sourceColumn));
  }, [answeredQuestionSnapshot, getAudioConfigForQuestion]);


  const handleManualAddToJournal = () => {
    if (!questionToDisplay || journalButtonState === 'saving') return;
    onAddToJournal({ vocabRow: questionToDisplay.vocabRow, relation: questionToDisplay.relation, sourceSessionType: 'study' });
    setJournalButtonState('saving');
    setJournalToast({ message: "Đã thêm vào nhật ký!", key: Date.now() });
    setTimeout(() => {
        setJournalButtonState('idle');
    }, 1500);
    setTimeout(() => setJournalToast(null), 1500);
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center animate-scale-in">
        <div className="w-full max-w-2xl">
          <h1 className="text-5xl font-extrabold text-teal-700 mb-4">Session Complete!</h1>
          <p className="text-2xl text-slate-700 mb-8">
            You mastered <span className="font-bold text-slate-900">{masteredWords.length}</span> out of <span className="font-bold text-slate-900">{queue.length}</span> words.
          </p>
          <div className="bg-white p-6 rounded-lg shadow-lg w-full mb-8">
              <p className="text-7xl font-bold text-slate-800">
                  {queue.length > 0 ? Math.round((masteredWords.length / queue.length) * 100) : 0}%
              </p>
              <p className="text-slate-500">Mastery</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-lg w-full text-left mb-8">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Session Summary</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {queue.map(q => {
                const result = wordResults[q.vocabRow.id];
                const keyword = Object.values(q.vocabRow.cols)[0];
                if (!result) return null;

                return (
                  <div key={q.vocabRow.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-md text-sm">
                    <p className="font-semibold text-slate-800 truncate pr-4">{keyword}</p>
                    <div className="flex items-center gap-3 text-xs font-mono flex-shrink-0">
                      {result.failed > 0 && <span className="text-red-600 font-semibold">failed +{result.failed}</span>}
                      {result.passed1 > 0 && <span className="text-amber-600 font-semibold">passed1 +{result.passed1}</span>}
                      {result.passed2 > 0 && <span className="text-teal-600 font-semibold">passed2 +{result.passed2}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {difficultWords.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-lg w-full text-left mb-8">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Words to Review</h3>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {difficultWords.map(q => (
                  <div key={q.vocabRow.id} className="pb-2 border-b last:border-b-0">
                    <p className="font-semibold text-slate-700">{q.relation.questionCols.map(c => q.vocabRow.cols[c]).join(' / ')}</p>
                    <p className="text-sm text-slate-500">{q.relation.answerCols.map(c => q.vocabRow.cols[c]).join(' / ')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleFinish}
            className="py-3 px-8 bg-teal-700 text-white font-bold text-xl rounded-lg shadow-md hover:bg-teal-800 transition-transform transform hover:scale-105"
          >
            Finish & Save Progress
          </button>
        </div>
      </div>
    );
  }
  
  if (!questionToDisplay) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p>Loading session...</p></div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {journalToast && (
          <div key={journalToast.key} className="fixed top-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-sm font-semibold py-2 px-4 rounded-full shadow-lg z-50 animate-toast-in-out">
              {journalToast.message}
          </div>
      )}
      <header className="p-3 fixed top-0 left-0 right-0 bg-slate-50/80 backdrop-blur-sm z-10 border-b">
        <div className="flex items-center justify-between">
          <div className="w-1/4">
            <button onClick={() => setIsConfirmingEnd(true)} className="text-slate-500 hover:text-slate-800"><CloseIcon /></button>
          </div>
          <div className="w-1/2 font-bold text-slate-700 text-center flex items-center justify-center gap-4">
            <div>
                <span className="text-teal-600">{masteredWords.length}</span> / {queue.length}
            </div>
            <div className="flex items-center gap-1 text-sm font-mono text-slate-500">
                <ClockIcon className="w-4 h-4" />
                {formatTime(elapsedSeconds)}
            </div>
          </div>
          <div className="w-1/4 flex items-center gap-2 justify-end">
              <span className="text-sm font-semibold text-slate-600 hidden sm:inline">Speed Mode</span>
              <button onClick={() => setSpeedMode(!speedMode)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${speedMode ? 'bg-teal-700' : 'bg-slate-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${speedMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
          </div>
        </div>
        <div className="mt-3">
          <XpBar globalStats={displayStats} variant="compact" />
        </div>
      </header>
      
      <main className="flex-grow flex flex-col items-center justify-center p-4 pt-24 text-center">
        <div className="w-full max-w-3xl">
            <div className="mb-6">
                <TopTracker 
                    activeQueue={sessionQueue}
                    masteredWords={masteredWords}
                    states={wordStates} 
                    showWords={showWords} 
                    onToggleShowWords={() => setShowWords(!showWords)} 
                />
            </div>

          <div 
            style={getBackgroundStyle(questionToDisplay.relation)}
            className="relative p-8 rounded-lg shadow-xl mb-8 min-h-[150px] flex flex-col items-center justify-center animate-scale-in"
          >
            {appSettings.journalLoggingMode === 'manual' && (
                <button
                    onClick={handleManualAddToJournal}
                    disabled={journalButtonState === 'saving'}
                    className={`absolute top-3 right-3 p-2 rounded-full transition-colors ${
                        journalButtonState === 'saving'
                        ? 'bg-amber-400 text-white'
                        : 'bg-black/20 text-white hover:bg-black/40'
                    }`}
                    aria-label="Add to Journal"
                >
                    {journalButtonState === 'saving' ? <BookmarkFilledIcon className="w-5 h-5" /> : <BookmarkIcon className="w-5 h-5" />}
                </button>
            )}
            <div className="flex w-full items-start justify-between gap-4">
              <div className="text-left w-full space-y-4">
                {questionToDisplay.relation.questionCols.map(col => {
                    const value = questionToDisplay.vocabRow.cols[col] || '';
                    const style = getColumnStyle(questionToDisplay.relation, col);
                    const labelStyle: React.CSSProperties = {};
                    if(style.color) {
                        labelStyle.color = style.color as string;
                        labelStyle.opacity = 0.7;
                    }
                    return (
                        <div key={col}>
                            <span className="text-sm font-semibold text-slate-500" style={labelStyle}>{col}:</span>
                            <p style={style} className="text-lg text-slate-800 whitespace-pre-wrap font-sans">{value}</p>
                        </div>
                    )
                })}
                {questionToDisplay.mode !== 'TF' && (
                  <div className="pt-4 border-t border-dashed border-slate-300">
                      <p className="text-base font-semibold text-slate-600">Question: {questionToDisplay.relation.answerCols.join(', ')} = ???</p>
                  </div>
                )}
              </div>
                {hasQuestionAudio && (
                    <button onClick={() => playQuestionAudio(questionToDisplay)} className="text-slate-400 hover:text-teal-700 p-2 -mr-4">
                        <SpeakerIcon className="w-6 h-6" />
                    </button>
                )}
            </div>
            {questionToDisplay.mode === 'TF' &&
              <div className="mt-6 w-full">
                  <p className="text-sm text-slate-400 font-semibold mb-2">{questionToDisplay.relation.answerCols.join(' & ')}</p>
                  <p 
                    style={getColumnStyle(questionToDisplay.relation, questionToDisplay.relation.answerCols[0])}
                    className="text-2xl font-medium text-slate-700 p-4 bg-slate-100/50 rounded-md"
                  >
                      {questionToDisplay.answerContent}
                  </p>
              </div>
            }
          </div>

          <div className="animate-scale-in" style={{ animationDelay: '100ms' }}>
            {!isAnswered ? (
                <>
                {currentQuestion && currentQuestion.mode === 'MCQ' && <McqQuestionUI question={currentQuestion} onAnswer={handleAnswer} />}
                {currentQuestion && currentQuestion.mode === 'Typing' && <TypingQuestionUI onAnswer={handleAnswer} />}
                {currentQuestion && currentQuestion.mode === 'TF' && <TfQuestionUI key={currentQuestion.id} onAnswer={handleAnswer} />}
                </>
            ) : (
                <AnswerFeedbackPanel 
                    isCorrect={isCorrect!}
                    correctAnswer={correctAnswerText}
                    question={answeredQuestionSnapshot!}
                    speedMode={speedMode}
                    onNext={advanceQueue}
                    hasAnswerAudio={hasAnswerAudio}
                    onPlayAudio={() => playQuestionAudio(answeredQuestionSnapshot!)}
                />
            )}
          </div>
        </div>
      </main>

      <Modal
        isOpen={isConfirmingEnd}
        onClose={() => setIsConfirmingEnd(false)}
        title="End Session?"
      >
        <div>
            <p className="text-slate-600 mb-6">
                Are you sure? Your progress for this session won't be saved. Words you haven't mastered will be marked so you can practice them later.
            </p>
            <div className="flex justify-end gap-4">
                <button
                    onClick={() => setIsConfirmingEnd(false)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-6 rounded-lg"
                >
                    Cancel
                </button>
                <button
                    onClick={handleQuit}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg"
                >
                    End Session
                </button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default StudySessionScreen;