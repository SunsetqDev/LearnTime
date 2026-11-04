/**
 * Курированная палитра предметов: 10 приглушённых «типографских» оттенков,
 * различимых между собой и с цветами режимов. Хранится ключ, а не hex —
 * поэтому в тёмной теме предмет автоматически получает свой вариант цвета.
 */
export const SUBJECT_COLORS = {
  vermilion: 'Киноварь',
  ochre: 'Охра',
  mustard: 'Горчица',
  olive: 'Олива',
  pine: 'Хвоя',
  teal: 'Бирюза',
  petrol: 'Петроль',
  slate: 'Сланец',
  plum: 'Слива',
  terracotta: 'Терракота',
} as const;

export type SubjectColor = keyof typeof SUBJECT_COLORS;

export const COLOR_KEYS = Object.keys(SUBJECT_COLORS) as SubjectColor[];

export function isSubjectColor(v: unknown): v is SubjectColor {
  return typeof v === 'string' && v in SUBJECT_COLORS;
}

export function colorVar(color: SubjectColor): string {
  return `var(--sub-${color})`;
}

/** Цвет «без предмета». */
export const NO_SUBJECT_COLOR = 'var(--ink-4)';

/** Следующий свободный цвет — чтобы новые предметы сразу различались. */
export function nextColor(used: readonly SubjectColor[]): SubjectColor {
  const free = COLOR_KEYS.find((c) => !used.includes(c));
  return free ?? COLOR_KEYS[used.length % COLOR_KEYS.length] ?? 'vermilion';
}

/** Частые предметы ЕНТ и вуза — для быстрого старта. */
export const PRESET_SUBJECTS = [
  'Математика',
  'Физика',
  'Химия',
  'Биология',
  'История Казахстана',
  'Казахский язык',
  'Русский язык',
  'Английский язык',
  'Информатика',
  'География',
] as const;
