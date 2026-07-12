import { useEffect, useState } from 'react';
import { useJobs } from '../hooks/useJobs';
import { useTheme } from '../hooks/useTheme';
import { useBadgeSync } from '../hooks/useBadgeSync';
import { useSettings } from '../hooks/useSettings';
import { JobList } from '../components/job/JobList';
import { JobFormModal } from '../components/job/JobFormModal';
import { Header } from '../components/layout/Header';
import { LiveTimerBar } from '../components/layout/LiveTimerBar';
import { Tabs } from '../components/ui/Tabs';
import { Toggle } from '../components/ui/Input';
import { Job } from '../state/schema';
import { findSoonestRunningJob, countRunningJobs } from '../utils/badge';
import { Plus, Loader2, ListChecks, PlayCircle, PauseCircle, StopCircle, Zap, ChevronDown } from 'lucide-react';

const FILTERS = [
  { id: 'all', label: 'All', icon: <ListChecks className="w-3.5 h-3.5" /> },
  { id: 'running', label: 'Running', icon: <PlayCircle className="w-3.5 h-3.5" /> },
  { id: 'paused', label: 'Paused', icon: <PauseCircle className="w-3.5 h-3.5" /> },
  { id: 'stopped', label: 'Stopped', icon: <StopCircle className="w-3.5 h-3.5" /> },
];

export default function App() {
  useTheme();
  const { jobsList, loading, saveJob, deleteJob, startJob, stopJob, pauseJob, runJobNow } = useJobs();
  const { settings, updateSettings } = useSettings();
  useBadgeSync(jobsList);

  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [quickSettingsOpen, setQuickSettingsOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<{ url: string; title: string; tabId?: number; windowId?: number }>({
    url: '',
    title: '',
  });

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.url) {
        setActiveTab({ url: tab.url, title: tab.title || 'Page', tabId: tab.id, windowId: tab.windowId });
      }
    });
  }, []);

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

  const soonestJob = findSoonestRunningJob(jobsList);
  const runningCount = countRunningJobs(jobsList);

  return (
    <div className="w-[420px] h-[600px] bg-paper-50 text-ink-900 dark:bg-ink-950 dark:text-ink-100 flex flex-col select-none relative overflow-hidden">
      {/* Ambient wash — a single quiet tint, not a rainbow gradient */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-signal-500/[0.05] to-transparent dark:from-signal-500/[0.06]" />

      <Header title="RefreshFlow" showDashboardLink runningCount={runningCount} />

      <div className="relative flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <Tabs tabs={FILTERS} activeTab={filter} onChange={setFilter} />

        {/* Quick settings — one tap away instead of buried in the dashboard */}
        <div className="rounded-lg border border-ink-200 dark:border-ink-800 bg-white/60 dark:bg-ink-900/40 overflow-hidden">
          <button
            onClick={() => setQuickSettingsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 cursor-pointer"
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-600 dark:text-ink-300">
              <Zap className="w-3.5 h-3.5" />
              Quick settings
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-ink-400 transition-transform duration-200 ${quickSettingsOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {quickSettingsOpen && (
            <div className="px-3 pb-3 flex flex-col gap-1 border-t border-ink-200/70 dark:border-ink-800 pt-2">
              <Toggle
                checked={settings.bypassCacheOnReload}
                onChange={(checked) => updateSettings({ bypassCacheOnReload: checked })}
                label="Hard Refresh"
                description="Bypass cache on every reload"
              />
              <Toggle
                checked={settings.showVisualTimerOverlay}
                onChange={(checked) => updateSettings({ showVisualTimerOverlay: checked })}
                label="Visual Timer Overlay"
                description="Show a countdown on the page itself"
              />
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-ink-500">
            <Loader2 className="w-5 h-5 animate-spin text-signal-600" />
            <span className="text-xs font-medium">Loading jobs&hellip;</span>
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

        {/* Spacer so the FAB never overlaps the last card */}
        <div className="h-14 shrink-0" aria-hidden="true" />
      </div>

      {/* Floating action button for creating a new job */}
      <button
        onClick={openNewJobModal}
        title="New Job"
        className={`absolute right-4 ${soonestJob ? 'bottom-[76px]' : 'bottom-4'} z-30 w-12 h-12 rounded-full bg-ink-900 dark:bg-signal-600 text-paper-50 shadow-md flex items-center justify-center transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer`}
      >
        <Plus className="w-5 h-5" />
      </button>

      {/* Live countdown pinned to the bottom of the extension popup */}
      {soonestJob && (
        <LiveTimerBar job={soonestJob} runningCount={runningCount} onRunNow={runJobNow} />
      )}

      <JobFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialJob={editingJob}
        defaultUrl={activeTab.url}
        defaultName={activeTab.title ? `Refresh: ${activeTab.title}` : ''}
        defaultTabId={activeTab.tabId}
        defaultWindowId={activeTab.windowId}
      />
    </div>
  );
}
