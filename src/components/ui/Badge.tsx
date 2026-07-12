import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'gray';
  children: React.ReactNode;
  className?: string;
  pulse?: boolean;
}

export function Badge({ variant = 'info', children, className = '', pulse = false }: BadgeProps) {
  const styles = {
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
    error: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20',
    info: 'bg-signal-500/10 text-signal-700 dark:text-signal-400 border border-signal-500/20',
    gray: 'bg-ink-100 text-ink-600 border border-ink-200 dark:bg-ink-850 dark:text-ink-400 dark:border-ink-700',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${styles[variant]} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full bg-current mr-1.5 ${pulse ? 'signal-dot' : ''}`} />
      {children}
    </span>
  );
}
