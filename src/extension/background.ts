import { LeetCodeTimer } from '../core/timer';
import { createInitialStats, addSubmissionToStats } from '../core/stats';
import { StorageData, SubmissionResult, ProblemInfo, TimerState, UserStats, AutomationState, AppSettings } from '../core/types';

let timer: LeetCodeTimer = new LeetCodeTimer();
let stats: UserStats = createInitialStats();
let history: SubmissionResult[] = [];
let automationState: AutomationState = { status: 'idle' };
let settings: AppSettings = {
  openRouterApiKey: '',
  pushMethod: 'local-git',
  githubToken: '',
  githubRepo: '',
  githubPath: '',
  autoSolveNext: false
};
let autoSolveCount: number = 0;
let visitedSlugsInCycle: string[] = [];
let lastProcessedLanguage = '';

// Initialize state from storage
chrome.storage.local.get(['stats', 'history', 'timer', 'automationState', 'settings', 'autoSolveCount'], (result) => {
  if (result.stats) stats = result.stats;
  if (result.history) history = result.history;
  if (result.automationState) automationState = result.automationState;
  if (result.settings) settings = result.settings;
  if (result.autoSolveCount !== undefined) autoSolveCount = result.autoSolveCount;
  
  // Rehydrate timer state if exists
  if (result.timer) {
    timer = new LeetCodeTimer(result.timer);
  }
  console.log('Background state initialized:', { stats, history, timerState: timer.getState(), automationState, settings, autoSolveCount });
});

// Helper to save complete state to storage
function saveState() {
  const data: StorageData = {
    stats,
    history,
    timer: timer.getState(),
    automationState,
    settings
  };
  chrome.storage.local.set({ ...data, autoSolveCount });
}

// Helper to broadcast state updates to popup/tabs
function broadcastStateUpdate() {
  chrome.runtime.sendMessage({
    type: 'STATE_UPDATED',
    stats,
    history,
    timer: timer.getState(),
    automationState,
    settings
  }).catch(() => {
    // Ignore errors when no popup is open to receive
  });

  // Also notify the active tab's content script to sync page widgets
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (activeTab && activeTab.id) {
      chrome.tabs.sendMessage(activeTab.id, {
        type: 'STATE_UPDATED',
        automationState,
        settings
      }).catch(() => {
        // Ignore errors if the tab is not loaded or doesn't have listener
      });
    }
  });
}

async function runSolveAndSubmitFlow(tabId: number) {
  automationState = { status: 'scraping' };
  saveState();
  broadcastStateUpdate();

  chrome.tabs.sendMessage(tabId, { type: 'GET_PROBLEM_DETAILS' }, async (response) => {
    if (!response || !response.success) {
      automationState = {
        status: 'error',
        errorMsg: response?.error || 'Make sure you are on a LeetCode problem page and it is loaded.'
      };
      saveState();
      broadcastStateUpdate();
      return;
    }

    const { info, starterCode, language } = response;
    automationState.status = 'solving';
    automationState.problemTitle = info.title;
    saveState();
    broadcastStateUpdate();

    try {
      const solveRes = await fetch('http://localhost:8080/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: info.title,
          slug: info.slug,
          difficulty: info.difficulty,
          description: info.description,
          language,
          starterCode,
          apiKey: settings.openRouterApiKey
        })
      });

      if (!solveRes.ok) {
        const errData = await solveRes.json();
        throw new Error(errData.error || `Server returned status ${solveRes.status}`);
      }

      const solveData = await solveRes.json();
      if (!solveData.success) {
        throw new Error(solveData.error || 'Solve request failed on server.');
      }

      automationState.status = 'injecting';
      saveState();
      broadcastStateUpdate();

      // Inject code via scripting in the MAIN world context to interface with Monaco Editor API
      await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: (codeToInject) => {
          try {
            const models = (window as any).monaco?.editor?.getModels();
            if (models && models.length > 0) {
              models.forEach((model: any) => {
                model.setValue(codeToInject);
              });
              return true;
            }
          } catch (e) {
            console.error('Failed to set Monaco value:', e);
          }
          
          // Fallback for mock editor or standard textarea
          try {
            const editorBox = document.getElementById('monaco-editor');
            if (editorBox) {
              editorBox.innerHTML = '';
              const lines = codeToInject.split('\n');
              lines.forEach(line => {
                const div = document.createElement('div');
                div.className = 'view-line';
                div.textContent = line;
                editorBox.appendChild(div);
              });
              return true;
            }
          } catch (e) {
            console.error('Failed to set fallback editor value:', e);
          }
          return false;
        },
        args: [solveData.code]
      });

      // Wait 1000ms and click submit via scripting API
      setTimeout(async () => {
        try {
          await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
              const submitBtn = document.querySelector('button[data-e2e-locator="console-submit-button"]') || 
                                document.querySelector('button.submit__24vi') ||
                                document.getElementById('submit-btn');
              if (submitBtn) {
                (submitBtn as HTMLElement).click();
                return true;
              }
              return false;
            }
          });

          automationState.status = 'submitting';
          saveState();
          broadcastStateUpdate();
        } catch (err: any) {
          automationState = {
            status: 'error',
            errorMsg: `Failed to trigger submit: ${err.message}`
          };
          saveState();
          broadcastStateUpdate();
        }
      }, 300);
    } catch (err: any) {
      let errorMsg = err.message || 'An error occurred during solving.';
      if (errorMsg === 'Failed to fetch' || errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
        errorMsg = 'Failed to connect to local server. Please make sure the backend is running by executing "node server.js" in the project directory.';
      }
      automationState = {
        status: 'error',
        errorMsg
      };
      saveState();
      broadcastStateUpdate();
    }
  });
}

async function triggerNextQuestion(tabId: number) {
  console.log('[Background] Navigating to the next question...');
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        let nextBtn = document.querySelector('[data-e2e-locator="next-question-btn"]') ||
                      document.querySelector('.next-question-btn') ||
                      document.querySelector('.next-btn') ||
                      document.querySelector('a[href*="/problems/"][class*="next"]');
                      
        if (!nextBtn) {
          nextBtn = document.querySelector('[aria-label*="Next problem"]') ||
                    document.querySelector('[title*="Next problem"]') ||
                    document.querySelector('[aria-label*="Next Question"]') ||
                    document.querySelector('[title*="Next Question"]') ||
                    document.querySelector('[aria-label*="Next"]') ||
                    document.querySelector('[title*="Next"]');
        }
        
        if (!nextBtn) {
          const SVGs = document.querySelectorAll('svg');
          for (const svg of SVGs) {
            if (svg.innerHTML.includes('chevron-right') || svg.innerHTML.includes('arrow-right') || svg.getAttribute('data-icon') === 'chevron-right') {
              let parent = svg.parentElement;
              while (parent && parent !== document.body) {
                if (parent.tagName === 'A' || parent.tagName === 'BUTTON') {
                  const parentText = parent.textContent?.trim().toLowerCase() || '';
                  if (!parentText.includes('run') && !parentText.includes('submit')) {
                    nextBtn = parent;
                    break;
                  }
                }
                parent = parent.parentElement;
              }
              if (nextBtn) break;
            }
          }
        }

        if (!nextBtn) {
          const anchors = document.querySelectorAll('a, button');
          for (const el of anchors) {
            const text = el.textContent?.trim().toLowerCase() || '';
            if (text === 'next' || text === 'next question' || text === 'next problem') {
              nextBtn = el;
              break;
            }
          }
        }

        if (nextBtn) {
          (nextBtn as HTMLElement).click();
          return true;
        }
        return false;
      }
    });
  } catch (err) {
    console.error('Failed to trigger navigation to next question:', err);
  }
}

async function handleSuccessfulSolveCompletion(tabId: number) {
  autoSolveCount = (autoSolveCount || 0) + 1;
  saveState();
  
  console.log(`[Background] Question solved successfully. Consecutive auto-solve count: ${autoSolveCount}`);
  triggerNextQuestion(tabId);
}

// Listen to messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.type || message);

  if (message.type === 'GET_STATE') {
    sendResponse({
      stats,
      history,
      timer: timer.getState(),
      liveElapsedMs: timer.getElapsedMs(),
      automationState,
      settings
    });
    return true;
  }

  if (message.type === 'PROBLEM_LOADED') {
    const problem: ProblemInfo = message.problem;
    const currentState = timer.getState();
    const problemLanguage: string = message.language || '';

    let isNewProblem = false;
    if (currentState.activeProblemSlug !== problem.slug) {
      isNewProblem = true;
      if (currentState.activeProblemSlug) {
        timer.stop();
      }
      timer.start(problem.slug, problem.title, problem.difficulty);
      saveState();
    } else if (currentState.isPaused) {
      // Keep paused
    } else if (!currentState.startTime) {
      timer.start(problem.slug, problem.title, problem.difficulty);
      saveState();
    }

    const isLanguageChanged = problemLanguage && lastProcessedLanguage !== problemLanguage;
    if (isNewProblem || isLanguageChanged) {
      lastProcessedLanguage = problemLanguage;
    }
    
    sendResponse({ success: true, timer: timer.getState() });
    broadcastStateUpdate();

    // Auto solve and submit if enabled and it's a new problem OR a manual language change
    if ((isNewProblem || isLanguageChanged) && settings.autoSolveNext !== false && sender.tab && sender.tab.id) {
      const tabId = sender.tab.id;
      
      if (isLanguageChanged && !isNewProblem) {
        // Explicit manual language switch: force solve immediately without skipping
        console.log(`[Background] Language changed to ${problemLanguage} on same problem. Force solving in new language...`);
        visitedSlugsInCycle = [];
        setTimeout(() => {
          runSolveAndSubmitFlow(tabId);
        }, 400);
      } else {
        // Normal problem transition: prevent infinite loops
        if (visitedSlugsInCycle.includes(problem.slug)) {
          console.log(`[Background] Detected loop or revisited slug ${problem.slug} during skip cycle. Stopping automation.`);
          visitedSlugsInCycle = [];
          automationState.status = 'idle';
          saveState();
          broadcastStateUpdate();
          return true;
        }
        
        visitedSlugsInCycle.push(problem.slug);

        const isAlreadySolvedInStats = stats.recentSolvedSlugs.includes(problem.slug);

        chrome.tabs.sendMessage(tabId, { type: 'CHECK_IF_SOLVED' }, (isSolvedResponse) => {
          const isSolvedOnPage = isSolvedResponse && isSolvedResponse.isSolved;
          const isSolved = isAlreadySolvedInStats || isSolvedOnPage;

          if (isSolved) {
            console.log(`[Background] Problem ${problem.slug} is already solved. Skipping to next...`);
            triggerNextQuestion(tabId);
          } else {
            // Unsolved! Clear cycle and trigger auto solve
            visitedSlugsInCycle = [];
            console.log(`[Background] Problem ${problem.slug} is unsolved. Auto-solving...`);
            setTimeout(() => {
              runSolveAndSubmitFlow(tabId);
            }, 400);
          }
        });
      }
    }
    return true;
  }

  if (message.type === 'SUBMISSION_DETECTED') {
    const submission: SubmissionResult = message.submission;
    
    // Stop active timer and read elapsed time
    const timeSpentMs = timer.stop();
    submission.timeSpentMs = timeSpentMs;
    
    // Save submission to history
    history.push(submission);
    
    // Update stats
    stats = addSubmissionToStats(stats, submission, history);
    
    // Restart timer for the active problem in case they continue solving
    timer.start(submission.problemSlug, submission.problemTitle, submission.difficulty);
    
    const isAutoSubmitting = automationState.status === 'submitting';

    if (submission.status === 'Accepted') {
      if (isAutoSubmitting || settings.pushMethod === 'local-git' || (settings.githubToken && settings.githubRepo)) {
        if (isAutoSubmitting) {
          automationState.status = 'solving'; // Visual: "Accepted! Pushing to GitHub..."
          saveState();
          broadcastStateUpdate();
        }

        // Trigger solve push on backend
        fetch('http://localhost:8080/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: submission.problemTitle,
            slug: submission.problemSlug,
            difficulty: submission.difficulty,
            language: submission.language,
            code: submission.code,
            githubToken: settings.pushMethod === 'github-api' ? settings.githubToken : undefined,
            githubRepo: settings.pushMethod === 'github-api' ? settings.githubRepo : undefined,
            githubPath: settings.pushMethod === 'github-api' ? settings.githubPath : undefined
          })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            if (isAutoSubmitting) {
              automationState.status = 'success';
              saveState();
              broadcastStateUpdate();
              if (sender.tab && sender.tab.id) {
                handleSuccessfulSolveCompletion(sender.tab.id);
              }
            }
          } else {
            if (isAutoSubmitting) {
              automationState.status = 'error';
              automationState.errorMsg = `Git push failed: ${data.error}`;
              saveState();
              broadcastStateUpdate();
            }
          }
        })
        .catch(err => {
          if (isAutoSubmitting) {
            automationState.status = 'error';
            let errorMsg = `Failed to connect to backend for Git push: ${err.message}`;
            if (err.message && (err.message.includes('fetch') || err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
              errorMsg = 'Failed to connect to local server. Please make sure the backend is running by executing "node server.js" in the project directory.';
            }
            automationState.errorMsg = errorMsg;
            saveState();
            broadcastStateUpdate();
          }
        });
      } else {
        if (isAutoSubmitting) {
          automationState.status = 'success';
          saveState();
          broadcastStateUpdate();
          if (sender.tab && sender.tab.id) {
            handleSuccessfulSolveCompletion(sender.tab.id);
          }
        }
      }
    } else {
      if (isAutoSubmitting) {
        automationState.status = 'error';
        automationState.errorMsg = `Submission rejected: ${submission.status}`;
        saveState();
        broadcastStateUpdate();
      }
    }

    saveState();
    sendResponse({ success: true, stats, timer: timer.getState() });
    broadcastStateUpdate();
    return true;
  }

  if (message.type === 'START_AUTO_SOLVE') {
    // Query active tab to extract details
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) {
        automationState = {
          status: 'error',
          errorMsg: 'No active tab found. Please refresh LeetCode page.'
        };
        saveState();
        broadcastStateUpdate();
        sendResponse({ success: false, error: 'No active tab.' });
        return;
      }

      runSolveAndSubmitFlow(activeTab.id);
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'PAUSE_TIMER') {
    timer.pause();
    saveState();
    sendResponse({ success: true, timer: timer.getState() });
    broadcastStateUpdate();
    return true;
  }

  if (message.type === 'RESUME_TIMER') {
    timer.resume();
    saveState();
    sendResponse({ success: true, timer: timer.getState() });
    broadcastStateUpdate();
    return true;
  }

  if (message.type === 'RESET_TIMER') {
    timer.reset();
    saveState();
    sendResponse({ success: true, timer: timer.getState() });
    broadcastStateUpdate();
    return true;
  }

  if (message.type === 'SAVE_SETTINGS') {
    settings = message.settings;
    saveState();
    sendResponse({ success: true });
    broadcastStateUpdate();
    return true;
  }

  if (message.type === 'SET_AUTO_SOLVE_NEXT') {
    settings.autoSolveNext = message.enabled;
    saveState();
    sendResponse({ success: true });
    broadcastStateUpdate();
    return true;
  }

  if (message.type === 'RESET_AUTOMATION') {
    automationState = { status: 'idle' };
    saveState();
    sendResponse({ success: true });
    broadcastStateUpdate();
    return true;
  }

  if (message.type === 'ADD_MOCK_SUBMISSION') {
    const mockSub: SubmissionResult = message.submission;
    history.push(mockSub);
    stats = addSubmissionToStats(stats, mockSub, history);
    saveState();
    sendResponse({ success: true, stats, history });
    broadcastStateUpdate();
    return true;
  }
});

