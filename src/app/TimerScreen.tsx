import { useTimer } from '@/features/timer/store';
import { TimerPage } from '@/features/timer/ui/TimerPage';
import { Field } from '@/ui/Field';

/** Главный экран: таймер + панель «Сегодня». Здесь фичи собираются вместе. */
export function TimerScreen() {
  const task = useTimer((s) => s.machine.context.task);
  const dispatch = useTimer((s) => s.dispatch);
  return (
    <TimerPage
      aside={
        <Field
          label="Задача на сессию"
          placeholder="Решить вариант ЕНТ по математике"
          value={task}
          maxLength={80}
          counter
          onChange={(e) => {
            dispatch({ type: 'SET_CONTEXT', context: { task: e.target.value } });
          }}
        />
      }
    />
  );
}
