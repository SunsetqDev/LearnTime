import { liveQuery } from 'dexie';

/**
 * Подписывает Zustand-стор на живой запрос Dexie: любая запись в IndexedDB
 * (из этой вкладки или соседней) сразу приходит в стор, компоненты читают синхронно.
 */
export function bindLiveQuery<T>(
  query: () => Promise<T>,
  onValue: (value: T) => void,
  onError: (error: unknown) => void = (e: unknown) => {
    console.error('[focus] liveQuery', e);
  },
): () => void {
  const sub = liveQuery(query).subscribe({ next: onValue, error: onError });
  return () => {
    sub.unsubscribe();
  };
}
