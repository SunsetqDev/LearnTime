import { goalDays, streak } from '@/features/habits/model/habits';
import type { GoalKind } from '@/features/settings/store';
import type { SessionRecord } from '@/lib/db';
import type { DayKey } from '@/lib/time';

export interface AchievementContext {
  readonly sessions: readonly SessionRecord[];
  readonly today: DayKey;
  readonly goal: { readonly kind: GoalKind; readonly value: number };
}

export type Glyph =
  | 'start'
  | 'ten'
  | 'hundred'
  | 'hours'
  | 'flame'
  | 'early'
  | 'cycle'
  | 'mountain'
  | 'spectrum'
  | 'shield'
  | 'target'
  | 'focus';

export interface AchievementDef {
  readonly id: string;
  readonly title: string;
  /** Условие простыми словами — показывается всегда, даже до получения. */
  readonly condition: string;
  readonly glyph: Glyph;
  /** Подпись внутри медали для «числовых» наград. */
  readonly label?: string;
  readonly target: number;
  readonly measure: (ctx: AchievementContext) => number;
}

/* ---------- Метрики, общие для нескольких правил ---------- */

const completed = (ctx: AchievementContext) => ctx.sessions.filter((s) => s.status === 'completed');
const totalHours = (ctx: AchievementContext) =>
  ctx.sessions.reduce((sum, s) => sum + s.actualMs, 0) / 3_600_000;

function maxDayHours(ctx: AchievementContext): number {
  const per = new Map<DayKey, number>();
  for (const s of ctx.sessions) per.set(s.dayKey, (per.get(s.dayKey) ?? 0) + s.actualMs);
  return Math.max(0, ...per.values()) / 3_600_000;
}

/** Самая длинная цепочка завершённых сессий подряд без единой прерванной. */
function cleanRun(ctx: AchievementContext): number {
  let best = 0;
  let run = 0;
  for (const s of [...ctx.sessions].sort((a, b) => a.startedAt - b.startedAt)) {
    run = s.status === 'completed' ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** Полный круг за день: 4 завершённые сессии в один день и ни одной прерванной. */
function fullCycleDays(ctx: AchievementContext): number {
  const per = new Map<DayKey, { done: number; broken: boolean }>();
  for (const s of ctx.sessions) {
    const v = per.get(s.dayKey) ?? { done: 0, broken: false };
    per.set(s.dayKey, {
      done: v.done + (s.status === 'completed' ? 1 : 0),
      broken: v.broken || s.status === 'interrupted',
    });
  }
  return [...per.values()].filter((v) => v.done >= 4 && !v.broken).length;
}

function maxSubjectHours(ctx: AchievementContext): number {
  const per = new Map<string, number>();
  for (const s of ctx.sessions)
    if (s.subjectId) per.set(s.subjectId, (per.get(s.subjectId) ?? 0) + s.actualMs);
  return Math.max(0, ...per.values()) / 3_600_000;
}

/* ---------- Каталог ---------- */

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    id: 'first-session',
    title: 'Первый отсчёт',
    condition: 'Завершите первую учебную сессию',
    glyph: 'start',
    target: 1,
    measure: (c) => completed(c).length,
  },
  {
    id: 'sessions-10',
    title: 'Десятка',
    condition: '10 завершённых сессий',
    glyph: 'ten',
    label: '10',
    target: 10,
    measure: (c) => completed(c).length,
  },
  {
    id: 'sessions-100',
    title: 'Сотня',
    condition: '100 завершённых сессий',
    glyph: 'hundred',
    label: '100',
    target: 100,
    measure: (c) => completed(c).length,
  },
  {
    id: 'hours-10',
    title: 'Первые десять часов',
    condition: '10 часов учёбы всего',
    glyph: 'hours',
    label: '10ч',
    target: 10,
    measure: totalHours,
  },
  {
    id: 'hours-100',
    title: 'Сто часов',
    condition: '100 часов учёбы всего',
    glyph: 'hours',
    label: '100ч',
    target: 100,
    measure: totalHours,
  },
  {
    id: 'streak-3',
    title: 'Три дня подряд',
    condition: 'Серия из 3 дней',
    glyph: 'flame',
    label: '3',
    target: 3,
    measure: (c) => streak(c.sessions, c.today).best,
  },
  {
    id: 'streak-7',
    title: 'Неделя без пропусков',
    condition: 'Серия из 7 дней',
    glyph: 'flame',
    label: '7',
    target: 7,
    measure: (c) => streak(c.sessions, c.today).best,
  },
  {
    id: 'streak-30',
    title: 'Месяц дисциплины',
    condition: 'Серия из 30 дней',
    glyph: 'flame',
    label: '30',
    target: 30,
    measure: (c) => streak(c.sessions, c.today).best,
  },
  {
    id: 'goal-5',
    title: 'Слово держу',
    condition: 'Выполните дневную цель в 5 разных дней',
    glyph: 'target',
    target: 5,
    measure: (c) => goalDays(c.sessions, c.goal),
  },
  {
    id: 'full-cycle',
    title: 'Полный круг',
    condition: '4 завершённые сессии за день без единого прерывания',
    glyph: 'cycle',
    target: 1,
    measure: fullCycleDays,
  },
  {
    id: 'clean-20',
    title: 'Без срывов',
    condition: '20 завершённых сессий подряд, ни одной прерванной',
    glyph: 'shield',
    target: 20,
    measure: cleanRun,
  },
  {
    id: 'marathon',
    title: 'Марафон',
    condition: '3 часа учёбы за один день',
    glyph: 'mountain',
    target: 3,
    measure: maxDayHours,
  },
  {
    id: 'early-bird',
    title: 'Ранний старт',
    condition: '5 сессий, начатых до 8:00',
    glyph: 'early',
    target: 5,
    measure: (c) => completed(c).filter((s) => s.hour < 8 && s.hour >= 4).length,
  },
  {
    id: 'polymath',
    title: 'Широкий профиль',
    condition: 'Сессии по 5 разным предметам',
    glyph: 'spectrum',
    target: 5,
    measure: (c) => new Set(c.sessions.map((s) => s.subjectId).filter(Boolean)).size,
  },
  {
    id: 'deep-subject',
    title: 'Специализация',
    condition: '20 часов по одному предмету',
    glyph: 'focus',
    target: 20,
    measure: maxSubjectHours,
  },
];

export interface AchievementState {
  readonly def: AchievementDef;
  readonly value: number;
  readonly progress: number;
  readonly unlocked: boolean;
}

export function evaluate(ctx: AchievementContext): AchievementState[] {
  return ACHIEVEMENTS.map((def) => {
    const value = def.measure(ctx);
    return { def, value, progress: Math.min(1, value / def.target), unlocked: value >= def.target };
  });
}
