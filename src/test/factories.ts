import type { SessionRecord } from '@/lib/db';
import { parseDay } from '@/lib/time';

let seq = 0;

/** Сессия для тестов: день, час, минуты и предмет — остальное по умолчанию. */
export function session(
  day: string,
  minutes = 25,
  patch: Partial<SessionRecord> & { readonly at?: number } = {},
): SessionRecord {
  const { at = 10, ...rest } = patch;
  const d = parseDay(day);
  d.setHours(at, 0, 0, 0);
  seq += 1;
  return {
    id: `t-${seq}`,
    mode: 'focus',
    status: 'completed',
    startedAt: d.getTime(),
    endedAt: d.getTime() + minutes * 60_000,
    dayKey: day,
    hour: at,
    plannedMs: 25 * 60_000,
    actualMs: minutes * 60_000,
    pauses: 0,
    subjectId: null,
    task: '',
    ...rest,
  };
}
