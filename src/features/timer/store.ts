import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createInitialState, transition } from '@/features/timer/model/machine';
import type { TimerEffect, TimerEvent, TimerState } from '@/features/timer/model/types';

type EffectListener = (effect: TimerEffect, state: TimerState) => void;

interface TimerStore {
  readonly machine: TimerState;
  readonly dispatch: (event: TimerEvent) => void;
}

const listeners = new Set<EffectListener>();

/** Подписка на эффекты автомата (часы, звук, запись сессии). Возвращает отписку. */
export function onTimerEffect(listener: EffectListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const TIMER_KEY = 'focus.timer';

export const useTimer = create<TimerStore>()(
  persist(
    (set, get) => ({
      machine: createInitialState(),
      dispatch: (event) => {
        const { state, effects } = transition(get().machine, event);
        if (state !== get().machine) set({ machine: state });
        for (const effect of effects) for (const l of listeners) l(effect, state);
      },
    }),
    {
      name: TIMER_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ machine: s.machine }),
    },
  ),
);

/** Удобная обёртка: отправить событие с текущим временем. */
export const timerActions = {
  toggle: () => {
    useTimer.getState().dispatch({ type: 'TOGGLE', now: Date.now() });
  },
  start: () => {
    useTimer.getState().dispatch({ type: 'START', now: Date.now() });
  },
  reset: () => {
    useTimer.getState().dispatch({ type: 'RESET' });
  },
  skip: () => {
    useTimer.getState().dispatch({ type: 'SKIP', now: Date.now() });
  },
  interrupt: () => {
    useTimer.getState().dispatch({ type: 'INTERRUPT', now: Date.now() });
  },
  tick: (now = Date.now()) => {
    useTimer.getState().dispatch({ type: 'TICK', now });
  },
};
