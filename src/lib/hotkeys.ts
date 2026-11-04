import { useEffect } from 'react';

export interface Hotkey {
  /** Значение `KeyboardEvent.code` (физическая клавиша — не зависит от раскладки) или `key`. */
  readonly keys: readonly string[];
  readonly handler: (e: KeyboardEvent) => void;
  /** Срабатывать даже в полях ввода и при открытом окне (нужно для Esc). */
  readonly always?: boolean;
}

/** Фокус в поле ввода — горячие клавиши не должны мешать печатать. */
export function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (target as HTMLInputElement).type;
    return !['checkbox', 'radio', 'range', 'button', 'submit'].includes(type);
  }
  return false;
}

function modalOpen(): boolean {
  return document.querySelector('dialog[open]') !== null;
}

/**
 * Глобальные горячие клавиши. Используем `code` (KeyR, Digit1), чтобы R и S
 * работали и в русской раскладке, где на этих клавишах «К» и «Ы».
 */
export function useHotkeys(bindings: readonly Hotkey[]): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      for (const b of bindings) {
        if (!b.keys.includes(e.code) && !b.keys.includes(e.key)) continue;
        if (!b.always && (isTyping(e.target) || modalOpen())) return;
        // preventDefault обязателен: Пробел на кнопке «нажал» бы её — и таймер переключился бы дважды.
        e.preventDefault();
        b.handler(e);
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [bindings]);
}
