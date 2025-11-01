

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { LibraryTable, VocabRow, VocabTable, VocabRowStats } from '../types';
import { SearchIcon, SpinnerIcon, DownloadIcon, UserIcon, TagIcon } from '../components/Icons';
import Modal from '../components/Modal';
import { User } from '@supabase/supabase-js';


interface LibraryScreenProps {
  onDownloadTable: (table: VocabTable) => void;
  user: User | null;
}

const LibraryTableCard: React.FC<{ table: LibraryTable, onClick: () => void }> = ({ table, onClick }) => (
    <div
        onClick={onClick}
        className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 transition-all duration-200 hover:shadow-md hover:border-cyan-400 cursor-pointer flex flex-col justify-between"
    >
        <div>
            <h3 className="text-lg font-bold text-cyan-600 truncate">{table.name}</h3>
            <p className="text-xs text-slate-400 mt-1">by {table.author_name}</p>
            <p className="text-sm text-slate-600 mt-2 h-10 overflow-hidden text-ellipsis">{table.description}</p>
            <div className="flex flex-wrap gap-1 mt-3">
                {(Array.isArray(table.tags) ? table.tags : []).slice(0, 3).map(tag => (
                    <span key={tag} className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{tag}</span>
                ))}
            </div>
        </div>
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100 text-sm text-slate-500">
            <span>{table.word_count} words</span>
            <span className="flex items-center gap-1.5">
                <DownloadIcon /> {table.downloads}
            </span>
        </div>
    </div>
);

const LibraryScreen: React.FC<LibraryScreenProps> = ({ onDownloadTable, user }) => {
    const [libraryTables, setLibraryTables] = useState<LibraryTable[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'downloads' | 'created_at'>('downloads');
    const [selectedTable, setSelectedTable] = useState<LibraryTable | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        const fetchLibraryTables = async () => {
            setIsLoading(true);
            setError(null);
            const { data, error } = await supabase
                .from('library_tables')
                .select('*')
                .order(sortBy, { ascending: false });

            if (error) {
                setError('Could not fetch tables from the library. Please try again later.');
                console.error(error);
            } else {
                setLibraryTables(data as LibraryTable[]);
            }
            setIsLoading(false);
        };
        fetchLibraryTables();
    }, [sortBy]);
    
    const filteredTables = useMemo(() => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return libraryTables.filter(table =>
            (table.name || '').toLowerCase().includes(lowerCaseSearchTerm) ||
            (table.description || '').toLowerCase().includes(lowerCaseSearchTerm) ||
            (Array.isArray(table.tags) ? table.tags : []).some(tag => (tag || '').toLowerCase().includes(lowerCaseSearchTerm))
        );
    }, [libraryTables, searchTerm]);

    const handleDownload = async (table: LibraryTable) => {
        if (!user) {
            alert("Please sign in to download tables from the library.");
            return;
        }
        if (isDownloading) return;
        setIsDownloading(true);

        const defaultStats: VocabRowStats = { Passed1: 0, Passed2: 0, Failed: 0, TotalAttempt: 0, SuccessRate: 0, FailureRate: 0, RankPoint: 0, Level: 1, InQueue: 0, QuitQueue: false, LastPracticeDate: null, flashcardStatus: null, flashcardEncounters: 0, flashcardRatings: { again: 0, hard: 0, good: 0, easy: 0, perfect: 0 } };
        const tableData = table.table_data;
        const tableToImport: VocabTable = {
            id: `tbl-imported-${Date.now()}`,
            name: table.name,
            wordCount: table.word_count,
            avgRankPoint: 0,
            avgFailureRate: 0,
            columns: tableData.columns || [],
            rows: (tableData.rows || []).map((row: VocabRow, i: number) => ({
                ...row,
                id: `row-imported-${Date.now()}-${i}`,
                stats: { ...defaultStats } // Ensure stats are reset
            })),
            isDemo: false,
        };

        onDownloadTable(tableToImport);

        // Increment download count
        const { error: updateError } = await supabase
            .from('library_tables')
            .update({ downloads: table.downloads + 1 })
            .eq('id', table.id);

        if (updateError) {
            console.error("Failed to update download count:", updateError);
        } else {
            // Update local state to reflect change immediately
            setLibraryTables(prev => prev.map(t => t.id === table.id ? { ...t, downloads: t.downloads + 1 } : t));
        }

        setIsDownloading(false);
        setSelectedTable(null);
    };

    return (
        <div>
            <header className="mb-6">
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Community Library</h1>
                <p className="mt-2 text-lg text-slate-500">Browse and download vocabulary tables shared by other users.</p>
            </header>

            <div className="mb-6 p-2 bg-slate-100 rounded-lg flex flex-wrap gap-2 justify-between items-center">
                <div className="relative flex-grow min-w-[200px]">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search tables..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md"
                    />
                </div>
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'downloads' | 'created_at')}
                    className="bg-white border border-slate-300 text-slate-700 text-sm font-semibold py-2 px-3 rounded-md"
                >
                    <option value="downloads">Most Popular</option>
                    <option value="created_at">Newest</option>
                </select>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <SpinnerIcon className="w-8 h-8 text-cyan-600 animate-spin-fast" />
                </div>
            ) : error ? (
                <div className="text-center py-12 bg-red-50 text-red-700 rounded-lg border-2 border-dashed border-red-200">
                    <h3 className="text-xl font-semibold">An Error Occurred</h3>
                    <p className="mt-2">{error}</p>
                </div>
            ) : filteredTables.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed">
                    <h3 className="text-xl font-semibold text-slate-700">No Tables Found</h3>
                    <p className="text-slate-500 mt-2">{searchTerm ? 'Try adjusting your search or filter.' : 'The library is empty. Be the first to share a table!'}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTables.map(table => (
                        <LibraryTableCard key={table.id} table={table} onClick={() => setSelectedTable(table)} />
                    ))}
                </div>
            )}

            {selectedTable && (
                 <Modal isOpen={!!selectedTable} onClose={() => setSelectedTable(null)} title={selectedTable.name}>
                    <div className="space-y-4">
                        <div>
                            <p className="text-slate-600 whitespace-pre-wrap">{selectedTable.description}</p>
                            <div className="flex justify-between items-center mt-4 text-sm text-slate-500">
                                <span className="flex items-center gap-2"><UserIcon className="w-4 h-4" /> {selectedTable.author_name}</span>
                                <span className="flex items-center gap-2"><DownloadIcon /> {selectedTable.downloads} Downloads</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                                {(Array.isArray(selectedTable.tags) ? selectedTable.tags : []).map(tag => (
                                    <span key={tag} className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-full flex items-center gap-1">
                                        <TagIcon className="w-3 h-3" /> {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                        
                        <div>
                            <h4 className="text-md font-bold text-slate-800 mb-2">Word Preview</h4>
                            <div className="space-y-2 p-3 bg-slate-50 border rounded-md max-h-48 overflow-y-auto">
                                {selectedTable.table_data.rows.slice(0, 5).map(row => (
                                    <div key={row.id} className="flex justify-between items-center text-sm p-1">
                                        <span className="font-semibold text-slate-700 truncate pr-4">{row.cols[selectedTable.table_data.columns[0]]}</span>
                                        <span className="text-slate-500 truncate">{row.cols[selectedTable.table_data.columns[1]] || ''}</span>
                                    </div>
                                ))}
                                {selectedTable.word_count > 5 && <p className="text-center text-xs text-slate-400 pt-2">...and {selectedTable.word_count - 5} more words.</p>}
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-4 border-t">
                             <button onClick={() => setSelectedTable(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-6 rounded-lg">Close</button>
                            <button
                                onClick={() => handleDownload(selectedTable)}
                                disabled={isDownloading || !user}
                                className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
                            >
                                {isDownloading ? <SpinnerIcon className="w-5 h-5 animate-spin-fast" /> : <DownloadIcon />}
                                Add to my Tables
                            </button>
                        </div>
                        {!user && <p className="text-center text-sm text-amber-700 bg-amber-50 p-2 rounded-md -mt-2">You must be signed in to download tables.</p>}
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default LibraryScreen;