import { motion } from 'motion/react';
import type { ReactElement } from 'react';
import type { Glyph } from '@/features/achievements/model/rules';
import s from '@/features/achievements/ui/Medal.module.css';

const TICKS = 36;

/** Гравировки в центре медали: сетка 24×24, линия 1.5 — та же графика, что у иконок приложения. */
const GLYPHS: Record<Glyph, ReactElement> = {
  start: <path d="M9 7v10l8-5-8-5Z" />,
  ten: <path d="M9 18h6" />,
  hundred: <path d="M8 18h8M10 20.5h4" />,
  hours: (
    <>
      <path d="M5 16h14" />
      <path d="M12 16V8" />
      <circle cx="12" cy="7" r="1.2" />
    </>
  ),
  flame: (
    <path d="M12 19c2.6 0 4.5-1.8 4.5-4.3 0-2.8-2.3-4.3-3-7.2-1.5 1-2.3 2.5-2.3 4-.8-.4-1.4-1.1-1.5-2.1-1.4 1.2-2.2 2.7-2.2 5.3 0 2.5 1.9 4.3 4.5 4.3Z" />
  ),
  early: (
    <>
      <path d="M5 16h14" />
      <path d="M8 16a4 4 0 0 1 8 0" />
      <path d="M12 7v2M7.2 9.2l1.2 1.2M16.8 9.2l-1.2 1.2" />
    </>
  ),
  cycle: (
    <>
      <path d="M6 15h3M10.5 15h3M15 15h3" />
      <path d="M6 10h12" />
      <path d="m15.5 8 2.5 2-2.5 2" />
    </>
  ),
  mountain: <path d="M4 18 10 8l3 5 2-3 5 8H4Z" />,
  spectrum: <path d="M6 8h12M6 11h9M6 14h11M6 17h6" />,
  shield: (
    <>
      <path d="M12 5 6.5 7v5c0 3.4 2.4 5.8 5.5 7 3.1-1.2 5.5-3.6 5.5-7V7L12 5Z" />
      <path d="m9.5 12 2 2 3.5-3.5" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  focus: (
    <>
      <path d="M6 9V6h3M15 6h3v3M18 15v3h-3M9 18H6v-3" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
};

interface MedalProps {
  readonly glyph: Glyph;
  readonly label?: string | undefined;
  readonly progress: number;
  readonly unlocked: boolean;
  readonly size?: number;
  readonly delay?: number;
}

/**
 * Медаль-прибор: по кругу 36 делений, которые «загораются» по мере прогресса.
 * Открытая медаль — тёмная гравировка с полностью зажжённой шкалой.
 */
export function Medal({ glyph, label, progress, unlocked, size = 72, delay = 0 }: MedalProps) {
  const lit = unlocked ? TICKS : Math.floor(progress * TICKS);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      className={[s.medal, unlocked ? s.unlocked : ''].join(' ')}
      aria-hidden="true"
    >
      {Array.from({ length: TICKS }, (_, i) => {
        const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2;
        const major = i % 3 === 0;
        const r1 = major ? 30 : 31.5;
        const r2 = 34.5;
        return (
          <motion.line
            key={i}
            x1={36 + r1 * Math.cos(a)}
            y1={36 + r1 * Math.sin(a)}
            x2={36 + r2 * Math.cos(a)}
            y2={36 + r2 * Math.sin(a)}
            className={i < lit ? s.tickOn : s.tick}
            strokeWidth={major ? 1.5 : 1}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + i * 0.012, duration: 0.2 }}
          />
        );
      })}
      <circle cx="36" cy="36" r="25" className={s.disc} />
      <g transform="translate(24 22)" className={s.glyph}>
        {GLYPHS[glyph]}
      </g>
      {label ? (
        <text
          x="36"
          y={glyph === 'ten' || glyph === 'hundred' ? 40 : 56}
          textAnchor="middle"
          className={s.label}
        >
          {label}
        </text>
      ) : null}
    </svg>
  );
}
