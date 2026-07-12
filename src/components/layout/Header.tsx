import { useSettings } from '../../hooks/useSettings';
import { Moon, Sun, Monitor, RefreshCw, LayoutDashboard } from 'lucide-react';

interface HeaderProps {
  title?: string;
  showDashboardLink?: boolean;
  runningCount?: number;
}

export function Header({ title = 'RefreshFlow', showDashboardLink = false, runningCount = 0 }: HeaderProps) {
  const { settings, updateSettings } = useSettings();
  const theme = settings.theme;

  const toggleTheme = () => {
    const nextThemeMap: Record<typeof theme, typeof theme> = {
      light: 'dark',
      dark: 'system',
      system: 'light',
    };
    updateSettings({ theme: nextThemeMap[theme] });
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="w-4 h-4 text-amber-500" />;
      case 'dark':
        return <Moon className="w-4 h-4 text-signal-400" />;
      case 'system':
      default:
        return <Monitor className="w-4 h-4 text-ink-400" />;
    }
  };

  return (
    <header className="relative sticky top-0 z-35 flex items-center justify-between px-5 py-3.5 border-b border-ink-200/70 bg-white/85 dark:border-ink-800 dark:bg-ink-950/85 backdrop-blur-md select-none">
      <div className="flex items-center gap-3">
        <div className="relative w-8 h-8 rounded-md bg-ink-900 dark:bg-signal-600 flex items-center justify-center ring-1 ring-ink-900/10 dark:ring-signal-500/30">
          <RefreshCw className={`w-4 h-4 text-paper-50 ${runningCount > 0 ? 'animate-spin' : ''}`} style={{ animationDuration: '2.5s' }} />
          {runningCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="signal-dot relative inline-flex rounded-full h-2.5 w-2.5 bg-signal-400 ring-2 ring-white dark:ring-ink-950" />
            </span>
          )}
        </div>
        <div className="flex flex-col leading-tight">
          <h1 className="text-[15px] font-bold tracking-tight text-ink-900 dark:text-ink-50">{title}</h1>
          <span className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider">
            {runningCount > 0
              ? `${runningCount} job${runningCount === 1 ? '' : 's'} active`
              : 'Auto Refresh & Monitor'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {showDashboardLink && (
          <button
            onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/dashboard.html') })}
            title="Open Dashboard"
            className="flex items-center gap-1.5 text-xs font-semibold bg-white border border-ink-200 hover:border-signal-500/40 hover:bg-signal-50 text-ink-700 hover:text-signal-700 dark:bg-ink-900 dark:border-ink-700 dark:hover:border-signal-500/40 dark:hover:bg-signal-500/10 dark:text-ink-300 dark:hover:text-signal-300 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={`Theme: ${theme}`}
          className="bg-white hover:bg-paper-100 border border-ink-200 text-ink-500 hover:text-ink-900 dark:bg-ink-900 dark:hover:bg-ink-800 dark:border-ink-700 dark:text-ink-400 dark:hover:text-ink-100 p-2 rounded-md transition-colors cursor-pointer"
        >
          {getThemeIcon()}
        </button>
      </div>
    </header>
  );
}
