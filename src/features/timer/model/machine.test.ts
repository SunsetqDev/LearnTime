import {
  AUTOSTART_GRACE_MS,
  createInitialState,
  cyclePlan,
  DEFAULT_CONFIG,
  elapsedMs,
  endsAt,
  planIndex,
  remainingMs,
  transition,
} from '@/features/timer/model/machine';
import type {
  TimerConfig,
  TimerEffect,
  TimerEvent,
  TimerState,
} from '@/features/timer/model/types';

const MIN = 60_000;
const T0 = 1_700_000_000_000;

function run(state: TimerState, ...events: TimerEvent[]) {
  const effects: TimerEffect[] = [];
  let s = state;
  for (const e of events) {
    const r = transition(s, e);
    s = r.state;
    effects.push(...r.effects);
  }
  return { state: s, effects };
}

const records = (effects: TimerEffect[]) =>
  effects.flatMap((e) => (e.type === 'record' ? [e.session] : []));

const config = (patch: Partial<TimerConfig> = {}): TimerConfig => ({ ...DEFAULT_CONFIG, ...patch });

describe('автомат таймера', () => {
  it('начинает в idle с длительностью учёбы', () => {
    const s = createInitialState();
    expect(s.phase).toBe('idle');
    expect(s.mode).toBe('focus');
    expect(remainingMs(s, T0)).toBe(25 * MIN);
  });

  it('START запускает таймер и взводит часы на точный дедлайн', () => {
    const { state, effects } = run(createInitialState(), { type: 'START', now: T0 });
    expect(state.phase).toBe('running');
    expect(endsAt(state)).toBe(T0 + 25 * MIN);
    expect(effects).toContainEqual({ type: 'clock', endAt: T0 + 25 * MIN });
  });

  it('время вычисляется по меткам, а не по количеству тиков', () => {
    const { state } = run(createInitialState(), { type: 'START', now: T0 });
    // Ни одного TICK, но прошло 10 минут — оставшееся время верное.
    expect(remainingMs(state, T0 + 10 * MIN)).toBe(15 * MIN);
  });

  it('пауза замораживает время, продолжение сдвигает дедлайн', () => {
    const { state } = run(
      createInitialState(),
      { type: 'START', now: T0 },
      { type: 'PAUSE', now: T0 + 5 * MIN },
    );
    expect(state.phase).toBe('paused');
    expect(remainingMs(state, T0 + 60 * MIN)).toBe(20 * MIN);

    const resumed = run(state, { type: 'RESUME', now: T0 + 30 * MIN }).state;
    expect(endsAt(resumed)).toBe(T0 + 50 * MIN);
    expect(resumed.pauses).toBe(1);
  });

  it('TOGGLE переключает старт → пауза → продолжение', () => {
    let s = createInitialState();
    s = run(s, { type: 'TOGGLE', now: T0 }).state;
    expect(s.phase).toBe('running');
    s = run(s, { type: 'TOGGLE', now: T0 + 1000 }).state;
    expect(s.phase).toBe('paused');
    s = run(s, { type: 'TOGGLE', now: T0 + 2000 }).state;
    expect(s.phase).toBe('running');
  });

  it('TICK до дедлайна ничего не меняет', () => {
    const started = run(createInitialState(), { type: 'START', now: T0 }).state;
    const r = transition(started, { type: 'TICK', now: T0 + MIN });
    expect(r.state).toBe(started);
    expect(r.effects).toHaveLength(0);
  });

  it('завершение учёбы записывает сессию на момент дедлайна, а не на момент тика', () => {
    const s = run(createInitialState(), {
      type: 'SET_CONTEXT',
      context: { subjectId: 'math', task: ' ЕНТ ' },
    }).state;
    const { state, effects } = run(
      s,
      { type: 'START', now: T0 },
      { type: 'TICK', now: T0 + 25 * MIN + 400 },
    );
    const [session] = records(effects);
    expect(session).toMatchObject({
      mode: 'focus',
      status: 'completed',
      startedAt: T0,
      endedAt: T0 + 25 * MIN,
      actualMs: 25 * MIN,
      subjectId: 'math',
      task: 'ЕНТ',
    });
    expect(state.phase).toBe('finished');
    expect(state.mode).toBe('short');
    expect(state.lastCompleted).toBe('focus');
    expect(state.cycle).toBe(1);
    expect(effects).toContainEqual({ type: 'signal', finished: 'focus', next: 'short' });
  });

  it('перерывы не записываются как учебные сессии', () => {
    const s = run(createInitialState(), { type: 'SET_MODE', mode: 'short' }).state;
    const { effects, state } = run(
      s,
      { type: 'START', now: T0 },
      { type: 'TICK', now: T0 + 5 * MIN },
    );
    expect(records(effects)).toHaveLength(0);
    expect(state.mode).toBe('focus');
  });

  it('после N учебных сессий наступает длинный перерыв', () => {
    let s = createInitialState(config({ longEvery: 2 }));
    const modes: string[] = [];
    let t = T0;
    for (let i = 0; i < 4; i += 1) {
      s = run(s, { type: 'START', now: t }).state;
      t += s.durationMs;
      s = run(s, { type: 'TICK', now: t }).state;
      modes.push(s.mode);
    }
    expect(modes).toEqual(['short', 'focus', 'long', 'focus']);
    expect(s.cycle).toBe(0);
  });

  it('автостарт перерыва начинается ровно с дедлайна', () => {
    const s = createInitialState(config({ autoStartBreaks: true }));
    const { state } = run(
      s,
      { type: 'START', now: T0 },
      { type: 'TICK', now: T0 + 25 * MIN + 700 },
    );
    expect(state.phase).toBe('running');
    expect(state.mode).toBe('short');
    expect(state.startedAt).toBe(T0 + 25 * MIN);
    expect(endsAt(state)).toBe(T0 + 30 * MIN);
  });

  it('автостарт догоняет цепочку, если вкладка проспала несколько сессий', () => {
    const s = createInitialState(config({ autoStartBreaks: true, autoStartFocus: true }));
    // Перерыв (5 мин) уже прошёл целиком, следующая учёба идёт 30 секунд.
    const started = run(s, { type: 'START', now: T0 }).state;
    const fast = {
      ...started,
      config: config({
        autoStartBreaks: true,
        autoStartFocus: true,
        durations: { focus: 25 * MIN, short: 20_000, long: 15 * MIN },
      }),
    };
    const { state, effects } = run(fast, { type: 'TICK', now: T0 + 25 * MIN + 50_000 });
    expect(records(effects)).toHaveLength(1);
    expect(state.mode).toBe('focus');
    expect(state.phase).toBe('running');
    expect(state.startedAt).toBe(T0 + 25 * MIN + 20_000);
  });

  it('RESTORE после долгого отсутствия завершает сессию без автостарта', () => {
    const s = createInitialState(config({ autoStartBreaks: true }));
    const started = run(s, { type: 'START', now: T0 }).state;
    const { state, effects } = run(started, { type: 'RESTORE', now: T0 + 3 * 60 * MIN });
    expect(records(effects)[0]?.endedAt).toBe(T0 + 25 * MIN);
    expect(state.phase).toBe('finished');
    expect(state.mode).toBe('short');
  });

  it('RESTORE идущей сессии снова взводит часы', () => {
    const started = run(createInitialState(), { type: 'START', now: T0 }).state;
    const { state, effects } = run(started, { type: 'RESTORE', now: T0 + MIN });
    expect(state).toBe(started);
    expect(effects).toEqual([{ type: 'clock', endAt: T0 + 25 * MIN }]);
  });

  it('автостарт не срабатывает, если дедлайн был давно', () => {
    const s = createInitialState(config({ autoStartBreaks: true }));
    const { state } = run(
      s,
      { type: 'START', now: T0 },
      { type: 'TICK', now: T0 + 25 * MIN + AUTOSTART_GRACE_MS + 1 },
    );
    expect(state.phase).toBe('finished');
  });

  it('INTERRUPT записывает честную прерванную сессию', () => {
    const { state, effects } = run(
      createInitialState(),
      { type: 'START', now: T0 },
      { type: 'PAUSE', now: T0 + 7 * MIN },
      { type: 'INTERRUPT', now: T0 + 9 * MIN },
    );
    const [session] = records(effects);
    expect(session).toMatchObject({ status: 'interrupted', actualMs: 7 * MIN, pauses: 1 });
    expect(state.phase).toBe('idle');
    expect(state.mode).toBe('focus');
    expect(state.cycle).toBe(0);
  });

  it('короткие прерванные сессии (< 1 мин) не записываются', () => {
    const { effects } = run(
      createInitialState(),
      { type: 'START', now: T0 },
      { type: 'INTERRUPT', now: T0 + 30_000 },
    );
    expect(records(effects)).toHaveLength(0);
  });

  it('SKIP переводит в перерыв, не засчитывая цикл', () => {
    const { state, effects } = run(
      createInitialState(),
      { type: 'START', now: T0 },
      { type: 'SKIP', now: T0 + 3 * MIN },
    );
    expect(state.mode).toBe('short');
    expect(state.phase).toBe('idle');
    expect(state.cycle).toBe(0);
    expect(records(effects)[0]?.status).toBe('interrupted');
  });

  it('RESET возвращает к началу текущего режима без записи', () => {
    const { state, effects } = run(
      createInitialState(),
      { type: 'START', now: T0 },
      { type: 'RESET' },
    );
    expect(state.phase).toBe('idle');
    expect(records(effects)).toHaveLength(0);
    expect(elapsedMs(state, T0 + MIN)).toBe(0);
  });

  it('CONFIGURE меняет длительность только у неактивного таймера', () => {
    const fast = config({ durations: { focus: 50 * MIN, short: 10 * MIN, long: 30 * MIN } });
    const idle = run(createInitialState(), { type: 'CONFIGURE', config: fast }).state;
    expect(idle.durationMs).toBe(50 * MIN);

    const running = run(
      createInitialState(),
      { type: 'START', now: T0 },
      { type: 'CONFIGURE', config: fast },
    ).state;
    expect(running.durationMs).toBe(25 * MIN);
  });

  it('игнорирует недопустимые события', () => {
    const s = createInitialState();
    expect(transition(s, { type: 'PAUSE', now: T0 }).state).toBe(s);
    expect(transition(s, { type: 'RESUME', now: T0 }).state).toBe(s);
    expect(transition(s, { type: 'RESET' }).state).toBe(s);
    expect(transition(s, { type: 'INTERRUPT', now: T0 }).state).toBe(s);
  });

  it('план круга и позиция в нём', () => {
    expect(cyclePlan(DEFAULT_CONFIG)).toEqual([
      'focus',
      'short',
      'focus',
      'short',
      'focus',
      'short',
      'focus',
      'long',
    ]);
    let s = createInitialState();
    expect(planIndex(s)).toBe(0);
    s = run(s, { type: 'START', now: T0 }, { type: 'TICK', now: T0 + 25 * MIN }).state;
    expect(planIndex(s)).toBe(1);
    s = run(s, { type: 'START', now: T0 + 30 * MIN }, { type: 'TICK', now: T0 + 35 * MIN }).state;
    expect(planIndex(s)).toBe(2);
  });
});
