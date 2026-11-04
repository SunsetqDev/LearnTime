import { create } from 'zustand';

export interface Toast {
  readonly id: number;
  readonly title: string;
  readonly text?: string;
  readonly kind: 'info' | 'achievement' | 'goal';
}

interface ToastState {
  readonly items: readonly Toast[];
}

let seq = 0;
export const useToasts = create<ToastState>()(() => ({ items: [] }));

export function toast(t: Omit<Toast, 'id'>, ttl = 5200): void {
  seq += 1;
  const id = seq;
  useToasts.setState((s) => ({ items: [...s.items.slice(-2), { ...t, id }] }));
  window.setTimeout(() => {
    dismissToast(id);
  }, ttl);
}

export function dismissToast(id: number): void {
  useToasts.setState((s) => ({ items: s.items.filter((x) => x.id !== id) }));
}
