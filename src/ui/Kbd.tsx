import type { ReactNode } from 'react';
import s from '@/ui/Kbd.module.css';

export function Kbd({ children }: { readonly children: ReactNode }) {
  return <kbd className={s.kbd}>{children}</kbd>;
}
