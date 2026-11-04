import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Mode, TimerConfig } from '@/features/timer/model/types';
import type { VoiceId } from '@/lib/audio/synth';

export type ThemePref = 'system' | 'light' | 'dark';
export type GoalKind = 'minutes' | 'sessions';

export interface SettingsState {
  /** Длительности в минутах — так их видит и вводит пользователь. */
  readonly minutes: Readonly<Record<Mode, number>>;
  readonly longEvery: number;
  readonly autoStartBreaks: boolean;
  readonly autoStartFocus: boolean;
  readonly sound: { readonly enabled: boolean; readonly volume: number; readonly voice: VoiceId };
  readonly notifications: boolean;
  readonly theme: ThemePref;
  readonly goal: { readonly kind: GoalKind; readonly value: number };
  readonly onboardingDone: boolean;
}

interface SettingsActions {
  update: (patch: Partial<SettingsState>) => void;
  setMinutes: (mode: Mode, value: number) => void;
  reset: () => void;
}

export const SETTINGS_KEY = 'focus.settings';

export const DEFAULT_SETTINGS: SettingsState = {
  minutes: { focus: 25, short: 5, long: 15 },
  longEvery: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  sound: { enabled: true, volume: 0.6, voice: 'tuning' },
  notifications: false,
  theme: 'system',
  goal: { kind: 'minutes', value: 120 },
  onboardingDone: false,
};

export const LIMITS = {
  focus: { min: 1, max: 120 },
  short: { min: 1, max: 30 },
  long: { min: 5, max: 60 },
  longEvery: { min: 2, max: 8 },
  goalMinutes: { min: 15, max: 600 },
  goalSessions: { min: 1, max: 20 },
} as const;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(v)));

export const useSettings = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => {
        set(patch);
      },
      setMinutes: (mode, value) => {
        set((s) => ({
          minutes: { ...s.minutes, [mode]: clamp(value, LIMITS[mode].min, LIMITS[mode].max) },
        }));
      },
      reset: () => {
        set({ ...DEFAULT_SETTINGS, onboardingDone: true });
      },
    }),
    {
      name: SETTINGS_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): SettingsState => ({
        minutes: s.minutes,
        longEvery: s.longEvery,
        autoStartBreaks: s.autoStartBreaks,
        autoStartFocus: s.autoStartFocus,
        sound: s.sound,
        notifications: s.notifications,
        theme: s.theme,
        goal: s.goal,
        onboardingDone: s.onboardingDone,
      }),
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<SettingsState>) }),
    },
  ),
);

export function toTimerConfig(s: SettingsState): TimerConfig {
  return {
    durations: {
      focus: s.minutes.focus * 60_000,
      short: s.minutes.short * 60_000,
      long: s.minutes.long * 60_000,
    },
    longEvery: s.longEvery,
    autoStartBreaks: s.autoStartBreaks,
    autoStartFocus: s.autoStartFocus,
  };
}
