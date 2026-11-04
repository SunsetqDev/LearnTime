import { isClockMessage, type ClockCommand } from '@/features/timer/clock/protocol';
import { createScheduler, type SchedulerCallbacks } from '@/features/timer/clock/scheduler';

export interface Clock {
  arm: (endAt: number) => void;
  disarm: () => void;
  dispose: () => void;
}

/**
 * Часы таймера. По возможности отсчёт идёт в Web Worker — его таймеры браузер
 * почти не замедляет в фоновой вкладке. Если Worker недоступен (старый браузер,
 * тесты), тот же планировщик работает в основном потоке.
 */
export function createClock(callbacks: SchedulerCallbacks): Clock {
  if (typeof Worker !== 'undefined') {
    try {
      const worker = new Worker(new URL('./clock.worker.ts', import.meta.url), {
        type: 'module',
        name: 'focus-clock',
      });
      worker.addEventListener('message', (event: MessageEvent<unknown>) => {
        const msg = event.data;
        if (!isClockMessage(msg)) return;
        if (msg.type === 'tick') callbacks.onTick(msg.now);
        else callbacks.onDeadline(msg.at, msg.now);
      });
      const send = (command: ClockCommand) => {
        worker.postMessage(command);
      };
      return {
        arm: (endAt) => {
          send({ type: 'arm', endAt });
        },
        disarm: () => {
          send({ type: 'disarm' });
        },
        dispose: () => {
          worker.terminate();
        },
      };
    } catch {
      // Падаем в запасной режим ниже.
    }
  }

  const scheduler = createScheduler(
    {
      now: () => Date.now(),
      setTimeout: (fn, ms) => window.setTimeout(fn, ms),
      clearTimeout: (handle) => {
        window.clearTimeout(handle as number);
      },
    },
    callbacks,
  );
  return { arm: scheduler.arm, disarm: scheduler.disarm, dispose: scheduler.disarm };
}
