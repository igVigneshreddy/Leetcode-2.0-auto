import { TimerState } from './types';

export class LeetCodeTimer {
  private state: TimerState;

  constructor(initialState?: TimerState) {
    this.state = initialState || {
      activeProblemSlug: null,
      activeProblemTitle: null,
      activeProblemDifficulty: null,
      startTime: null,
      accumulatedTime: 0,
      isPaused: false
    };
  }

  getState(): TimerState {
    return { ...this.state };
  }

  start(slug: string, title: string, difficulty: 'Easy' | 'Medium' | 'Hard') {
    const now = Date.now();
    if (this.state.activeProblemSlug === slug) {
      if (this.state.isPaused) {
        // Resume
        this.state.startTime = now;
        this.state.isPaused = false;
      }
      return;
    }

    // New problem timer start
    this.state = {
      activeProblemSlug: slug,
      activeProblemTitle: title,
      activeProblemDifficulty: difficulty,
      startTime: now,
      accumulatedTime: 0,
      isPaused: false
    };
  }

  pause() {
    if (this.state.startTime && !this.state.isPaused) {
      this.state.accumulatedTime += Date.now() - this.state.startTime;
      this.state.startTime = null;
      this.state.isPaused = true;
    }
  }

  resume() {
    if (this.state.activeProblemSlug && this.state.isPaused) {
      this.state.startTime = Date.now();
      this.state.isPaused = false;
    }
  }

  stop(): number {
    let finalTime = this.state.accumulatedTime;
    if (this.state.startTime && !this.state.isPaused) {
      finalTime += Date.now() - this.state.startTime;
    }
    this.reset();
    return finalTime;
  }

  reset() {
    this.state = {
      activeProblemSlug: null,
      activeProblemTitle: null,
      activeProblemDifficulty: null,
      startTime: null,
      accumulatedTime: 0,
      isPaused: false
    };
  }

  getElapsedMs(): number {
    if (!this.state.activeProblemSlug) return 0;
    let elapsed = this.state.accumulatedTime;
    if (this.state.startTime && !this.state.isPaused) {
      elapsed += Date.now() - this.state.startTime;
    }
    return elapsed;
  }
}
