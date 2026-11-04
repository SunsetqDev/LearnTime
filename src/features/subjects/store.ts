import { create } from 'zustand';
import { nextColor, type SubjectColor } from '@/features/subjects/palette';
import { db, uid, type SubjectRecord } from '@/lib/db';
import { bindLiveQuery } from '@/lib/liveStore';

export const NAME_MAX = 40;

interface SubjectsState {
  readonly ready: boolean;
  readonly all: readonly SubjectRecord[];
  /** Производные списки считаются один раз при обновлении, чтобы селекторы возвращали стабильные ссылки. */
  readonly active: readonly SubjectRecord[];
  readonly archived: readonly SubjectRecord[];
}

export const useSubjects = create<SubjectsState>()(() => ({
  ready: false,
  all: [],
  active: [],
  archived: [],
}));

/** Активные предметы в пользовательском порядке. */
export const selectActive = (s: SubjectsState) => s.active;
export const selectArchived = (s: SubjectsState) => s.archived;

export function startSubjectsSync(): () => void {
  return bindLiveQuery(
    () => db.subjects.orderBy('order').toArray(),
    (all) => {
      useSubjects.setState({
        ready: true,
        all,
        active: all.filter((x) => x.archived === 0),
        archived: all.filter((x) => x.archived === 1),
      });
    },
  );
}

export function validateName(
  name: string,
  all: readonly SubjectRecord[],
  exceptId?: string,
): string | null {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (clean.length === 0) return 'Введите название предмета';
  if (clean.length > NAME_MAX) return `Не длиннее ${NAME_MAX} символов`;
  const taken = all.some(
    (s) => s.id !== exceptId && s.name.toLocaleLowerCase('ru') === clean.toLocaleLowerCase('ru'),
  );
  return taken ? 'Такой предмет уже есть' : null;
}

export const subjectsRepo = {
  async create(name: string, color?: SubjectColor): Promise<SubjectRecord> {
    const all = await db.subjects.toArray();
    const record: SubjectRecord = {
      id: uid(),
      name: name.trim().replace(/\s+/g, ' '),
      color: color ?? nextColor(all.filter((s) => s.archived === 0).map((s) => s.color)),
      archived: 0,
      order: all.reduce((m, s) => Math.max(m, s.order), -1) + 1,
      createdAt: Date.now(),
    };
    await db.subjects.add(record);
    return record;
  },

  async update(id: string, patch: Partial<Pick<SubjectRecord, 'name' | 'color'>>): Promise<void> {
    const clean =
      patch.name === undefined ? patch : { ...patch, name: patch.name.trim().replace(/\s+/g, ' ') };
    await db.subjects.update(id, clean);
  },

  async setArchived(id: string, archived: boolean): Promise<void> {
    await db.subjects.update(id, { archived: archived ? 1 : 0 });
  },

  /** Сохраняет новый порядок: индексы перезаписываются одной транзакцией. */
  async reorder(ids: readonly string[]): Promise<void> {
    await db.transaction('rw', db.subjects, async () => {
      await Promise.all(ids.map((id, order) => db.subjects.update(id, { order })));
    });
  },
};
