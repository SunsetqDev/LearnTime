import { motion, useReducedMotion } from 'motion/react';
import { useId, useRef, type KeyboardEvent } from 'react';
import s from '@/ui/Segmented.module.css';

interface Option<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly hint?: string;
}

interface SegmentedProps<T extends string> {
  readonly options: readonly Option<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly label: string;
  readonly size?: 'sm' | 'md';
  readonly className?: string;
}

/**
 * Переключатель-радиогруппа. Подложка «переезжает» к выбранному пункту (общий layoutId),
 * стрелки ←/→ перемещают выбор — как у нативной радиогруппы.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  className,
}: SegmentedProps<T>) {
  const id = useId();
  const reduce = useReducedMotion();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent, index: number) => {
    const step =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0;
    if (step === 0) return;
    e.preventDefault();
    const next = (index + step + options.length) % options.length;
    const option = options[next];
    if (!option) return;
    onChange(option.value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={[s.root, s[size], className ?? ''].join(' ')}
    >
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            title={o.hint}
            className={[s.item, active ? s.active : ''].join(' ')}
            onClick={() => {
              onChange(o.value);
            }}
            onKeyDown={(e) => {
              onKey(e, i);
            }}
          >
            {active ? (
              <motion.span
                layoutId={`${id}-thumb`}
                className={s.thumb}
                transition={
                  reduce ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 40 }
                }
              />
            ) : null}
            <span className={s.text}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
