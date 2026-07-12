import { Job } from '../state/schema';
import { StateStore } from '../state/stateStore';
import { HistoryStore } from '../state/historyStore';
import { TabScopeResolver } from './tabScopeResolver';
import { AlarmScheduler } from './alarmScheduler';
import { PermissionBroker } from './permissionBroker';
import { NotificationsManager } from './notifications';
import { OverlayBroker } from './overlayBroker';

// Guards against the same job being executed twice in quick succession —
// the precise offscreen timer is the primary trigger, but the chrome.alarms
// heartbeat/backstop can occasionally race it right at the due instant.
const executingJobs = new Set<string>();

export const JobRunner = {
  /**
   * Main entry point to run a job by ID
   */
  async run(jobId: string): Promise<void> {
    if (executingJobs.has(jobId)) return;

    const job = await StateStore.getJob(jobId);
    if (!job || job.state.status !== 'running') return;

    executingJobs.add(jobId);
    console.log(`🏃 Running job: ${job.name} (${job.id})`);
    const startTime = Date.now();

    try {
      // 1. Resolve tabs targeting this job
      const tabIds = await TabScopeResolver.resolveTabs(job);
      if (tabIds.length === 0) {
        console.log(`ℹ No matching tabs found for job ${job.id}`);
        // Reschedule and return
        await this.rescheduleOrStop(job);
        return;
      }

      // Check settings for cache bypass
      const settings = await StateStore.getSettings();
      const bypassCache = settings?.bypassCacheOnReload || false;

      // Execute based on job type
      if (job.type === 'refresh') {
        await this.executeRefresh(job, tabIds, bypassCache, startTime);
      } else if (job.type === 'monitor') {
        await this.executeMonitor(job, tabIds, startTime);
      } else if (job.type === 'automation') {
        await this.executeAutomation(job, tabIds, startTime);
      }
    } catch (err: any) {
      console.error(`❌ Error executing job ${job.id}:`, err);
      job.state.lastError = err.message || 'Unknown runner error';
      if (job.conditions.stopOnError) {
        job.state.status = 'stopped';
      }
      // Always resolve to either a fresh reschedule (job stays running) or
      // a clean stop — never leave the job stranded with no active alarm,
      // which previously made it look "stuck"/paused after a single hiccup.
      await this.rescheduleOrStop(job);
    } finally {
      executingJobs.delete(jobId);
    }
  },

  /**
   * Executes simple page refresh reload
   */
  async executeRefresh(
    job: Job,
    tabIds: number[],
    bypassCache: boolean,
    startTime: number
  ): Promise<void> {
    for (const tabId of tabIds) {
      try {
        await chrome.tabs.reload(tabId, { bypassCache });
        
        // Log to IndexedDB history
        await HistoryStore.addRefreshEntry({
          jobId: job.id,
          jobName: job.name,
          url: job.url,
          tabId,
          status: 'success',
          timestamp: Date.now(),
          durationMs: Date.now() - startTime
        });
      } catch (err: any) {
        await HistoryStore.addRefreshEntry({
          jobId: job.id,
          jobName: job.name,
          url: job.url,
          tabId,
          status: 'error',
          timestamp: Date.now(),
          durationMs: Date.now() - startTime,
          error: err.message || 'Reload failed'
        });
        
        if (job.conditions.stopOnError) {
          job.state.status = 'stopped';
          break;
        }
      }
    }

    job.state.runCount += 1;
    job.state.lastRunAt = Date.now();
    job.state.lastResult = 'Refreshed successfully';
    
    if (job.conditions.stopOnSuccess) {
      job.state.status = 'stopped';
    }

    await this.rescheduleOrStop(job);

    // Reflect the freshly-scheduled next run time in the on-page overlay
    // (best-effort — no-op unless the setting is on and permission is held).
    if (job.state.status === 'running') {
      await OverlayBroker.syncForJob(job, tabIds);
    } else {
      for (const tabId of tabIds) {
        await OverlayBroker.hideOnTab(tabId, job.id);
      }
    }
  },

  /**
   * Injects content scripts on demand to execute DOM monitoring
   */
  async executeMonitor(job: Job, tabIds: number[], _startTime: number): Promise<void> {
    const injectableTabs = await TabScopeResolver.filterInjectableTabs(tabIds);
    
    if (injectableTabs.length === 0) {
      console.log(`⚠️ No injectable tabs found for monitor job ${job.id}`);
      await this.rescheduleOrStop(job);
      return;
    }

    const tabId = injectableTabs[0]; // monitor runs on first resolved tab for efficiency

    // 1. Check host permissions
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url) return;

    const hasPermission = await PermissionBroker.hasHostPermission(tab.url);
    if (!hasPermission) {
      console.log(`⚠️ Host permission missing for ${tab.url}. Job paused.`);
      job.state.status = 'paused';
      job.state.lastError = 'Missing host permission';
      await StateStore.saveJob(job);
      return;
    }

    // 2. Inject content script if not already present
    await this.injectContentScriptIfNeeded(tabId);

    // 3. Send a custom event for DOM snapshot request
    const result = await chrome.tabs.sendMessage(tabId, {
      type: 'MONITOR_CAPTURE',
      payload: { config: job.monitor, jobId: job.id }
    });

    if (result && result.status === 'success') {
      const { hasChanged, diffText, message } = result;

      if (hasChanged) {
        console.log(`🔔 Monitor alert for ${job.name}: ${diffText}`);
        
        // Save history entry
        await HistoryStore.addMonitorEntry({
          jobId: job.id,
          jobName: job.name,
          url: tab.url,
          changeType: job.monitor?.mode || 'text',
          diff: diffText,
          timestamp: Date.now()
        });

        // Trigger notifications
        await NotificationsManager.triggerAlert(
          job,
          `Change detected!`,
          `${job.name}: ${diffText}`
        );

        if (job.conditions.stopOnSuccess) {
          job.state.status = 'stopped';
        }
      }
      
      job.state.runCount += 1;
      job.state.lastRunAt = Date.now();
      job.state.lastResult = message || 'Monitored successfully';
    } else {
      console.log(`❌ Monitor capture failed on tab ${tabId}`);
      if (job.conditions.stopOnError) {
        job.state.status = 'stopped';
      }
    }

    await this.rescheduleOrStop(job);
  },

  /**
   * Injects content scripts on demand to execute DOM actions automation
   */
  async executeAutomation(job: Job, tabIds: number[], startTime: number): Promise<void> {
    const injectableTabs = await TabScopeResolver.filterInjectableTabs(tabIds);
    if (injectableTabs.length === 0) {
      await this.rescheduleOrStop(job);
      return;
    }

    const tabId = injectableTabs[0];
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url) return;

    const hasPermission = await PermissionBroker.hasHostPermission(tab.url);
    if (!hasPermission) {
      job.state.status = 'paused';
      job.state.lastError = 'Missing host permission';
      await StateStore.saveJob(job);
      return;
    }

    // Inject content script
    await this.injectContentScriptIfNeeded(tabId);

    // Send actions list to content script
    const result = await chrome.tabs.sendMessage(tabId, {
      type: 'AUTOMATION_EXECUTE',
      payload: { steps: job.actions, jobId: job.id }
    });

    if (result && result.status === 'success') {
      console.log(`✓ Automation sequence succeeded for job ${job.id}`);
      
      // Log to history
      await HistoryStore.addRefreshEntry({
        jobId: job.id,
        jobName: job.name,
        url: tab.url,
        tabId,
        status: 'success',
        timestamp: Date.now(),
        durationMs: Date.now() - startTime
      });

      if (job.conditions.stopOnSuccess) {
        job.state.status = 'stopped';
      }
      job.state.runCount += 1;
      job.state.lastRunAt = Date.now();
      job.state.lastResult = 'Automation executed successfully';
    } else {
      console.error(`❌ Automation sequence failed for job ${job.id}`);
      
      await HistoryStore.addRefreshEntry({
        jobId: job.id,
        jobName: job.name,
        url: tab.url,
        tabId,
        status: 'error',
        timestamp: Date.now(),
        durationMs: Date.now() - startTime,
        error: result?.error || 'Automation sequence failed'
      });

      if (job.conditions.stopOnError) {
        job.state.status = 'stopped';
      }
    }

    await this.rescheduleOrStop(job);
  },

  /**
   * Helper to inject content.js if it hasn't been loaded in the target tab yet
   */
  async injectContentScriptIfNeeded(tabId: number): Promise<void> {
    try {
      // Send a quick ping to see if listener already exists
      const ping = await chrome.tabs.sendMessage(tabId, { type: 'PING' }).catch(() => null);
      if (ping && ping.status === 'pong') {
        return; // already injected
      }
      
      // Inject content script file programmatically
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      console.log(`✓ Injected content.js into tab ${tabId}`);
    } catch (err) {
      console.error(`❌ Script injection failed on tab ${tabId}:`, err);
      throw err;
    }
  },

  /**
   * Handles scheduling the next run of the job or stopping it if conditions match
   */
  async rescheduleOrStop(job: Job): Promise<void> {
    // Check repeat limit
    if (job.schedule.repeatCount !== undefined && job.state.runCount >= job.schedule.repeatCount) {
      job.state.status = 'stopped';
      console.log(`⏹ Job ${job.id} stopped: hit repeat count limit (${job.schedule.repeatCount})`);
    }

    await StateStore.saveJob(job);

    if (job.state.status === 'running') {
      await AlarmScheduler.schedule(job);
    } else {
      await AlarmScheduler.cancel(job.id);
    }
  }
};
