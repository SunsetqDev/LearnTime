import type {
  Mode,
  SessionDraft,
  SessionStatus,
  TimerConfig,
  TimerEffect,
  TimerEvent,
  TimerState,
  Transition,
} from '@/features/timer/model/types';

const MINUTE = 60_000;

/** Учебные сессии короче этого порога при пропуске/прерывании не записываются — это шум, а не учёба. */
export const MIN_RECORDED_MS = MINUTE;

/** Если дедлайн наступил давно (вкладка была закрыта), автостарт следующей сессии не делаем. */
export const AUTOSTART_GRACE_MS = 60_000;

export const DEFAULT_CONFIG: TimerConfig = {
  durations: { focus: 25 * MINUTE, short: 5 * MINUTE, long: 15 * MINUTE },
  longEvery: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
};

export function createInitialState(config: TimerConfig = DEFAULT_CONFIG): TimerState {
  return {
    phase: 'idle',
    mode: 'focus',
    durationMs: config.durations.focus,
    startedAt: null,
    anchor: null,
    banked: 0,
    pauses: 0,
    cycle: 0,
    lastCompleted: null,
    context: { subjectId: null, task: '' },
    config,
  };
}

/* ---------------- Производные величины ---------------- */

export function elapsedMs(state: TimerState, now: number): number {
  const live = state.phase === 'running' && state.anchor !== null ? now - state.anchor : 0;
  return Math.min(state.durationMs, Math.max(0, state.banked + live));
}

export function remainingMs(state: TimerState, now: number): number {
  return state.durationMs - elapsedMs(state, now);
}

export function progress(state: TimerState, now: number): number {
  return state.durationMs === 0 ? 0 : elapsedMs(state, now) / state.durationMs;
}

/** Абсолютный момент окончания, если таймер идёт. */
export function endsAt(state: TimerState): number | null {
  if (state.phase !== 'running' || state.anchor === null) return null;
  return state.anchor + (state.durationMs - state.banked);
}

/** Какой режим будет после текущего — с учётом счётчика циклов. */
export function nextModeAfter(mode: Mode, cycle: number, config: TimerConfig): Mode {
  if (mode !== 'focus') return 'focus';
  return (cycle + 1) % config.longEvery === 0 ? 'long' : 'short';
}

/** План одного круга: учёба и перерыв по очереди, в конце — длинный перерыв. */
export function cyclePlan(config: TimerConfig): Mode[] {
  const plan: Mode[] = [];
  for (let i = 0; i < config.longEvery; i += 1) {
    plan.push('focus', i === config.longEvery - 1 ? 'long' : 'short');
  }
  return plan;
}

/** Позиция текущей сессии в плане круга. */
export function planIndex(state: TimerState): number {
  if (state.mode === 'focus') return state.cycle * 2;
  if (state.mode === 'long') return state.config.longEvery * 2 - 1;
  return Math.max(0, state.cycle * 2 - 1);
}

/* ---------------- Вспомогательные переходы ---------------- */

const none: readonly TimerEffect[] = [];

function isActive(state: TimerState): boolean {
  return state.phase === 'running' || state.phase === 'paused';
}

function idleIn(state: TimerState, mode: Mode, patch: Partial<TimerState> = {}): TimerState {
  return {
    ...state,
    phase: 'idle',
    mode,
    durationMs: state.config.durations[mode],
    startedAt: null,
    anchor: null,
    banked: 0,
    pauses: 0,
    lastCompleted: null,
    ...patch,
  };
}

function draft(state: TimerState, now: number, status: SessionStatus): SessionDraft {
  return {
    mode: state.mode,
    status,
    startedAt: state.startedAt ?? now,
    endedAt: now,
    plannedMs: state.durationMs,
    actualMs: Math.round(elapsedMs(state, now)),
    pauses: state.pauses,
    subjectId: state.context.subjectId,
    task: state.context.task.trim(),
  };
}

function start(state: TimerState, now: number): Transition {
  const next: TimerState = {
    ...state,
    phase: 'running',
    durationMs: state.config.durations[state.mode],
    startedAt: now,
    anchor: now,
    banked: 0,
    pauses: 0,
    lastCompleted: null,
  };
  return { state: next, effects: [{ type: 'clock', endAt: endsAt(next) }] };
}

/**
 * Сессия дошла до конца. `at` — точный момент дедлайна, а не момент, когда мы о нём узнали:
 * так запись и автостарт не «съезжают», если вкладка спала.
 */
function complete(state: TimerState, at: number, now: number, allowAutostart: boolean): Transition {
  const finished = state.mode;
  const effects: TimerEffect[] = [];

  if (finished === 'focus') {
    effects.push({
      type: 'record',
      session: { ...draft(state, at, 'completed'), actualMs: state.durationMs },
    });
  }

  const nextMode = nextModeAfter(finished, state.cycle, state.config);
  const cycle = finished === 'focus' ? (state.cycle + 1) % state.config.longEvery : state.cycle;
  effects.push({ type: 'signal', finished, next: nextMode });

  const auto =
    allowAutostart &&
    now - at < AUTOSTART_GRACE_MS &&
    (nextMode === 'focus' ? state.config.autoStartFocus : state.config.autoStartBreaks);

  if (auto) {
    const running: TimerState = {
      ...idleIn(state, nextMode, { cycle }),
      phase: 'running',
      startedAt: at,
      anchor: at,
    };
    // Если с момента дедлайна прошло больше, чем длится следующая сессия, — догоняем дальше.
    const chained = checkDeadline(running, now, allowAutostart);
    if (chained.state !== running)
      return { state: chained.state, effects: [...effects, ...chained.effects] };
    effects.push({ type: 'clock', endAt: endsAt(running) });
    return { state: running, effects };
  }

  effects.push({ type: 'clock', endAt: null });
  return {
    state: idleIn(state, nextMode, { cycle, phase: 'finished', lastCompleted: finished }),
    effects,
  };
}

function checkDeadline(state: TimerState, now: number, allowAutostart: boolean): Transition {
  const end = endsAt(state);
  if (end === null || now < end) return { state, effects: none };
  return complete(state, end, now, allowAutostart);
}

/* ---------------- Автомат ---------------- */

export function transition(state: TimerState, event: TimerEvent): Transition {
  switch (event.type) {
    case 'START':
      if (state.phase === 'idle' || state.phase === 'finished') return start(state, event.now);
      return { state, effects: none };

    case 'PAUSE': {
      if (state.phase !== 'running') return { state, effects: none };
      const done = checkDeadline(state, event.now, true);
      if (done.state !== state) return done;
      return {
        state: {
          ...state,
          phase: 'paused',
          banked: elapsedMs(state, event.now),
          anchor: null,
          pauses: state.pauses + 1,
        },
        effects: [{ type: 'clock', endAt: null }],
      };
    }

    case 'RESUME': {
      if (state.phase !== 'paused') return { state, effects: none };
      const next: TimerState = { ...state, phase: 'running', anchor: event.now };
      return { state: next, effects: [{ type: 'clock', endAt: endsAt(next) }] };
    }

    case 'TOGGLE':
      if (state.phase === 'running') return transition(state, { type: 'PAUSE', now: event.now });
      if (state.phase === 'paused') return transition(state, { type: 'RESUME', now: event.now });
      return transition(state, { type: 'START', now: event.now });

    case 'TICK':
      return checkDeadline(state, event.now, true);

    case 'RESTORE': {
      if (state.phase !== 'running') return { state, effects: none };
      const caught = checkDeadline(state, event.now, false);
      if (caught.state !== state) return caught;
      return { state, effects: [{ type: 'clock', endAt: endsAt(state) }] };
    }

    case 'RESET':
      if (state.phase === 'idle') return { state, effects: none };
      return { state: idleIn(state, state.mode), effects: [{ type: 'clock', endAt: null }] };

    case 'SKIP': {
      const effects: TimerEffect[] = [];
      if (
        isActive(state) &&
        state.mode === 'focus' &&
        elapsedMs(state, event.now) >= MIN_RECORDED_MS
      ) {
        effects.push({ type: 'record', session: draft(state, event.now, 'interrupted') });
      }
      // Пропуск учёбы не засчитывает цикл: длинный перерыв нужно заработать.
      effects.push({ type: 'clock', endAt: null });
      return {
        state: idleIn(state, nextModeAfter(state.mode, state.cycle, state.config)),
        effects,
      };
    }

    case 'INTERRUPT': {
      if (!isActive(state) || state.mode !== 'focus') return { state, effects: none };
      const effects: TimerEffect[] = [];
      if (elapsedMs(state, event.now) >= MIN_RECORDED_MS) {
        effects.push({ type: 'record', session: draft(state, event.now, 'interrupted') });
      }
      effects.push({ type: 'clock', endAt: null });
      return { state: idleIn(state, 'focus'), effects };
    }

    case 'SET_MODE': {
      if (state.mode === event.mode && state.phase === 'idle') return { state, effects: none };
      return {
        state: idleIn(state, event.mode),
        effects: isActive(state) ? [{ type: 'clock', endAt: null }] : none,
      };
    }

    case 'SET_CONTEXT':
      return {
        state: { ...state, context: { ...state.context, ...event.context } },
        effects: none,
      };

    case 'CONFIGURE': {
      const config = event.config;
      const cycle = state.cycle % Math.max(1, config.longEvery);
      if (state.phase === 'idle' || state.phase === 'finished') {
        return {
          state: { ...state, config, cycle, durationMs: config.durations[state.mode] },
          effects: none,
        };
      }
      // Идущую сессию не трогаем: новые длительности применятся со следующей.
      return { state: { ...state, config, cycle }, effects: none };
    }
  }
}
