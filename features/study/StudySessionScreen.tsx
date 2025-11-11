import React, { useState, useEffect, useMemo } from 'react';
import { Screen, StudySessionData, Question, StudyMode, SessionWordResult } from '../../types';
import Icon from '../../components/ui/Icon';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import { useSessionStore } from '../../stores/useSessionStore';
import { useUIStore } from '../../stores/useUIStore';
import { useNoteStore } from '../../stores/useNoteStore';
import { useUserStore } from '../../stores/useUserStore';
import { useTableStore } from '../../stores/useTableStore';
import { generateHint } from '../../services/geminiService';

const normalizeAnswer = (answer: string) => {
    return answer.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
};

const StudySessionScreen: React.FC = () => {
    const { activeSession: session, handleEndSession, handleSessionQuit } = useSessionStore();
    const { showToast } = useUIStore();
    const { handleSaveToJournal } = useNoteStore();
    const { settings: userSettings } = useUserStore();
    const { tables } = useTableStore();
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userInput, setUserInput] = useState('');
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
    const [sessionResults, setSessionResults] = useState<SessionWordResult[]>([]);
    const [isQuitting, setIsQuitting] = useState(false);
    const [hint, setHint] = useState<{ text: string; isLoading: boolean }>({ text: '', isLoading: false });
    const [isJournaled, setIsJournaled] = useState(false);

    const currentQuestion = useMemo(() => session?.questions[currentIndex], [session, currentIndex]);
    const progressPercentage = session ? ((currentIndex / session.questions.length) * 100) : 0;
    const isAnswered = feedback !== null;

    useEffect(() => {
        if (!session) {
            useUIStore.getState().setCurrentScreen(Screen.Home);
        }
    }, [session]);
    
    if (!session || !currentQuestion) {
        return <div className="fixed inset-0 bg-background dark:bg-secondary-900 flex items-center justify-center"><Icon name="spinner" className="w-10 h-10 text-primary-500 animate-spin"/></div>;
    }
    
    const handleCheckAnswer = () => {
        if (isAnswered) return;
        
        let isCorrect = false;
        if (currentQuestion.type === StudyMode.TrueFalse) {
            isCorrect = userInput === currentQuestion.correctAnswer;
        } else {
            isCorrect = normalizeAnswer(userInput) === normalizeAnswer(currentQuestion.correctAnswer);
        }
        
        setFeedback(isCorrect ? 'correct' : 'incorrect');
        setSessionResults(prev => [...prev, { rowId: currentQuestion.rowId, isCorrect, timestamp: Date.now(), hintUsed: !!hint.text }]);

        if (!isCorrect && userSettings.journalMode === 'automatic') {
            handleSaveToJournal(`Study Session: ${tables.find(t=>t.id === currentQuestion.tableId)?.name}`, `*Q: ${currentQuestion.questionText}*\n*A: ${currentQuestion.correctAnswer}*`);
            setIsJournaled(true);
        }
    };
    
    const handleNextQuestion = () => {
        if (currentIndex < session.questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setUserInput('');
            setFeedback(null);
            setHint({ text: '', isLoading: false });
            setIsJournaled(false);
        } else {
            const durationSeconds = Math.round((Date.now() - session.startTime) / 1000);
            handleEndSession(sessionResults, durationSeconds);
        }
    };

    const handleQuit = () => {
        const remainingQueue = session.questions.slice(currentIndex);
        const durationSeconds = Math.round((Date.now() - session.startTime) / 1000);
        handleSessionQuit(sessionResults, durationSeconds, remainingQueue);
    };

    const getHint = async () => {
        setHint({ text: '', isLoading: true });
        try {
            const hintText = await generateHint(currentQuestion.correctAnswer, currentQuestion.questionText);
            setHint({ text: hintText, isLoading: false });
        } catch(e) {
            showToast("Could not get hint.", "error");
            setHint({ text: '', isLoading: false });
        }
    }

    const renderAnswerInput = () => {
        switch (currentQuestion.type) {
            case StudyMode.Typing:
                return <input type="text" value={userInput} onChange={e => setUserInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !isAnswered && handleCheckAnswer()} disabled={isAnswered} autoFocus className="w-full text-center bg-secondary-100 dark:bg-secondary-700 border-2 border-secondary-300 dark:border-secondary-600 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />;
            case StudyMode.MultipleChoice:
                return <div className="grid grid-cols-2 gap-3">{currentQuestion.options?.map(option => <button key={option} onClick={() => setUserInput(option)} disabled={isAnswered} className={`p-4 rounded-lg text-left text-sm font-semibold transition-all ${userInput === option ? 'ring-2 ring-primary-500 bg-primary-500/10' : 'bg-surface dark:bg-secondary-800 border border-secondary-200/80 dark:border-secondary-700/50 hover:border-primary-400'}`}>{option}</button>)}</div>;
            case StudyMode.TrueFalse:
                return <div className="flex justify-center gap-4">{['True', 'False'].map(option => <button key={option} onClick={() => setUserInput(option)} disabled={isAnswered} className={`px-12 py-4 rounded-lg font-bold text-lg transition-all ${userInput === option ? 'ring-2 ring-primary-500 bg-primary-500/10' : 'bg-surface dark:bg-secondary-800 border border-secondary-200/80 dark:border-secondary-700/50 hover:border-primary-400'}`}>{option}</button>)}</div>;
            default: return null;
        }
    };
    
    return (
        <div className="fixed inset-0 bg-background dark:bg-secondary-900 flex flex-col items-center p-4 transition-colors duration-300">
            <header className="w-full max-w-2xl">
                <div className="flex justify-between items-center text-text-subtle mb-2">
                    <span>Question {currentIndex + 1} of {session.questions.length}</span>
                    <button onClick={() => setIsQuitting(true)} className="hover:text-text-main dark:hover:text-secondary-100 transition-colors">Quit</button>
                </div>
                <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-2.5"><div className="bg-primary-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div></div>
            </header>
            <main className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl">
                <div className="w-full text-center mb-6">
                    <p className="text-sm text-text-subtle mb-2">{currentQuestion.questionSourceColumnNames.join(' / ')}</p>
                    <h1 className="text-3xl font-bold text-text-main dark:text-secondary-100">{currentQuestion.questionText}</h1>
                    {currentQuestion.type === StudyMode.TrueFalse && <p className="text-2xl mt-2 text-text-subtle">"{currentQuestion.proposedAnswer}"</p>}
                </div>
                <div className="w-full mb-6">
                    {renderAnswerInput()}
                </div>
                {!isAnswered ? (
                    <button onClick={handleCheckAnswer} disabled={!userInput} className="w-full bg-primary-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50">Check</button>
                ) : (
                    <div className="w-full animate-fadeIn space-y-4">
                        <div className={`p-4 rounded-lg text-center ${feedback === 'correct' ? 'bg-success-500/10 text-success-700 dark:text-success-300' : 'bg-error-500/10 text-error-700 dark:text-error-300'}`}>
                            <p className="font-bold text-lg">{feedback === 'correct' ? 'Correct!' : 'Incorrect'}</p>
                            {feedback === 'incorrect' && <p className="mt-1">Correct answer: <span className="font-bold">{currentQuestion.correctAnswer}</span></p>}
                        </div>
                        <button onClick={handleNextQuestion} autoFocus className="w-full bg-primary-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors">Next</button>
                    </div>
                )}
            </main>
            <footer className="w-full max-w-2xl flex justify-between items-center">
                 <div className="flex gap-2">
                    <button onClick={getHint} disabled={hint.isLoading || !!hint.text} className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm transition-colors bg-surface dark:bg-secondary-800 border-secondary-300 dark:border-secondary-600 text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 disabled:opacity-50">
                        {hint.isLoading ? <Icon name="spinner" className="w-4 h-4 animate-spin"/> : <Icon name="sparkles" className="w-4 h-4"/>} Hint
                    </button>
                    <button onClick={() => { handleSaveToJournal(`Study Session: ${tables.find(t=>t.id === currentQuestion.tableId)?.name}`, `*Q: ${currentQuestion.questionText}*\n*A: ${currentQuestion.correctAnswer}*`); setIsJournaled(true); }} disabled={isJournaled} className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm transition-colors bg-surface dark:bg-secondary-800 border-secondary-300 dark:border-secondary-600 text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 disabled:opacity-50">
                        <Icon name="book" className="w-4 h-4"/> {isJournaled ? 'Saved' : 'Save'}
                    </button>
                </div>
                {hint.text && <p className="text-xs text-text-subtle text-right max-w-xs truncate" title={hint.text}>{hint.text}</p>}
            </footer>
             <ConfirmationModal isOpen={isQuitting} onClose={() => setIsQuitting(false)} onConfirm={handleQuit} title="Quit Session?" message="Are you sure you want to end this session early? Your progress will be saved, but you'll receive a small XP penalty." confirmText="Quit Session" />
        </div>
    );
};

export default StudySessionScreen;
