import { Job } from '../../state/schema';
import { useCountdown } from '../../hooks/useCountdown';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { formatDuration } from '../../utils/time';
import { Play, Pause, Square, Trash2, Zap, AlertTriangle, Pencil } from 'lucide-react';

interface JobCardProps {
  job: Job;
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onStop: (id: string) => void;
  onDelete: (id: string) => void;
  onRunNow: (id: string) => void;
  onEdit: (job: Job) => void;
}

export function JobCard({
  job,
  onStart,
  onPause,
  onStop,
  onDelete,
  onRunNow,
  onEdit
}: JobCardProps) {
  const { formatted, percentage } = useCountdown(job);
  const status = job.state.status;

  const getStatusBadge = () => {
    switch (status) {
      case 'running':
        return <Badge variant="success" pulse>Running</Badge>;
      case 'paused':
        return <Badge variant="warning">Paused</Badge>;
      case 'stopped':
      default:
        return <Badge variant="gray">Stopped</Badge>;
    }
  };

  const getTypeLabel = () => {
    switch (job.type) {
      case 'monitor':
        return 'Monitor';
      case 'automation':
        return 'Automation';
      case 'refresh':
      default:
        return 'Auto Refresh';
    }
  };

  const getIntervalLabel = () => {
    if (job.schedule.mode === 'random' && job.schedule.min !== undefined && job.schedule.max !== undefined) {
      return `${formatDuration(job.schedule.min * 1000)}\u2013${formatDuration(job.schedule.max * 1000)}`;
    }
    return formatDuration(job.schedule.intervalMs);
  };

  return (
    <Card
      variant="interactive"
      className={`flex flex-col gap-4 relative overflow-hidden font-sans ${
        status === 'running' ? 'glow-card ring-1 ring-signal-500/15 dark:ring-signal-500/10' : ''
      }`}
    >
      {/* ProgressBar on top for active job */}
      {status === 'running' && (
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-ink-100 dark:bg-ink-900">
          <div
            className="h-full bg-gradient-to-r from-signal-400 to-signal-600 transition-all duration-300 ease-out shadow-[0_0_8px_var(--color-signal-400)]"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      {/* Header Info */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1 max-w-[70%]">
          <h4 className="font-display font-bold text-ink-950 dark:text-ink-50 truncate text-sm" title={job.name}>
            {job.name}
          </h4>
          <span className="text-xs text-ink-400 dark:text-ink-500 truncate" title={job.url}>
            {job.url}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 py-2 border-y border-ink-200/60 dark:border-ink-800/80 text-left">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-ink-400 dark:text-ink-500 uppercase tracking-widest">Type</span>
          <span className="text-xs font-semibold text-ink-700 dark:text-ink-300 mt-0.5">{getTypeLabel()}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-ink-400 dark:text-ink-500 uppercase tracking-widest">Interval</span>
          <span className="text-xs font-semibold text-ink-700 dark:text-ink-300 mt-0.5">{getIntervalLabel()}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-ink-400 dark:text-ink-500 uppercase tracking-widest">Runs</span>
          <span className="text-xs font-semibold text-ink-700 dark:text-ink-300 mt-0.5">{job.state.runCount}</span>
        </div>
      </div>

      {/* Details based on type */}
      {job.type === 'monitor' && job.monitor && (
        <div className="text-xs text-ink-600 dark:text-ink-400 bg-paper-100/60 dark:bg-ink-950/20 p-2.5 rounded-lg border border-ink-200/50 dark:border-ink-800/50">
          <span className="font-semibold text-ink-400 dark:text-ink-500">Monitoring:</span> {job.monitor.mode.toUpperCase()}{' '}
          {job.monitor.selector && `(${job.monitor.selector})`}
        </div>
      )}

      {job.type === 'automation' && (
        <div className="text-xs text-ink-600 dark:text-ink-400 bg-paper-100/60 dark:bg-ink-950/20 p-2.5 rounded-lg border border-ink-200/50 dark:border-ink-800/50">
          <span className="font-semibold text-ink-400 dark:text-ink-500">Steps:</span> {job.actions.length} automations
        </div>
      )}

      {/* Display errors if any */}
      {job.state.lastError && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-500/5 px-2.5 py-1.5 rounded-lg border border-rose-500/10">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{job.state.lastError}</span>
        </div>
      )}

      {/* Countdown and Actions Row */}
      <div className="flex justify-between items-center mt-1">
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-bold text-ink-400 dark:text-ink-500 uppercase tracking-widest">
            {status === 'running' ? 'Next Run In' : 'Remaining'}
          </span>
          <span
            className={`text-[15px] font-bold mt-0.5 tracking-tight digital-mono ${
              status === 'running'
                ? 'text-signal-600 dark:text-signal-400'
                : 'text-ink-700 dark:text-ink-300'
            }`}
          >
            {status === 'running' ? formatted : formatDuration(job.schedule.intervalMs)}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {status === 'running' ? (
            <>
              <button
                onClick={() => onPause(job.id)}
                title="Pause Job"
                className="p-1.5 hover:bg-amber-500/8 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Pause className="w-4 h-4" />
              </button>
              <button
                onClick={() => onStop(job.id)}
                title="Stop Job"
                className="p-1.5 hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-400 hover:text-ink-700 dark:text-ink-500 dark:hover:text-ink-300 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Square className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => onStart(job.id)}
              title="Start Job"
              className="p-1.5 hover:bg-emerald-500/8 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4" />
            </button>
          )}

          {/* Trigger immediate run */}
          <button
            onClick={() => onRunNow(job.id)}
            title="Execute Now"
            className="p-1.5 hover:bg-signal-500/8 text-signal-600 hover:text-signal-700 dark:text-signal-400 dark:hover:text-signal-300 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Zap className="w-4 h-4" />
          </button>

          {/* Edit */}
          <button
            onClick={() => onEdit(job)}
            title="Edit Job"
            className="p-1.5 hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-400 hover:text-ink-700 dark:text-ink-500 dark:hover:text-ink-300 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Pencil className="w-4 h-4" />
          </button>

          {/* Delete */}
          <button
            onClick={() => onDelete(job.id)}
            title="Delete Job"
            className="p-1.5 hover:bg-rose-500/10 text-ink-400 hover:text-rose-600 dark:text-ink-500 dark:hover:text-rose-400 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
