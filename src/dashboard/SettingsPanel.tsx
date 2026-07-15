import { useRef, useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { Card } from '../components/ui/Card';
import { Select, Input, Toggle } from '../components/ui/Input';
import { Slider } from '../components/ui/Slider';
import { Button } from '../components/ui/Button';
import { StateStore } from '../state/stateStore';
import { HistoryStore } from '../state/historyStore';
import { validateBackup, BackupData } from '../utils/exportImport';
import { SCHEMA_VERSION } from '../state/schema';
import { Download, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';

export function SettingsPanel() {
  const { settings, loading, updateSettings } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (loading) {
    return <div className="text-ink-500 text-sm">Loading settings…</div>;
  }

  const handleExport = async () => {
    const [jobs, exportedSettings, profiles, history] = await Promise.all([
      StateStore.getJobs(),
      StateStore.getSettings(),
      StateStore.getProfiles(),
      HistoryStore.exportHistory(),
    ]);

    const backup: BackupData = {
      version: SCHEMA_VERSION,
      timestamp: Date.now(),
      storage: { jobs, settings: exportedSettings, profiles },
      history,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `refreshflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    await updateSettings({ lastBackupAt: Date.now() });
    setStatus({ type: 'success', message: 'Backup downloaded.' });
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!validateBackup(data)) {
        setStatus({ type: 'error', message: 'That file doesn\u2019t look like a valid RefreshFlow backup.' });
        return;
      }
      await StateStore.set('jobs', data.storage.jobs);
      await StateStore.set('settings', data.storage.settings);
      await StateStore.set('profiles', data.storage.profiles);
      setStatus({ type: 'success', message: 'Backup restored. Jobs and settings updated.' });
    } catch {
      setStatus({ type: 'error', message: 'Could not read that file — is it a valid JSON backup?' });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h3 className="text-sm font-bold text-ink-900 dark:text-ink-100 mb-4">Appearance</h3>
        <div className="flex flex-col gap-4">
          <Select
            label="Theme"
            value={settings.theme}
            onChange={(e) => updateSettings({ theme: e.target.value as typeof settings.theme })}
            options={[
              { value: 'system', label: 'Match System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
          <Toggle
            checked={settings.lowCpuMode}
            onChange={(checked) => updateSettings({ lowCpuMode: checked })}
            label="Low CPU mode"
            description="Reduces animations and rendering work in the dashboard."
          />
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-bold text-ink-900 dark:text-ink-100 mb-4">Job Defaults</h3>
        <div className="flex flex-col gap-5">
          <Slider
            label="Default Interval"
            min={10}
            max={600}
            step={10}
            unit="sec"
            value={settings.defaultIntervalSeconds}
            onChange={(value) => updateSettings({ defaultIntervalSeconds: value })}
          />
          <Select
            label="Default Scope"
            value={settings.defaultScope}
            onChange={(e) =>
              updateSettings({ defaultScope: e.target.value as typeof settings.defaultScope })
            }
            options={[
              { value: 'currentTab', label: 'Current Tab' },
              { value: 'allTabs', label: 'All Tabs' },
              { value: 'pinned', label: 'Pinned Tabs' },
              { value: 'inactive', label: 'Inactive Tabs' },
              { value: 'window', label: 'Current Window' },
            ]}
          />
          <Toggle
            checked={settings.bypassCacheOnReload}
            onChange={(checked) => updateSettings({ bypassCacheOnReload: checked })}
            label="Hard Refresh — bypass cache on every reload"
            description="Forces a hard reload instead of using the browser cache."
          />
          <Toggle
            checked={settings.showVisualTimerOverlay}
            onChange={async (checked) => {
              updateSettings({ showVisualTimerOverlay: checked });
              if (checked) {
                try {
                  const jobs = await StateStore.getJobs();
                  for (const job of Object.values(jobs)) {
                    if (job.state.status === 'running' || job.state.status === 'paused') {
                      const urlObj = new URL(job.url);
                      if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
                        const origin = `${urlObj.protocol}//${urlObj.hostname}/*`;
                        if (typeof chrome !== 'undefined' && chrome.permissions) {
                          await new Promise<boolean>((resolve) => {
                            chrome.permissions.request({ origins: [origin] }, resolve);
                          });
                        }
                      }
                    }
                  }
                } catch (err) {
                  console.error('[SettingsPanel] Failed to request host permissions:', err);
                }
              }
            }}
            label="Show Visual Timer Overlay"
            description="Overlays a live countdown on the page itself while a job is running. Requires site access to be granted for that page."
          />
          {settings.showVisualTimerOverlay && (
            <Select
              label="Overlay Position"
              value={settings.visualTimerPosition || 'bottom-right'}
              onChange={(e) => updateSettings({ visualTimerPosition: e.target.value as any })}
              options={[
                { value: 'top-left', label: 'Top Left' },
                { value: 'top-right', label: 'Top Right' },
                { value: 'bottom-left', label: 'Bottom Left' },
                { value: 'bottom-right', label: 'Bottom Right' },
              ]}
            />
          )}
          <Toggle
            checked={settings.userInteractionBehaviorEnabled}
            onChange={(checked) => updateSettings({ userInteractionBehaviorEnabled: checked })}
            label="Interaction Behavior"
            description="Change timer refresh behavior when you interact with the webpage."
          />
          {settings.userInteractionBehaviorEnabled && (
            <Select
              label="On Interaction"
              value={settings.userInteractionBehavior || 'pause'}
              onChange={(e) => updateSettings({ userInteractionBehavior: e.target.value as any })}
              options={[
                { value: 'stop', label: 'Stop Refresh' },
                { value: 'pause', label: 'Pause Refresh' },
                { value: 'restart', label: 'Restart Countdown' },
              ]}
            />
          )}
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-bold text-ink-900 dark:text-ink-100 mb-4">Power & Precision</h3>
        <div className="flex flex-col gap-4">
          <Toggle
            checked={settings.subMinuteGlobalEnabled}
            onChange={(checked) => updateSettings({ subMinuteGlobalEnabled: checked })}
            label="Allow sub-minute intervals"
            description="Globally permit jobs to opt into refresh intervals under 60 seconds."
          />
          <Toggle
            checked={settings.batterySaverMode}
            onChange={(checked) => updateSettings({ batterySaverMode: checked })}
            label="Battery saver mode"
            description="Restricts the minimum interval to 60s and disables sub-minute precision."
          />
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-bold text-ink-900 dark:text-ink-100 mb-4">Backup & Restore</h3>
        <div className="flex flex-col gap-4">
          <p className="text-xs text-ink-500">
            Export all jobs, settings, and run history to a JSON file, or restore from a previous backup.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={handleExport} className="gap-2">
              <Download className="w-4 h-4" />
              Export Backup
            </Button>
            <Button variant="outline" size="sm" onClick={handleImportClick} className="gap-2">
              <Upload className="w-4 h-4" />
              Import Backup
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>

          <Toggle
            checked={settings.autoBackupEnabled}
            onChange={(checked) => updateSettings({ autoBackupEnabled: checked })}
            label="Reminder for periodic backups"
            description="Shows a reminder to export a backup on the interval below."
          />
          {settings.autoBackupEnabled && (
            <Input
              label="Reminder Interval (days)"
              type="number"
              min={1}
              value={settings.autoBackupIntervalDays}
              onChange={(e) =>
                updateSettings({ autoBackupIntervalDays: Math.max(1, Number(e.target.value)) })
              }
            />
          )}

          {settings.lastBackupAt && (
            <span className="text-xs text-ink-600">
              Last backup: {new Date(settings.lastBackupAt).toLocaleString()}
            </span>
          )}

          {status && (
            <div
              className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
                status.type === 'success'
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 border-emerald-500/10'
                  : 'text-red-600 dark:text-red-400 bg-red-500/5 border-red-500/10'
              }`}
            >
              {status.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              )}
              {status.message}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
