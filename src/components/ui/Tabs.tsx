import React from 'react';

interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps) {
  return (
    <div className={`flex border border-ink-200/60 bg-paper-100 dark:border-ink-800/80 dark:bg-ink-900/40 p-1.25 rounded-xl ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3.5 text-xs font-display font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              isActive
                ? 'bg-white text-ink-950 shadow-[0_2px_8px_-1px_rgba(15,23,42,0.06)] border border-ink-200/40 dark:bg-ink-800 dark:text-ink-50 dark:border-ink-700/50'
                : 'text-ink-500 hover:text-ink-800 hover:bg-white/40 dark:text-ink-400 dark:hover:text-ink-200 dark:hover:bg-ink-800/30'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
