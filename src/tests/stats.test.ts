import { describe, it, expect } from 'vitest';
import { createInitialStats, addSubmissionToStats, formatDate, getDaysDifference } from '../core/stats';
import { SubmissionResult } from '../core/types';

describe('stats.ts', () => {
  it('should create initial stats with all zero values', () => {
    const stats = createInitialStats();
    expect(stats.solvedCount.Easy).toBe(0);
    expect(stats.solvedCount.Total).toBe(0);
    expect(stats.dailyStreak).toBe(0);
    expect(stats.lastSolvedDate).toBeNull();
    expect(stats.recentSolvedSlugs).toHaveLength(0);
  });

  it('should format timestamps to YYYY-MM-DD correctly', () => {
    // 2026-07-08T14:10:45 in timestamp (approx 1783586445000 depending on TZ, let's construct explicit UTC/Local date)
    const date = new Date(2026, 6, 8); // July 8, 2026 (Month is 0-indexed)
    expect(formatDate(date.getTime())).toBe('2026-07-08');
  });

  it('should track attempts and solves correctly', () => {
    const stats = createInitialStats();
    const sub1: SubmissionResult = {
      id: '1',
      problemSlug: 'two-sum',
      problemTitle: 'Two Sum',
      difficulty: 'Easy',
      status: 'Wrong Answer',
      language: 'javascript',
      timestamp: new Date(2026, 6, 8, 10, 0, 0).getTime(),
      timeSpentMs: 60000 // 1 minute
    };

    // First attempt (Wrong Answer)
    const stats1 = addSubmissionToStats(stats, sub1, [sub1]);
    expect(stats1.attemptedCount.Easy).toBe(1);
    expect(stats1.attemptedCount.Total).toBe(1);
    expect(stats1.solvedCount.Easy).toBe(0);
    expect(stats1.solvedCount.Total).toBe(0);
    expect(stats1.totalTimeSpent).toBe(60000);

    // Second attempt (Accepted)
    const sub2: SubmissionResult = {
      id: '2',
      problemSlug: 'two-sum',
      problemTitle: 'Two Sum',
      difficulty: 'Easy',
      status: 'Accepted',
      language: 'javascript',
      timestamp: new Date(2026, 6, 8, 10, 5, 0).getTime(),
      timeSpentMs: 30000 // 30 seconds
    };

    const stats2 = addSubmissionToStats(stats1, sub2, [sub1, sub2]);
    expect(stats2.attemptedCount.Easy).toBe(1); // Still 1 unique attempted
    expect(stats2.solvedCount.Easy).toBe(1);
    expect(stats2.solvedCount.Total).toBe(1);
    expect(stats2.recentSolvedSlugs).toContain('two-sum');
    expect(stats2.totalTimeSpent).toBe(90000);
    expect(stats2.dailyStreak).toBe(1);
    expect(stats2.lastSolvedDate).toBe('2026-07-08');
  });

  it('should handle streak calculations on consecutive and non-consecutive days', () => {
    let stats = createInitialStats();
    
    // Solve 1 on Day 1
    const sub1: SubmissionResult = {
      id: '1',
      problemSlug: 'two-sum',
      problemTitle: 'Two Sum',
      difficulty: 'Easy',
      status: 'Accepted',
      language: 'javascript',
      timestamp: new Date(2026, 6, 8, 12, 0, 0).getTime(), // July 8
      timeSpentMs: 5000
    };
    stats = addSubmissionToStats(stats, sub1, [sub1]);
    expect(stats.dailyStreak).toBe(1);
    expect(stats.lastSolvedDate).toBe('2026-07-08');

    // Solve 2 on the same Day 1 (streak should not change)
    const sub2: SubmissionResult = {
      id: '2',
      problemSlug: 'add-two-numbers',
      problemTitle: 'Add Two Numbers',
      difficulty: 'Medium',
      status: 'Accepted',
      language: 'javascript',
      timestamp: new Date(2026, 6, 8, 15, 0, 0).getTime(), // July 8
      timeSpentMs: 10000
    };
    stats = addSubmissionToStats(stats, sub2, [sub1, sub2]);
    expect(stats.dailyStreak).toBe(1);

    // Solve 3 on Day 2 (consecutive day, streak should increase)
    const sub3: SubmissionResult = {
      id: '3',
      problemSlug: 'longest-substring-without-repeating-characters',
      problemTitle: 'Longest Substring',
      difficulty: 'Medium',
      status: 'Accepted',
      language: 'javascript',
      timestamp: new Date(2026, 6, 9, 12, 0, 0).getTime(), // July 9
      timeSpentMs: 15000
    };
    stats = addSubmissionToStats(stats, sub3, [sub1, sub2, sub3]);
    expect(stats.dailyStreak).toBe(2);
    expect(stats.lastSolvedDate).toBe('2026-07-09');

    // Solve 4 on Day 4 (gap day, streak resets to 1)
    const sub4: SubmissionResult = {
      id: '4',
      problemSlug: 'median-of-two-sorted-arrays',
      problemTitle: 'Median of Two Sorted Arrays',
      difficulty: 'Hard',
      status: 'Accepted',
      language: 'javascript',
      timestamp: new Date(2026, 6, 11, 12, 0, 0).getTime(), // July 11
      timeSpentMs: 20000
    };
    stats = addSubmissionToStats(stats, sub4, [sub1, sub2, sub3, sub4]);
    expect(stats.dailyStreak).toBe(1);
    expect(stats.lastSolvedDate).toBe('2026-07-11');
  });
});
