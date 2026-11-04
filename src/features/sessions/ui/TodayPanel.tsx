import { AnimatePresence, motion } from 'motion/react';
import { useMemo, type ReactNode } from 'react';
import { useSessions } from '@/features/sessions/store';
import { SessionRow } from '@/features/sessions/ui/SessionRow';
import { useSubjects } from '@/features/subjects/store';
import { useNow } from '@/features/timer/now';
import { duration } from '@/lib/format';
import { dayKey, humanDate } from '@/lib/time';
import { CountUp } from '@/ui/CountUp';
import { EmptyState } from '@/ui/EmptyState';
import s from '@/features/sessions/ui/TodayPanel.module.css';

interface TodayPanelProps {
  /** Блок цели дня и серии — приходит из фичи привычек. */
  readonly goal?: ReactNode;
  readonly children?: ReactNode;
}

export function TodayPanel({ goal, children }: TodayPanelProps) {
  const now = useNow();
  const today = dayKey(now);
  const all = useSessions((st) => st.all);
  const subjects = useSubjects((st) => st.all);

  const sessions = useMemo(() => all.filter((x) => x.dayKey === today).reverse(), [all, today]);
  const total = sessions.reduce((sum, x) => sum + x.actualMs, 0);

  return (
    <div className={s.root}>
      <header className={s.head}>
        <span className="caps">Сегодня</span>
        <span className={s.date}>{humanDate(today, true)}</span>
      </header>

      <div className={s.total}>
        <CountUp
          className={s.totalValue}
          value={Math.round(total / 60_000)}
          format={(n) => duration(n * 60_000)}
        />
        <span className={s.totalNote}>
          {sessions.filter((x) => x.status === 'completed').length} завершено
          {sessions.some((x) => x.status === 'interrupted')
            ? ` · ${sessions.filter((x) => x.status === 'interrupted').length} прервано`
            : ''}
        </span>
      </div>

      {goal}
      {children}

      <section aria-label="Сессии сегодня">
        <div className={s.listHead}>
          <span className="caps">Хронология</span>
        </div>
        {sessions.length === 0 ? (
          <EmptyState
            compact
            art="sessions"
            title="Пока пусто"
            text="Завершите первую сессию — она появится здесь со временем и предметом."
          />
        ) : (
          <ol className={s.list}>
            <AnimatePresence initial={false}>
              {sessions.map((x) => (
                <motion.li
                  key={x.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <SessionRow
                    compact
                    session={x}
                    subject={subjects.find((sub) => sub.id === x.subjectId)}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        )}
      </section>
    </div>
  );
}
