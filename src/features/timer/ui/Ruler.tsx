import { motion, useTransform, type MotionValue } from 'motion/react';
import { useMemo, type CSSProperties } from 'react';
import s from '@/features/timer/ui/Ruler.module.css';

interface RulerProps {
  readonly minutes: number;
  readonly progress: MotionValue<number>;
  readonly showNow: boolean;
  /** Ключ для перезапуска анимации появления делений при смене режима. */
  readonly seed: string;
}

interface Scale {
  readonly step: number;
  readonly major: number;
}

/** Подбираем частоту делений так, чтобы их было 20–60 и крупные шли «круглыми» минутами. */
function scaleFor(minutes: number): Scale {
  if (minutes <= 10) return { step: 0.5, major: 1 };
  if (minutes <= 30) return { step: 1, major: 5 };
  if (minutes <= 60) return { step: 1, major: 10 };
  return { step: 5, major: 15 };
}

/**
 * Линейная шкала времени, как на линейке: минуты слева направо, пройденная часть
 * закрашивается, метка «сейчас» едет по шкале. Подписи — HTML, чтобы не растягивались.
 */
export function Ruler({ minutes, progress, showNow, seed }: RulerProps) {
  const ticks = useMemo(() => {
    const { step, major } = scaleFor(minutes);
    const out: { at: number; major: boolean }[] = [];
    for (let m = 0; m <= minutes + 1e-9; m += step) {
      out.push({
        at: m / minutes,
        major: Math.abs(m % major) < 1e-9 || Math.abs(m - minutes) < 1e-9,
      });
    }
    return out;
  }, [minutes]);

  const fill = useTransform(progress, (p) => `scaleX(${p})`);
  const clip = useTransform(progress, (p) => `inset(0 ${((1 - p) * 100).toFixed(3)}% 0 0)`);
  const left = useTransform(progress, (p) => `${(p * 100).toFixed(3)}%`);

  const labels = ticks.filter((t) => t.major);

  return (
    <div className={s.root} aria-hidden="true">
      <div className={s.track}>
        <motion.div className={s.fill} style={{ transform: fill }} />
      </div>

      <div className={s.ticks} key={seed}>
        {ticks.map((t, i) => (
          <span
            key={t.at}
            className={[s.tick, t.major ? s.major : ''].join(' ')}
            style={{ left: `${t.at * 100}%`, '--i': i } as CSSProperties}
          />
        ))}
        <motion.div className={s.lit} style={{ clipPath: clip }}>
          {ticks.map((t) => (
            <span
              key={t.at}
              className={[s.tick, s.on, t.major ? s.major : ''].join(' ')}
              style={{ left: `${t.at * 100}%` }}
            />
          ))}
        </motion.div>
      </div>

      <div className={s.labels}>
        {labels.map((t, i) => (
          <span
            key={t.at}
            className={[
              s.label,
              i === 0 ? s.first : '',
              i === labels.length - 1 ? s.last : '',
            ].join(' ')}
            style={{ left: `${t.at * 100}%` }}
          >
            {Math.round(t.at * minutes)}
            {i === labels.length - 1 ? ' мин' : ''}
          </span>
        ))}
      </div>

      <motion.div
        className={s.now}
        style={{ left }}
        initial={false}
        animate={{ opacity: showNow ? 1 : 0 }}
        transition={{ duration: 0.24 }}
      >
        <span className={s.nowLabel}>сейчас</span>
      </motion.div>
    </div>
  );
}
