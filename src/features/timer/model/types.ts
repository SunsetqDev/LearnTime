export const MODES = ['focus', 'short', 'long'] as const;
export type Mode = (typeof MODES)[number];

export type Phase = 'idle' | 'running' | 'paused' | 'finished';

export interface TimerConfig {
  /** Длительность каждого режима в миллисекундах. */
  readonly durations: Readonly<Record<Mode, number>>;
  /** Через сколько учебных сессий наступает длинный перерыв. */
  readonly longEvery: number;
  readonly autoStartBreaks: boolean;
  readonly autoStartFocus: boolean;
}

export interface SessionContext {
  readonly subjectId: string | null;
  readonly task: string;
}

export interface TimerState {
  readonly phase: Phase;
  readonly mode: Mode;
  readonly durationMs: number;
  /** Момент первого запуска текущей сессии (epoch ms). */
  readonly startedAt: number | null;
  /** Начало текущего непрерывного отрезка работы. null, если таймер не идёт. */
  readonly anchor: number | null;
  /** Сколько миллисекунд набежало до anchor (сумма прошлых отрезков между паузами). */
  readonly banked: number;
  readonly pauses: number;
  /** Завершённые учебные сессии в текущем круге (0 … longEvery-1). */
  readonly cycle: number;
  /** Режим, который только что закончился (для состояния finished). */
  readonly lastCompleted: Mode | null;
  readonly context: SessionContext;
  readonly config: TimerConfig;
}

export type SessionStatus = 'completed' | 'interrupted';

export interface SessionDraft {
  readonly mode: Mode;
  readonly status: SessionStatus;
  readonly startedAt: number;
  readonly endedAt: number;
  readonly plannedMs: number;
  readonly actualMs: number;
  readonly pauses: number;
  readonly subjectId: string | null;
  readonly task: string;
}

export type TimerEvent =
  | { readonly type: 'START'; readonly now: number }
  | { readonly type: 'PAUSE'; readonly now: number }
  | { readonly type: 'RESUME'; readonly now: number }
  | { readonly type: 'TOGGLE'; readonly now: number }
  | { readonly type: 'TICK'; readonly now: number }
  | { readonly type: 'RESET' }
  | { readonly type: 'SKIP'; readonly now: number }
  | { readonly type: 'INTERRUPT'; readonly now: number }
  | { readonly type: 'SET_MODE'; readonly mode: Mode }
  | { readonly type: 'SET_CONTEXT'; readonly context: Partial<SessionContext> }
  | { readonly type: 'CONFIGURE'; readonly config: TimerConfig }
  /** Восстановление после перезагрузки: догоняем время, но не запускаем цепочку автостартов. */
  | { readonly type: 'RESTORE'; readonly now: number };

export type TimerEffect =
  | { readonly type: 'record'; readonly session: SessionDraft }
  | { readonly type: 'signal'; readonly finished: Mode; readonly next: Mode }
  | { readonly type: 'clock'; readonly endAt: number | null };

export interface Transition {
  readonly state: TimerState;
  readonly effects: readonly TimerEffect[];
}
