import React from 'react';
import { Header } from './Header';

interface PageLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  title?: string;
  showDashboardLink?: boolean;
}

export function PageLayout({ children, sidebar, title, showDashboardLink }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-paper-50 text-ink-900 dark:bg-ink-950 dark:text-ink-100 flex flex-col font-sans select-none">
      <Header title={title} showDashboardLink={showDashboardLink} />

      <div className="flex-1 flex overflow-hidden">
        {sidebar}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-paper-50 dark:bg-ink-950 scroll-smooth">
          <div className="max-w-5xl mx-auto flex flex-col gap-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
