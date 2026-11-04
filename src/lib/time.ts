/** Работа с локальными календарными днями. День — строка «YYYY-MM-DD» в часовом поясе пользователя. */
export type DayKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function dayKey(epoch: number): DayKey {
  const d = new Date(epoch);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDay(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDays(key: DayKey, days: number): DayKey {
  const d = parseDay(key);
  d.setDate(d.getDate() + days);
  return dayKey(d.getTime());
}

/** Разница в календарных днях (b − a), устойчивая к переходу на летнее время. */
export function diffDays(a: DayKey, b: DayKey): number {
  const da = parseDay(a);
  const db = parseDay(b);
  return Math.round(
    (Date.UTC(db.getFullYear(), db.getMonth(), db.getDate()) -
      Date.UTC(da.getFullYear(), da.getMonth(), da.getDate())) /
      86_400_000,
  );
}

/** Понедельник недели, в которую входит день. */
export function weekStart(key: DayKey): DayKey {
  const d = parseDay(key);
  const shift = (d.getDay() + 6) % 7;
  return addDays(key, -shift);
}

export function monthStart(key: DayKey): DayKey {
  return `${key.slice(0, 7)}-01`;
}

export function daysInRange(from: DayKey, to: DayKey): DayKey[] {
  const out: DayKey[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
}

const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'] as const;
const WEEKDAYS_FULL = [
  'воскресенье',
  'понедельник',
  'вторник',
  'среда',
  'четверг',
  'пятница',
  'суббота',
] as const;
const MONTHS_GEN = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
] as const;
const MONTHS_SHORT = [
  'янв',
  'фев',
  'мар',
  'апр',
  'май',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
] as const;

export function weekdayShort(key: DayKey): string {
  return WEEKDAYS[parseDay(key).getDay()] ?? '';
}

export function monthShort(monthIndex: number): string {
  return MONTHS_SHORT[monthIndex] ?? '';
}

/** «4 ноября», «среда, 4 ноября». */
export function humanDate(key: DayKey, withWeekday = false): string {
  const d = parseDay(key);
  const base = `${d.getDate()} ${MONTHS_GEN[d.getMonth()] ?? ''}`;
  return withWeekday ? `${WEEKDAYS_FULL[d.getDay()] ?? ''}, ${base}` : base;
}

export function relativeDay(key: DayKey, today: DayKey): string {
  const diff = diffDays(key, today);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Вчера';
  return humanDate(key, true).replace(/^./, (c) => c.toUpperCase());
}
