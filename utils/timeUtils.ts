import { HistoryLogItem } from '../types';

export const calculateTotalPracticeSeconds = (history: HistoryLogItem[]): number => {
    const practiceTypes: HistoryLogItem['type'][] = [
        'session_complete',
        'session_quit',
        'theater_session_complete',
        'scramble_session_complete',
        'dictation_session_complete',
    ];

    return history.reduce((sum, item) => {
        if (practiceTypes.includes(item.type) && item.durationSeconds) {
            return sum + item.durationSeconds;
        }
        return sum;
    }, 0);
};
