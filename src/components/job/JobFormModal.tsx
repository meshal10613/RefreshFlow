import { useEffect, useState } from 'react';
import { Job, MonitorConfig } from '../../state/schema';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Select, Toggle } from '../ui/Input';
import { Tabs } from '../ui/Tabs';

type IntervalUnit = 'seconds' | 'minutes' | 'hours';
type ScheduleMode = 'fixed' | 'random';

interface JobFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (job: Job, startImmediately: boolean) => void | Promise<void>;
  initialJob?: Job;
  defaultUrl?: string;
  defaultName?: string;
  defaultTabId?: number;
  defaultWindowId?: number;
}

const SCOPE_OPTIONS = [
  { value: 'currentTab', label: 'This Tab (pinned)' },
  { value: 'allTabs', label: 'All Tabs' },
  { value: 'pinned', label: 'Pinned Tabs' },
  { value: 'inactive', label: 'Inactive Tabs' },
  { value: 'window', label: 'Current Window' },
];

const MONITOR_MODE_OPTIONS = [
  { value: 'text', label: 'Text content' },
  { value: 'html', label: 'HTML markup' },
  { value: 'element', label: 'Specific element' },
  { value: 'keyword', label: 'Keyword found/lost' },
  { value: 'regex', label: 'Regex pattern' },
];

function msToValueUnit(ms: number): { value: number; unit: IntervalUnit } {
  if (ms % 3600000 === 0 && ms >= 3600000) return { value: ms / 3600000, unit: 'hours' };
  if (ms % 60000 === 0 && ms >= 60000) return { value: ms / 60000, unit: 'minutes' };
  return { value: Math.round(ms / 1000), unit: 'seconds' };
}

function valueUnitToMs(value: number, unit: IntervalUnit): number {
  switch (unit) {
    case 'seconds':
      return value * 1000;
    case 'minutes':
      return value * 60 * 1000;
    case 'hours':
      return value * 60 * 60 * 1000;
  }
}

function makeJobId(): string {
  return `job-${Math.random().toString(36).substring(2, 11)}`;
}

export function JobFormModal({
  isOpen,
  onClose,
  onSave,
  initialJob,
  defaultUrl = '',
  defaultName = '',
  defaultTabId,
  defaultWindowId,
}: JobFormModalProps) {
  const isEdit = Boolean(initialJob);

  const [type, setType] = useState<Job['type']>('refresh');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [scope, setScope] = useState<Job['target']['scope']>('currentTab');
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('fixed');
  const [intervalValue, setIntervalValue] = useState(60);
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>('seconds');
  const [randomMinSeconds, setRandomMinSeconds] = useState(30);
  const [randomMaxSeconds, setRandomMaxSeconds] = useState(90);
  const [subMinuteOptIn, setSubMinuteOptIn] = useState(false);
  const [stopOnError, setStopOnError] = useState(false);
  const [stopOnSuccess, setStopOnSuccess] = useState(false);
  const [notifyDesktop, setNotifyDesktop] = useState(false);
  const [notifySound, setNotifySound] = useState(false);
  const [notifyBadge, setNotifyBadge] = useState(false);
  const [startImmediately, setStartImmediately] = useState(true);

  const [monitorMode, setMonitorMode] = useState<MonitorConfig['mode']>('keyword');
  const [monitorSelector, setMonitorSelector] = useState('');
  const [monitorKeyword, setMonitorKeyword] = useState('');
  const [monitorRegex, setMonitorRegex] = useState('');
  const [monitorKeywordCondition, setMonitorKeywordCondition] =
    useState<NonNullable<MonitorConfig['keywordCondition']>>('lost');
  const [monitorHighlightChanges, setMonitorHighlightChanges] = useState(true);
  const [monitorIgnoreWhitespace, setMonitorIgnoreWhitespace] = useState(true);

  const [error, setErrorMsg] = useState<string | null>(null);

  // Reset / prefill form whenever the modal is (re)opened
  useEffect(() => {
    if (!isOpen) return;

    if (initialJob) {
      setType(initialJob.type === 'automation' ? 'refresh' : initialJob.type);
      setName(initialJob.name);
      setUrl(initialJob.url);
      setScope(initialJob.target.scope);
      if (initialJob.schedule.mode === 'random' && initialJob.schedule.min !== undefined && initialJob.schedule.max !== undefined) {
        setScheduleMode('random');
        setRandomMinSeconds(initialJob.schedule.min);
        setRandomMaxSeconds(initialJob.schedule.max);
        const { value, unit } = msToValueUnit(initialJob.schedule.intervalMs);
        setIntervalValue(value);
        setIntervalUnit(unit);
      } else {
        setScheduleMode('fixed');
        const { value, unit } = msToValueUnit(initialJob.schedule.intervalMs);
        setIntervalValue(value);
        setIntervalUnit(unit);
        setRandomMinSeconds(30);
        setRandomMaxSeconds(90);
      }
      setSubMinuteOptIn(initialJob.schedule.subMinuteOptIn);
      setStopOnError(initialJob.conditions.stopOnError);
      setStopOnSuccess(initialJob.conditions.stopOnSuccess);
      setNotifyDesktop(initialJob.notifications.desktop);
      setNotifySound(initialJob.notifications.sound);
      setNotifyBadge(initialJob.notifications.badge);
      setStartImmediately(initialJob.state.status === 'running');

      if (initialJob.monitor) {
        setMonitorMode(initialJob.monitor.mode);
        setMonitorSelector(initialJob.monitor.selector || '');
        setMonitorKeyword(initialJob.monitor.keyword || '');
        setMonitorRegex(initialJob.monitor.regex || '');
        setMonitorKeywordCondition(initialJob.monitor.keywordCondition || 'lost');
        setMonitorHighlightChanges(initialJob.monitor.highlightChanges);
        setMonitorIgnoreWhitespace(initialJob.monitor.ignoreWhitespace);
      }
    } else {
      setType('refresh');
      setName(defaultName);
      setUrl(defaultUrl);
      setScope('currentTab');
      setScheduleMode('fixed');
      setIntervalValue(60);
      setIntervalUnit('seconds');
      setRandomMinSeconds(30);
      setRandomMaxSeconds(90);
      setSubMinuteOptIn(false);
      setStopOnError(false);
      setStopOnSuccess(false);
      setNotifyDesktop(false);
      setNotifySound(false);
      setNotifyBadge(false);
      setStartImmediately(true);
      setMonitorMode('keyword');
      setMonitorSelector('');
      setMonitorKeyword('');
      setMonitorRegex('');
      setMonitorKeywordCondition('lost');
      setMonitorHighlightChanges(true);
      setMonitorIgnoreWhitespace(true);
    }
    setErrorMsg(null);
  }, [isOpen, initialJob, defaultUrl, defaultName]);

  const intervalMs = valueUnitToMs(intervalValue, intervalUnit);
  const showSubMinuteToggle =
    scheduleMode === 'fixed'
      ? intervalUnit === 'seconds' && intervalValue > 0 && intervalValue < 60
      : randomMinSeconds > 0 && randomMinSeconds < 60;

  const handleSubmit = async () => {
    if (!name.trim()) {
      setErrorMsg('Please give this job a name.');
      return;
    }
    if (!url.trim()) {
      setErrorMsg('Please enter a URL to target.');
      return;
    }
    try {
      new URL(url);
    } catch {
      setErrorMsg('That URL doesn\u2019t look valid \u2014 include https:// at the start.');
      return;
    }
    if (scheduleMode === 'random') {
      if (!Number.isFinite(randomMinSeconds) || randomMinSeconds < 1) {
        setErrorMsg('Enter a "from" value of at least 1 second.');
        return;
      }
      if (!Number.isFinite(randomMaxSeconds) || randomMaxSeconds < 1) {
        setErrorMsg('Enter a "to" value of at least 1 second.');
        return;
      }
      if (randomMaxSeconds < randomMinSeconds) {
        setErrorMsg('The "to" value must be greater than or equal to the "from" value.');
        return;
      }
    }
    if (type === 'monitor') {
      if ((monitorMode === 'keyword') && !monitorKeyword.trim()) {
        setErrorMsg('Enter a keyword to watch for.');
        return;
      }
      if (monitorMode === 'regex' && !monitorRegex.trim()) {
        setErrorMsg('Enter a regex pattern to watch for.');
        return;
      }
      if ((monitorMode === 'element' || monitorMode === 'text') && !monitorSelector.trim()) {
        setErrorMsg('Enter a CSS selector for the element to watch.');
        return;
      }
    }

    const monitor: MonitorConfig | undefined =
      type === 'monitor'
        ? {
            mode: monitorMode,
            selector: monitorSelector || undefined,
            selectorType: 'css',
            keyword: monitorKeyword || undefined,
            keywordCondition: monitorKeywordCondition,
            regex: monitorRegex || undefined,
            ignoreWhitespace: monitorIgnoreWhitespace,
            highlightChanges: monitorHighlightChanges,
            captureFullPage: monitorMode === 'html',
          }
        : undefined;

    const now = Date.now();

    const schedule: Job['schedule'] =
      scheduleMode === 'random'
        ? {
            mode: 'random',
            // Used as the sub-minute precision floor and as a fallback duration estimate;
            // kept in sync with the lower bound of the random range.
            intervalMs: randomMinSeconds * 1000,
            min: randomMinSeconds,
            max: randomMaxSeconds,
            subMinuteOptIn: showSubMinuteToggle ? subMinuteOptIn : false,
          }
        : {
            mode: 'fixed',
            intervalMs,
            subMinuteOptIn: showSubMinuteToggle ? subMinuteOptIn : false,
          };

    const job: Job = {
      id: initialJob?.id ?? makeJobId(),
      type,
      name: name.trim(),
      url: url.trim(),
      target: {
        scope,
        windowId: initialJob?.target.windowId ?? defaultWindowId,
        tabIds: initialJob?.target.tabIds ?? (defaultTabId !== undefined ? [defaultTabId] : undefined),
      },
      schedule,
      conditions: {
        onlyIfLoaded: true,
        stopOnError,
        stopOnSuccess,
        urlChangeBehavior: 'restart',
      },
      actions: initialJob?.actions ?? [],
      monitor,
      state: initialJob?.state ?? {
        status: 'stopped',
        nextRunAt: now + schedule.intervalMs,
        runCount: 0,
      },
      notifications: {
        desktop: notifyDesktop,
        sound: notifySound,
        badge: notifyBadge,
      },
      createdAt: initialJob?.createdAt ?? now,
    };

    await onSave(job, startImmediately);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Job' : 'New Job'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {isEdit ? 'Save Changes' : 'Create Job'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6 font-sans">
        {/* Section 1: Task Identity */}
        <div className="form-section flex flex-col gap-4">
          <Tabs
            tabs={[
              { id: 'refresh', label: 'Auto Refresh' },
              { id: 'monitor', label: 'Page Monitor' },
            ]}
            activeTab={type}
            onChange={(id) => setType(id as Job['type'])}
          />

          <Input
            label="Job Name"
            placeholder="e.g. Refresh ticket queue"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="URL"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />

          <div className="flex flex-col gap-2">
            <Select
              label="Apply To"
              value={scope}
              onChange={(e) => setScope(e.target.value as Job['target']['scope'])}
              options={SCOPE_OPTIONS}
            />
            {scope === 'currentTab' && (
              <p className="text-[11px] text-ink-500 dark:text-ink-400 leading-normal">
                This job stays locked to the tab it was created from and keeps refreshing on
                schedule even while you're browsing somewhere else.
              </p>
            )}
          </div>
        </div>

        {/* Section 2: Timer Configuration */}
        <div className="form-section flex flex-col gap-4">
          <h4 className="text-[10px] font-bold text-ink-400 dark:text-ink-500 uppercase tracking-widest">Schedule & Interval</h4>
          
          <Select
            label="Schedule Mode"
            value={scheduleMode}
            onChange={(e) => setScheduleMode(e.target.value as ScheduleMode)}
            options={[
              { value: 'fixed', label: 'Fixed interval' },
              { value: 'random', label: 'Random interval range' },
            ]}
          />

          {scheduleMode === 'fixed' ? (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Interval"
                type="number"
                min={1}
                value={intervalValue}
                onChange={(e) => setIntervalValue(Math.max(1, Number(e.target.value)))}
              />
              <Select
                label="Unit"
                value={intervalUnit}
                onChange={(e) => setIntervalUnit(e.target.value as IntervalUnit)}
                options={[
                  { value: 'seconds', label: 'Seconds' },
                  { value: 'minutes', label: 'Minutes' },
                  { value: 'hours', label: 'Hours' },
                ]}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="From (sec)"
                  type="number"
                  min={1}
                  value={randomMinSeconds}
                  onChange={(e) => setRandomMinSeconds(Math.max(1, Number(e.target.value)))}
                />
                <Input
                  label="To (sec)"
                  type="number"
                  min={1}
                  value={randomMaxSeconds}
                  onChange={(e) => setRandomMaxSeconds(Math.max(1, Number(e.target.value)))}
                />
              </div>
              <p className="text-xs text-ink-500 leading-normal">
                Each cycle waits a random number of seconds between these two values.
              </p>
            </div>
          )}

          {showSubMinuteToggle && (
            <Toggle
              checked={subMinuteOptIn}
              onChange={setSubMinuteOptIn}
              label="Allow sub-minute precision"
              description="Without this, intervals under 60s are rounded up to 60s to save battery."
            />
          )}
        </div>

        {/* Section 3: Monitoring Filters */}
        {type === 'monitor' && (
          <div className="form-section flex flex-col gap-4">
            <h4 className="text-[10px] font-bold text-ink-400 dark:text-ink-500 uppercase tracking-widest">Page Monitoring</h4>
            
            <Select
              label="Watch For"
              value={monitorMode}
              onChange={(e) => setMonitorMode(e.target.value as MonitorConfig['mode'])}
              options={MONITOR_MODE_OPTIONS}
            />

            {(monitorMode === 'element' || monitorMode === 'text') && (
              <Input
                label="CSS Selector"
                placeholder="#price, .status-badge, ..."
                value={monitorSelector}
                onChange={(e) => setMonitorSelector(e.target.value)}
              />
            )}

            {monitorMode === 'keyword' && (
              <>
                <Input
                  label="Keyword"
                  placeholder="e.g. Sold Out"
                  value={monitorKeyword}
                  onChange={(e) => setMonitorKeyword(e.target.value)}
                />
                <Select
                  label="Alert When Keyword Is"
                  value={monitorKeywordCondition}
                  onChange={(e) =>
                    setMonitorKeywordCondition(e.target.value as 'found' | 'lost')
                  }
                  options={[
                    { value: 'found', label: 'Found on the page' },
                    { value: 'lost', label: 'No longer on the page' },
                  ]}
                />
              </>
            )}

            {monitorMode === 'regex' && (
              <Input
                label="Regex Pattern"
                placeholder="e.g. \\$\\d+\\.\\d{2}"
                value={monitorRegex}
                onChange={(e) => setMonitorRegex(e.target.value)}
              />
            )}

            <Toggle
              checked={monitorHighlightChanges}
              onChange={setMonitorHighlightChanges}
              label="Highlight changes"
              description="Flash the changed area on the page when detected."
            />
            <Toggle
              checked={monitorIgnoreWhitespace}
              onChange={setMonitorIgnoreWhitespace}
              label="Ignore whitespace"
              description="Avoid false alerts from spacing-only changes."
            />
          </div>
        )}

        {/* Section 4: Trigger Rules */}
        <div className="form-section flex flex-col gap-3">
          <h4 className="text-[10px] font-bold text-ink-400 dark:text-ink-500 uppercase tracking-widest">Trigger Conditions</h4>
          <Toggle
            checked={stopOnError}
            onChange={setStopOnError}
            label="Stop on error"
            description="Pause this job automatically if a run fails."
          />
          <Toggle
            checked={stopOnSuccess}
            onChange={setStopOnSuccess}
            label="Stop after first success"
            description="Useful for one-off checks like restock alerts."
          />
        </div>

        {/* Section 5: Notifications & Startup */}
        <div className="form-section flex flex-col gap-3">
          <h4 className="text-[10px] font-bold text-ink-400 dark:text-ink-500 uppercase tracking-widest">Alerts & Start Settings</h4>
          <Toggle checked={notifyDesktop} onChange={setNotifyDesktop} label="Desktop notification" />
          <Toggle checked={notifySound} onChange={setNotifySound} label="Play sound" />
          <Toggle checked={notifyBadge} onChange={setNotifyBadge} label="Badge counter" />
          <div className="pt-2 border-t border-ink-100 dark:border-ink-800/40 mt-1">
            <Toggle
              checked={startImmediately}
              onChange={setStartImmediately}
              label={isEdit ? 'Keep running' : 'Start immediately'}
            />
          </div>
        </div>

        {error && (
          <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/5 border border-rose-500/10 rounded-lg px-3.5 py-2 font-medium">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
