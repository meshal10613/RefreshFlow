import React from 'react';

// --- Input Component ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && <label className="text-xs font-semibold text-ink-500 dark:text-ink-400 uppercase tracking-wider">{label}</label>}
        <input
          ref={ref}
          className={`bg-white border border-ink-200 text-ink-900 placeholder:text-ink-400 focus:border-signal-500 focus:ring-2 focus:ring-signal-500/15 rounded-lg px-3.5 py-2 text-sm focus:outline-none transition-all duration-200 dark:bg-ink-900 dark:border-ink-800 dark:text-ink-100 dark:placeholder:text-ink-600 ${
            error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15' : ''
          } ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-rose-500 mt-0.5 font-medium">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

// --- Select Component ---
interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5 font-sans">
        {label && <label className="text-xs font-semibold text-ink-500 dark:text-ink-400 uppercase tracking-wider">{label}</label>}
        <div className="relative">
          <select
            ref={ref}
            className={`w-full bg-white border border-ink-200 text-ink-900 focus:border-signal-500 focus:ring-2 focus:ring-signal-500/15 rounded-lg pl-3.5 pr-10 py-2.5 text-sm focus:outline-none transition-all duration-200 appearance-none cursor-pointer dark:bg-ink-900 dark:border-ink-800 dark:text-ink-100 ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white text-ink-900 dark:bg-ink-900 dark:text-ink-100">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-ink-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';

// --- Toggle Component ---
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
}

export function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      {(label || description) && (
        <div className="flex flex-col select-none">
          {label && <span className="text-sm font-medium text-ink-800 dark:text-ink-200">{label}</span>}
          {description && <span className="text-xs text-ink-500 mt-0.5">{description}</span>}
        </div>
      )}
      <button
        type="button"
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-500/30 ${
          checked ? 'bg-signal-600' : 'bg-ink-200 dark:bg-ink-800'
        }`}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-[0_1px_4px_rgba(15,23,42,0.15)] ring-0 transition duration-300 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
