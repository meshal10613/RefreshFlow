import { useState, useEffect, useCallback } from 'react';
import { Job } from '../state/schema';
import { formatCountdown } from '../utils/time';

interface CountdownState {
  remainingMs: number;
  formatted: string;
  percentage: number;
}

export function useCountdown(job: Job): CountdownState {
  const nextRunAt = job.state.nextRunAt;
  const intervalMs = job.schedule.intervalMs;
  const status = job.state.status;

  const calculateState = useCallback((): CountdownState => {
    if (status !== 'running' || !nextRunAt) {
      return { remainingMs: intervalMs, formatted: formatCountdown(intervalMs), percentage: 0 };
    }

    const remainingMs = Math.max(0, nextRunAt - Date.now());
    const formatted = formatCountdown(remainingMs);

    // Percentage elapsed (100 is fully complete/due, 0 is just started)
    const elapsed = intervalMs - remainingMs;
    const percentage = Math.min(100, Math.max(0, (elapsed / intervalMs) * 100));

    return { remainingMs, formatted, percentage };
  }, [nextRunAt, intervalMs, status]);

  const [state, setState] = useState<CountdownState>(calculateState());

  useEffect(() => {
    if (status !== 'running') {
      setState(calculateState());
      return undefined;
    }

    // Recompute immediately whenever this becomes the active tick, then
    // once per second after that. A plain setInterval is used instead of
    // requestAnimationFrame: rAF is throttled/paused by the browser when
    // the document isn't visible (e.g. a background/unfocused window), which
    // is exactly when this hook previously appeared to "freeze" instead of
    // counting down every second.
    setState(calculateState());
    const interval = setInterval(() => {
      setState(calculateState());
    }, 1000);

    // Correct any drift the instant the tab/window regains visibility
    // (setInterval itself is also throttled while hidden in some browsers).
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setState(calculateState());
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [calculateState, status]);

  return state;
}
