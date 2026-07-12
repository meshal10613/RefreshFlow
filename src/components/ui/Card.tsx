import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'interactive';
  children: React.ReactNode;
}

export function Card({ variant = 'default', children, className = '', ...props }: CardProps) {
  const styles = {
    default:
      'bg-white border border-ink-200/70 shadow-[0_1px_2px_rgba(20,24,26,0.04)] dark:bg-ink-900 dark:border-ink-800 rounded-lg p-5',
    glass: 'surface rounded-lg p-5',
    interactive:
      'bg-white border border-ink-200/70 shadow-[0_1px_2px_rgba(20,24,26,0.04)] hover:border-ink-300 hover:shadow-[0_2px_10px_rgba(20,24,26,0.06)] dark:bg-ink-900 dark:border-ink-800 dark:hover:border-ink-700 rounded-lg p-5 transition-all duration-200 cursor-pointer',
  };

  return (
    <div className={`${styles[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}
