import Dexie, { type EntityTable } from 'dexie';
import type { Mode, SessionStatus } from '@/features/timer/model/types';
import type { SubjectColor } from '@/features/subjects/palette';

export interface SessionRecord {
  readonly id: string;
  readonly mode: Mode;
  readonly status: SessionStatus;
  readonly startedAt: number;
  readonly endedAt: number;
  /** Локальный день начала сессии. Сессия через полночь остаётся в дне старта. */
  readonly dayKey: string;
  /** Час начала (0–23) — для распределения «лучшее время для учёбы». Появился в версии 2. */
  readonly hour: number;
  readonly plannedMs: number;
  readonly actualMs: number;
  readonly pauses: number;
  readonly subjectId: string | null;
  readonly task: string;
}

export interface SubjectRecord {
  readonly id: string;
  readonly name: string;
  readonly color: SubjectColor;
  /** 0/1 вместо boolean: IndexedDB не индексирует логические значения. */
  readonly archived: 0 | 1;
  readonly order: number;
  readonly createdAt: number;
}

export interface AchievementRecord {
  readonly id: string;
  readonly unlockedAt: number;
}

export type FocusDB = Dexie & {
  sessions: EntityTable<SessionRecord, 'id'>;
  subjects: EntityTable<SubjectRecord, 'id'>;
  achievements: EntityTable<AchievementRecord, 'id'>;
};

export const DB_NAME = 'focus';
export const DB_VERSION = 2;

/**
 * Схема базы с историей версий. Старые версии не удаляются: Dexie по цепочке
 * применяет миграции к базе любой давности.
 */
export function defineSchema(db: Dexie): void {
  db.version(1).stores({
    sessions: 'id, startedAt, dayKey, subjectId, status',
    subjects: 'id, order, archived',
    achievements: 'id',
  });

  // v2: час начала для аналитики по времени суток и составной индекс для фильтров истории.
  db.version(2)
    .stores({
      sessions: 'id, startedAt, dayKey, subjectId, status, hour, [subjectId+dayKey]',
    })
    .upgrade(async (tx) => {
      await tx
        .table<Omit<SessionRecord, 'hour'> & { hour?: number }>('sessions')
        .toCollection()
        .modify((s) => {
          s.hour ??= new Date(s.startedAt).getHours();
        });
    });
}

export function openDatabase(name = DB_NAME): FocusDB {
  const db = new Dexie(name) as FocusDB;
  defineSchema(db);
  return db;
}

export const db = openDatabase();

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
