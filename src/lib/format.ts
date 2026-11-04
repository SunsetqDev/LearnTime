const pad = (n: number) => String(n).padStart(2, '0');

/** 1 499 999 мс → «25:00»: округляем вверх, чтобы «00:00» появлялось только в самом конце. */
export function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Продолжительность для людей: «1 ч 40 мин», «25 мин», «0 мин». */
export function duration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} мин`;
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`;
}

/** Короткая запись часов для осей: «2,5 ч», «40 м». */
export function compactDuration(ms: number): string {
  const minutes = ms / 60_000;
  if (minutes < 60) return `${Math.round(minutes)} м`;
  const hours = minutes / 60;
  return `${hours.toFixed(hours < 10 ? 1 : 0).replace('.', ',')} ч`;
}

export function timeOfDay(epoch: number): string {
  const d = new Date(epoch);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Склонение: plural(5, ['сессия', 'сессии', 'сессий']) → «сессий». */
export function plural(n: number, forms: readonly [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

export const MODE_LABEL = {
  focus: 'Учёба',
  short: 'Перерыв',
  long: 'Длинный перерыв',
} as const;
