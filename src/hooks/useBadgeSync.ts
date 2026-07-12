import { useEffect } from 'react';
import { Job } from '../state/schema';
import { syncActionBadge } from '../utils/badge';

/**
 * Keeps the pinned toolbar-icon badge updated once per second for as long
 * as this UI surface (popup or dashboard) is mounted. The background
 * service worker keeps the badge alive when the UI is closed; this hook
 * just guarantees a perfectly smooth per-second tick whenever a surface
 * happens to be open, and immediately reflects local optimistic state.
 */
export function useBadgeSync(jobsList: Job[]): void {
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.action) return undefined;

    syncActionBadge(jobsList);
    const interval = setInterval(() => {
      syncActionBadge(jobsList);
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobsList]);
}
