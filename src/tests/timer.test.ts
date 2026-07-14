import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LeetCodeTimer } from '../core/timer';

describe('timer.ts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with an empty/default state', () => {
    const timer = new LeetCodeTimer();
    const state = timer.getState();

    expect(state.activeProblemSlug).toBeNull();
    expect(state.activeProblemTitle).toBeNull();
    expect(state.startTime).toBeNull();
    expect(state.accumulatedTime).toBe(0);
    expect(state.isPaused).toBe(false);
  });

  it('should start a timer and compute elapsed time correctly', () => {
    const timer = new LeetCodeTimer();
    const startTime = 1000000;
    vi.setSystemTime(startTime);

    timer.start('two-sum', 'Two Sum', 'Easy');
    
    // Advance time by 5 seconds (5000 ms)
    vi.setSystemTime(startTime + 5000);
    
    expect(timer.getElapsedMs()).toBe(5000);
    expect(timer.getState().isPaused).toBe(false);
    expect(timer.getState().startTime).toBe(startTime);
  });

  it('should pause and resume without losing accumulated time', () => {
    const timer = new LeetCodeTimer();
    const startTime = 1000000;
    vi.setSystemTime(startTime);

    timer.start('two-sum', 'Two Sum', 'Easy');
    
    // Solve for 10 seconds
    vi.setSystemTime(startTime + 10000);
    timer.pause(); // Accumulated: 10000 ms

    expect(timer.getElapsedMs()).toBe(10000);
    expect(timer.getState().isPaused).toBe(true);
    expect(timer.getState().startTime).toBeNull();

    // Wait 5 seconds while paused
    vi.setSystemTime(startTime + 15000);
    expect(timer.getElapsedMs()).toBe(10000); // Should still be 10s

    // Resume
    timer.resume();
    expect(timer.getState().isPaused).toBe(false);

    // Solve for another 5 seconds
    vi.setSystemTime(startTime + 20000);
    expect(timer.getElapsedMs()).toBe(15000); // 10s + 5s = 15s
  });

  it('should return final duration and reset state on stop', () => {
    const timer = new LeetCodeTimer();
    const startTime = 1000000;
    vi.setSystemTime(startTime);

    timer.start('two-sum', 'Two Sum', 'Easy');
    vi.setSystemTime(startTime + 12000);
    
    const finalDuration = timer.stop();
    expect(finalDuration).toBe(12000);
    expect(timer.getElapsedMs()).toBe(0);
    expect(timer.getState().activeProblemSlug).toBeNull();
  });
});
