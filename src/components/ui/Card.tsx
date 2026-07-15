import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'interactive';
  children: React.ReactNode;
}

export function Card({ variant = 'default', children, className = '', ...props }: CardProps) {
  const styles = {
    default:
      'bg-white border border-ink-200/60 shadow-[0_2px_12px_-3px_rgba(15,23,42,0.04)] dark:bg-ink-900 dark:border-ink-800/80 rounded-xl p-5',
    glass: 'surface rounded-xl p-5',
    interactive:
      'bg-white border border-ink-200/60 shadow-[0_2px_12px_-3px_rgba(15,23,42,0.04)] hover:border-ink-300 hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] dark:bg-ink-900 dark:border-ink-800/80 dark:hover:border-ink-700 rounded-xl p-5 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer',
  };

  return (
    <div className={`${styles[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}
