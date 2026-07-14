// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { parseProblemInfo, parseSubmissionResult, parseCodeEditor } from '../core/parser';

describe('parser.ts', () => {
  describe('parseProblemInfo', () => {
    it('should parse modern LeetCode problem layout correctly', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="text-title-large">1. Two Sum</div>
        <div class="text-easy">Easy</div>
        <div data-track-load="description_content">
          <p>Given an array of integers...</p>
        </div>
      `;

      const result = parseProblemInfo(container, '/problems/two-sum/description/');
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Two Sum');
      expect(result?.slug).toBe('two-sum');
      expect(result?.difficulty).toBe('Easy');
      expect(result?.description).toContain('Given an array of integers...');
    });

    it('should parse medium difficulty with dynamic green/yellow classes', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="text-title-large">15. 3Sum</div>
        <div class="text-medium text-yellow">Medium</div>
      `;

      const result = parseProblemInfo(container, '/problems/3sum/');
      expect(result).not.toBeNull();
      expect(result?.title).toBe('3Sum');
      expect(result?.slug).toBe('3sum');
      expect(result?.difficulty).toBe('Medium');
    });

    it('should fall back to slug if title container is missing', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="text-hard text-red">Hard</div>
      `;

      const result = parseProblemInfo(container, '/problems/median-of-two-sorted-arrays/');
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Median Of Two Sorted Arrays');
      expect(result?.slug).toBe('median-of-two-sorted-arrays');
      expect(result?.difficulty).toBe('Hard');
    });
  });

  describe('parseSubmissionResult', () => {
    it('should parse Accepted submission results', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div data-e2e-locator="submission-result">Accepted</div>
        <div>Runtime 15 ms</div>
        <div>Memory 48.3 MB</div>
      `;

      const result = parseSubmissionResult(container);
      expect(result).not.toBeNull();
      expect(result?.status).toBe('Accepted');
      expect(result?.runtime).toBe('15 ms');
      expect(result?.memory).toBe('48.3 MB');
    });

    it('should parse Wrong Answer submission results', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div data-e2e-locator="submission-result">Wrong Answer</div>
        <div>50 / 60 testcases passed</div>
      `;

      const result = parseSubmissionResult(container);
      expect(result).not.toBeNull();
      expect(result?.status).toBe('Wrong Answer');
      expect(result?.runtime).toBeUndefined();
      expect(result?.memory).toBeUndefined();
    });

    it('should parse Time Limit Exceeded', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="status__15LT">Time Limit Exceeded</div>
      `;

      const result = parseSubmissionResult(container);
      expect(result).not.toBeNull();
      expect(result?.status).toBe('Time Limit Exceeded');
    });
  });

  describe('parseCodeEditor', () => {
    it('should extract code from view-line elements (Monaco)', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="view-line">function twoSum(nums, target) {</div>
        <div class="view-line">    return [0, 1];</div>
        <div class="view-line">}</div>
      `;

      const result = parseCodeEditor(container);
      expect(result).toBe('function twoSum(nums, target) {\n    return [0, 1];\n}');
    });

    it('should extract code from textarea fallback if view-line is missing', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <textarea class="inputarea">print("Hello world")</textarea>
      `;

      const result = parseCodeEditor(container);
      expect(result).toBe('print("Hello world")');
    });
  });
});
