import { useState } from 'react';
import { useJobs } from '../hooks/useJobs';
import { useTheme } from '../hooks/useTheme';
import { PageLayout } from '../components/layout/PageLayout';
import { Sidebar } from '../components/layout/Sidebar';
import { JobList } from '../components/job/JobList';
import { JobFormModal } from '../components/job/JobFormModal';
import { Tabs } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { SettingsPanel } from './SettingsPanel';
import { Job } from '../state/schema';
import { ListChecks, Settings as SettingsIcon, Plus, Loader2 } from 'lucide-react';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'running', label: 'Running' },
  { id: 'paused', label: 'Paused' },
  { id: 'stopped', label: 'Stopped' },
  { id: 'refresh', label: 'Refresh' },
  { id: 'monitor', label: 'Monitor' },
];

const NAV_ITEMS = [
  { id: 'jobs', label: 'Jobs', icon: ListChecks },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function App() {
  useTheme();
  const { jobsList, loading, saveJob, deleteJob, startJob, stopJob, pauseJob, runJobNow } = useJobs();
  const [activeView, setActiveView] = useState('jobs');
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | undefined>(undefined);

  const openNewJobModal = () => {
    setEditingJob(undefined);
    setModalOpen(true);
  };

  const openEditJobModal = (job: Job) => {
    setEditingJob(job);
    setModalOpen(true);
  };

  const handleSave = async (job: Job, startImmediately: boolean) => {
    await saveJob(job);
    if (startImmediately) {
      await startJob(job.id);
    } else if (job.state.status === 'running') {
      await stopJob(job.id);
    }
  };

  return (
    <PageLayout
      title="RefreshFlow Dashboard"
      sidebar={
        <Sidebar items={NAV_ITEMS} activeId={activeView} onChange={setActiveView} title="Navigate" />
      }
    >
      {activeView === 'jobs' && (
        <>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-ink-900 dark:text-ink-100">Jobs</h2>
            <Button variant="primary" size="sm" onClick={openNewJobModal} className="gap-2">
              <Plus className="w-4 h-4" />
              New Job
            </Button>
          </div>

          <Tabs tabs={FILTERS} activeTab={filter} onChange={setFilter} />

          {loading ? (
            <div className="flex items-center justify-center py-16 text-ink-500">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <JobList
              jobs={jobsList}
              filter={filter}
              onStart={startJob}
              onPause={pauseJob}
              onStop={stopJob}
              onDelete={deleteJob}
              onRunNow={runJobNow}
              onEdit={openEditJobModal}
            />
          )}
        </>
      )}

      {activeView === 'settings' && (
        <>
          <h2 className="text-lg font-bold text-ink-900 dark:text-ink-100">Settings</h2>
          <SettingsPanel />
        </>
      )}

      <JobFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialJob={editingJob}
      />
    </PageLayout>
  );
}
