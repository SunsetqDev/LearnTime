import { createBackup, importBackup, parseBackup, wipeAll } from '@/features/settings/backup';
import { db } from '@/lib/db';
import { session } from '@/test/factories';

describe('резервная копия', () => {
  beforeEach(async () => {
    await wipeAll();
  });

  it('экспорт → импорт с заменой восстанавливает данные один в один', async () => {
    await db.subjects.add({
      id: 'm',
      name: 'Математика',
      color: 'cobalt',
      archived: 0,
      order: 0,
      createdAt: 1,
    });
    await db.sessions.bulkAdd([
      session('2026-11-01', 25, { subjectId: 'm' }),
      session('2026-11-02', 40),
    ]);
    const backup = await createBackup(1_800_000_000_000);
    await wipeAll();

    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const report = await importBackup(parsed.backup, 'replace');
    expect(report).toEqual({ sessionsAdded: 2, subjectsAdded: 1 });
    expect(await db.sessions.count()).toBe(2);
  });

  it('объединение не дублирует записи', async () => {
    const s = session('2026-11-01');
    await db.sessions.add(s);
    const backup = await createBackup();
    const parsed = parseBackup(JSON.stringify(backup));
    if (!parsed.ok) throw new Error(parsed.error);
    const report = await importBackup(parsed.backup, 'merge');
    expect(report.sessionsAdded).toBe(0);
    expect(await db.sessions.count()).toBe(1);
  });

  it('отклоняет чужой и повреждённый файл с понятной ошибкой', () => {
    expect(parseBackup('не json')).toMatchObject({ ok: false });
    const wrong = parseBackup(JSON.stringify({ format: 'other', sessions: [] }));
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.error).toMatch(/проверку/);
  });

  it('дополняет недостающие поля и переводит старые цвета', () => {
    const parsed = parseBackup(
      JSON.stringify({
        format: 'focus-backup',
        schemaVersion: 1,
        exportedAt: 1,
        subjects: [
          { id: 'a', name: 'Физика', color: 'petrol', archived: false, order: 0, createdAt: 0 },
        ],
        sessions: [
          {
            id: 'x',
            mode: 'focus',
            status: 'completed',
            startedAt: new Date(2026, 0, 2, 15).getTime(),
            endedAt: new Date(2026, 0, 2, 16).getTime(),
            plannedMs: 1,
            actualMs: 1,
            subjectId: 'a',
          },
        ],
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.subjects[0]?.color).toBe('cobalt');
    expect(parsed.backup.sessions[0]).toMatchObject({
      dayKey: '2026-01-02',
      hour: 15,
      task: '',
      pauses: 0,
    });
  });
});
