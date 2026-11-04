/** Справочник горячих клавиш — для окна «?» и README. */
export const SHORTCUTS: readonly { readonly keys: readonly string[]; readonly action: string }[] = [
  { keys: ['Пробел'], action: 'Старт / пауза' },
  { keys: ['R'], action: 'Сбросить текущую сессию' },
  { keys: ['S'], action: 'Пропустить к следующему режиму' },
  { keys: ['1', '2', '3'], action: 'Учёба · перерыв · длинный перерыв' },
  { keys: ['F'], action: 'Режим полного фокуса' },
  { keys: ['Esc'], action: 'Выйти из режима фокуса или окна' },
  { keys: ['?'], action: 'Эта справка' },
];
