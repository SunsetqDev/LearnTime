import { useSyncExternalStore } from 'react';

/**
 * Общий «пульс» приложения: текущее время, которое обновляют часы таймера.
 * Компоненты читают его через useNow() и перерисовываются раз в секунду, а не каждый кадр.
 */
let current = Date.now();
const subs = new Set<() => void>();

export function pulse(now: number): void {
  current = now;
  for (const s of subs) s();
}

export function subscribeNow(cb: () => void): () => void {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
}

export function useNow(): number {
  return useSyncExternalStore(subscribeNow, () => current);
}

export function readNow(): number {
  return current;
}
