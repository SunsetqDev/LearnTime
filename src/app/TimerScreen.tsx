import { GoalBlock } from '@/features/habits/ui/GoalBlock';
import { TodayPanel } from '@/features/sessions/ui/TodayPanel';
import { SubjectPicker } from '@/features/subjects/ui/SubjectPicker';
import { useTimer } from '@/features/timer/store';
import { TimerPage } from '@/features/timer/ui/TimerPage';
import { Field } from '@/ui/Field';

/** Главный экран: таймер + панель «Сегодня». Здесь фичи собираются вместе. */
export function TimerScreen() {
  const context = useTimer((s) => s.machine.context);
  const dispatch = useTimer((s) => s.dispatch);

  return (
    <TimerPage
      setup={
        <SubjectPicker
          value={context.subjectId}
          onChange={(subjectId) => {
            dispatch({ type: 'SET_CONTEXT', context: { subjectId } });
          }}
        />
      }
      aside={
        <TodayPanel goal={<GoalBlock />}>
          <Field
            label="Задача на сессию"
            placeholder="Решить вариант ЕНТ по математике"
            value={context.task}
            maxLength={80}
            counter
            onChange={(e) => {
              dispatch({ type: 'SET_CONTEXT', context: { task: e.target.value } });
            }}
          />
        </TodayPanel>
      }
    />
  );
}
