import { useMemo, useState } from 'react';
import { BackupControls } from '@/features/settings/ui/BackupControls';
import { useSettings } from '@/features/settings/store';
import { useSessions } from '@/features/sessions/store';
import { DayBars, type DayRange } from '@/features/stats/charts/DayBars';
import { Heatmap } from '@/features/stats/charts/Heatmap';
import { HourBars } from '@/features/stats/charts/HourBars';
import { SubjectBars } from '@/features/stats/charts/SubjectBars';
import {
  byDay,
  byHour,
  bySubject,
  heatmap,
  periodRange,
  summarize,
  type Period,
} from '@/features/stats/model/aggregate';
import { History } from '@/features/stats/ui/History';
import { SummaryStrip } from '@/features/stats/ui/SummaryStrip';
import { useSubjects } from '@/features/subjects/store';
import { useNow } from '@/features/timer/now';
import { dayKey } from '@/lib/time';
import { EmptyState } from '@/ui/EmptyState';
import { PageHeader } from '@/ui/PageHeader';
import s from '@/features/stats/ui/StatsPage.module.css';

export default function StatsPage() {
  const sessions = useSessions((st) => st.all);
  const ready = useSessions((st) => st.ready);
  const subjects = useSubjects((st) => st.all);
  const goal = useSettings((st) => st.goal);
  const today = dayKey(useNow());
  const [range, setRange] = useState<DayRange>('week');
  const [period, setPeriod] = useState<Period>('month');

  const summary = useMemo(() => summarize(sessions, today), [sessions, today]);
  const days = useMemo(() => {
    const [from, to] = periodRange(range, today, null);
    return byDay(sessions, from, to);
  }, [sessions, range, today]);
  const shares = useMemo(() => {
    const [from, to] = periodRange(period, today, sessions[0]?.dayKey ?? null);
    return bySubject(sessions, from, to);
  }, [sessions, period, today]);
  const heat = useMemo(() => heatmap(sessions, today), [sessions, today]);
  const hours = useMemo(() => byHour(sessions), [sessions]);

  const header = (
    <PageHeader
      index="02"
      title="Аналитика"
      lead="Сколько вы учитесь на самом деле: по дням, предметам и времени суток. Прерванные сессии учитываются честно — отдельно."
      actions={<BackupControls />}
    />
  );

  if (ready && sessions.length === 0) {
    return (
      <div className={s.page}>
        {header}
        <EmptyState
          art="chart"
          title="Здесь появится ваша статистика"
          text="Проведите первую учебную сессию — графики построятся сами. Есть резервная копия? Импортируйте её кнопкой выше."
          action={{ label: 'Начать сессию', to: '/' }}
        />
      </div>
    );
  }

  return (
    <div className={s.page}>
      {header}
      <SummaryStrip summary={summary} />
      <div className={s.grid}>
        <div className={s.wide}>
          <DayBars
            days={days}
            range={range}
            onRange={setRange}
            subjects={subjects}
            goalMinutes={goal.kind === 'minutes' ? goal.value : null}
            today={today}
          />
        </div>
        <div className={s.narrow}>
          <SubjectBars shares={shares} subjects={subjects} period={period} onPeriod={setPeriod} />
        </div>
        <div className={s.full}>
          <Heatmap data={heat} activeDays={summary.activeDays} />
        </div>
        <div className={s.full}>
          <HourBars profile={hours} />
        </div>
      </div>
      <History sessions={sessions} subjects={subjects} today={today} />
    </div>
  );
}
