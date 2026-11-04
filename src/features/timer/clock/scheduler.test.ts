import { createScheduler, delayToNextBoundary } from '@/features/timer/clock/scheduler';

describe('планировщик часов', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const host = {
    now: () => Date.now(),
    setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
    clearTimeout: (h: unknown) => {
      clearTimeout(h as ReturnType<typeof setTimeout>);
    },
  };

  it('выравнивает задержку по границе секунды относительно дедлайна', () => {
    expect(delayToNextBoundary(10_000, 0)).toBe(1000);
    expect(delayToNextBoundary(10_300, 0)).toBe(305);
    expect(delayToNextBoundary(10_000, 9_990)).toBe(50);
    expect(delayToNextBoundary(10_000, 10_000)).toBe(0);
  });

  it('шлёт тики и один дедлайн', () => {
    const onTick = vi.fn();
    const onDeadline = vi.fn();
    const s = createScheduler(host, { onTick, onDeadline });
    s.arm(3_000);
    vi.advanceTimersByTime(3_100);
    expect(onTick.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(onDeadline).toHaveBeenCalledTimes(1);
    expect(onDeadline.mock.calls[0]?.[0]).toBe(3_000);
  });

  it('дедлайн срабатывает, даже если браузер задержал таймер', () => {
    const onDeadline = vi.fn();
    const s = createScheduler(host, { onTick: vi.fn(), onDeadline });
    s.arm(2_000);
    // Таймер «проспал»: системное время прыгнуло на 10 секунд.
    vi.setSystemTime(10_000);
    vi.advanceTimersByTime(1_000);
    expect(onDeadline).toHaveBeenCalledWith(2_000, expect.any(Number));
  });

  it('disarm останавливает отсчёт', () => {
    const onDeadline = vi.fn();
    const s = createScheduler(host, { onTick: vi.fn(), onDeadline });
    s.arm(2_000);
    s.disarm();
    vi.advanceTimersByTime(5_000);
    expect(onDeadline).not.toHaveBeenCalled();
  });
});
