import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  // Lock scroll on open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop blur */}
      <div 
        className="fixed inset-0 bg-ink-900/30 dark:bg-ink-950/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white border border-ink-200 dark:bg-ink-900 dark:border-ink-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-slide-up z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-ink-200 bg-white dark:border-ink-800/80 dark:bg-ink-900">
          <h3 className="text-base font-semibold text-ink-900 dark:text-ink-100 tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="text-ink-500 hover:text-ink-900 hover:bg-ink-100 rounded-lg p-1.5 dark:text-ink-400 dark:hover:text-ink-100 dark:hover:bg-ink-800 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-ink-200 bg-ink-50/60 dark:border-ink-800/80 dark:bg-ink-900/60 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
