import { Job } from '../../state/schema';
import { useCountdown } from '../../hooks/useCountdown';
import { Zap } from 'lucide-react';

interface LiveTimerBarProps {
  job: Job;
  runningCount: number;
  onRunNow: (id: string) => void;
}

const RADIUS = 15;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function LiveTimerBar({ job, runningCount, onRunNow }: LiveTimerBarProps) {
  const { formatted, percentage } = useCountdown(job);
  const dashOffset = CIRCUMFERENCE - (percentage / 100) * CIRCUMFERENCE;

  return (
    <div className="sticky bottom-0 z-20 shrink-0 border-t border-ink-200/70 dark:border-ink-800 bg-white/90 dark:bg-ink-950/90 backdrop-blur-md px-4 py-3 animate-slide-up">
      <div className="flex items-center gap-3">
        {/* Mini circular progress ring */}
        <div className="relative w-9 h-9 shrink-0">
          <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
            <circle
              cx="18"
              cy="18"
              r={RADIUS}
              fill="none"
              strokeWidth="3"
              className="stroke-ink-200 dark:stroke-ink-800"
            />
            <circle
              cx="18"
              cy="18"
              r={RADIUS}
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              className="stroke-signal-600 dark:stroke-signal-400"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.3s ease-out' }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="signal-dot w-1.5 h-1.5 rounded-full bg-signal-500" />
          </span>
        </div>

        {/* Job name + countdown */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
              Next run
            </span>
            {runningCount > 1 && (
              <span className="text-[10px] font-semibold text-ink-400">
                &middot; +{runningCount - 1} more active
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-base font-bold tracking-tight text-signal-700 dark:text-signal-400 tabular-nums">
              {formatted}
            </span>
            <span className="text-xs text-ink-500 truncate" title={job.name}>
              {job.name}
            </span>
          </div>
        </div>

        {/* Quick action */}
        <button
          onClick={() => onRunNow(job.id)}
          title="Run now"
          className="shrink-0 p-2 rounded-md bg-signal-500/10 hover:bg-signal-500/20 text-signal-700 dark:text-signal-400 transition-colors cursor-pointer"
        >
          <Zap className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
