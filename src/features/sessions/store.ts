import { create } from 'zustand';
import type { SessionDraft } from '@/features/timer/model/types';
import { db, type SessionRecord } from '@/lib/db';
import { bindLiveQuery } from '@/lib/liveStore';
import { dayKey } from '@/lib/time';

interface SessionsState {
  readonly ready: boolean;
  /** Все учебные сессии по возрастанию времени начала. Тысячи записей — это десятки КБ, держим в памяти. */
  readonly all: readonly SessionRecord[];
}

export const useSessions = create<SessionsState>()(() => ({ ready: false, all: [] }));

export function startSessionsSync(): () => void {
  return bindLiveQuery(
    () => db.sessions.orderBy('startedAt').toArray(),
    (all) => {
      useSessions.setState({ ready: true, all });
    },
  );
}

/**
 * Идентификатор выводится из момента старта: если сессию завершат две открытые вкладки
 * или восстановление после перезагрузки, запись всё равно будет одна.
 */
export function sessionId(startedAt: number): string {
  return `s-${startedAt.toString(36)}`;
}

export function toRecord(draft: SessionDraft): SessionRecord {
  return {
    id: sessionId(draft.startedAt),
    mode: draft.mode,
    status: draft.status,
    startedAt: draft.startedAt,
    endedAt: draft.endedAt,
    dayKey: dayKey(draft.startedAt),
    hour: new Date(draft.startedAt).getHours(),
    plannedMs: draft.plannedMs,
    actualMs: draft.actualMs,
    pauses: draft.pauses,
    subjectId: draft.subjectId,
    task: draft.task,
  };
}

type Listener = (record: SessionRecord) => void;
const saved = new Set<Listener>();

/** Подписка на новые записанные сессии (для достижений и уведомлений в интерфейсе). */
export function onSessionSaved(l: Listener): () => void {
  saved.add(l);
  return () => {
    saved.delete(l);
  };
}

export const sessionsRepo = {
  /** Идемпотентная запись: повтор той же сессии ничего не меняет и не будит слушателей. */
  async add(draft: SessionDraft): Promise<SessionRecord | null> {
    const record = toRecord(draft);
    const inserted = await db.transaction('rw', db.sessions, async () => {
      if (await db.sessions.get(record.id)) return false;
      await db.sessions.add(record);
      return true;
    });
    if (!inserted) return null;
    for (const l of saved) l(record);
    return record;
  },
  async remove(id: string): Promise<void> {
    await db.sessions.delete(id);
  },
};
