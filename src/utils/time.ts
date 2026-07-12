/**
 * Time utility functions for RefreshFlow
 */

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function parseInterval(value: number, unit: 'ms' | 's' | 'm' | 'h' | 'd'): number {
  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
  }
}

/**
 * Calculates the next timestamp matching weekdays and time windows.
 */
export function nextCronTime(
  weekdays: number[] | undefined,
  timeWindow: { start: string; end: string } | undefined
): number {
  const now = new Date();
  let candidate = new Date(now.getTime() + 1000); // starts at least 1s from now

  // Loop up to 8 days to find a matching weekday/time window
  for (let d = 0; d < 8; d++) {
    const dayOfWeek = candidate.getDay(); // 0 is Sunday, 1 is Monday...
    
    // Check if weekday matches
    if (weekdays && weekdays.length > 0 && !weekdays.includes(dayOfWeek)) {
      // Shift candidate to next day start
      candidate.setDate(candidate.getDate() + 1);
      candidate.setHours(0, 0, 0, 0);
      continue;
    }

    // Check if time window matches or needs adjustment
    if (timeWindow) {
      const [startH, startM] = timeWindow.start.split(':').map(Number);
      const [endH, endM] = timeWindow.end.split(':').map(Number);

      const startTime = new Date(candidate.getTime());
      startTime.setHours(startH, startM, 0, 0);

      const endTime = new Date(candidate.getTime());
      endTime.setHours(endH, endM, 0, 0);

      if (candidate.getTime() < startTime.getTime()) {
        // Before the window started today, set to window start time today
        return startTime.getTime();
      } else if (candidate.getTime() > endTime.getTime()) {
        // After the window ended today, shift candidate to tomorrow start and continue
        candidate.setDate(candidate.getDate() + 1);
        candidate.setHours(0, 0, 0, 0);
        continue;
      } else {
        // Inside time window, candidate is fine as is
        return candidate.getTime();
      }
    } else {
      // No time window restriction, matches current candidate time
      return candidate.getTime();
    }
  }

  // Fallback
  return now.getTime() + 60000;
}

export function randomInterval(min: number, max: number): number {
  const minMs = min * 1000;
  const maxMs = max * 1000;
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}
