import { StorageData, SubmissionResult, TimerState, UserStats, AutomationState, AppSettings } from '../../core/types';
import { persistSettings } from '../../core/settings';

// Element DOM references
const streakCountEl = document.getElementById('streak-count')!;
const timerBadgeEl = document.getElementById('timer-badge')!;
const timerDiffEl = document.getElementById('timer-diff')!;
const timerTitleEl = document.getElementById('timer-problem-title')!;
const timerTimeEl = document.getElementById('timer-time')!;
const btnPlayPauseEl = document.getElementById('btn-play-pause') as HTMLButtonElement;
const btnPlayPauseTextEl = document.getElementById('btn-play-pause-text')!;
const btnResetEl = document.getElementById('btn-reset') as HTMLButtonElement;

const statsEasyEl = document.getElementById('stats-easy')!;
const barEasyEl = document.getElementById('bar-easy')!;
const statsMediumEl = document.getElementById('stats-medium')!;
const barMediumEl = document.getElementById('bar-medium')!;
const statsHardEl = document.getElementById('stats-hard')!;
const barHardEl = document.getElementById('bar-hard')!;
const totalFocusTimeEl = document.getElementById('total-focus-time')!;
const historyListEl = document.getElementById('history-list')!;

// Automation UI elements
const btnSettingsToggle = document.getElementById('btn-settings-toggle')!;
const settingsDrawer = document.getElementById('settings-drawer')!;
const inputOpenRouterKey = document.getElementById('input-openrouter-key') as HTMLInputElement;
const selectPushMethod = document.getElementById('select-push-method') as HTMLSelectElement;
const githubApiFields = document.getElementById('github-api-fields')!;
const inputGithubToken = document.getElementById('input-github-token') as HTMLInputElement;
const inputGithubRepo = document.getElementById('input-github-repo') as HTMLInputElement;
const inputGithubPath = document.getElementById('input-github-path') as HTMLInputElement;
const btnSaveSettings = document.getElementById('btn-save-settings') as HTMLButtonElement;

const btnAutoSolve = document.getElementById('btn-auto-solve') as HTMLButtonElement;
const statusContainer = document.getElementById('automation-status-container')!;
const statusTitle = document.getElementById('automation-status-title')!;
const statusDesc = document.getElementById('automation-status-desc')!;
const btnResetAutomation = document.getElementById('btn-reset-automation') as HTMLButtonElement;

let activeTimerInterval: NodeJS.Timeout | null = null;
let currentTimerState: TimerState | null = null;
let lastBaseTime = 0;
let lastTimerFetchTime = 0;

// Format milliseconds into hh:mm:ss
function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSecs = Math.floor(ms / 1000);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

// Format milliseconds into Xh Ym
function formatTimeSpentSummary(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) {
    return `${mins}m`;
  }
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins}m`;
}

// Update the UI with fresh state
function renderState(
  stats: UserStats,
  history: SubmissionResult[],
  timerState: TimerState,
  liveElapsedMs = 0,
  automationState?: AutomationState,
  settings?: AppSettings
) {
  currentTimerState = timerState;

  // 1. Render streak
  streakCountEl.textContent = String(stats.dailyStreak);

  // 2. Render timer card
  if (timerState.activeProblemSlug) {
    timerTitleEl.textContent = timerState.activeProblemTitle || 'Active Problem';
    timerBadgeEl.textContent = timerState.isPaused ? 'Paused' : 'Solving';
    timerBadgeEl.className = 'badge active';
    timerDiffEl.textContent = timerState.activeProblemDifficulty || '';
    timerDiffEl.className = `difficulty-indicator ${timerState.activeProblemDifficulty || ''}`;

    btnPlayPauseEl.disabled = false;
    btnResetEl.disabled = false;
    btnPlayPauseTextEl.textContent = timerState.isPaused ? 'Resume' : 'Pause';
    btnPlayPauseEl.querySelector('.btn-icon')!.textContent = timerState.isPaused ? '▶️' : '⏸️';

    // Set up local ticking
    lastBaseTime = liveElapsedMs;
    lastTimerFetchTime = Date.now();
    updateTimerTick();
    startTicking();
  } else {
    timerTitleEl.textContent = 'No active problem';
    timerBadgeEl.textContent = 'Idle';
    timerBadgeEl.className = 'badge';
    timerDiffEl.textContent = '';
    timerTimeEl.textContent = '00:00:00';
    btnPlayPauseEl.disabled = true;
    btnResetEl.disabled = true;
    btnPlayPauseTextEl.textContent = 'Pause';
    btnPlayPauseEl.querySelector('.btn-icon')!.textContent = '⏸️';
    stopTicking();
  }

  // 3. Render statistics
  statsEasyEl.textContent = `${stats.solvedCount.Easy} solved`;
  statsMediumEl.textContent = `${stats.solvedCount.Medium} solved`;
  statsHardEl.textContent = `${stats.solvedCount.Hard} solved`;
  totalFocusTimeEl.textContent = formatTimeSpentSummary(stats.totalTimeSpent);

  // Compute percentages for progress bar
  const computePercentage = (solved: number, attempted: number) => {
    if (attempted === 0) return '0%';
    const pct = Math.round((solved / attempted) * 100);
    return `${Math.min(pct, 100)}%`;
  };

  barEasyEl.style.width = computePercentage(stats.solvedCount.Easy, stats.attemptedCount.Easy || stats.solvedCount.Easy || 1);
  barMediumEl.style.width = computePercentage(stats.solvedCount.Medium, stats.attemptedCount.Medium || stats.solvedCount.Medium || 1);
  barHardEl.style.width = computePercentage(stats.solvedCount.Hard, stats.attemptedCount.Hard || stats.solvedCount.Hard || 1);

  // 4. Render History
  historyListEl.innerHTML = '';
  if (history.length === 0) {
    historyListEl.innerHTML = '<li class="empty-state">No solves recorded yet. Start coding!</li>';
  } else {
    // Show recent submissions first (reverse order)
    [...history].reverse().forEach(sub => {
      const li = document.createElement('li');
      li.className = 'history-item';

      const dateStr = new Date(sub.timestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      });

      const isSuccess = sub.status === 'Accepted';
      const statusClass = isSuccess ? 'Accepted' : 'Failed';
      const statusText = sub.status;

      li.innerHTML = `
        <div class="history-left">
          <span class="history-title" title="${sub.problemTitle}">${sub.problemTitle}</span>
          <span class="history-meta">${sub.language} • ${dateStr}</span>
        </div>
        <div class="history-right">
          <span class="history-status ${statusClass}">${statusText}</span>
          <span class="history-time">${formatDuration(sub.timeSpentMs || 0)}</span>
        </div>
      `;
      historyListEl.appendChild(li);
    });
  }

  // 5. Render settings if loaded
  if (settings) {
    inputOpenRouterKey.value = settings.openRouterApiKey || '';
    selectPushMethod.value = settings.pushMethod || 'local-git';
    inputGithubToken.value = settings.githubToken || '';
    inputGithubRepo.value = settings.githubRepo || '';
    inputGithubPath.value = settings.githubPath || '';

    if (settings.pushMethod === 'github-api') {
      githubApiFields.classList.remove('collapsed');
    } else {
      githubApiFields.classList.add('collapsed');
    }
  }

  // 6. Render automation state
  if (automationState) {
    renderAutomationState(automationState);
  }
}

// Render automation state dynamically
function renderAutomationState(state: AutomationState) {
  statusContainer.className = 'status-container'; // Clear classes

  if (state.status === 'idle') {
    statusContainer.classList.add('hidden');
    btnAutoSolve.disabled = false;
    btnAutoSolve.innerHTML = '<span class="btn-icon">⚡</span> Auto Solve & Submit';
    return;
  }

  statusContainer.classList.remove('hidden');
  statusContainer.classList.add(state.status);
  statusTitle.textContent = state.status;
  btnAutoSolve.disabled = true;

  let descText = '';
  switch (state.status) {
    case 'scraping':
      descText = 'Extracting problem content, starter templates, and configuration from the active page...';
      btnAutoSolve.innerHTML = '🤖 Scraping page...';
      break;
    case 'solving':
      descText = `Generating an optimal solution for "${state.problemTitle || 'problem'}" using Gemini AI...`;
      btnAutoSolve.innerHTML = '🤖 AI Thinking...';
      break;
    case 'injecting':
      descText = 'Inserting the generated solution code into the LeetCode editor...';
      btnAutoSolve.innerHTML = '🤖 Injecting...';
      break;
    case 'submitting':
      descText = 'Clicking LeetCode submission button and waiting for result...';
      btnAutoSolve.innerHTML = '🤖 Submitting...';
      break;
    case 'success':
      descText = `Success! Solution for "${state.problemTitle || 'problem'}" was Accepted and pushed to GitHub repository! 🎉`;
      btnAutoSolve.disabled = false;
      btnAutoSolve.innerHTML = '⚡ Try Auto Solve again';
      btnResetAutomation.classList.remove('hidden');
      break;
    case 'error':
      descText = `Error: ${state.errorMsg || 'An unknown error occurred.'}`;
      btnAutoSolve.disabled = false;
      btnAutoSolve.innerHTML = '⚡ Retry Auto Solve';
      btnResetAutomation.classList.remove('hidden');
      break;
  }

  statusDesc.textContent = descText;
}

// Timer clock ticking animations
function startTicking() {
  if (activeTimerInterval) clearInterval(activeTimerInterval);
  activeTimerInterval = setInterval(() => {
    updateTimerTick();
  }, 200);
}

// Stop ticking
function stopTicking() {
  if (activeTimerInterval) {
    clearInterval(activeTimerInterval);
    activeTimerInterval = null;
  }
}

// Update timer tick
function updateTimerTick() {
  if (!currentTimerState || !currentTimerState.activeProblemSlug) return;

  let elapsed = lastBaseTime;
  if (!currentTimerState.isPaused && currentTimerState.startTime) {
    elapsed += Date.now() - lastTimerFetchTime;
  }
  timerTimeEl.textContent = formatDuration(elapsed);
}

// Fetch current state on startup
function refreshState() {
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
    if (response) {
      renderState(
        response.stats,
        response.history,
        response.timer,
        response.liveElapsedMs,
        response.automationState,
        response.settings
      );
    }
  });
}

// Hook up settings panel toggle
btnSettingsToggle.addEventListener('click', () => {
  settingsDrawer.classList.toggle('collapsed');
});

// Toggle github PAT fields
selectPushMethod.addEventListener('change', () => {
  if (selectPushMethod.value === 'github-api') {
    githubApiFields.classList.remove('collapsed');
  } else {
    githubApiFields.classList.add('collapsed');
  }
});

// Save settings to chrome storage
btnSaveSettings.addEventListener('click', async () => {
  const apiKeyInput = inputOpenRouterKey.value.trim();
  if (!apiKeyInput || apiKeyInput === 'undefined' || apiKeyInput === 'null') {
    alert('Please open settings (⚙️) and enter a valid OpenRouter API Key first.');
    return;
  }

  const newSettings: AppSettings = {
    openRouterApiKey: apiKeyInput,
    pushMethod: selectPushMethod.value as 'local-git' | 'github-api',
    githubToken: inputGithubToken.value.trim(),
    githubRepo: inputGithubRepo.value.trim(),
    githubPath: inputGithubPath.value.trim()
  };

  const result = await persistSettings(
    newSettings,
    async (data) => {
      await chrome.storage.local.set(data);
    },
    (message) => new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        resolve(response);
      });
    })
  );

  if (result.success) {
    alert('Settings saved successfully!');
    settingsDrawer.classList.add('collapsed');
    refreshState();
  } else {
    alert(`Failed to save settings: ${result.error || 'Unknown error'}`);
  }
});

// Click Auto-Solve
btnAutoSolve.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
    const key = response?.settings?.openRouterApiKey;
    if (!key || key === 'undefined' || key === 'null') {
      alert('Please open settings (⚙️) and enter your OpenRouter API Key first.');
      settingsDrawer.classList.remove('collapsed');
      return;
    }

    btnResetAutomation.classList.add('hidden');

    chrome.runtime.sendMessage({ type: 'START_AUTO_SOLVE' }, (solveResponse) => {
      if (solveResponse && solveResponse.success) {
        refreshState();
      }
    });
  });
});

// Reset automation state back to idle
btnResetAutomation.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'RESET_AUTOMATION' }, (response) => {
    if (response && response.success) {
      btnResetAutomation.classList.add('hidden');
      refreshState();
    }
  });
});

// Hook up timer buttons
btnPlayPauseEl.addEventListener('click', () => {
  if (!currentTimerState) return;
  const action = currentTimerState.isPaused ? 'RESUME_TIMER' : 'PAUSE_TIMER';
  chrome.runtime.sendMessage({ type: action }, (response) => {
    if (response && response.success) {
      refreshState();
    }
  });
});

btnResetEl.addEventListener('click', () => {
  if (confirm('Are you sure you want to reset focus time for this problem?')) {
    chrome.runtime.sendMessage({ type: 'RESET_TIMER' }, (response) => {
      if (response && response.success) {
        refreshState();
      }
    });
  }
});

// Listen for updates from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'STATE_UPDATED') {
    renderState(
      message.stats,
      message.history,
      message.timer,
      0,
      message.automationState,
      message.settings
    );
  }
});

// Initial load
refreshState();

