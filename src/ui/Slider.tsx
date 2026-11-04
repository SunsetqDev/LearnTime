import { useId, type CSSProperties } from 'react';
import s from '@/ui/Slider.module.css';

interface SliderProps {
  readonly label: string;
  readonly value: number;
  readonly onChange: (v: number) => void;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly format?: (v: number) => string;
  readonly disabled?: boolean;
}

/** Ползунок на нативном range: заполненная часть — цветом режима, деления каждые 10%. */
export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.05,
  format,
  disabled = false,
}: SliderProps) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={s.row}>
      <label htmlFor={id} className={s.label}>
        {label}
      </label>
      <div className={s.control}>
        <input
          id={id}
          type="range"
          className={s.range}
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-valuetext={format ? format(value) : undefined}
          style={{ '--pct': `${pct}%` } as CSSProperties}
          onChange={(e) => {
            onChange(Number(e.target.value));
          }}
        />
        <span className={s.value}>{format ? format(value) : value}</span>
      </div>
    </div>
  );
}
