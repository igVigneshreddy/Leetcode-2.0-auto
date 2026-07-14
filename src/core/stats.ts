import { UserStats, SubmissionResult, DifficultyStats } from './types';

export function createInitialStats(): UserStats {
  return {
    solvedCount: { Easy: 0, Medium: 0, Hard: 0, Total: 0 },
    attemptedCount: { Easy: 0, Medium: 0, Hard: 0, Total: 0 },
    dailyStreak: 0,
    lastSolvedDate: null,
    totalTimeSpent: 0,
    recentSolvedSlugs: []
  };
}

/**
 * Returns date in YYYY-MM-DD format relative to given timestamp.
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates date difference in days between two YYYY-MM-DD dates.
 */
export function getDaysDifference(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Adds a new submission and updates user statistics.
 * Pure function: does not modify inputs, returns a new UserStats object.
 */
export function addSubmissionToStats(
  currentStats: UserStats,
  submission: SubmissionResult,
  allSubmissions: SubmissionResult[]
): UserStats {
  const stats = JSON.parse(JSON.stringify(currentStats)) as UserStats;

  // Add time spent
  if (submission.timeSpentMs) {
    stats.totalTimeSpent += submission.timeSpentMs;
  }

  const slug = submission.problemSlug;
  const diff = submission.difficulty;

  // Track attempted count (unique problems attempted)
  const hasAttemptedBefore = allSubmissions.some(
    s => s.problemSlug === slug && s.id !== submission.id
  );
  if (!hasAttemptedBefore) {
    stats.attemptedCount[diff] += 1;
    stats.attemptedCount.Total += 1;
  }

  // If accepted, track solved count and daily streak
  if (submission.status === 'Accepted') {
    const isAlreadySolved = stats.recentSolvedSlugs.includes(slug);
    if (!isAlreadySolved) {
      stats.solvedCount[diff] += 1;
      stats.solvedCount.Total += 1;
      stats.recentSolvedSlugs.push(slug);

      // Daily streak logic
      const solvedDateStr = formatDate(submission.timestamp);
      if (!stats.lastSolvedDate) {
        stats.dailyStreak = 1;
      } else {
        const daysDiff = getDaysDifference(stats.lastSolvedDate, solvedDateStr);
        if (daysDiff === 1) {
          // Solved on the consecutive day
          stats.dailyStreak += 1;
        } else if (daysDiff > 1) {
          // Streak broken
          stats.dailyStreak = 1;
        }
        // If daysDiff === 0 (same day), streak remains the same
      }
      stats.lastSolvedDate = solvedDateStr;
    }
  }

  return stats;
}
