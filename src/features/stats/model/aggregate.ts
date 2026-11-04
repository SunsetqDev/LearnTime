import type { SessionRecord } from '@/lib/db';
import { addDays, daysInRange, monthStart, weekStart, type DayKey } from '@/lib/time';

/** Чистые агрегаты для аналитики. Все функции принимают массив сессий и «сегодня» — без Date.now(). */

export interface Summary {
  readonly todayMs: number;
  readonly weekMs: number;
  readonly monthMs: number;
  readonly totalMs: number;
  readonly sessions: number;
  readonly completed: number;
  readonly interrupted: number;
  /** Средняя длина сессии (по всем записанным, включая прерванные). */
  readonly avgMs: number;
  /** Доля прерванных от всех записанных, 0…1. */
  readonly interruptedShare: number;
  readonly activeDays: number;
}

export function summarize(sessions: readonly SessionRecord[], today: DayKey): Summary {
  const week = weekStart(today);
  const month = monthStart(today);
  let todayMs = 0;
  let weekMs = 0;
  let monthMs = 0;
  let totalMs = 0;
  let interrupted = 0;
  const days = new Set<DayKey>();
  for (const s of sessions) {
    totalMs += s.actualMs;
    days.add(s.dayKey);
    if (s.status === 'interrupted') interrupted += 1;
    if (s.dayKey > today) continue;
    if (s.dayKey === today) todayMs += s.actualMs;
    if (s.dayKey >= week) weekMs += s.actualMs;
    if (s.dayKey >= month) monthMs += s.actualMs;
  }
  const count = sessions.length;
  return {
    todayMs,
    weekMs,
    monthMs,
    totalMs,
    sessions: count,
    completed: count - interrupted,
    interrupted,
    avgMs: count === 0 ? 0 : totalMs / count,
    interruptedShare: count === 0 ? 0 : interrupted / count,
    activeDays: days.size,
  };
}

/* ---------- По дням ---------- */

export interface DayBucket {
  readonly day: DayKey;
  readonly totalMs: number;
  readonly count: number;
  /** Время по предметам: subjectId (или '' — без предмета) → мс. */
  readonly bySubject: ReadonlyMap<string, number>;
}

export function byDay(sessions: readonly SessionRecord[], from: DayKey, to: DayKey): DayBucket[] {
  const index = new Map<
    DayKey,
    { totalMs: number; count: number; bySubject: Map<string, number> }
  >();
  for (const day of daysInRange(from, to))
    index.set(day, { totalMs: 0, count: 0, bySubject: new Map() });
  for (const s of sessions) {
    const b = index.get(s.dayKey);
    if (!b) continue;
    b.totalMs += s.actualMs;
    b.count += 1;
    const key = s.subjectId ?? '';
    b.bySubject.set(key, (b.bySubject.get(key) ?? 0) + s.actualMs);
  }
  return [...index.entries()].map(([day, b]) => ({ day, ...b }));
}

export type Period = 'week' | 'month' | 'all';

export function periodRange(period: Period, today: DayKey, first: DayKey | null): [DayKey, DayKey] {
  if (period === 'week') return [addDays(today, -6), today];
  if (period === 'month') return [addDays(today, -29), today];
  return [first ?? today, today];
}

/* ---------- По предметам ---------- */

export interface SubjectShare {
  readonly subjectId: string | null;
  readonly ms: number;
  readonly count: number;
  readonly share: number;
}

export function bySubject(
  sessions: readonly SessionRecord[],
  from: DayKey,
  to: DayKey,
): SubjectShare[] {
  const map = new Map<string, { ms: number; count: number }>();
  let total = 0;
  for (const s of sessions) {
    if (s.dayKey < from || s.dayKey > to) continue;
    const key = s.subjectId ?? '';
    const v = map.get(key) ?? { ms: 0, count: 0 };
    map.set(key, { ms: v.ms + s.actualMs, count: v.count + 1 });
    total += s.actualMs;
  }
  return [...map.entries()]
    .map(([id, v]) => ({
      subjectId: id === '' ? null : id,
      ms: v.ms,
      count: v.count,
      share: total === 0 ? 0 : v.ms / total,
    }))
    .sort((a, b) => b.ms - a.ms);
}

/* ---------- По часам суток ---------- */

export interface HourProfile {
  /** 24 значения: минуты учёбы, начатой в этот час. */
  readonly hours: readonly number[];
  /** Начало лучшего трёхчасового окна или null, если данных мало. */
  readonly bestStart: number | null;
  readonly bestShare: number;
}

export const BEST_WINDOW = 3;

export function byHour(sessions: readonly SessionRecord[]): HourProfile {
  const hours = Array.from({ length: 24 }, () => 0);
  for (const s of sessions) hours[s.hour] = (hours[s.hour] ?? 0) + s.actualMs / 60_000;
  const total = hours.reduce((a, b) => a + b, 0);
  // Минимум 5 сессий, иначе «лучшее время» — случайность.
  if (sessions.length < 5 || total === 0) return { hours, bestStart: null, bestShare: 0 };
  let best = 0;
  let bestSum = -1;
  for (let h = 0; h < 24; h += 1) {
    let sum = 0;
    for (let k = 0; k < BEST_WINDOW; k += 1) sum += hours[(h + k) % 24] ?? 0;
    if (sum > bestSum) {
      bestSum = sum;
      best = h;
    }
  }
  return { hours, bestStart: best, bestShare: bestSum / total };
}

/* ---------- Тепловая карта ---------- */

export interface HeatCell {
  readonly day: DayKey;
  readonly ms: number;
  /** Уровень 0…4 по перцентилю среди активных дней пользователя, а не по фиксированным порогам. */
  readonly level: 0 | 1 | 2 | 3 | 4;
  readonly future: boolean;
}

export interface Heatmap {
  /** Колонки-недели (пн…вс), последняя — текущая. */
  readonly weeks: readonly (readonly HeatCell[])[];
  readonly max: number;
}

export function heatmap(sessions: readonly SessionRecord[], today: DayKey, weeks = 53): Heatmap {
  const end = addDays(weekStart(today), 6);
  const start = addDays(weekStart(today), -(weeks - 1) * 7);
  const buckets = byDay(sessions, start, end);
  const active = buckets
    .filter((b) => b.totalMs > 0 && b.day <= today)
    .map((b) => b.totalMs)
    .sort((x, y) => x - y);
  // Уровень = в какую четверть личных активных дней попадает день (перцентильный ранг).
  // Так карта информативна и у того, кто учится по 20 минут, и у того, кто по 5 часов.
  const level = (ms: number): HeatCell['level'] => {
    if (ms <= 0 || active.length === 0) return 0;
    let lo = 0;
    let hi = active.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((active[mid] ?? 0) <= ms) lo = mid + 1;
      else hi = mid;
    }
    return Math.max(1, Math.min(4, Math.ceil((lo / active.length) * 4))) as HeatCell['level'];
  };
  const cols: HeatCell[][] = [];
  buckets.forEach((b, i) => {
    const col = Math.floor(i / 7);
    (cols[col] ??= []).push({
      day: b.day,
      ms: b.totalMs,
      level: level(b.totalMs),
      future: b.day > today,
    });
  });
  return { weeks: cols, max: active.at(-1) ?? 0 };
}

/* ---------- История ---------- */

export interface HistoryFilter {
  /** id предмета, 'all' — все, 'none' — без предмета. */
  readonly subjectId: string;
  /** Пустая строка — без ограничения. */
  readonly from: DayKey;
  readonly to: DayKey;
  readonly status: 'all' | 'completed' | 'interrupted';
}

export const EMPTY_FILTER: HistoryFilter = { subjectId: 'all', from: '', to: '', status: 'all' };

export function filterHistory(
  sessions: readonly SessionRecord[],
  f: HistoryFilter,
): SessionRecord[] {
  return sessions
    .filter((s) => {
      if (f.subjectId === 'none' && s.subjectId !== null) return false;
      if (f.subjectId !== 'all' && f.subjectId !== 'none' && s.subjectId !== f.subjectId)
        return false;
      if (f.from && s.dayKey < f.from) return false;
      if (f.to && s.dayKey > f.to) return false;
      if (f.status !== 'all' && s.status !== f.status) return false;
      return true;
    })
    .sort((a, b) => b.startedAt - a.startedAt);
}

export function groupByDay(
  sessions: readonly SessionRecord[],
): { day: DayKey; items: SessionRecord[]; totalMs: number }[] {
  const out: { day: DayKey; items: SessionRecord[]; totalMs: number }[] = [];
  for (const s of sessions) {
    const last = out.at(-1);
    if (last?.day === s.dayKey) {
      last.items.push(s);
      last.totalMs += s.actualMs;
    } else {
      out.push({ day: s.dayKey, items: [s], totalMs: s.actualMs });
    }
  }
  return out;
}
