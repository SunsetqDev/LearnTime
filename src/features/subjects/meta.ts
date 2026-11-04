import { colorVar, NO_SUBJECT_COLOR } from '@/features/subjects/palette';
import type { SubjectRecord } from '@/lib/db';

export interface SubjectMeta {
  readonly id: string | null;
  readonly name: string;
  readonly color: string;
  readonly order: number;
}

/** Имя и цвет предмета по id; удалённый/неизвестный и «без предмета» — нейтральные. */
export function subjectMeta(id: string | null, all: readonly SubjectRecord[]): SubjectMeta {
  const found = id ? all.find((x) => x.id === id) : undefined;
  if (!found)
    return {
      id,
      name: id ? 'Предмет удалён' : 'Без предмета',
      color: NO_SUBJECT_COLOR,
      order: 1e6,
    };
  return { id, name: found.name, color: colorVar(found.color), order: found.order };
}
