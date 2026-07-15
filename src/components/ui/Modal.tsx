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
      <div className="relative bg-white border border-ink-200/60 dark:bg-ink-900 dark:border-ink-800/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-[0_20px_50px_-12px_rgba(15,23,42,0.15)] flex flex-col max-h-[85vh] animate-slide-up z-10 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-200/60 bg-white dark:border-ink-800/80 dark:bg-ink-900">
          <h3 className="text-base font-display font-bold text-ink-950 dark:text-ink-50 tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-800 hover:bg-paper-100 rounded-lg p-1.5 dark:text-ink-500 dark:hover:text-ink-200 dark:hover:bg-ink-800 transition-all duration-200 cursor-pointer"
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
          <div className="px-6 py-4 border-t border-ink-200/60 bg-paper-50/50 dark:border-ink-800/60 dark:bg-ink-900/40 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
