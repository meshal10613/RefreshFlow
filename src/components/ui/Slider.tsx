interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  label?: string;
  unit?: string;
}

export function Slider({ min, max, step = 1, value, onChange, label, unit = '' }: SliderProps) {
  return (
    <div className="w-full flex flex-col gap-2 font-sans">
      <div className="flex justify-between items-center text-xs text-ink-500 dark:text-ink-400 font-display font-semibold uppercase tracking-wider">
        <span>{label}</span>
        <span className="text-signal-600 dark:text-signal-400 font-bold normal-case text-sm font-mono tabular-nums">
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-ink-200 dark:bg-ink-800 rounded-full appearance-none cursor-pointer accent-signal-600 dark:accent-signal-500 focus:outline-none transition-all"
      />
      <div className="flex justify-between text-[10px] text-ink-400 dark:text-ink-600 font-semibold font-mono">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}
