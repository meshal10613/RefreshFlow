import { ContextMenuManager } from './contextMenu';
import { JobReconciler } from './jobReconciler';
import { AlarmScheduler } from './alarmScheduler';
import { JobRunner } from './jobRunner';
import { BadgeManager } from './badgeManager';
import { OverlayBroker } from './overlayBroker';
import { TabScopeResolver } from './tabScopeResolver';
import { Messaging } from '../utils/messaging';
import { StateStore as Storage } from '../state/stateStore';
import { Job } from '../state/schema';

// ----------------------------------------------------
// 1. Top-Level Synchronous Event Listeners Registration
// ----------------------------------------------------

// Fired when extension is installed, updated, or browser is updated
chrome.runtime.onInstalled.addListener((details) => {
  console.log(`[Background] Installed/Updated: Reason = ${details.reason}`);
  
  // Initialize context menus
  ContextMenuManager.initialize();
  
  // Reconcile and initialize storage schema
  JobReconciler.reconcile().then(() => BadgeManager.startTicker());
});

// Fired when browser profile starts up
chrome.runtime.onStartup.addListener(() => {
  console.log('[Background] Browser startup. Reconciling active jobs...');
  JobReconciler.reconcile().then(() => BadgeManager.startTicker());
});

// Also arm the badge ticker whenever this service worker instance spins up
// (install/startup only fire once per browser session — this line makes
// sure the badge keeps ticking after every MV3 worker eviction + wake).
BadgeManager.startTicker();

// Fired when a scheduled alarm triggers
chrome.alarms.onAlarm.addListener((alarm) => {
  const alarmName = alarm.name;

  if (BadgeManager.isTickAlarm(alarmName)) {
    BadgeManager.update();
    return;
  }

  if (alarmName.startsWith('job:')) {
    const jobId = alarmName.slice(4); // trim "job:" prefix
    console.log(`[Background] Alarm trigger: ${alarmName}`);
    JobRunner.run(jobId).then(() => BadgeManager.update());
  } else if (alarmName.startsWith('heartbeat:')) {
    const jobId = alarmName.slice(10); // trim "heartbeat:" prefix
    AlarmScheduler.handleHeartbeat(jobId).then(() => BadgeManager.update());
  }
});

// Keep the badge countdown in sync with any job state change, no matter
// which context (popup, dashboard, command shortcut) caused it.
Storage.onChanged((changes) => {
  if (changes.jobs) {
    BadgeManager.update();
  }
});

// Fired when a context menu item is clicked
chrome.contextMenus.onClicked.addListener((info, tab) => {
  ContextMenuManager.handleClick(info, tab || undefined);
});

// Fired when a registered keyboard shortcut command triggers
chrome.commands.onCommand.addListener(async (command, tab) => {
  console.log(`[Background] Command shortcut triggered: ${command}`);
  
  if (command === 'toggle-refresh-current') {
    if (!tab || !tab.id || !tab.url) return;
    
    // Toggle auto-refresh on the active tab of current window
    const jobs = await Storage.getJobs();
    
    // Check if there is an active job for this tab ID
    const existingJob = Object.values(jobs).find(
      (j) => j.target.scope === 'currentTab' && j.url === tab.url
    );
    
    if (existingJob) {
      // Toggle status
      const nextStatus = existingJob.state.status === 'running' ? 'stopped' : 'running';
      existingJob.state.status = nextStatus;
      
      await Storage.saveJob(existingJob);
      
      if (nextStatus === 'running') {
        console.log(`[Background] Command started job: ${existingJob.id}`);
        await AlarmScheduler.schedule(existingJob);
      } else {
        console.log(`[Background] Command stopped job: ${existingJob.id}`);
        await AlarmScheduler.cancel(existingJob.id);
      }
    } else {
      // Create new default 60s job for this tab
      const settings = await Storage.getSettings();
      const intervalSec = settings?.defaultIntervalSeconds || 60;
      
      const newJob: Job = {
        id: `job-${Math.random().toString(36).substring(2, 11)}`,
        type: 'refresh',
        name: `Shortcut Refresh (${tab.title || 'Page'})`,
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
      
      await Storage.saveJob(newJob);
      console.log(`[Background] Command created & started job: ${newJob.id}`);
      await AlarmScheduler.schedule(newJob);
    }
  }
});

// Fired when message is dispatched across contexts
Messaging.onMessage((type, payload, _sender, sendResponse) => {
  // Return true if async response is needed
  let isAsync = false;

  switch (type) {
    case 'JOB_START': {
      const { jobId } = payload as { jobId: string };
      Storage.getJob(jobId).then((job) => {
        if (job) {
          job.state.status = 'running';
          Storage.saveJob(job).then(() => {
            AlarmScheduler.schedule(job).then(async () => {
              // Show the on-page overlay immediately (if enabled) rather
              // than waiting for the first refresh cycle to complete.
              const tabIds = await TabScopeResolver.resolveTabs(job).catch(() => []);
              await OverlayBroker.syncForJob(job, tabIds);
              sendResponse({ status: 'started' });
            });
          });
        } else {
          sendResponse({ error: 'Job not found' });
        }
      });
      isAsync = true;
      break;
    }

    case 'JOB_STOP': {
      const { jobId } = payload as { jobId: string };
      Storage.getJob(jobId).then((job) => {
        if (job) {
          job.state.status = 'stopped';
          Storage.saveJob(job).then(() => {
            AlarmScheduler.cancel(jobId).then(async () => {
              const tabIds = await TabScopeResolver.resolveTabs(job).catch(() => []);
              for (const tabId of tabIds) await OverlayBroker.hideOnTab(tabId, jobId);
              sendResponse({ status: 'stopped' });
            });
          });
        } else {
          sendResponse({ error: 'Job not found' });
        }
      });
      isAsync = true;
      break;
    }

    case 'JOB_PAUSE': {
      const { jobId } = payload as { jobId: string };
      Storage.getJob(jobId).then((job) => {
        if (job) {
          job.state.status = 'paused';
          Storage.saveJob(job).then(() => {
            AlarmScheduler.cancel(jobId).then(async () => {
              const tabIds = await TabScopeResolver.resolveTabs(job).catch(() => []);
              for (const tabId of tabIds) await OverlayBroker.hideOnTab(tabId, jobId);
              sendResponse({ status: 'paused' });
            });
          });
        } else {
          sendResponse({ error: 'Job not found' });
        }
      });
      isAsync = true;
      break;
    }

    case 'JOB_DELETE': {
      const { jobId } = payload as { jobId: string };
      AlarmScheduler.cancel(jobId).then(() => {
        Storage.deleteJob(jobId).then(() => {
          sendResponse({ status: 'deleted' });
        });
      });
      isAsync = true;
      break;
    }

    case 'RUN_JOB_NOW': {
      const { jobId } = payload as { jobId: string };
      JobRunner.run(jobId).then(() => {
        sendResponse({ status: 'executed' });
      });
      isAsync = true;
      break;
    }

    case 'PING': {
      // Content script or UI check
      sendResponse({ status: 'pong' });
      break;
    }

    case 'OFFSCREEN_TICK': {
      // Sent every ~250ms by the offscreen document. Two purposes: keep the
      // toolbar badge's live countdown perfectly in sync (instead of the
      // coarse ~30s alarm-only refresh), and — just by virtue of being a
      // received message — reset the service worker's idle-eviction timer
      // so it stays warm while any job is actively running.
      BadgeManager.update();
      break;
    }
  }

  return isAsync;
});
