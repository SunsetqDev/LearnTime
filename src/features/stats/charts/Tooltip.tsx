import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import s from '@/features/stats/charts/Tooltip.module.css';

interface TooltipProps {
  /** Координаты якоря внутри контейнера графика. null — подсказка скрыта. */
  readonly at: { readonly x: number; readonly y: number } | null;
  readonly width: number;
  readonly children: ReactNode;
}

/** Подсказка над меткой. Не вылезает за края графика: у краёв выравнивается по ним. */
export function Tooltip({ at, width, children }: TooltipProps) {
  const align = at ? (at.x < 90 ? 'left' : at.x > width - 90 ? 'right' : 'center') : 'center';
  return (
    <AnimatePresence>
      {at ? (
        <motion.div
          role="status"
          className={[s.tip, s[align]].join(' ')}
          style={{ left: at.x, top: at.y }}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.08 } }}
          transition={{ duration: 0.14 }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function TipRow({
  color,
  label,
  value,
}: {
  readonly color?: string;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className={s.row}>
      {color ? (
        <span className={s.swatch} style={{ background: color }} aria-hidden="true" />
      ) : null}
      <span className={s.label}>{label}</span>
      <span className={s.value}>{value}</span>
    </div>
  );
}

export function TipTitle({ children }: { readonly children: ReactNode }) {
  return <div className={s.title}>{children}</div>;
}
