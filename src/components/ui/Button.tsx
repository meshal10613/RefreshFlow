import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyle =
    'inline-flex items-center justify-center font-display font-semibold rounded-lg transition-all duration-200 cubic-bezier(0.16, 1, 0.3, 1) focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-500/40 focus-visible:ring-offset-1 focus-visible:ring-offset-paper-50 dark:focus-visible:ring-offset-ink-950 hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer';

  const variants = {
    primary:
      'bg-gradient-to-r from-signal-600 to-signal-500 hover:from-signal-500 hover:to-signal-600 text-white shadow-[0_2px_8px_rgba(13,148,136,0.15)] border border-signal-600/30 hover:shadow-[0_4px_12px_rgba(13,148,136,0.25)] dark:from-signal-600 dark:to-signal-700 dark:hover:from-signal-500 dark:hover:to-signal-600 dark:border-signal-500/30',
    secondary:
      'bg-paper-100 hover:bg-paper-200 text-ink-800 border border-ink-200/60 dark:bg-ink-850 dark:hover:bg-ink-800 dark:text-ink-100 dark:border-ink-800/80',
    outline:
      'bg-transparent hover:bg-paper-100/80 text-ink-700 border border-ink-200 hover:border-ink-300 dark:hover:bg-ink-850 dark:text-ink-300 dark:border-ink-800 dark:hover:text-ink-100',
    ghost:
      'bg-transparent hover:bg-paper-100/50 text-ink-500 hover:text-ink-800 dark:hover:bg-ink-850/50 dark:text-ink-400 dark:hover:text-ink-200',
    danger:
      'bg-transparent hover:bg-rose-500/5 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}
