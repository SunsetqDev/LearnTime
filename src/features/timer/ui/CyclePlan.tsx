import { motion, useTransform, type MotionValue } from 'motion/react';
import { cyclePlan } from '@/features/timer/model/machine';
import type { Mode, TimerConfig } from '@/features/timer/model/types';
import s from '@/features/timer/ui/CyclePlan.module.css';

interface CyclePlanProps {
  readonly config: TimerConfig;
  readonly index: number;
  readonly progress: MotionValue<number>;
}

const SHORT_LABEL: Record<Mode, string> = { focus: 'Учёба', short: 'Перерыв', long: 'Длинный' };

/**
 * План круга: отрезки учёбы и перерывов в пропорции их длительности.
 * Пройденные — приглушены, текущий заполняется вместе с таймером.
 */
export function CyclePlan({ config, index, progress }: CyclePlanProps) {
  const plan = cyclePlan(config);
  const fill = useTransform(progress, (p) => `scaleX(${p})`);
  const focusCount = plan.filter((m) => m === 'focus').length;
  const doneFocus = plan.slice(0, index).filter((m) => m === 'focus').length;

  return (
    <section className={s.root} aria-label="План цикла">
      <div className={s.head}>
        <span className="caps">План цикла</span>
        <span className={s.count}>
          <span className="num">{String(doneFocus).padStart(2, '0')}</span>
          <span className={s.of}> / {String(focusCount).padStart(2, '0')}</span>
        </span>
      </div>
      <ol className={s.row}>
        {plan.map((mode, i) => {
          const state = i < index ? 'done' : i === index ? 'now' : 'next';
          return (
            <li
              key={`${mode}-${i}`}
              className={[s.seg, s[state]].join(' ')}
              style={{ flexGrow: config.durations[mode] }}
              data-mode={mode}
              aria-current={state === 'now' ? 'step' : undefined}
            >
              <span className={s.bar}>
                {state === 'now' ? (
                  <motion.span className={s.barFill} style={{ transform: fill }} />
                ) : null}
              </span>
              <span className={s.label}>
                {mode === 'short'
                  ? `${Math.round(config.durations.short / 60_000)} м`
                  : SHORT_LABEL[mode]}
              </span>
              <span className="sr-only">
                {state === 'done' ? 'пройдено' : state === 'now' ? 'сейчас' : 'впереди'}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
