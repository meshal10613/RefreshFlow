import { StateStore } from '../state/stateStore';
import { Job } from '../state/schema';

export const ContextMenuManager = {
  /**
   * Initializes the right-click context menu options
   * Must be called inside chrome.runtime.onInstalled
   */
  initialize(): void {
    // Clear any existing menus to avoid duplicates
    chrome.contextMenus.removeAll(() => {
      // 1. Quick Refresh start
      chrome.contextMenus.create({
        id: 'rf-start-refresh',
        title: 'Start 60s Auto-Refresh',
        contexts: ['page'],
      });

      // 2. Stop refresh
      chrome.contextMenus.create({
        id: 'rf-stop-refresh',
        title: 'Stop Auto-Refresh',
        contexts: ['page'],
      });

      // 3. Monitor page selection
      chrome.contextMenus.create({
        id: 'rf-monitor-page',
        title: 'Monitor selection for changes',
        contexts: ['selection'],
      });
    });
  },

  /**
   * Handle context menu click events
   */
  async handleClick(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab): Promise<void> {
    if (!tab || !tab.id || !tab.url) return;

    const { menuItemId, selectionText } = info;

    switch (menuItemId) {
      case 'rf-start-refresh': {
        // Start a default 60-second refresh job for the active tab
        const settings = await StateStore.getSettings();
        const intervalSec = settings?.defaultIntervalSeconds || 60;
        
        const newJob: Job = {
          id: `job-${Math.random().toString(36).substring(2, 11)}`,
          type: 'refresh',
          name: `Quick Refresh (${tab.title || 'Page'})`,
          url: tab.url,
          target: {
            scope: 'currentTab',
            tabIds: [tab.id],
            windowId: tab.windowId,
          },
          schedule: {
            mode: 'fixed',
            intervalMs: intervalSec * 1000,
            subMinuteOptIn: false,
          },
          conditions: {
            onlyIfLoaded: true,
            stopOnError: false,
            stopOnSuccess: false,
            urlChangeBehavior: 'restart',
          },
          actions: [],
          state: {
            status: 'running',
            nextRunAt: Date.now() + intervalSec * 1000,
            runCount: 0,
          },
          notifications: {
            desktop: false,
            sound: false,
            badge: false,
          },
          createdAt: Date.now(),
        };

        await StateStore.saveJob(newJob);
        // Dispatch start message to background scheduler
        chrome.runtime.sendMessage({
          type: 'JOB_START',
          payload: { jobId: newJob.id },
        });
        break;
      }

      case 'rf-stop-refresh': {
        // Find running jobs targeting the active tab URL and stop them
        const jobs = await StateStore.getJobs();
        const activeJobs = Object.values(jobs).filter(
          (j) => j.url === tab.url && j.state.status === 'running'
        );

        for (const job of activeJobs) {
          job.state.status = 'stopped';
          await StateStore.saveJob(job);
          chrome.runtime.sendMessage({
            type: 'JOB_STOP',
            payload: { jobId: job.id },
          });
        }
        break;
      }

      case 'rf-monitor-page': {
        // Create a monitor job with the selected text
        if (!selectionText) return;
        
        const newJob: Job = {
          id: `job-${Math.random().toString(36).substring(2, 11)}`,
          type: 'monitor',
          name: `Monitor selection on ${tab.title || 'Page'}`,
          url: tab.url,
          target: {
            scope: 'currentTab',
            tabIds: [tab.id],
            windowId: tab.windowId,
          },
          schedule: {
            mode: 'fixed',
            intervalMs: 120 * 1000, // 2 minutes default for monitors
            subMinuteOptIn: false,
          },
          conditions: {
            onlyIfLoaded: true,
            stopOnError: true,
            stopOnSuccess: false,
            urlChangeBehavior: 'restart',
          },
          actions: [],
          monitor: {
            mode: 'keyword',
            keyword: selectionText,
            keywordCondition: 'lost', // alert if selection text changes/disappears
            ignoreWhitespace: true,
            highlightChanges: true,
            captureFullPage: false,
          },
          state: {
            status: 'running',
            nextRunAt: Date.now() + 120 * 1000,
            runCount: 0,
          },
          notifications: {
            desktop: true,
            sound: true,
            badge: true,
          },
          createdAt: Date.now(),
        };

        await StateStore.saveJob(newJob);
        chrome.runtime.sendMessage({
          type: 'JOB_START',
          payload: { jobId: newJob.id },
        });
        break;
      }
    }
  },
};
