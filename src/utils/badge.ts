import { Job } from '../state/schema';

/**
 * Formats a millisecond duration into a compact string suitable for the
 * ~4-character toolbar badge (e.g. "45s", "12m", "3h", "2d").
 */
export function formatBadgeCountdown(ms: number): string {
  if (ms <= 0) return '\u2022'; // bullet = "due now"

  const totalSeconds = Math.ceil(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const totalMinutes = Math.ceil(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m`;

  const totalHours = Math.ceil(totalMinutes / 60);
  if (totalHours < 24) return `${totalHours}h`;

  const totalDays = Math.ceil(totalHours / 24);
  return `${totalDays}d`;
}

/**
 * Finds the running job whose next run is soonest — this is the job whose
 * countdown should be reflected on the pinned toolbar icon badge.
 */
export function findSoonestRunningJob(jobs: Job[] | Record<string, Job>): Job | undefined {
  const list = Array.isArray(jobs) ? jobs : Object.values(jobs);
  const running = list.filter((j) => j.state.status === 'running' && !!j.state.nextRunAt);
  if (running.length === 0) return undefined;

  return running.reduce((soonest, job) =>
    job.state.nextRunAt < soonest.state.nextRunAt ? job : soonest
  );
}

/**
 * Counts how many jobs are currently running (used for badge tooltip/title).
 */
export function countRunningJobs(jobs: Job[] | Record<string, Job>): number {
  const list = Array.isArray(jobs) ? jobs : Object.values(jobs);
  return list.filter((j) => j.state.status === 'running').length;
}

/**
 * Syncs the extension's toolbar-icon badge (visible even when the popup is
 * closed and the icon is pinned) with the live countdown of the
 * soonest-to-run active job. Safe to call frequently — it's a cheap no-op
 * when nothing changed and never throws.
 */
export async function syncActionBadge(jobs: Job[] | Record<string, Job>): Promise<void> {
  try {
    const soonest = findSoonestRunningJob(jobs);

    if (!soonest) {
      await chrome.action.setBadgeText({ text: '' });
      return;
    }

    const remainingMs = soonest.state.nextRunAt - Date.now();
    const text = formatBadgeCountdown(remainingMs);
    const runningCount = countRunningJobs(jobs);

    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });

    // setBadgeTextColor landed in Chrome 110 — guard for older builds.
    if ('setBadgeTextColor' in chrome.action) {
      await chrome.action.setBadgeTextColor({ color: '#ffffff' });
    }

    if ('setTitle' in chrome.action) {
      const suffix = runningCount > 1 ? ` (+${runningCount - 1} more running)` : '';
      await chrome.action.setTitle({
        title: `RefreshFlow \u2014 ${soonest.name}: next run in ${text}${suffix}`
      });
    }
  } catch {
    // Badge sync is a nice-to-have; never let it break core functionality.
  }
}

/**
 * Clears the badge back to its default empty state.
 */
export async function clearActionBadge(): Promise<void> {
  try {
    await chrome.action.setBadgeText({ text: '' });
    if ('setTitle' in chrome.action) {
      await chrome.action.setTitle({ title: 'RefreshFlow' });
    }
  } catch {
    // ignore
  }
}
