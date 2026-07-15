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
    <header className="relative sticky top-0 z-35 flex items-center justify-between px-5 py-3.5 border-b border-ink-200/60 bg-white/85 dark:border-ink-800/80 dark:bg-ink-950/85 backdrop-blur-md select-none font-sans">
      <div className="flex items-center gap-3">
        <div className="relative w-8 h-8 rounded-lg bg-gradient-to-tr from-signal-600 to-signal-500 dark:from-signal-600 dark:to-signal-500 flex items-center justify-center shadow-sm">
          <RefreshCw className={`w-4 h-4 text-white ${runningCount > 0 ? 'animate-spin' : ''}`} style={{ animationDuration: '2.5s' }} />
          {runningCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="signal-dot relative inline-flex rounded-full h-2.5 w-2.5 bg-white border-2 border-signal-500" />
            </span>
          )}
        </div>
        <div className="flex flex-col leading-tight">
          <h1 className="text-base font-display font-bold tracking-tight text-ink-950 dark:text-ink-50">{title}</h1>
          <span className="text-[10px] font-bold text-ink-400 dark:text-ink-500 uppercase tracking-widest">
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
            className="flex items-center gap-1.5 text-xs font-semibold bg-white hover:bg-paper-100/50 border border-ink-200/80 hover:border-ink-300 text-ink-700 dark:bg-ink-900 dark:border-ink-800 dark:hover:bg-ink-800 dark:hover:border-ink-700 dark:text-ink-300 px-3 py-2 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-[0_1px_2px_rgba(15,23,42,0.02)] cursor-pointer"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-ink-500 dark:text-ink-400" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={`Theme: ${theme}`}
          className="bg-white hover:bg-paper-100/50 border border-ink-200/80 hover:border-ink-300 text-ink-500 hover:text-ink-800 dark:bg-ink-900 dark:border-ink-800 dark:hover:bg-ink-800 dark:hover:border-ink-700 dark:text-ink-400 dark:hover:text-ink-200 p-2 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-[0_1px_2px_rgba(15,23,42,0.02)] cursor-pointer"
        >
          {getThemeIcon()}
        </button>
      </div>
    </header>
  );
}
