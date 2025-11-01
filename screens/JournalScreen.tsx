


import React, { useState, useEffect } from 'react';
import { JournalData, JournalDay } from '../types';
import { ChevronDownIcon, PrintIcon } from '../components/Icons';
import Modal from '../components/Modal';

interface JournalScreenProps {
    journal: JournalData;
    setJournal: React.Dispatch<React.SetStateAction<JournalData>>;
    onActiveJournalChange: (date: string | null) => void;
}

const formatDateForNote = (dateStr: string): string => {
    const date = new Date(dateStr);
    // Add timezone offset to get correct date in local time
    const adjustedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
    const mm = (adjustedDate.getMonth() + 1).toString().padStart(2, '0');
    const dd = adjustedDate.getDate().toString().padStart(2, '0');
    const yy = adjustedDate.getFullYear().toString().slice(-2);
    return `${mm}/${dd}/${yy}`;
}

const PrintModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    journal: JournalData;
    sortedDates: string[];
}> = ({ isOpen, onClose, journal, sortedDates }) => {
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && sortedDates.length > 0) {
            setSelectedDate(sortedDates[0]);
        }
    }, [isOpen, sortedDates]);

    const handleExportTxt = () => {
        if (!selectedDate) return;
        const note = journal[selectedDate]?.note || '';
        const blob = new Blob([note], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `journal_${selectedDate}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        onClose();
    };

    const handlePrintPdf = () => {
        if (!selectedDate) return;
        const note = journal[selectedDate]?.note || '';
        const printableContent = `
            <html>
                <head>
                    <title>Journal Entry - ${selectedDate}</title>
                    <style>
                        body { font-family: sans-serif; line-height: 1.5; color: #333; padding: 1em; }
                        h1 { color: #111; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem; }
                        pre { 
                            white-space: pre-wrap; 
                            word-wrap: break-word; 
                            background: #f8f9fa; 
                            padding: 1em; 
                            border-radius: 5px; 
                            border: 1px solid #e9ecef;
                            font-family: monospace;
                        }
                    </style>
                </head>
                <body>
                    <h1>Journal Entry for ${formatDateForNote(selectedDate)}</h1>
                    <pre>${note.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printableContent);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        } else {
            alert("Could not open print window. Please check your browser's pop-up settings.");
        }
        onClose();
    };


    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Print or Export Journal Entry">
            <div className="space-y-4">
                <div>
                    <label htmlFor="date-select" className="block text-sm font-semibold text-gray-700 mb-1">Select a date</label>
                    <select
                        id="date-select"
                        value={selectedDate || ''}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                        {sortedDates.map(date => (
                            <option key={date} value={date}>{formatDateForNote(date)}</option>
                        ))}
                    </select>
                </div>
                {selectedDate && (
                    <div className="p-3 bg-slate-50 border rounded-md max-h-48 overflow-y-auto">
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{journal[selectedDate]?.note.substring(0, 300)}...</p>
                    </div>
                )}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
                    <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">Cancel</button>
                    <button onClick={handleExportTxt} disabled={!selectedDate} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-300">Export as TXT</button>
                    <button onClick={handlePrintPdf} disabled={!selectedDate} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-300">Print to PDF</button>
                </div>
            </div>
        </Modal>
    );
};

const NoteItem: React.FC<{
    date: string;
    dayData: JournalDay;
    onNoteChange: (date: string, note: string) => void;
    isExpanded: boolean;
    onToggleExpand: () => void;
}> = ({ date, dayData, onNoteChange, isExpanded, onToggleExpand }) => {
    
    const snippet = dayData.note.substring(0, 100) + (dayData.note.length > 100 ? '...' : '');

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 transition-shadow hover:shadow-md">
            <div className="p-4 flex items-center justify-between cursor-pointer" onClick={onToggleExpand}>
                <div className="flex-grow min-w-0 pr-4">
                    <h3 className="font-bold text-lg text-slate-800">{formatDateForNote(date)}</h3>
                    {!isExpanded && <p className="text-sm text-slate-500 mt-1 truncate">{snippet}</p>}
                </div>
                <div
                    className="p-2 rounded-full hover:bg-slate-100 flex-shrink-0"
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? "Collapse note" : "Expand note"}
                >
                    <ChevronDownIcon className={`w-6 h-6 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
            </div>
            {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-200 animate-scale-in">
                    <textarea
                        value={dayData.note || ''}
                        onChange={(e) => onNoteChange(date, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Empty note..."
                        className="mt-4 w-full p-4 bg-amber-50/50 border-amber-200 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono text-base h-[50vh] resize-y"
                        autoFocus
                    />
                </div>
            )}
        </div>
    );
};

const JournalScreen: React.FC<JournalScreenProps> = ({ journal, setJournal, onActiveJournalChange }) => {
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [expandedDate, setExpandedDate] = useState<string | null>(null);

    useEffect(() => {
        onActiveJournalChange(expandedDate);
        return () => onActiveJournalChange(null);
    }, [expandedDate, onActiveJournalChange]);
    
    const sortedDates = React.useMemo(() => {
        return Object.keys(journal).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    }, [journal]);

    const handleNoteChange = (date: string, note: string) => {
        setJournal(prev => ({
            ...prev,
            [date]: {
                ...(prev[date] || { note: '' }),
                note,
            }
        }));
    };

    const handleToggleExpand = (date: string) => {
        setExpandedDate(prev => (prev === date ? null : date));
    };

    return (
        <div className="flex flex-col h-full">
            <header className="mb-8 flex-shrink-0 flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Journal</h1>
                    <p className="mt-2 text-lg text-slate-500">Your personal log of reviewed vocabulary.</p>
                </div>
                {sortedDates.length > 0 && (
                     <button 
                        onClick={() => setIsPrintModalOpen(true)}
                        className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg flex items-center gap-2"
                    >
                        <PrintIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">Print / Export</span>
                    </button>
                )}
            </header>
            
            {sortedDates.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-lg border-2 border-dashed">
                    <h3 className="text-xl font-semibold text-slate-700">Your Journal is Empty</h3>
                    <p className="text-slate-500 mt-2">Start a study session to log your progress.</p>
                </div>
            ) : (
                <div className="space-y-3 overflow-y-auto pb-4">
                    {sortedDates.map(date => (
                       <NoteItem
                            key={date}
                            date={date}
                            dayData={journal[date]}
                            onNoteChange={handleNoteChange}
                            isExpanded={expandedDate === date}
                            onToggleExpand={() => handleToggleExpand(date)}
                       />
                    ))}
                </div>
            )}
             <PrintModal
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                journal={journal}
                sortedDates={sortedDates}
            />
        </div>
    );
};

export default JournalScreen;