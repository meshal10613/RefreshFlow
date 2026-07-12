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
    <div className="w-full flex flex-col gap-2">
      <div className="flex justify-between items-center text-xs text-ink-500 dark:text-ink-400 font-semibold uppercase tracking-wider">
        <span>{label}</span>
        <span className="text-signal-700 dark:text-signal-400 font-bold normal-case text-sm font-mono tabular-nums">
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
        className="w-full h-1.5 bg-ink-200 dark:bg-ink-700 rounded-full appearance-none cursor-pointer accent-signal-600 focus:outline-none transition-all"
      />
      <div className="flex justify-between text-[10px] text-ink-400 dark:text-ink-600 font-medium font-mono">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}
