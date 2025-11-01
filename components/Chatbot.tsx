import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatContext, ChatMessage, VocabRow } from '../types';
import { ChatIcon, CloseIcon, SendIcon, SparklesIcon, SpinnerIcon, UserIcon, BookmarkIcon, BookmarkFilledIcon } from './Icons';
import { generateAiContent } from '../utils/gemini';

interface ChatbotProps {
  context: ChatContext;
  userApiKey: string | null;
  onAddToJournal: (content: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  initialQuery: string | null;
  onQueryHandled: () => void;
}

const Chatbot: React.FC<ChatbotProps> = ({ context, userApiKey, onAddToJournal, isOpen, setIsOpen, initialQuery, onQueryHandled }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [justSavedIndex, setJustSavedIndex] = useState<number | null>(null);
  const [toastInfo, setToastInfo] = useState<{ message: string; key: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (isOpen) {
      if (userApiKey) {
        if (messages.length === 0) {
            setMessages([
                { role: 'model', content: "Hi! I'm Vmind, your AI vocabulary assistant. How can I help you today?" }
            ]);
        }
      } else {
        setMessages([
            { role: 'model', content: "Hello! To activate me, please go to the Settings screen and enter your Gemini API key." }
        ]);
      }
    }
  }, [isOpen, userApiKey, messages.length]);

  const createFullPrompt = useCallback((input: string): string => {
    let contextString = "You are Vmind, a helpful and friendly AI vocabulary learning assistant integrated into a web app. ";

    if (context.screen) {
      contextString += `The user is currently on the "${context.screen}" screen. `;
    }
    
    if (context.subScreen) {
      contextString += `A popup window or sub-view named "${context.subScreen}" is also open. `;
    }

    if (context.currentWord) {
      const { cols } = context.currentWord;
      const word = cols[Object.keys(cols)[0]] || 'N/A';
      const definition = cols['Definition'] || cols['definition'] || 'not available';
      contextString += `They are looking at the word "${word}" (meaning: "${definition}"). Be ready to answer questions about this specific word. `;
    }

    if (context.journalDate && context.journalContent) {
      const snippet = context.journalContent.substring(0, 250);
      contextString += `They are viewing a journal entry for ${context.journalDate}. The entry starts with: "${snippet}...". `;
    }
    
    contextString += `\n\nBased on this context, answer the user's question concisely, helpfully, and in a conversational tone.\n\nUser: "${input}"\n\nAI Assistant Vmind:`;
    return contextString;
  }, [context]);
  
  const handleSend = useCallback(async (query: string) => {
    if (!query || isLoading || !userApiKey) return;

    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setIsLoading(true);

    try {
        const fullPrompt = createFullPrompt(query);
        const response = await generateAiContent(fullPrompt, userApiKey);
        setMessages(prev => [...prev, { role: 'model', content: response }]);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        setMessages(prev => [...prev, { role: 'model', content: `Sorry, I ran into an issue: ${errorMessage}` }]);
    } finally {
        setIsLoading(false);
    }
  }, [isLoading, userApiKey, createFullPrompt]);
  
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = userInput.trim();
    if(trimmedInput) {
        handleSend(trimmedInput);
        setUserInput('');
    }
  };

  useEffect(() => {
    if (isOpen && initialQuery) {
        handleSend(initialQuery);
        onQueryHandled();
    }
  }, [isOpen, initialQuery, handleSend, onQueryHandled]);


  const handleAddToJournalClick = (content: string, index: number) => {
      onAddToJournal(content);
      setJustSavedIndex(index);
      setToastInfo({ message: 'Đã thêm vào journal!', key: Date.now() });
      setTimeout(() => {
        setJustSavedIndex(null);
        setToastInfo(null);
      }, 1500);
  };

  const SuggestionButton: React.FC<{ text: string }> = ({ text }) => (
    <button
        onClick={() => setUserInput(text)}
        disabled={!userApiKey}
        className="px-3 py-1.5 bg-slate-200 text-slate-700 text-sm font-semibold rounded-full hover:bg-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
        {text}
    </button>
  );

  const getSuggestions = () => {
    if (context.currentWord) {
        return ["Explain this word simply", "Give me a mnemonic", "Use it in a story"];
    }
    if (context.screen === 'Journal') {
        return ["Summarize this entry", "Suggest related words", "Check for grammar mistakes"];
    }
    return ["Give me a study tip", "Explain 'mnemonics'", "Suggest a new word to learn"];
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 w-16 h-16 bg-teal-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 z-50"
        aria-label="Open AI Assistant"
      >
        <ChatIcon />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
            <div className="relative bg-slate-100 w-full max-w-2xl h-[85vh] rounded-t-2xl shadow-2xl flex flex-col animate-slide-in-up">
                 {toastInfo && (
                    <div key={toastInfo.key} className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-sm font-semibold py-2 px-4 rounded-full shadow-lg z-10 animate-toast-in-out">
                        {toastInfo.message}
                    </div>
                )}
                <header className="flex justify-between items-center p-4 border-b border-slate-200 bg-white rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <SparklesIcon className="w-6 h-6 text-teal-600" />
                        <h2 className="text-xl font-bold text-slate-800">Vmind AI Assistant</h2>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600"><CloseIcon /></button>
                </header>

                <main className="flex-grow p-4 overflow-y-auto">
                    <div className="space-y-4">
                        {messages.map((msg, index) => (
                          <div key={index} className={`flex items-start gap-3 w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              {msg.role === 'model' ? (
                                  <>
                                      <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center flex-shrink-0"><SparklesIcon className="w-5 h-5" /></div>
                                      <div className="max-w-md p-3 rounded-2xl bg-white text-slate-800 rounded-bl-none border">
                                          <p className="whitespace-pre-wrap">{msg.content}</p>
                                      </div>
                                      <button
                                          onClick={() => handleAddToJournalClick(msg.content, index)}
                                          className="p-2 rounded-full text-slate-400 hover:bg-slate-200 hover:text-amber-500 self-center"
                                          aria-label="Add to Journal"
                                      >
                                          {justSavedIndex === index ? (
                                              <BookmarkFilledIcon className="w-5 h-5 text-amber-500" />
                                          ) : (
                                              <BookmarkIcon className="w-5 h-5" />
                                          )}
                                      </button>
                                  </>
                              ) : (
                                  <>
                                     <button
                                          onClick={() => handleAddToJournalClick(msg.content, index)}
                                          className="p-2 rounded-full text-slate-400 hover:bg-slate-200 hover:text-amber-500 self-center"
                                          aria-label="Add to Journal"
                                      >
                                          {justSavedIndex === index ? (
                                              <BookmarkFilledIcon className="w-5 h-5 text-amber-500" />
                                          ) : (
                                              <BookmarkIcon className="w-5 h-5" />
                                          )}
                                      </button>
                                      <div className="max-w-md p-3 rounded-2xl bg-teal-700 text-white rounded-br-none">
                                          <p className="whitespace-pre-wrap">{msg.content}</p>
                                      </div>
                                      <div className="w-8 h-8 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center flex-shrink-0"><UserIcon className="w-5 h-5"/></div>
                                  </>
                              )}
                          </div>
                        ))}
                        {isLoading && (
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center flex-shrink-0"><SparklesIcon className="w-5 h-5" /></div>
                                <div className="max-w-md p-3 rounded-2xl bg-white text-slate-800 rounded-bl-none border flex items-center gap-2">
                                    <SpinnerIcon className="w-5 h-5 animate-spin-fast text-slate-400" />
                                    <span>Thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    {messages.length <= 1 && userApiKey && (
                        <div className="text-center p-4">
                            <h4 className="font-semibold text-slate-600 mb-3">Try asking:</h4>
                            <div className="flex flex-wrap justify-center gap-2">
                                {getSuggestions().map(s => <SuggestionButton key={s} text={s} />)}
                            </div>
                        </div>
                    )}
                </main>

                <footer className="p-4 border-t border-slate-200 bg-white">
                    <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder={!userApiKey ? "Set your API key in Settings..." : "Ask anything..."}
                            className="w-full px-4 py-2 text-slate-800 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100"
                            disabled={isLoading || !userApiKey}
                        />
                        <button type="submit" disabled={isLoading || !userInput.trim() || !userApiKey} className="w-11 h-11 bg-teal-700 text-white rounded-full flex items-center justify-center flex-shrink-0 disabled:bg-slate-300">
                            <SendIcon className="w-5 h-5" />
                        </button>
                    </form>
                </footer>
            </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
