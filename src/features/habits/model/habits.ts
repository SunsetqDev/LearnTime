import type { GoalKind } from '@/features/settings/store';
import type { SessionRecord } from '@/lib/db';
import { addDays, diffDays, type DayKey } from '@/lib/time';

/**
 * День «засчитан» для серии, если в нём есть хотя бы одна завершённая учебная сессия.
 * Прерванные сессии в статистике видны, но серию не продлевают — честно.
 */
export function countedDays(sessions: readonly SessionRecord[]): Set<DayKey> {
  const days = new Set<DayKey>();
  for (const s of sessions) if (s.status === 'completed') days.add(s.dayKey);
  return days;
}

export interface Streak {
  /** Текущая серия. Если сегодня ещё не учились, серия «жива» до конца дня и считается от вчера. */
  readonly current: number;
  readonly best: number;
  /** Засчитан ли уже сегодняшний день. */
  readonly todayCounted: boolean;
  /** Серия под угрозой: вчера был засчитан, сегодня ещё нет. */
  readonly atRisk: boolean;
}

export function streak(sessions: readonly SessionRecord[], today: DayKey): Streak {
  const days = countedDays(sessions);
  const todayCounted = days.has(today);

  let current = 0;
  for (let d = todayCounted ? today : addDays(today, -1); days.has(d); d = addDays(d, -1))
    current += 1;

  let best = 0;
  let run = 0;
  let prev: DayKey | null = null;
  for (const d of [...days].sort()) {
    run = prev !== null && diffDays(prev, d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }

  return {
    current,
    best: Math.max(best, current),
    todayCounted,
    atRisk: !todayCounted && current > 0,
  };
}

export interface GoalProgress {
  readonly kind: GoalKind;
  readonly value: number;
  readonly target: number;
  /** 0…1 (может быть больше 1, если цель перевыполнена). */
  readonly ratio: number;
  readonly done: boolean;
}

export function goalProgress(
  sessions: readonly SessionRecord[],
  today: DayKey,
  goal: { readonly kind: GoalKind; readonly value: number },
): GoalProgress {
  const todays = sessions.filter((s) => s.dayKey === today);
  const value =
    goal.kind === 'minutes'
      ? Math.floor(todays.reduce((sum, s) => sum + s.actualMs, 0) / 60_000)
      : todays.filter((s) => s.status === 'completed').length;
  const ratio = goal.value > 0 ? value / goal.value : 0;
  return { kind: goal.kind, value, target: goal.value, ratio, done: ratio >= 1 };
}

/** Сколько дней цель была выполнена (с текущей настройкой цели). */
export function goalDays(
  sessions: readonly SessionRecord[],
  goal: { readonly kind: GoalKind; readonly value: number },
): number {
  const per = new Map<DayKey, { ms: number; done: number }>();
  for (const s of sessions) {
    const v = per.get(s.dayKey) ?? { ms: 0, done: 0 };
    per.set(s.dayKey, { ms: v.ms + s.actualMs, done: v.done + (s.status === 'completed' ? 1 : 0) });
  }
  let n = 0;
  for (const v of per.values()) {
    const value = goal.kind === 'minutes' ? v.ms / 60_000 : v.done;
    if (value >= goal.value) n += 1;
  }
  return n;
}
