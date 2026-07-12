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
    <div className={`flex border border-ink-200/70 bg-paper-100 dark:border-ink-800 dark:bg-ink-950/50 p-1 rounded-lg ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-md transition-colors duration-150 cursor-pointer ${
              isActive
                ? 'bg-white text-ink-900 shadow-sm border border-ink-200/70 dark:bg-ink-800 dark:text-ink-50 dark:border-ink-700'
                : 'text-ink-500 hover:text-ink-800 hover:bg-white/60 dark:hover:text-ink-300 dark:hover:bg-ink-900/40'
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
