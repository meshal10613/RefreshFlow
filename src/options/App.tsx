import { useTheme } from '../hooks/useTheme';

export default function App() {
  useTheme();
  return (
    <div className="min-h-screen bg-paper-50 text-ink-900 dark:bg-ink-950 dark:text-ink-100 flex flex-col items-center justify-center p-8 select-none">
      <div className="w-16 h-16 rounded-xl bg-ink-900 dark:bg-signal-600 flex items-center justify-center shadow-sm mb-4">
        <svg className="w-8 h-8 text-paper-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-ink-50">
        RefreshFlow Options &amp; Settings
      </h1>
      <p className="text-ink-500 dark:text-ink-400 text-sm mt-1 text-center max-w-[320px]">
        Configure application defaults, notifications, profiles, backup/restore, and advanced features.
      </p>
      <div className="mt-8 text-xs text-ink-500 border border-ink-200 bg-paper-100 dark:border-ink-800 dark:bg-ink-900/40 px-3 py-1.5 rounded-full font-mono">
        v1.0.0 &middot; Initial Scaffold
      </div>
    </div>
  );
}
