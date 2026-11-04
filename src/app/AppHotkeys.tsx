import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ui, useUi } from '@/app/uiStore';
import { elapsedMs } from '@/features/timer/model/machine';
import type { Mode } from '@/features/timer/model/types';
import { timerActions, useTimer } from '@/features/timer/store';
import { useHotkeys, type Hotkey } from '@/lib/hotkeys';
import { toast } from '@/ui/toast';

const MODE_KEYS: Record<string, Mode> = {
  Digit1: 'focus',
  Digit2: 'short',
  Digit3: 'long',
  Numpad1: 'focus',
  Numpad2: 'short',
  Numpad3: 'long',
};

/** Глобальные клавиши приложения. Таймерные действия работают с любой страницы. */
export function AppHotkeys() {
  const navigate = useNavigate();

  const bindings = useMemo<Hotkey[]>(
    () => [
      {
        keys: ['Space'],
        handler: () => {
          timerActions.toggle();
        },
      },
      { keys: ['KeyR'], handler: timerActions.reset },
      { keys: ['KeyS'], handler: timerActions.skip },
      {
        keys: Object.keys(MODE_KEYS),
        handler: (e) => {
          const mode = MODE_KEYS[e.code];
          if (!mode) return;
          const m = useTimer.getState().machine;
          const active = m.phase === 'running' || m.phase === 'paused';
          // С клавиатуры не обрываем идущую сессию молча — это легко сделать случайно.
          if (active && m.mode !== mode && elapsedMs(m, Date.now()) > 5_000) {
            toast({
              kind: 'info',
              title: 'Сессия идёт',
              text: 'Сбросьте её (R) или пропустите (S), чтобы сменить режим.',
            });
            return;
          }
          useTimer.getState().dispatch({ type: 'SET_MODE', mode });
          navigate('/');
        },
      },
      {
        keys: ['KeyF'],
        handler: () => {
          ui.toggleFocus();
        },
      },
      {
        keys: ['?', 'Slash'],
        handler: (e) => {
          if (e.code === 'Slash' && !e.shiftKey) return;
          ui.setHelp(true);
        },
      },
      {
        keys: ['Escape'],
        always: true,
        handler: () => {
          if (useUi.getState().focusMode) ui.setFocus(false);
        },
      },
    ],
    [navigate],
  );

  useHotkeys(bindings);
  return null;
}
