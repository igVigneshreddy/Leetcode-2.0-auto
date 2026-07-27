import { parseProblemInfo, parseSubmissionResult, parseCodeEditor, extractSlugFromUrl } from '../core/parser';
import { ProblemInfo, SubmissionResult } from '../core/types';

let currentProblem: ProblemInfo | null = null;
let pollInterval: NodeJS.Timeout | null = null;

// Scrape the editor's selected language
function detectLanguage(root: HTMLElement): string {
  // Query language dropdown button or text on LeetCode's editor header
  const buttons = root.querySelectorAll('button');
  const commonLanguages = [
    'c++', 'java', 'python', 'python3', 'c#', 'javascript', 'typescript',
    'c', 'go', 'rust', 'ruby', 'scala', 'kotlin', 'swift', 'php',
    'erlang', 'elixir', 'racket', 'ocaml', 'dart', 'mysql', 'ms sql server',
    'oracle', 'postgresql', 'pandas', 'bash'
  ];

  for (const btn of buttons) {
    const txt = btn.textContent?.trim().toLowerCase().replace(/\s+/g, ' ') || '';
    if (commonLanguages.includes(txt)) {
      return btn.textContent?.trim() || 'Unknown';
    }
  }

  // Fallback selector check
  const langEl = root.querySelector('[class*="language-select"]');
  if (langEl && langEl.textContent) {
    return langEl.textContent.trim();
  }

  return 'JavaScript';
}

function handlePageLoad() {
  const pathname = window.location.pathname;
  const slug = extractSlugFromUrl(pathname);

  if (!slug) {
    currentProblem = null;
    return;
  }

  // If we already parsed this problem, just make sure we keep tracking
  if (currentProblem && currentProblem.slug === slug) {
    checkForSubmissions();
    return;
  }

  // Try to parse problem details from page
  const parsed = parseProblemInfo(document.body, pathname);
  if (parsed && parsed.title && parsed.difficulty !== null) {
    currentProblem = parsed;
    console.log('Parsed problem info:', currentProblem);
    
    // Notify background script that problem is loaded
    chrome.runtime.sendMessage({
      type: 'PROBLEM_LOADED',
      problem: currentProblem
    }, (response) => {
      console.log('PROBLEM_LOADED response from background:', response);
    });
  }
}

function checkForSubmissions() {
  if (!currentProblem) return;

  // Modern Leetcode results element locator
  const resultEl = document.querySelector('[data-e2e-locator="submission-result"]') ||
                   document.querySelector('.status__15LT') ||
                   document.querySelector('.result-container');

  if (resultEl) {
    const isProcessed = resultEl.getAttribute('data-leetcode-flow-processed') === 'true';
    if (!isProcessed) {
      // Mark as processed immediately to prevent double processing
      resultEl.setAttribute('data-leetcode-flow-processed', 'true');

      // Add a small delay to allow runtime and memory elements to populate
      setTimeout(() => {
        const parsedResult = parseSubmissionResult(document.body);
        if (parsedResult) {
          const code = parseCodeEditor(document.body) || '';
          const lang = detectLanguage(document.body);
          
          const submission: SubmissionResult = {
            id: Date.now().toString(),
            problemSlug: currentProblem!.slug,
            problemTitle: currentProblem!.title,
            difficulty: currentProblem!.difficulty,
            status: parsedResult.status,
            language: lang,
            runtime: parsedResult.runtime,
            memory: parsedResult.memory,
            code: code,
            timestamp: Date.now()
          };

          console.log('Sending submission to background:', submission);

          chrome.runtime.sendMessage({
            type: 'SUBMISSION_DETECTED',
            submission
          }, (response) => {
            console.log('SUBMISSION_DETECTED response:', response);
          });
        }
      }, 800);
    }
  } else {
    // If the submission result container doesn't exist, we can reset processed status flags
    // on next run when it re-appears. But since React creates new elements, this is usually handled.
  }
}

// Set up page observer & periodic check for single page app navigation
function startObserver() {
  if (pollInterval) clearInterval(pollInterval);

  // Poll frequently since page loads asynchronously and SPA transitions occur without full reload
  pollInterval = setInterval(() => {
    handlePageLoad();
    checkForSubmissions();
  }, 1500);
}

// Start tracking
console.log('LeetCode Flow Content Script loaded.');
startObserver();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message.type);

  if (message.type === 'GET_PROBLEM_DETAILS') {
    const pathname = window.location.pathname;
    const slug = extractSlugFromUrl(pathname);
    if (!slug) {
      sendResponse({ success: false, error: 'Not on a LeetCode problem page.' });
      return true;
    }

    const info = parseProblemInfo(document.body, pathname);
    const starterCode = parseCodeEditor(document.body) || '';
    const language = detectLanguage(document.body);

    sendResponse({
      success: true,
      info,
      starterCode,
      language
    });
    return true;
  }

  if (message.type === 'CHECK_IF_SOLVED') {
    let isSolved = false;

    // 1. Look for SVG check circle or check icons
    const svgs = document.querySelectorAll('svg');
    for (const svg of svgs) {
      const parentClass = svg.parentElement?.className || '';
      const iconAttr = svg.getAttribute('data-icon') || '';
      if (
        iconAttr.includes('check') || 
        svg.innerHTML.includes('check') || 
        svg.classList.contains('text-brand-success') || 
        svg.classList.contains('text-green-s') ||
        parentClass.includes('text-brand-success') ||
        parentClass.includes('text-green-s')
      ) {
        let el: HTMLElement | null = svg;
        while (el && el !== document.body) {
          if (el.className && (el.className.includes('title') || el.className.includes('question'))) {
            isSolved = true;
            break;
          }
          el = el.parentElement;
        }
        if (isSolved) break;
      }
    }

    // 2. Check if a green checkmark or text "Solved" exists near the title
    if (!isSolved) {
      const successIcons = document.querySelectorAll('.text-brand-success, .text-green-s');
      for (const el of successIcons) {
        let parent: HTMLElement | null = el as HTMLElement;
        while (parent && parent !== document.body) {
          if (parent.className && (parent.className.includes('title') || parent.className.includes('question'))) {
            isSolved = true;
            break;
          }
          parent = parent.parentElement;
        }
        if (isSolved) break;
      }
    }

    sendResponse({ isSolved });
    return true;
  }
});

