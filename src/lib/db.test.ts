import Dexie from 'dexie';
import { DB_VERSION, openDatabase } from '@/lib/db';
import { sessionId, sessionsRepo, toRecord } from '@/features/sessions/store';
import type { SessionDraft } from '@/features/timer/model/types';

const draft = (startedAt: number, patch: Partial<SessionDraft> = {}): SessionDraft => ({
  mode: 'focus',
  status: 'completed',
  startedAt,
  endedAt: startedAt + 25 * 60_000,
  plannedMs: 25 * 60_000,
  actualMs: 25 * 60_000,
  pauses: 0,
  subjectId: null,
  task: '',
  ...patch,
});

describe('база данных', () => {
  it('миграция v1 → v2 заполняет час начала у старых сессий', async () => {
    const name = `migrate-${Math.random()}`;
    // Создаём базу «как у старой версии приложения».
    const v1 = new Dexie(name);
    v1.version(1).stores({
      sessions: 'id, startedAt, dayKey, subjectId, status',
      subjects: 'id, order, archived',
      achievements: 'id',
    });
    const started = new Date(2026, 9, 1, 19, 30).getTime();
    await v1
      .table('sessions')
      .add({ ...toRecord(draft(started, { subjectId: 'math' })), hour: undefined });
    v1.close();

    const db = openDatabase(name);
    const [row] = await db.sessions.toArray();
    expect(db.verno).toBe(DB_VERSION);
    expect(row?.hour).toBe(19);
    // Новый составной индекс работает.
    const found = await db.sessions
      .where('[subjectId+dayKey]')
      .equals(['math', '2026-10-01'])
      .count();
    expect(found).toBe(1);
    db.close();
  });

  it('запись сессии идемпотентна: две вкладки не создают дубль', async () => {
    const t = Date.now();
    const first = await sessionsRepo.add(draft(t));
    const second = await sessionsRepo.add(draft(t));
    expect(first?.id).toBe(sessionId(t));
    expect(second).toBeNull();
  });

  it('день сессии берётся по времени старта', () => {
    const late = new Date(2026, 10, 3, 23, 50).getTime();
    expect(toRecord(draft(late)).dayKey).toBe('2026-11-03');
  });
});

describe('миграция палитры', () => {
  it('v3 переносит старые цвета предметов на новую палитру', async () => {
    const name = `palette-${Math.random()}`;
    const v2 = new Dexie(name);
    v2.version(1).stores({ sessions: 'id', subjects: 'id, order, archived', achievements: 'id' });
    await v2.table('subjects').bulkAdd([
      { id: 'a', name: 'Физика', color: 'petrol', archived: 0, order: 0, createdAt: 0 },
      { id: 'b', name: 'Химия', color: 'jade', archived: 0, order: 1, createdAt: 0 },
    ]);
    v2.close();
    const db = openDatabase(name);
    const rows = await db.subjects.orderBy('order').toArray();
    expect(rows.map((r) => r.color)).toEqual(['cobalt', 'jade']);
    db.close();
  });
});
