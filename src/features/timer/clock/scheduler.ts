/**
 * Планировщик тиков, общий для Web Worker и запасного режима в основном потоке.
 *
 * Тики выравниваются по границам секунд относительно момента окончания (`endAt`),
 * поэтому цифра на экране меняется ровно тогда, когда должна, а не «плавает» на ±1 с.
 * Время всегда берётся из `now()`, интервалы таймеров используются лишь как побудка:
 * даже если браузер задержал таймер, следующий тик посчитает всё заново.
 */
export interface SchedulerHost {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface SchedulerCallbacks {
  onTick(now: number): void;
  onDeadline(at: number, now: number): void;
}

export interface Scheduler {
  arm: (endAt: number) => void;
  disarm: () => void;
}

/** Не просыпаемся чаще, чем раз в 50 мс, и не спим дольше секунды. */
const MIN_DELAY = 50;
const MAX_DELAY = 1000;

export function delayToNextBoundary(endAt: number, now: number): number {
  const left = endAt - now;
  if (left <= 0) return 0;
  const toBoundary = left % 1000 || 1000;
  return Math.min(MAX_DELAY, Math.max(MIN_DELAY, toBoundary + 5));
}

export function createScheduler(host: SchedulerHost, cb: SchedulerCallbacks): Scheduler {
  let handle: unknown = null;
  let target: number | null = null;

  const clear = () => {
    if (handle !== null) host.clearTimeout(handle);
    handle = null;
  };

  const loop = () => {
    if (target === null) return;
    const now = host.now();
    if (now >= target) {
      const at = target;
      target = null;
      clear();
      cb.onDeadline(at, now);
      return;
    }
    cb.onTick(now);
    handle = host.setTimeout(loop, delayToNextBoundary(target, now));
  };

  return {
    arm(endAt) {
      clear();
      target = endAt;
      loop();
    },
    disarm() {
      target = null;
      clear();
    },
  };
}
