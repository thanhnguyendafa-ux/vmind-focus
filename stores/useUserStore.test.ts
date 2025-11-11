// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useUserStore } from './useUserStore';
import { useUIStore } from './useUIStore';
import { UserStats } from '../types';
import { BADGES } from '../constants';

// Declare test globals to satisfy TypeScript in environments without full test runner types.
declare var describe: (name: string, fn: () => void) => void;
declare var it: (name: string, fn: () => void) => void;
declare var expect: (actual: any) => any;
declare var beforeEach: (fn: () => void) => void;
declare var vi: any;

const defaultStats: UserStats = { xp: 0, level: 1, studyStreak: 0, lastSessionDate: null, activity: {}, totalStudyTimeSeconds: 0, unlockedBadges: [] };
const defaultSettings = { journalMode: 'manual' as const };

// Mock the UI store to spy on its methods
vi.mock('./useUIStore', () => ({
  useUIStore: {
    getState: vi.fn(() => ({
      setUnlockedBadgeNotification: vi.fn(),
    })),
  }
}));

describe('useUserStore', () => {

  beforeEach(() => {
    act(() => {
      useUserStore.setState({
        stats: JSON.parse(JSON.stringify(defaultStats)), // Deep copy to prevent mutation across tests
        settings: defaultSettings,
        session: null,
        isGuest: false,
        loading: false,
      });
    });
    vi.clearAllMocks();
  });

  it('should update stats correctly from a session', () => {
    const durationSeconds = 600; // 10 minutes
    const xpGained = 50;
    const penalty = 10;

    act(() => {
      useUserStore.getState().updateStatsFromSession(durationSeconds, xpGained, penalty);
    });

    const { stats } = useUserStore.getState();
    const todayStr = new Date().toISOString().split('T')[0];

    expect(stats.xp).toBe(40); // 50 - 10
    expect(stats.level).toBe(1);
    expect(stats.totalStudyTimeSeconds).toBe(600);
    expect(stats.activity[todayStr]).toBe(600);
    expect(stats.studyStreak).toBe(1);
  });

  it('should increase level when XP threshold is crossed', () => {
    act(() => {
        // Set initial XP to be close to leveling up
        useUserStore.setState({ stats: { ...defaultStats, xp: 980 }});
    });

    act(() => {
      useUserStore.getState().updateStatsFromSession(60, 30, 0); // Gain 30 XP
    });

    const { stats } = useUserStore.getState();
    expect(stats.xp).toBe(1010);
    expect(stats.level).toBe(2);
  });

  it('should unlock a badge when criteria are met and notify the UI', () => {
    const xpBadge = BADGES.find(b => b.id === 'xp-1'); // Earn 100 XP
    expect(xpBadge).toBeDefined();

    act(() => {
      useUserStore.getState().updateStatsFromSession(300, 120, 0); // Gain 120 XP
    });

    const { stats } = useUserStore.getState();
    expect(stats.xp).toBe(120);
    expect(stats.unlockedBadges).toContain('xp-1');
    
    const setUnlockedBadgeNotificationMock = useUIStore.getState().setUnlockedBadgeNotification;
    expect(setUnlockedBadgeNotificationMock).toHaveBeenCalledWith(xpBadge);
  });
  
  it('should not notify for an already unlocked badge', () => {
     act(() => {
        useUserStore.setState({ stats: { ...defaultStats, unlockedBadges: ['xp-1'] }});
    });

    act(() => {
      useUserStore.getState().updateStatsFromSession(300, 150, 0);
    });

    const setUnlockedBadgeNotificationMock = useUIStore.getState().setUnlockedBadgeNotification;
    expect(setUnlockedBadgeNotificationMock).not.toHaveBeenCalled();
  });
});
