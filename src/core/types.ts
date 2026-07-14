export interface ProblemInfo {
  title: string;
  slug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
}

export type SubmissionStatus =
  | 'Accepted'
  | 'Wrong Answer'
  | 'Time Limit Exceeded'
  | 'Runtime Error'
  | 'Compile Error'
  | 'Memory Limit Exceeded'
  | 'Other';

export interface SubmissionResult {
  id: string; // unique submission id or timestamp
  problemSlug: string;
  problemTitle: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  status: SubmissionStatus;
  language: string;
  runtime?: string;
  memory?: string;
  code?: string;
  timestamp: number; // ms since epoch
  timeSpentMs?: number; // focus time spent on this submission
}

export interface TimerState {
  activeProblemSlug: string | null;
  activeProblemTitle: string | null;
  activeProblemDifficulty: 'Easy' | 'Medium' | 'Hard' | null;
  startTime: number | null; // null if paused/stopped
  accumulatedTime: number; // ms spent before current resume
  isPaused: boolean;
}

export interface DifficultyStats {
  Easy: number;
  Medium: number;
  Hard: number;
  Total: number;
}

export interface UserStats {
  solvedCount: DifficultyStats;
  attemptedCount: DifficultyStats;
  dailyStreak: number;
  lastSolvedDate: string | null; // 'YYYY-MM-DD'
  totalTimeSpent: number; // ms
  recentSolvedSlugs: string[]; // checklist of unique solved problem slugs
}

export interface AutomationState {
  status: 'idle' | 'scraping' | 'solving' | 'injecting' | 'submitting' | 'success' | 'error';
  errorMsg?: string;
  problemTitle?: string;
}

export interface AppSettings {
  openRouterApiKey: string;
  pushMethod: 'local-git' | 'github-api';
  githubToken: string;
  githubRepo: string;
  githubPath: string;
}

export interface StorageData {
  stats: UserStats;
  history: SubmissionResult[];
  timer: TimerState;
  automationState?: AutomationState;
  settings?: AppSettings;
}

