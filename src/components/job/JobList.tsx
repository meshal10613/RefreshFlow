import { Job } from '../../state/schema';
import { JobCard } from './JobCard';
import { FolderOpen } from 'lucide-react';

interface JobListProps {
  jobs: Job[];
  filter: string;
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onStop: (id: string) => void;
  onDelete: (id: string) => void;
  onRunNow: (id: string) => void;
  onEdit: (job: Job) => void;
}

export function JobList({
  jobs,
  filter,
  onStart,
  onPause,
  onStop,
  onDelete,
  onRunNow,
  onEdit
}: JobListProps) {
  // Apply filtering
  const filteredJobs = jobs.filter((job) => {
    if (filter === 'all') return true;
    if (filter === 'running') return job.state.status === 'running';
    if (filter === 'paused') return job.state.status === 'paused';
    if (filter === 'stopped') return job.state.status === 'stopped';
    if (filter === 'refresh') return job.type === 'refresh';
    if (filter === 'monitor') return job.type === 'monitor';
    if (filter === 'automation') return job.type === 'automation';
    return true;
  });

  if (filteredJobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-ink-200 bg-ink-100/40 dark:border-ink-900 dark:bg-ink-950/20 rounded-2xl select-none">
        <div className="w-12 h-12 rounded-xl bg-white border border-ink-200 dark:bg-ink-900 dark:border-ink-800 flex items-center justify-center text-ink-500 mb-3">
          <FolderOpen className="w-5 h-5" />
        </div>
        <h5 className="font-semibold text-ink-700 dark:text-ink-300 text-sm">No jobs found</h5>
        <p className="text-xs text-ink-500 dark:text-ink-600 mt-1 max-w-[240px] text-center">
          {filter === 'all' 
            ? 'Get started by creating a new refresh or page monitor task!' 
            : `No matching jobs are currently ${filter}.`}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {filteredJobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          onStart={onStart}
          onPause={onPause}
          onStop={onStop}
          onDelete={onDelete}
          onRunNow={onRunNow}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
