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
      className={`flex flex-col gap-4 relative overflow-hidden ${
        status === 'running' ? 'ring-1 ring-signal-500/15 dark:ring-signal-400/10' : ''
      }`}
    >
      {/* ProgressBar on top for active job */}
      {status === 'running' && (
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-ink-100 dark:bg-ink-800">
          <div
            className="h-full bg-signal-500 transition-all duration-300 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      {/* Header Info */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1 max-w-[70%]">
          <h4 className="font-bold text-ink-900 dark:text-ink-100 truncate text-sm" title={job.name}>
            {job.name}
          </h4>
          <span className="text-xs text-ink-500 truncate" title={job.url}>
            {job.url}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 py-1.5 border-y border-ink-200 dark:border-ink-900 text-left">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider">Type</span>
          <span className="text-xs font-semibold text-ink-700 dark:text-ink-300 mt-0.5">{getTypeLabel()}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider">Interval</span>
          <span className="text-xs font-semibold text-ink-700 dark:text-ink-300 mt-0.5">{getIntervalLabel()}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider">Runs</span>
          <span className="text-xs font-semibold text-ink-700 dark:text-ink-300 mt-0.5">{job.state.runCount}</span>
        </div>
      </div>

      {/* Details based on type */}
      {job.type === 'monitor' && job.monitor && (
        <div className="text-xs text-ink-600 dark:text-ink-400 bg-ink-100/60 dark:bg-ink-950/40 p-2 rounded-lg border border-ink-200 dark:border-ink-900/60">
          <span className="font-semibold text-ink-500">Monitoring:</span> {job.monitor.mode.toUpperCase()}{' '}
          {job.monitor.selector && `(${job.monitor.selector})`}
        </div>
      )}

      {job.type === 'automation' && (
        <div className="text-xs text-ink-600 dark:text-ink-400 bg-ink-100/60 dark:bg-ink-950/40 p-2 rounded-lg border border-ink-200 dark:border-ink-900/60">
          <span className="font-semibold text-ink-500">Steps:</span> {job.actions.length} automations
        </div>
      )}

      {/* Display errors if any */}
      {job.state.lastError && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 bg-red-500/5 px-2.5 py-1.5 rounded-lg border border-red-500/10">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{job.state.lastError}</span>
        </div>
      )}

      {/* Countdown and Actions Row */}
      <div className="flex justify-between items-center mt-1">
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider">
            {status === 'running' ? 'Next Run In' : 'Remaining'}
          </span>
          <span
            className={`text-sm font-bold mt-0.5 tracking-tight font-mono tabular-nums ${
              status === 'running'
                ? 'text-signal-700 dark:text-signal-400'
                : 'text-ink-800 dark:text-ink-200'
            }`}
          >
            {status === 'running' ? formatted : formatDuration(job.schedule.intervalMs)}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {status === 'running' ? (
            <>
              <button
                onClick={() => onPause(job.id)}
                title="Pause Job"
                className="p-1.5 hover:bg-ink-200 dark:hover:bg-ink-800 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 rounded-lg transition-colors cursor-pointer"
              >
                <Pause className="w-4 h-4" />
              </button>
              <button
                onClick={() => onStop(job.id)}
                title="Stop Job"
                className="p-1.5 hover:bg-ink-200 dark:hover:bg-ink-800 text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-200 rounded-lg transition-colors cursor-pointer"
              >
                <Square className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => onStart(job.id)}
              title="Start Job"
              className="p-1.5 hover:bg-ink-200 dark:hover:bg-ink-800 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 rounded-lg transition-colors cursor-pointer"
            >
              <Play className="w-4 h-4" />
            </button>
          )}

          {/* Trigger immediate run */}
          <button
            onClick={() => onRunNow(job.id)}
            title="Execute Now"
            className="p-1.5 hover:bg-ink-200 dark:hover:bg-ink-800 text-signal-600 hover:text-signal-700 dark:text-signal-400 dark:hover:text-signal-300 rounded-lg transition-colors cursor-pointer"
          >
            <Zap className="w-4 h-4" />
          </button>

          {/* Edit */}
          <button
            onClick={() => onEdit(job)}
            title="Edit Job"
            className="p-1.5 hover:bg-ink-200 dark:hover:bg-ink-800 text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-200 rounded-lg transition-colors cursor-pointer"
          >
            <Pencil className="w-4 h-4" />
          </button>

          {/* Delete */}
          <button
            onClick={() => onDelete(job.id)}
            title="Delete Job"
            className="p-1.5 hover:bg-red-500/10 text-ink-500 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
