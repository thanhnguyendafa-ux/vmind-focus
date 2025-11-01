import { VocabRow } from "../types";

const getDaysSince = (isoDate: string | null): number => {
    if (!isoDate) return Infinity; // Treat null dates as very old
    const date = new Date(isoDate);
    const today = new Date();
    // To ignore time part
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(today.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const g = (daysSincePractice: number): number => {
    if (daysSincePractice < 2) return 0.1;
    if (daysSincePractice < 5) return 0.5;
    if (daysSincePractice < 10) return 0.8;
    return 1.0;
};

const h = (quitQueue: boolean): number => {
    return quitQueue ? 1.0 : 0;
};

export const calculatePriorityScore = (row: VocabRow, maxInQueue: number): number => {
    const { RankPoint, FailureRate, Level, InQueue, QuitQueue, LastPracticeDate } = row.stats;

    const rankComponent = 0.2 * (1 / (RankPoint + 1));
    const failureComponent = 0.2 * FailureRate;
    const levelComponent = 0.1 * (1 / (Level + 1));
    const daysSincePractice = getDaysSince(LastPracticeDate);
    const practiceDateComponent = 0.2 * g(daysSincePractice);
    const quitQueueComponent = 0.2 * h(QuitQueue);
    const normalizedInQueue = maxInQueue > 0 ? InQueue / maxInQueue : 0;
    const inQueueComponent = 0.1 * (1 - normalizedInQueue);

    return rankComponent + failureComponent + levelComponent + practiceDateComponent + quitQueueComponent + inQueueComponent;
};
