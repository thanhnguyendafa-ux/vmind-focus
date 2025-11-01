import { TimeMilestone } from '../types';
import {
    TimeBadgeIcon01, TimeBadgeIcon02, TimeBadgeIcon03, TimeBadgeIcon04, TimeBadgeIcon05,
    TimeBadgeIcon06, TimeBadgeIcon07, TimeBadgeIcon08, TimeBadgeIcon09, TimeBadgeIcon10
} from '../components/Icons';

const fibonacciHours = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946, 17711, 28657, 46368, 75025, 121393];

const names = [
    "Time Novice", "Dedicated Learner", "Consistent Scholar", "Focused Adept", "Endurance Student",
    "Persistent Scribe", "Devoted Researcher", "Time-Tested Savant", "Sage of Hours", "Master of Moments",
    "Chronos Enthusiast", "Temporal Expert", "Epochal Linguist", "Eon Etymologist", "Millennial Philologist",
    "Aeon Grammarian", "Eternal Rhetorician", "Timeless Dialectician", "Infinite Philosopher", "Perpetual Prodigy",
    "Boundless Polymath", "Unending Illuminatus", "Everlasting Chronicler", "Immortal Oracle", "Timelord of Words"
];

const icons = [
    TimeBadgeIcon01, TimeBadgeIcon02, TimeBadgeIcon03, TimeBadgeIcon04, TimeBadgeIcon05,
    TimeBadgeIcon06, TimeBadgeIcon07, TimeBadgeIcon08, TimeBadgeIcon09, TimeBadgeIcon10
];

export const timeMilestones: TimeMilestone[] = fibonacciHours.map((hours, index) => ({
    id: `time-milestone-${index}`,
    hoursThreshold: hours,
    name: `${names[index] || 'Time Master'}`,
    description: `Unlocked by practicing for a total of ${hours.toLocaleString()} hours.`,
    icon: icons[index % icons.length],
}));
