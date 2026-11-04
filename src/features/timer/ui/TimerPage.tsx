import { AnimatePresence, motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { useSettings } from '@/features/settings/store';
import { elapsedMs, endsAt, planIndex, remainingMs } from '@/features/timer/model/machine';
import type { Mode, TimerState } from '@/features/timer/model/types';
import { useNow } from '@/features/timer/now';
import { timerActions, useTimer } from '@/features/timer/store';
import { CyclePlan } from '@/features/timer/ui/CyclePlan';
import { Readout } from '@/features/timer/ui/Readout';
import { Ruler } from '@/features/timer/ui/Ruler';
import { useProgress } from '@/features/timer/ui/useProgress';
import { clock, duration, MODE_LABEL, timeOfDay } from '@/lib/format';
import { Button, IconButton } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/Dialog';
import { Kbd } from '@/ui/Kbd';
import { Segmented } from '@/ui/Segmented';
import s from '@/features/timer/ui/TimerPage.module.css';

const MODE_OPTIONS = [
  { value: 'focus', label: 'Учёба', hint: 'Клавиша 1' },
  { value: 'short', label: 'Перерыв', hint: 'Клавиша 2' },
  { value: 'long', label: 'Длинный перерыв', hint: 'Клавиша 3' },
] as const satisfies readonly { value: Mode; label: string; hint: string }[];

const NEXT_NAME: Record<Mode, string> = {
  focus: 'учёба',
  short: 'перерыв',
  long: 'длинный перерыв',
};

function statusLine(m: TimerState, now: number, minutes: Record<Mode, number>): ReactNode {
  const after =
    m.mode === 'focus' ? ((m.cycle + 1) % m.config.longEvery === 0 ? 'long' : 'short') : 'focus';
  switch (m.phase) {
    case 'idle':
      return (
        <>
          {minutes[m.mode]} мин — {MODE_LABEL[m.mode].toLowerCase()}, затем {NEXT_NAME[after]}{' '}
          {minutes[after]} мин
        </>
      );
    case 'running': {
      const end = endsAt(m);
      return <>осталось · закончится в {end ? timeOfDay(end) : '—'}</>;
    }
    case 'paused':
      return <>на паузе · пройдено {duration(elapsedMs(m, now))}</>;
    case 'finished':
      return m.lastCompleted === 'focus' ? (
        <>
          Сессия засчитана — {minutes.focus} мин. Дальше {NEXT_NAME[m.mode]} {minutes[m.mode]} мин
        </>
      ) : (
        <>Перерыв окончен. Дальше учёба {minutes.focus} мин</>
      );
  }
}

function phaseCaption(m: TimerState): string {
  if (m.phase === 'running') return `Идёт · ${MODE_LABEL[m.mode]}`;
  if (m.phase === 'paused') return `Пауза · ${MODE_LABEL[m.mode]}`;
  if (m.phase === 'finished')
    return m.lastCompleted === 'focus' ? 'Учёба завершена' : 'Перерыв завершён';
  return 'До старта';
}

interface TimerPageProps {
  /** Правая колонка «Сегодня» — собирается из других фич. */
  readonly aside?: ReactNode;
  readonly setup?: ReactNode;
  readonly onFocusMode?: () => void;
}

export function TimerPage({ aside, setup, onFocusMode }: TimerPageProps) {
  const machine = useTimer((st) => st.machine);
  const dispatch = useTimer((st) => st.dispatch);
  const minutes = useSettings((st) => st.minutes);
  const now = useNow();
  const progress = useProgress();
  const [pendingMode, setPendingMode] = useState<Mode | null>(null);

  const active = machine.phase === 'running' || machine.phase === 'paused';
  const left = remainingMs(machine, now);
  const sessionMinutes = machine.durationMs / 60_000;

  const changeMode = (mode: Mode) => {
    if (mode === machine.mode && !active) return;
    if (active && elapsedMs(machine, Date.now()) > 5_000) setPendingMode(mode);
    else dispatch({ type: 'SET_MODE', mode });
  };

  const primary =
    machine.phase === 'running'
      ? { label: 'Пауза', icon: 'pause' as const }
      : machine.phase === 'paused'
        ? { label: 'Продолжить', icon: 'play' as const }
        : {
            label: machine.mode === 'focus' ? 'Начать учёбу' : 'Начать перерыв',
            icon: 'play' as const,
          };

  return (
    <div className={s.page}>
      <section className={s.main} aria-label="Таймер">
        <div className={s.top}>
          <Segmented
            label="Режим"
            options={MODE_OPTIONS}
            value={machine.mode}
            onChange={changeMode}
          />
          {setup}
        </div>

        <div className={s.dial}>
          <div className={s.caption}>
            <span
              className={[s.dot, machine.phase === 'running' ? s.live : ''].join(' ')}
              aria-hidden="true"
            />
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={phaseCaption(machine)}
                className="caps"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >
                {phaseCaption(machine)}
              </motion.span>
            </AnimatePresence>
          </div>

          <div role="timer" aria-live="off" aria-label={`Осталось ${clock(left)}`}>
            <Readout value={clock(left)} dim={machine.phase === 'paused'} />
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={`${machine.phase}-${machine.mode}`}
              className={s.status}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              aria-live="polite"
            >
              {statusLine(machine, now, minutes)}
            </motion.p>
          </AnimatePresence>

          <Ruler
            minutes={sessionMinutes}
            progress={progress}
            showNow={active}
            seed={`${machine.mode}-${sessionMinutes}`}
          />
        </div>

        <div className={s.controls}>
          <Button
            variant="mode"
            size="lg"
            icon={primary.icon}
            onClick={timerActions.toggle}
            className={s.primary}
            aria-keyshortcuts="Space"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={primary.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'inline-block' }}
              >
                {primary.label}
              </motion.span>
            </AnimatePresence>
          </Button>

          <AnimatePresence initial={false}>
            {active ? (
              <motion.div
                key="active"
                className={s.secondary}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.22 }}
              >
                <Button icon="skip" onClick={timerActions.skip} aria-keyshortcuts="S">
                  Пропустить
                </Button>
                {machine.mode === 'focus' ? (
                  <Button icon="stop" variant="ghost" onClick={timerActions.interrupt}>
                    Прервать
                  </Button>
                ) : null}
                <IconButton
                  icon="reset"
                  label="Сбросить (R)"
                  onClick={timerActions.reset}
                  aria-keyshortcuts="R"
                />
              </motion.div>
            ) : (
              <motion.p
                key="hint"
                className={s.hint}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                или <Kbd>Пробел</Kbd>
              </motion.p>
            )}
          </AnimatePresence>

          {onFocusMode ? (
            <IconButton
              icon="expand"
              label="Режим полного фокуса (F)"
              onClick={onFocusMode}
              className={s.focusBtn}
            />
          ) : null}
        </div>

        <CyclePlan config={machine.config} index={planIndex(machine)} progress={progress} />
      </section>

      {aside ? <aside className={s.aside}>{aside}</aside> : null}

      <ConfirmDialog
        open={pendingMode !== null}
        title="Сменить режим?"
        description="Текущая сессия остановится и не попадёт в статистику. Чтобы сохранить её как прерванную, нажмите «Прервать»."
        confirmLabel={pendingMode ? `Перейти: ${MODE_LABEL[pendingMode].toLowerCase()}` : 'Сменить'}
        onCancel={() => {
          setPendingMode(null);
        }}
        onConfirm={() => {
          if (pendingMode) dispatch({ type: 'SET_MODE', mode: pendingMode });
          setPendingMode(null);
        }}
      />
    </div>
  );
}
