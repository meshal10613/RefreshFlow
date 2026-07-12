import { StateStore } from '../state/stateStore';
import { JobRunner } from './jobRunner';
import { AlarmScheduler } from './alarmScheduler';
import { OffscreenManager } from './offscreenManager';

export const JobReconciler = {
  /**
   * Reconciles all jobs in storage, recovering active tasks after a browser crash, sleep, or update
   */
  async reconcile(): Promise<void> {
    console.log('🔄 Reconciling jobs and alarms...');
    
    // 1. Initialize State Storage defaults if first run
    await StateStore.initialize();
    
    const jobs = await StateStore.getJobs();
    const activeAlarms = await chrome.alarms.getAll();
    const alarmNames = activeAlarms.map((a) => a.name);

    for (const job of Object.values(jobs)) {
      if (job.state.status === 'running') {
        const nextRunAt = job.state.nextRunAt;
        const timePassed = Date.now() - nextRunAt;

        // Verify if alarms or heartbeats still exist for this running job
        const alarmName = job.schedule.intervalMs < 60000 && job.schedule.subMinuteOptIn
          ? `heartbeat:${job.id}`
          : `job:${job.id}`;

        if (timePassed >= 0) {
          // 1. Missed Run: The target time has passed (browser closed or slept)
          console.log(`⚡ Missed run detected for job: ${job.name} (overdue by ${timePassed}ms). Triggering run.`);
          
          // Trigger the job run immediately
          // We run it async so it doesn't block the loop
          JobRunner.run(job.id);
        } else {
          // 2. Future Run: re-arm the precise offscreen timer unconditionally
          // — unlike chrome.alarms, it does not survive a browser restart —
          // and re-arm the backstop alarm too if that was also lost.
          if (!alarmNames.includes(alarmName)) {
            console.log(`⏰ Re-arming missing alarm for running job: ${job.name}.`);
            await AlarmScheduler.schedule(job);
          } else {
            await OffscreenManager.armTimer(job.id, nextRunAt);
          }
        }
      } else {
        // Stop any active alarms for stopped/paused jobs that might have leaked
        await AlarmScheduler.cancel(job.id);
      }
    }

    // 3. Clear any orphaned alarms in Chrome scheduler that have no active matching job in state
    for (const alarmName of alarmNames) {
      if (alarmName.startsWith('job:') || alarmName.startsWith('heartbeat:')) {
        const jobId = alarmName.split(':')[1];
        const job = jobs[jobId];
        if (!job || job.state.status !== 'running') {
          console.log(`🧹 Clearing orphaned alarm: ${alarmName}`);
          await chrome.alarms.clear(alarmName);
        }
      }
    }

    console.log('✓ Reconciliation complete');
  }
};
