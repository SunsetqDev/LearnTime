import { useEffect } from 'react';
import { toTimerConfig, useSettings } from '@/features/settings/store';
import { createClock } from '@/features/timer/clock/clock';
import { remainingMs } from '@/features/timer/model/machine';
import { pulse, subscribeNow } from '@/features/timer/now';
import { onTimerEffect, TIMER_KEY, timerActions, useTimer } from '@/features/timer/store';
import { playSignal, unlockAudio } from '@/lib/audio/synth';
import { clock as fmtClock, MODE_LABEL } from '@/lib/format';
import { notify } from '@/lib/notify';

const APP_TITLE = 'Фокус';

/**
 * Связывает чистый автомат с внешним миром: часы в Worker, звук, уведомления,
 * заголовок вкладки, цвет режима и применение настроек. Подключается один раз в App.
 */
export function useTimerRuntime(): void {
  useEffect(() => {
    const c = createClock({
      onTick: (now) => {
        pulse(now);
        timerActions.tick(now);
      },
      onDeadline: (_at, now) => {
        pulse(now);
        timerActions.tick(now);
      },
    });

    const off = onTimerEffect((effect) => {
      if (effect.type === 'clock') {
        if (effect.endAt === null) c.disarm();
        else c.arm(effect.endAt);
        pulse(Date.now());
        return;
      }
      if (effect.type === 'signal') {
        const s = useSettings.getState();
        if (s.sound.enabled) playSignal(s.sound.voice, s.sound.volume, effect.next !== 'focus');
        if (s.notifications) {
          const title =
            effect.finished === 'focus' ? 'Сессия учёбы завершена' : 'Перерыв закончился';
          const body =
            effect.next === 'focus'
              ? `Дальше — учёба, ${s.minutes.focus} мин.`
              : `Дальше — ${effect.next === 'long' ? 'длинный перерыв' : 'перерыв'}, ${s.minutes[effect.next]} мин.`;
          void notify(title, body);
        }
      }
    });

    // Применяем настройки к автомату и восстанавливаем сессию после перезагрузки.
    const applyConfig = () => {
      useTimer
        .getState()
        .dispatch({ type: 'CONFIGURE', config: toTimerConfig(useSettings.getState()) });
    };
    applyConfig();
    const offSettings = useSettings.subscribe((s, prev) => {
      if (
        s.minutes !== prev.minutes ||
        s.longEvery !== prev.longEvery ||
        s.autoStartBreaks !== prev.autoStartBreaks ||
        s.autoStartFocus !== prev.autoStartFocus
      ) {
        applyConfig();
      }
    });
    useTimer.getState().dispatch({ type: 'RESTORE', now: Date.now() });

    // Фоновая вкладка: при возвращении сразу пересчитываем время, не дожидаясь тика.
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        pulse(Date.now());
        timerActions.tick();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    // Другая вкладка изменила таймер — подхватываем её состояние и перевзводим часы.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== TIMER_KEY) return;
      void Promise.resolve(useTimer.persist.rehydrate()).then(() => {
        useTimer.getState().dispatch({ type: 'RESTORE', now: Date.now() });
        if (useTimer.getState().machine.phase !== 'running') c.disarm();
        pulse(Date.now());
      });
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      off();
      offSettings();
      c.dispose();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Цвет режима на корне документа и время в заголовке вкладки.
  useEffect(() => {
    const render = () => {
      const m = useTimer.getState().machine;
      document.documentElement.dataset.mode = m.mode;
      if (m.phase === 'running' || m.phase === 'paused') {
        const left = fmtClock(remainingMs(m, Date.now()));
        const mark = m.phase === 'paused' ? '❚❚ ' : '';
        document.title = `${mark}${left} · ${MODE_LABEL[m.mode]} — ${APP_TITLE}`;
      } else {
        document.title = APP_TITLE;
      }
    };
    render();
    const offTimer = useTimer.subscribe(render);
    const offNow = subscribeNow(render);
    return () => {
      offTimer();
      offNow();
    };
  }, []);
}
