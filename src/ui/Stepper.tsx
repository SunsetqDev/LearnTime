import { AnimatePresence, motion } from 'motion/react';
import { useId, useState } from 'react';
import { IconButton } from '@/ui/Button';
import s from '@/ui/Stepper.module.css';

interface StepperProps {
  readonly label: string;
  readonly value: number;
  readonly onChange: (v: number) => void;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly unit?: string;
  readonly hint?: string;
}

/**
 * Числовое поле с кнопками «−/+»: значение «перекатывается» в сторону изменения,
 * стрелки ↑/↓ работают с клавиатуры (это нативный spinbutton).
 */
export function Stepper({ label, value, onChange, min, max, step = 1, unit, hint }: StepperProps) {
  const id = useId();
  const [dir, setDir] = useState(0);
  const set = (v: number) => {
    const next = Math.min(max, Math.max(min, Math.round(v / step) * step));
    setDir(Math.sign(next - value));
    if (next !== value) onChange(next);
  };
  return (
    <div className={s.row}>
      <label htmlFor={id} className={s.text}>
        <span className={s.label}>{label}</span>
        {hint ? <span className={s.hint}>{hint}</span> : null}
      </label>
      <div className={s.control}>
        <IconButton
          icon="minus"
          label={`Уменьшить: ${label}`}
          variant="line"
          size={16}
          disabled={value <= min}
          onClick={() => {
            set(value - step);
          }}
        />
        <div className={s.valueBox}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={value}
              className={s.valueShown}
              aria-hidden="true"
              initial={{ y: dir >= 0 ? '-70%' : '70%', opacity: 0 }}
              animate={{ y: '0%', opacity: 1 }}
              exit={{ y: dir >= 0 ? '70%' : '-70%', opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {value}
            </motion.span>
          </AnimatePresence>
          <input
            id={id}
            className={s.input}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) set(v);
            }}
          />
          {unit ? <span className={s.unit}>{unit}</span> : null}
        </div>
        <IconButton
          icon="plus"
          label={`Увеличить: ${label}`}
          variant="line"
          size={16}
          disabled={value >= max}
          onClick={() => {
            set(value + step);
          }}
        />
      </div>
    </div>
  );
}
