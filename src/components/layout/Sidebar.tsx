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
    <aside className="w-64 border-r border-ink-200/70 bg-paper-100/60 dark:border-ink-800 dark:bg-ink-950/40 shrink-0 flex flex-col p-4 select-none">
      {title && (
        <div className="px-3 mb-4">
          <span className="text-[10px] font-bold text-ink-500 uppercase tracking-wider">
            {title}
          </span>
        </div>
      )}
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 cursor-pointer ${
                isActive
                  ? 'bg-signal-500/10 text-signal-700 dark:text-signal-400 border border-signal-500/15'
                  : 'text-ink-500 hover:text-ink-800 hover:bg-paper-200/60 dark:text-ink-400 dark:hover:text-ink-200 dark:hover:bg-ink-900/50 border border-transparent'
              }`}
            >
              <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-signal-700 dark:text-signal-400' : 'text-ink-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
