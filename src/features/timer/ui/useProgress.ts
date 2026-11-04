import { useMotionValue, type MotionValue } from 'motion/react';
import { useLayoutEffect } from 'react';
import { progress } from '@/features/timer/model/machine';
import { useTimer } from '@/features/timer/store';

/**
 * Плавный прогресс 0…1 текущей сессии как MotionValue: обновляется каждый кадр,
 * но без перерисовки React — шкала и план двигаются на GPU.
 */
export function useProgress(): MotionValue<number> {
  const machine = useTimer((s) => s.machine);
  const value = useMotionValue(0);

  useLayoutEffect(() => {
    value.set(progress(machine, Date.now()));
    if (machine.phase !== 'running') return;
    let frame = 0;
    const loop = () => {
      value.set(progress(machine, Date.now()));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [machine, value]);

  return value;
}
