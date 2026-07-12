import { Job } from '../state/schema';
import { StateStore } from '../state/stateStore';
import { PermissionBroker } from './permissionBroker';

/**
 * Manages the on-page "Visual Timer Overlay" — a small floating countdown
 * shown directly on the target page by the content script. Purely
 * best-effort: if the extension doesn't currently hold host permission for
 * a tab (e.g. a plain refresh job that never needed one), we silently skip
 * rather than interrupting the refresh itself or prompting mid-flight
 * (permission prompts require a user gesture and can't be triggered from a
 * background timer).
 */
export const OverlayBroker = {
  /**
   * Injects (if needed) and shows/updates the overlay on every tab this job
   * targets, reflecting the job's freshly-scheduled next run time.
   */
  async syncForJob(job: Job, tabIds: number[]): Promise<void> {
    const settings = await StateStore.getSettings();
    if (!settings.showVisualTimerOverlay) return;
    if (job.state.status !== 'running') return;

    for (const tabId of tabIds) {
      this.showOnTab(tabId, job).catch(() => {
        // Best-effort — most commonly this just means we lack host
        // permission for that origin, or the tab closed mid-cycle.
      });
    }
  },

  async showOnTab(tabId: number, job: Job): Promise<void> {
    let tab: chrome.tabs.Tab;
    try {
      tab = await chrome.tabs.get(tabId);
    } catch {
      return;
    }
    if (!tab.url) return;

    const hasPermission = await PermissionBroker.hasHostPermission(tab.url);
    if (!hasPermission) return;

    await this.ensureInjected(tabId);

    await chrome.tabs
      .sendMessage(tabId, {
        type: 'OVERLAY_UPDATE',
        payload: {
          jobId: job.id,
          jobName: job.name,
          nextRunAt: job.state.nextRunAt,
          intervalMs: job.schedule.intervalMs
        }
      })
      .catch(() => {});
  },

  async hideOnTab(tabId: number, jobId?: string): Promise<void> {
    await chrome.tabs
      .sendMessage(tabId, { type: 'OVERLAY_HIDE', payload: { jobId } })
      .catch(() => {});
  },

  async ensureInjected(tabId: number): Promise<void> {
    try {
      const ping = await chrome.tabs.sendMessage(tabId, { type: 'PING' }).catch(() => null);
      if (ping && ping.status === 'pong') return;

      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
    } catch (err) {
      console.warn(`⚠️ Could not inject overlay content script into tab ${tabId}:`, err);
    }
  }
};
