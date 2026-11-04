import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import s from '@/features/timer/ui/Readout.module.css';

interface ReadoutProps {
  readonly value: string;
  readonly size?: 'hero' | 'focus';
  readonly dim?: boolean;
}

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Время как механический счётчик: каждая цифра живёт в своей ячейке и при смене
 * уезжает вниз, а новая приходит сверху. Ячейки фиксированной ширины (моноширинный
 * шрифт), поэтому строка не дрожит. Для скринридера — одна строка без анимации.
 */
export function Readout({ value, size = 'hero', dim = false }: ReadoutProps) {
  const reduce = useReducedMotion();
  const chars = value.split('');
  return (
    <div className={[s.root, s[size], dim ? s.dim : ''].join(' ')}>
      <span className="sr-only">{value}</span>
      <span className={s.digits} aria-hidden="true">
        {chars.map((ch, i) => {
          const key = `${chars.length - i}`; // позиция с конца: секунды всегда в одной ячейке
          if (ch === ':') {
            return (
              <span key={key} className={s.colon}>
                :
              </span>
            );
          }
          return (
            <span key={key} className={s.slot}>
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  key={ch}
                  className={s.char}
                  initial={reduce ? { opacity: 0 } : { y: '-55%', opacity: 0, filter: 'blur(2px)' }}
                  animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
                  exit={reduce ? { opacity: 0 } : { y: '55%', opacity: 0, filter: 'blur(2px)' }}
                  transition={{ duration: reduce ? 0.12 : 0.42, ease: EASE }}
                >
                  {ch}
                </motion.span>
              </AnimatePresence>
            </span>
          );
        })}
      </span>
    </div>
  );
}
