import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'gray';
  children: React.ReactNode;
  className?: string;
  pulse?: boolean;
}

export function Badge({ variant = 'info', children, className = '', pulse = false }: BadgeProps) {
  const styles = {
    success: 'bg-emerald-500/8 text-emerald-700 dark:text-emerald-400 border border-emerald-500/15',
    warning: 'bg-amber-500/8 text-amber-700 dark:text-amber-400 border border-amber-500/15',
    error: 'bg-rose-500/8 text-rose-700 dark:text-rose-400 border border-rose-500/15',
    info: 'bg-signal-500/8 text-signal-600 dark:text-signal-400 border border-signal-500/15',
    gray: 'bg-ink-100 text-ink-600 border border-ink-200/80 dark:bg-ink-900 dark:text-ink-400 dark:border-ink-800',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-display font-semibold tracking-wide ${styles[variant]} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full bg-current mr-1.5 ${pulse ? 'signal-dot' : ''}`} />
      {children}
    </span>
  );
}
