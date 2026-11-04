import { motion } from 'motion/react';
import { useRef, type KeyboardEvent } from 'react';
import {
  COLOR_KEYS,
  colorVar,
  SUBJECT_COLORS,
  type SubjectColor,
} from '@/features/subjects/palette';
import s from '@/features/subjects/ui/ColorPicker.module.css';

interface ColorPickerProps {
  readonly value: SubjectColor;
  readonly onChange: (c: SubjectColor) => void;
  readonly taken?: readonly SubjectColor[];
}

/** Радиогруппа из курированной палитры. Занятые цвета помечены, но доступны. */
export function ColorPicker({ value, onChange, taken = [] }: ColorPickerProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const delta = { ArrowRight: 1, ArrowDown: 5, ArrowLeft: -1, ArrowUp: -5 }[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    const next = (i + delta + COLOR_KEYS.length) % COLOR_KEYS.length;
    const key = COLOR_KEYS[next];
    if (!key) return;
    onChange(key);
    refs.current[next]?.focus();
  };

  return (
    <fieldset className={s.root}>
      <legend className="caps">Цвет</legend>
      <div role="radiogroup" aria-label="Цвет предмета" className={s.grid}>
        {COLOR_KEYS.map((c, i) => {
          const active = c === value;
          return (
            <button
              key={c}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${SUBJECT_COLORS[c]}${taken.includes(c) && !active ? ' (уже используется)' : ''}`}
              title={SUBJECT_COLORS[c]}
              tabIndex={active ? 0 : -1}
              className={s.swatch}
              style={{ color: colorVar(c) }}
              onClick={() => {
                onChange(c);
              }}
              onKeyDown={(e) => {
                onKey(e, i);
              }}
            >
              <span className={s.fill} />
              {taken.includes(c) && !active ? (
                <span className={s.taken} aria-hidden="true" />
              ) : null}
              {active ? (
                <motion.span
                  layoutId="color-ring"
                  className={s.ring}
                  transition={{ type: 'spring', stiffness: 600, damping: 38 }}
                />
              ) : null}
            </button>
          );
        })}
      </div>
      <p className={s.name}>{SUBJECT_COLORS[value]}</p>
    </fieldset>
  );
}
