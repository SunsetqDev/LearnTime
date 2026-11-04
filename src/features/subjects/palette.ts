/**
 * Курированная палитра предметов: 8 оттенков в фиксированном порядке (тёплый/холодный
 * чередуются). Проверена валидатором цветов: соседние пары различимы при протанопии,
 * дейтеранопии и тританопии (ΔE ≥ 8), у всех достаточная насыщенность, в тёмной теме —
 * свои ступени. Хранится ключ, а не hex — тема подставляет нужный вариант.
 */
export const SUBJECT_COLORS = {
  cobalt: 'Кобальт',
  vermilion: 'Киноварь',
  jade: 'Нефрит',
  ochre: 'Охра',
  rose: 'Роза',
  moss: 'Мох',
  iris: 'Ирис',
  brick: 'Кирпич',
} as const;

export type SubjectColor = keyof typeof SUBJECT_COLORS;

export const COLOR_KEYS = Object.keys(SUBJECT_COLORS) as SubjectColor[];

export function isSubjectColor(v: unknown): v is SubjectColor {
  return typeof v === 'string' && v in SUBJECT_COLORS;
}

export function colorVar(color: SubjectColor): string {
  return `var(--sub-${color})`;
}

/** Цвета первой версии палитры → ближайшие новые. Используется миграцией базы v3. */
export const LEGACY_COLORS: Readonly<Record<string, SubjectColor>> = {
  vermilion: 'vermilion',
  ochre: 'ochre',
  mustard: 'ochre',
  olive: 'moss',
  pine: 'jade',
  teal: 'jade',
  petrol: 'cobalt',
  slate: 'iris',
  plum: 'rose',
  terracotta: 'brick',
};

/** Цвет «без предмета». */
export const NO_SUBJECT_COLOR = 'var(--ink-4)';

/** Следующий свободный цвет — чтобы новые предметы сразу различались. */
export function nextColor(used: readonly SubjectColor[]): SubjectColor {
  const free = COLOR_KEYS.find((c) => !used.includes(c));
  return free ?? COLOR_KEYS[used.length % COLOR_KEYS.length] ?? 'cobalt';
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
