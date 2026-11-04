import { z } from 'zod';
import { COLOR_KEYS, isSubjectColor, LEGACY_COLORS } from '@/features/subjects/palette';
import { db, type AchievementRecord, type SessionRecord, type SubjectRecord } from '@/lib/db';
import { dayKey } from '@/lib/time';

/**
 * Резервная копия в JSON. Формат версионирован: `schemaVersion` позволяет читать
 * копии из старых версий приложения. Импорт строго проверяется схемой zod —
 * повреждённый или чужой файл не попадёт в базу.
 */
export const BACKUP_FORMAT = 'focus-backup';
export const BACKUP_VERSION = 1;

const sessionSchema = z.object({
  id: z.string().min(1).max(64),
  mode: z.enum(['focus', 'short', 'long']),
  status: z.enum(['completed', 'interrupted']),
  startedAt: z.number().int().positive(),
  endedAt: z.number().int().positive(),
  dayKey: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  hour: z.number().int().min(0).max(23).optional(),
  plannedMs: z.number().int().nonnegative(),
  actualMs: z
    .number()
    .int()
    .nonnegative()
    .max(24 * 3_600_000),
  pauses: z.number().int().nonnegative().default(0),
  subjectId: z.string().nullable(),
  task: z.string().max(200).default(''),
});

const subjectSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(60),
  color: z.string(),
  archived: z
    .union([z.literal(0), z.literal(1), z.boolean()])
    .transform((v) => (v === true || v === 1 ? 1 : 0)),
  order: z.number().int(),
  createdAt: z.number().int().nonnegative(),
});

const achievementSchema = z.object({
  id: z.string().min(1).max(64),
  unlockedAt: z.number().int().positive(),
});

export const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  schemaVersion: z.number().int().min(1).max(BACKUP_VERSION),
  exportedAt: z.number().int(),
  sessions: z.array(sessionSchema),
  subjects: z.array(subjectSchema),
  achievements: z.array(achievementSchema).default([]),
});

export interface Backup {
  readonly format: typeof BACKUP_FORMAT;
  readonly schemaVersion: number;
  readonly exportedAt: number;
  readonly sessions: readonly SessionRecord[];
  readonly subjects: readonly SubjectRecord[];
  readonly achievements: readonly AchievementRecord[];
}

export async function createBackup(now = Date.now()): Promise<Backup> {
  const [sessions, subjects, achievements] = await Promise.all([
    db.sessions.toArray(),
    db.subjects.toArray(),
    db.achievements.toArray(),
  ]);
  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_VERSION,
    exportedAt: now,
    sessions,
    subjects,
    achievements,
  };
}

export function downloadBackup(backup: Backup): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `focus-${dayKey(backup.exportedAt)}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export type ParseResult =
  { readonly ok: true; readonly backup: Backup } | { readonly ok: false; readonly error: string };

/** Разбирает и нормализует файл копии: недостающие поля вычисляются, старые цвета переводятся. */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Файл не похож на JSON. Выберите копию, сохранённую из «Фокуса».' };
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first?.path.join('.') ?? '';
    return {
      ok: false,
      error: `Файл не прошёл проверку${where ? ` (поле ${where})` : ''}. Возможно, он повреждён или из другого приложения.`,
    };
  }
  const data = parsed.data;
  const sessions: SessionRecord[] = data.sessions.map((s) => ({
    ...s,
    dayKey: s.dayKey ?? dayKey(s.startedAt),
    hour: s.hour ?? new Date(s.startedAt).getHours(),
  }));
  const subjects: SubjectRecord[] = data.subjects.map((s) => ({
    ...s,
    color: isSubjectColor(s.color)
      ? s.color
      : (LEGACY_COLORS[s.color] ?? COLOR_KEYS[0] ?? 'cobalt'),
  }));
  return { ok: true, backup: { ...data, sessions, subjects } };
}

export type ImportMode = 'merge' | 'replace';

export interface ImportReport {
  readonly sessionsAdded: number;
  readonly subjectsAdded: number;
}

/** Импорт одной транзакцией: при ошибке база остаётся как была. */
export async function importBackup(backup: Backup, mode: ImportMode): Promise<ImportReport> {
  return db.transaction('rw', db.sessions, db.subjects, db.achievements, async () => {
    if (mode === 'replace') {
      await Promise.all([db.sessions.clear(), db.subjects.clear(), db.achievements.clear()]);
      await db.subjects.bulkAdd([...backup.subjects]);
      await db.sessions.bulkAdd([...backup.sessions]);
      await db.achievements.bulkAdd([...backup.achievements]);
      return { sessionsAdded: backup.sessions.length, subjectsAdded: backup.subjects.length };
    }
    const [haveSessions, haveSubjects, haveAch] = await Promise.all([
      db.sessions.toCollection().primaryKeys(),
      db.subjects.toCollection().primaryKeys(),
      db.achievements.toCollection().primaryKeys(),
    ]);
    const s1 = new Set(haveSessions);
    const s2 = new Set(haveSubjects);
    const s3 = new Set(haveAch);
    const newSubjects = backup.subjects.filter((x) => !s2.has(x.id));
    const newSessions = backup.sessions.filter((x) => !s1.has(x.id));
    await db.subjects.bulkAdd(newSubjects);
    await db.sessions.bulkAdd(newSessions);
    await db.achievements.bulkAdd(backup.achievements.filter((x) => !s3.has(x.id)));
    return { sessionsAdded: newSessions.length, subjectsAdded: newSubjects.length };
  });
}

export async function wipeAll(): Promise<void> {
  await db.transaction('rw', db.sessions, db.subjects, db.achievements, async () => {
    await Promise.all([db.sessions.clear(), db.subjects.clear(), db.achievements.clear()]);
  });
}
