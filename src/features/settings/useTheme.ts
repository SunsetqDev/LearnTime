import { useEffect } from 'react';
import { useSettings, type ThemePref } from '@/features/settings/store';

const META_COLOR = { light: '#F2EEE6', dark: '#131210' } as const;

export function resolveTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref !== 'system') return pref;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Применяет тему к <html> и цвет строки состояния браузера; следит за системной темой. */
export function useTheme(): void {
  const pref = useSettings((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const theme = resolveTheme(pref);
      if (pref === 'system') delete root.dataset.theme;
      else root.dataset.theme = pref;
      for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
        meta.content = META_COLOR[theme];
      }
    };
    apply();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => {
      mq.removeEventListener('change', apply);
    };
  }, [pref]);
}
