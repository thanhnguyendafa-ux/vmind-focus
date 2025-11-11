import * as React from 'react';
import { FlashcardProgress, VocabRow, FlashcardStatus } from '../../../types';
import Modal from '../../../components/ui/Modal';
import Icon from '../../../components/ui/Icon';
import { useTableStore } from '../../../stores/useTableStore';

interface FlashcardProgressStatsModalProps {
  progress: FlashcardProgress;
  onClose: () => void;
}

const statusColors: { [key in FlashcardStatus]: { bg: string; text: string } } = {
  [FlashcardStatus.New]: { bg: 'bg-secondary-200 dark:bg-secondary-700', text: 'text-secondary-600 dark:text-secondary-300' },
  [FlashcardStatus.Again]: { bg: 'bg-error-200 dark:bg-error-900', text: 'text-error-700 dark:text-error-300' },
  [FlashcardStatus.Hard]: { bg: 'bg-orange-200 dark:bg-orange-900', text: 'text-orange-700 dark:text-orange-300' },
  [FlashcardStatus.Good]: { bg: 'bg-blue-200 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300' },
  [FlashcardStatus.Easy]: { bg: 'bg-green-200 dark:bg-green-900', text: 'text-green-700 dark:text-green-300' },
  [FlashcardStatus.Perfect]: { bg: 'bg-purple-200 dark:bg-purple-900', text: 'text-purple-700 dark:text-purple-300' },
  [FlashcardStatus.Superb]: { bg: 'bg-purple-200 dark:bg-purple-900', text: 'text-purple-700 dark:text-purple-300' },
};


const FlashcardProgressStatsModal: React.FC<FlashcardProgressStatsModalProps> = ({ progress, onClose }) => {
  const { tables } = useTableStore();

  const stats = React.useMemo(() => {
    const allRowsMap = new Map<string, VocabRow>();
    tables.forEach(table => {
      // FIX: Ensure rows exist before iterating to prevent runtime errors with newly created tables.
      if (table.rows) {
        table.rows.forEach(row => allRowsMap.set(row.id, row));
      }
    });

    const progressRows = progress.queue.map(rowId => allRowsMap.get(rowId)).filter((r): r is VocabRow => !!r);
    
    const totalCards = progress.queue.length;
    
    const statusCounts: { [key in FlashcardStatus]: number } = {
      [FlashcardStatus.New]: 0,
      [FlashcardStatus.Again]: 0,
      [FlashcardStatus.Hard]: 0,
      [FlashcardStatus.Good]: 0,
      [FlashcardStatus.Easy]: 0,
      [FlashcardStatus.Perfect]: 0,
      [FlashcardStatus.Superb]: 0,
    };

    progressRows.forEach(row => {
      // FIX: Safely access flashcardStatus, providing a default to prevent errors if the stat is missing.
      const status = row.stats?.flashcardStatus || FlashcardStatus.New;
      statusCounts[status]++;
    });
    
    const newCards = statusCounts[FlashcardStatus.New];
    const seenCards = totalCards - newCards;
    const completionPercent = totalCards > 0 ? (seenCards / totalCards) * 100 : 0;
    
    const sourceTableNames = tables
      .filter(t => progress.tableIds.includes(t.id))
      .map(t => t.name);

    return {
      totalCards,
      statusCounts,
      newCards,
      seenCards,
      completionPercent,
      sourceTableNames,
    };
  }, [progress, tables]);

  return (
    <Modal isOpen={true} onClose={onClose} title={`Statistics for "${progress.name}"`}>
      <div className="p-6 space-y-6 bg-secondary-50 dark:bg-secondary-900/50">
        
        {/* Overview section */}
        <div>
          <h3 className="text-lg font-semibold text-text-main dark:text-secondary-100 mb-2">Overview</h3>
          <div className="bg-surface dark:bg-secondary-800 border border-secondary-200/80 dark:border-secondary-700/50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
                <span className="text-text-subtle">Total Cards</span>
                <span className="font-bold">{stats.totalCards}</span>
            </div>
            <div>
              <div className="flex justify-between items-center text-xs text-text-subtle mb-1">
                <span>Completion</span>
                <span>{stats.seenCards} / {stats.totalCards} cards seen</span>
              </div>
              <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
                <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${stats.completionPercent}%` }}></div>
              </div>
              <p className="text-right text-xs text-text-subtle mt-1">{stats.completionPercent.toFixed(0)}% Complete</p>
            </div>
          </div>
        </div>

        {/* Status Breakdown section */}
        <div>
          <h3 className="text-lg font-semibold text-text-main dark:text-secondary-100 mb-2">Status Breakdown</h3>
          <div className="bg-surface dark:bg-secondary-800 border border-secondary-200/80 dark:border-secondary-700/50 rounded-lg p-4 grid grid-cols-2 gap-x-4 gap-y-2">
            {(Object.keys(stats.statusCounts) as FlashcardStatus[]).map(status => {
              const count = stats.statusCounts[status];
              if (count === 0) return null;
              return (
                <div key={status} className="flex justify-between items-center text-sm">
                  <span className={`px-2 py-0.5 rounded-full font-semibold text-xs ${statusColors[status].bg} ${statusColors[status].text}`}>
                    {status}
                  </span>
                  <span className="font-medium text-secondary-600 dark:text-secondary-300">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Sources section */}
        <div>
          <h3 className="text-lg font-semibold text-text-main dark:text-secondary-100 mb-2">Sources</h3>
          <div className="bg-surface dark:bg-secondary-800 border border-secondary-200/80 dark:border-secondary-700/50 rounded-lg p-4 space-y-1">
            {stats.sourceTableNames.map(name => (
              <p key={name} className="text-sm text-text-subtle">- {name}</p>
            ))}
             {progress.tags.length > 0 && (
                <div className="pt-2 mt-2 border-t border-secondary-200/80 dark:border-secondary-700/50">
                    <p className="text-xs font-bold text-text-subtle">Tags:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {progress.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 rounded text-xs font-semibold bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300">{tag}</span>
                        ))}
                    </div>
                </div>
             )}
          </div>
        </div>
        
      </div>
    </Modal>
  );
};

export default FlashcardProgressStatsModal;