import { animate, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  readonly value: number;
  readonly format?: (n: number) => string;
  readonly duration?: number;
  readonly className?: string | undefined;
}

const defaultFormat = (n: number) => Math.round(n).toLocaleString('ru-RU');

/**
 * Число «набегает» при первом появлении на экране и при каждом изменении —
 * от прошлого значения к новому, с замедлением в конце.
 */
export function CountUp({
  value,
  format = defaultFormat,
  duration = 0.9,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const reduce = useReducedMotion();
  const from = useRef(0);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(from.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        setShown(v);
      },
    });
    from.current = value;
    return () => {
      controls.stop();
    };
  }, [value, inView, reduce, duration]);

  return (
    <span ref={ref} className={className}>
      <span aria-hidden="true">{format(reduce ? value : shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
