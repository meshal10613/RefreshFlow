export interface AutomationStep {
  id: string;
  type: 'click' | 'scroll' | 'fill' | 'wait';
  selector: string; // CSS selector or XPath
  selectorType: 'css' | 'xpath';
  value?: string; // used for fill (text to input)
  delayMs?: number; // delay before executing this step
  scrollOption?: 'top' | 'bottom' | 'custom';
  scrollPosition?: { x: number; y: number };
}

export interface MonitorConfig {
  mode: 'text' | 'html' | 'element' | 'keyword' | 'regex';
  selector?: string; // CSS selector or XPath for element mode
  selectorType?: 'css' | 'xpath';
  keyword?: string; // text keyword to look for (alert on found/lost)
  keywordCondition?: 'found' | 'lost';
  regex?: string; // regex pattern to evaluate
  ignoreWhitespace: boolean;
  highlightChanges: boolean;
  captureFullPage: boolean;
}

export interface Job {
  id: string;
  type: 'refresh' | 'monitor' | 'automation';
  name: string;
  url: string;
  target: {
    scope: 'currentTab' | 'allTabs' | 'selectedTabs' | 'pinned' | 'inactive' | 'window';
    tabIds?: number[];
    windowId?: number;
  };
  schedule: {
    mode: 'fixed' | 'random' | 'cron-like';
    intervalMs: number;
    min?: number;
    max?: number;
    subMinuteOptIn: boolean;
    repeatCount?: number; // stop after N repeats if set
    timeWindow?: { start: string; end: string }; // e.g. "09:00"-"17:00"
    weekdays?: number[]; // [0-6] where 0 is Sunday
  };
  conditions: {
    onlyIfLoaded: boolean;
    stopOnError: boolean;
    stopOnSuccess: boolean;
    urlChangeBehavior: 'restart' | 'ignoreParams' | 'none';
  };
  actions: AutomationStep[];
  monitor?: MonitorConfig;
  state: {
    status: 'running' | 'paused' | 'stopped';
    nextRunAt: number;
    runCount: number;
    lastRunAt?: number;
    lastResult?: string;
    lastError?: string;
  };
  notifications: {
    desktop: boolean;
    sound: boolean;
    badge: boolean;
    customMessage?: string;
  };
  createdAt: number;
}

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  accentColor: string; // hex or tailwind class
  lowCpuMode: boolean; // limit rendering/animations in dashboard
  batterySaverMode: boolean; // restricts min interval to 60s, disables sub-minute
  subMinuteGlobalEnabled: boolean; // global toggle for sub-minute heartbeat precision
  defaultIntervalSeconds: number;
  defaultScope: Job['target']['scope'];
  bypassCacheOnReload: boolean;
  showVisualTimerOverlay: boolean; // overlay a live countdown on the page itself
  visualTimerPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  userInteractionBehaviorEnabled?: boolean;
  userInteractionBehavior?: 'stop' | 'pause' | 'restart';
  notificationSoundFile: string; // name or synthesized tone index
  autoBackupEnabled: boolean;
  autoBackupIntervalDays: number;
  lastBackupAt?: number;
}

export interface Profile {
  id: string;
  name: string;
  description?: string;
  jobs: Job[];
  createdAt: number;
}

export interface StorageSchema {
  jobs: Record<string, Job>;
  settings: Settings;
  profiles: Profile[];
  schemaVersion: number;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  accentColor: '#6366f1', // Indigo
  lowCpuMode: false,
  batterySaverMode: false,
  subMinuteGlobalEnabled: true,
  defaultIntervalSeconds: 60,
  defaultScope: 'currentTab',
  bypassCacheOnReload: false,
  showVisualTimerOverlay: false,
  visualTimerPosition: 'bottom-right',
  userInteractionBehaviorEnabled: false,
  userInteractionBehavior: 'pause',
  notificationSoundFile: 'default-chime',
  autoBackupEnabled: false,
  autoBackupIntervalDays: 7,
};

export const SCHEMA_VERSION = 1;
