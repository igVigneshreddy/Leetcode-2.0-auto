import { ProblemInfo, SubmissionResult, SubmissionStatus } from './types';

/**
 * Extracts problem slug from a URL path.
 * Example: "/problems/two-sum/description/" -> "two-sum"
 */
export function extractSlugFromUrl(pathname: string): string | null {
  const match = pathname.match(/\/problems\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Parses problem details from the LeetCode DOM.
 * Accepts a root element to facilitate isolated unit testing.
 */
export function parseProblemInfo(root: HTMLElement, pathname: string): ProblemInfo | null {
  const slug = extractSlugFromUrl(pathname);
  if (!slug) return null;

  // Title scraping
  // Modern LeetCode: <div class="text-title-large"> or <a> element with problem link
  let title = '';
  const titleEl = root.querySelector('.text-title-large') || 
                  root.querySelector('[data-cy="question-title"]') ||
                  root.querySelector('div.flex.layout-title');
  
  if (titleEl) {
    title = titleEl.textContent?.trim() || '';
  } else {
    // Fallback: try to find h4 or title from page headers
    const h4El = root.querySelector('h4');
    if (h4El) {
      title = h4El.textContent?.trim() || '';
    }
  }

  // Clean title (remove numbers like "1. Two Sum" -> "Two Sum")
  if (title) {
    title = title.replace(/^\d+\.\s*/, '');
  } else {
    // Ultimate fallback: generate from slug
    title = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  // Difficulty scraping
  let difficulty: 'Easy' | 'Medium' | 'Hard' = 'Easy';
  const textContent = root.textContent || '';
  
  // Look for text or classes indicating difficulty
  // Modern LeetCode difficulty tags contain specific classes or text
  const easyEl = root.querySelector('.text-easy, .text-brand-success, [class*="text-green"]');
  const mediumEl = root.querySelector('.text-medium, .text-brand-warning, [class*="text-yellow"]');
  const hardEl = root.querySelector('.text-hard, .text-brand-danger, [class*="text-red"]');

  if (easyEl && easyEl.textContent?.includes('Easy')) {
    difficulty = 'Easy';
  } else if (mediumEl && mediumEl.textContent?.includes('Medium')) {
    difficulty = 'Medium';
  } else if (hardEl && hardEl.textContent?.includes('Hard')) {
    difficulty = 'Hard';
  } else {
    // Search the text content for fallback matching
    if (/easy/i.test(textContent) && !/medium/i.test(textContent) && !/hard/i.test(textContent)) {
      difficulty = 'Easy';
    } else if (/medium/i.test(textContent)) {
      difficulty = 'Medium';
    } else if (/hard/i.test(textContent)) {
      difficulty = 'Hard';
    }
  }

  // Description scraping
  const descEl = root.querySelector('[data-track-load="description_content"]') || 
                 root.querySelector('.question-content') ||
                 root.querySelector('.content__u3e1');
  const description = descEl?.textContent?.trim() || 'No description found.';

  return {
    title,
    slug,
    difficulty,
    description
  };
}

/**
 * Extracts submission status from LeetCode submission response or DOM state.
 */
export function parseSubmissionResult(root: HTMLElement): {
  status: SubmissionStatus;
  runtime?: string;
  memory?: string;
} | null {
  // Check for submission result indicators in the DOM
  // Modern Leetcode layout uses data-e2e-locator="submission-result"
  const resultEl = root.querySelector('[data-e2e-locator="submission-result"]') ||
                   root.querySelector('.status__15LT') ||
                   root.querySelector('.result-container');
  
  if (!resultEl) return null;

  const rawStatus = resultEl.textContent?.trim() || '';
  let status: SubmissionStatus = 'Other';

  if (/Accepted/i.test(rawStatus)) {
    status = 'Accepted';
  } else if (/Wrong Answer/i.test(rawStatus)) {
    status = 'Wrong Answer';
  } else if (/Time Limit Exceeded/i.test(rawStatus) || /TLE/i.test(rawStatus)) {
    status = 'Time Limit Exceeded';
  } else if (/Runtime Error/i.test(rawStatus)) {
    status = 'Runtime Error';
  } else if (/Compile Error/i.test(rawStatus)) {
    status = 'Compile Error';
  } else if (/Memory Limit Exceeded/i.test(rawStatus) || /MLE/i.test(rawStatus)) {
    status = 'Memory Limit Exceeded';
  }

  // Parse runtime and memory
  let runtime: string | undefined;
  let memory: string | undefined;

  // Modern UI has elements like div containing "Runtime" and "Memory"
  const text = root.textContent || '';
  const runtimeMatch = text.match(/Runtime\s*([0-9.]+)\s*(ms)/i) || text.match(/([0-9.]+)\s*ms/i);
  if (runtimeMatch) {
    runtime = `${runtimeMatch[1]} ${runtimeMatch[2]}`;
  }

  const memoryMatch = text.match(/Memory\s*([0-9.]+)\s*(MB)/i) || text.match(/([0-9.]+)\s*MB/i);
  if (memoryMatch) {
    memory = `${memoryMatch[1]} ${memoryMatch[2]}`;
  }

  return {
    status,
    runtime,
    memory
  };
}

/**
 * Scraping the editor content.
 * LeetCode uses Monaco Editor. Text is stored in divs with class `view-line`.
 */
export function parseCodeEditor(root: HTMLElement): string | null {
  const lines = root.querySelectorAll('.view-line');
  if (lines.length === 0) {
    // Try fallback of looking for textarea
    const textarea = root.querySelector('textarea.inputarea') as HTMLTextAreaElement;
    if (textarea && textarea.value) {
      return textarea.value;
    }
    return null;
  }
  
  const codeLines: string[] = [];
  lines.forEach(line => {
    codeLines.push(line.textContent || '');
  });
  return codeLines.join('\n');
}
