import { useEffect } from 'react';
import { sessionsRepo, startSessionsSync } from '@/features/sessions/store';
import { startSubjectsSync } from '@/features/subjects/store';
import { onTimerEffect } from '@/features/timer/store';

/** Синхронизация сторов с IndexedDB и запись завершённых сессий из эффектов автомата. */
export function useDataRuntime(): void {
  useEffect(() => {
    const offSubjects = startSubjectsSync();
    const offSessions = startSessionsSync();
    const offRecord = onTimerEffect((effect) => {
      if (effect.type !== 'record') return;
      void sessionsRepo.add(effect.session).catch((e: unknown) => {
        console.error('[focus] не удалось сохранить сессию', e);
      });
    });
    return () => {
      offSubjects();
      offSessions();
      offRecord();
    };
  }, []);
}
