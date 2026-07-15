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

      {/* Quick Settings Pinned at the top of the popup (outside of scroll container) */}
      <div className="px-4 pt-3 pb-1 border-b border-ink-200/40 dark:border-ink-800/40 bg-paper-50/80 dark:bg-ink-950/80 backdrop-blur-md z-10 shrink-0">
        <div className="rounded-xl border border-ink-200/60 dark:border-ink-800/80 bg-white/60 dark:bg-ink-900/40 overflow-hidden shadow-[0_1px_4px_rgba(15,23,42,0.02)]">
          <button
            onClick={() => setQuickSettingsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 cursor-pointer font-sans"
          >
            <span className="flex items-center gap-1.5 text-xs font-display font-bold text-ink-700 dark:text-ink-300 uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-signal-500" />
              Quick settings
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-ink-400 transition-transform duration-200 ${quickSettingsOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {quickSettingsOpen && (
            <div className="px-3.5 pb-3.5 flex flex-col gap-1.5 border-t border-ink-200/60 dark:border-ink-800/80 pt-3">
              <Toggle
                checked={settings.bypassCacheOnReload}
                onChange={(checked) => updateSettings({ bypassCacheOnReload: checked })}
                label="Hard Refresh"
                description="Bypass cache on every reload"
              />
              <Toggle
                checked={settings.showVisualTimerOverlay}
                onChange={async (checked) => {
                  updateSettings({ showVisualTimerOverlay: checked });
                  if (checked && activeTab.url) {
                    try {
                      const urlObj = new URL(activeTab.url);
                      if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
                        const origin = `${urlObj.protocol}//${urlObj.hostname}/*`;
                        if (typeof chrome !== 'undefined' && chrome.permissions) {
                          chrome.permissions.request({ origins: [origin] });
                        }
                      }
                    } catch (err) {
                      console.error('[QuickSettings] Failed to request active tab host permission:', err);
                    }
                  }
                }}
                label="Visual Timer Overlay"
                description="Show a countdown on the page itself"
              />
              {settings.showVisualTimerOverlay && (
                <div className="pl-6 pr-1.5 flex items-center justify-between gap-2 py-1 bg-ink-50/50 dark:bg-ink-950/20 rounded-lg">
                  <span className="text-xs text-ink-600 dark:text-ink-400 font-medium">Overlay Position</span>
                  <select
                    value={settings.visualTimerPosition || 'bottom-right'}
                    onChange={(e) => updateSettings({ visualTimerPosition: e.target.value as any })}
                    className="text-xs font-sans bg-white dark:bg-ink-800 text-ink-800 dark:text-ink-200 border border-ink-200 dark:border-ink-700 rounded-md px-2 py-1 outline-none cursor-pointer hover:border-signal-500 dark:hover:border-signal-500 transition-colors"
                  >
                    <option value="top-left">Top Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-right">Bottom Right</option>
                  </select>
                </div>
              )}
              <Toggle
                checked={settings.userInteractionBehaviorEnabled}
                onChange={(checked) => updateSettings({ userInteractionBehaviorEnabled: checked })}
                label="Interaction Behavior"
                description="Trigger action on page interaction"
              />
              {settings.userInteractionBehaviorEnabled && (
                <div className="pl-6 pr-1.5 flex items-center justify-between gap-2 py-1 bg-ink-50/50 dark:bg-ink-950/20 rounded-lg">
                  <span className="text-xs text-ink-600 dark:text-ink-400 font-medium">On Interaction</span>
                  <select
                    value={settings.userInteractionBehavior || 'pause'}
                    onChange={(e) => updateSettings({ userInteractionBehavior: e.target.value as any })}
                    className="text-xs font-sans bg-white dark:bg-ink-800 text-ink-800 dark:text-ink-200 border border-ink-200 dark:border-ink-700 rounded-md px-2 py-1 outline-none cursor-pointer hover:border-signal-500 dark:hover:border-signal-500 transition-colors"
                  >
                    <option value="stop">Stop Refresh</option>
                    <option value="pause">Pause Refresh</option>
                    <option value="restart">Restart countdown</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="relative flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <Tabs tabs={FILTERS} activeTab={filter} onChange={setFilter} />

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
        className={`absolute right-4 ${soonestJob ? 'bottom-[76px]' : 'bottom-4'} z-30 w-12 h-12 rounded-full bg-gradient-to-tr from-signal-600 to-signal-500 hover:from-signal-500 hover:to-signal-600 dark:from-signal-600 dark:to-signal-700 dark:hover:from-signal-500 dark:hover:to-signal-600 text-white shadow-[0_4px_16px_rgba(13,148,136,0.25)] flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer`}
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
