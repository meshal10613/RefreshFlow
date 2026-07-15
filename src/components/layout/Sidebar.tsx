import { LucideIcon } from 'lucide-react';

interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface SidebarProps {
  items: SidebarItem[];
  activeId: string;
  onChange: (id: string) => void;
  title?: string;
}

export function Sidebar({ items, activeId, onChange, title }: SidebarProps) {
  return (
    <aside className="w-64 border-r border-ink-200/60 bg-paper-100/40 dark:border-ink-800/80 dark:bg-ink-950/25 shrink-0 flex flex-col p-4 select-none font-sans">
      {title && (
        <div className="px-3 mb-4">
          <span className="text-[10px] font-bold text-ink-400 dark:text-ink-500 uppercase tracking-widest">
            {title}
          </span>
        </div>
      )}
      <nav className="flex flex-col gap-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 border-l-2 cursor-pointer ${
                isActive
                  ? 'bg-signal-500/8 border-l-signal-600 text-signal-700 dark:text-signal-400 border-y border-r border-y-transparent border-r-transparent'
                  : 'border-l-transparent text-ink-500 hover:text-ink-800 hover:bg-paper-200/50 dark:text-ink-400 dark:hover:text-ink-200 dark:hover:bg-ink-900/45 border-y border-r border-transparent'
              }`}
            >
              <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-signal-600 dark:text-signal-400' : 'text-ink-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
