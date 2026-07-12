import { Job } from '../state/schema';
import { StateStore } from '../state/stateStore';
import { nextCronTime, randomInterval } from '../utils/time';
import { OffscreenManager } from './offscreenManager';

// Local cache for setTimeout timers (will clear when service worker is evicted, but rebuilt by alarms)
const activeSubMinuteTimers: Record<string, any> = {};

export const AlarmScheduler = {
  /**
   * Schedules an alarm/heartbeat for a job
   */
  async schedule(job: Job): Promise<void> {
    const jobId = job.id;
    await this.cancel(jobId); // clear any active scheduling first

    if (job.state.status !== 'running') return;

    let intervalMs = job.schedule.intervalMs;
    const isSubMinute = intervalMs < 60000;
    const subMinuteOptIn = job.schedule.subMinuteOptIn;

    // Floor to 60s if sub-minute option is off
    if (isSubMinute && !subMinuteOptIn) {
      intervalMs = 60000;
    }

    // Determine the next run timestamp
    let nextRunAt = Date.now() + intervalMs;
    if (job.schedule.mode === 'random' && job.schedule.min !== undefined && job.schedule.max !== undefined) {
      const randMs = randomInterval(job.schedule.min, job.schedule.max);
      nextRunAt = Date.now() + randMs;
    } else if (job.schedule.mode === 'cron-like') {
      nextRunAt = nextCronTime(job.schedule.weekdays, job.schedule.timeWindow);
    }

    // Update job nextRunAt state
    job.state.nextRunAt = nextRunAt;
    await StateStore.saveJob(job);

    // Primary firing mechanism: an always-resident offscreen document timer.
    // This is what actually makes the job fire immediately/on-time — see
    // offscreen.ts for the full rationale. It works for every interval,
    // sub-minute or not.
    await OffscreenManager.armTimer(jobId, nextRunAt);

    // Backstop: chrome.alarms, in case the offscreen document was ever
    // discarded (e.g. the browser reclaimed it under memory pressure) before
    // its timer fired. Alarms are coarser and can lag by several seconds,
    // but they guarantee the job is never permanently stranded.
    if (isSubMinute && subMinuteOptIn) {
      // 1. Backstop heartbeat alarm (every 25 seconds) that also re-arms
      //    the offscreen timer if it was somehow lost.
      await chrome.alarms.create(`heartbeat:${jobId}`, {
        periodInMinutes: 25 / 60, // ~0.41 minutes
        delayInMinutes: 25 / 60
      });
      console.log(`⚡ Armed sub-minute job ${jobId} via offscreen timer (backstop heartbeat every 25s). Next run in ${nextRunAt - Date.now()}ms`);

      // 2. Also keep the in-worker timeout as a second line of defense for
      //    as long as this particular worker instance happens to stay alive.
      this.scheduleInWorkerTimeout(jobId, nextRunAt);
    } else {
      // Standard backstop alarm (interval >= 60 seconds)
      const delayMin = Math.max(0.5, (nextRunAt - Date.now()) / 60000);
      await chrome.alarms.create(`job:${jobId}`, {
        delayInMinutes: delayMin
      });
      console.log(`⏰ Armed job ${jobId} via offscreen timer (backstop alarm in ${delayMin.toFixed(2)} mins)`);
    }
  },

  /**
   * Sets up a setTimeout inside the running worker instance
   */
  scheduleInWorkerTimeout(jobId: string, nextRunAt: number): void {
    if (activeSubMinuteTimers[jobId]) {
      clearTimeout(activeSubMinuteTimers[jobId]);
    }

    const remainingMs = nextRunAt - Date.now();
    if (remainingMs <= 0) {
      // Already past due, fire immediately via runner trigger
      this.triggerJobRun(jobId);
      return;
    }

    // Schedule the runner
    activeSubMinuteTimers[jobId] = setTimeout(() => {
      delete activeSubMinuteTimers[jobId];
      this.triggerJobRun(jobId);
    }, remainingMs);
  },

  /**
   * Triggers the job runner immediately for the specified job
   */
  triggerJobRun(jobId: string): void {
    // Dispatch a message internally to background runner
    chrome.runtime.sendMessage({
      type: 'RUN_JOB_NOW',
      payload: { jobId }
    }).catch(() => {
      // If extension message bus fails, call local handler directly (will be wired in index.ts)
      import('./jobRunner').then(({ JobRunner }) => {
        JobRunner.run(jobId);
      });
    });
  },

  /**
   * Handles checking sub-minute execution during heartbeat alarms
   */
  async handleHeartbeat(jobId: string): Promise<void> {
    const job = await StateStore.getJob(jobId);
    if (!job || job.state.status !== 'running') {
      await this.cancel(jobId);
      return;
    }

    const nextRunAt = job.state.nextRunAt;
    const remainingMs = nextRunAt - Date.now();

    // If remaining time is less than 25 seconds, ensure we have an active in-worker setTimeout running
    if (remainingMs <= 25000) {
      this.scheduleInWorkerTimeout(jobId, nextRunAt);
    }
  },

  /**
   * Cancels all scheduled alarms and active timers for a job
   */
  async cancel(jobId: string): Promise<void> {
    // 1. Clear chrome.alarms
    await chrome.alarms.clear(`job:${jobId}`);
    await chrome.alarms.clear(`heartbeat:${jobId}`);

    // 2. Clear in-memory active timeout
    if (activeSubMinuteTimers[jobId]) {
      clearTimeout(activeSubMinuteTimers[jobId]);
      delete activeSubMinuteTimers[jobId];
    }

    // 3. Disarm the precise offscreen timer
    await OffscreenManager.disarmTimer(jobId);
  }
};
