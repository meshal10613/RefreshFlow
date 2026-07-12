import { StateStore } from '../state/stateStore';
import { syncActionBadge, clearActionBadge } from '../utils/badge';

const TICK_ALARM_NAME = 'badge-tick';

// While the service worker instance happens to be alive (which is often,
// given the extension's own alarm/heartbeat activity), tick locally every
// second for a smooth, live-looking countdown. This interval is cleared
// automatically whenever the worker is evicted — startTicker() re-arms it
// on every wake, and the periodic chrome.alarms.badge-tick alarm below
// guarantees the badge still refreshes (in coarser ~30s steps) even during
// long idle periods when the worker stays asleep.
let localTickHandle: ReturnType<typeof setInterval> | undefined;

export const BadgeManager = {
  /**
   * Recomputes and applies the badge based on current job state.
   */
  async update(): Promise<void> {
    const jobs = await StateStore.getJobs();
    await syncActionBadge(jobs);
  },

  /**
   * Clears the badge entirely (e.g. nothing running).
   */
  async clear(): Promise<void> {
    await clearActionBadge();
  },

  /**
   * Arms the periodic wake-up alarm that refreshes the badge even when the
   * service worker has been evicted, and starts a fast local tick for as
   * long as this worker instance stays alive. Safe to call repeatedly.
   */
  async startTicker(): Promise<void> {
    await chrome.alarms.create(TICK_ALARM_NAME, {
      periodInMinutes: 0.5,
      delayInMinutes: 0.02
    });

    if (localTickHandle) {
      clearInterval(localTickHandle);
    }
    localTickHandle = setInterval(() => {
      this.update();
    }, 1000);

    await this.update();
  },

  /**
   * Whether the given alarm name is the badge ticker (callers should route
   * matching alarms here instead of treating them as job alarms).
   */
  isTickAlarm(alarmName: string): boolean {
    return alarmName === TICK_ALARM_NAME;
  }
};
