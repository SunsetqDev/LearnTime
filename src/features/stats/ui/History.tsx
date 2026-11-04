import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { sessionsRepo } from '@/features/sessions/store';
import { SessionRow } from '@/features/sessions/ui/SessionRow';
import {
  EMPTY_FILTER,
  filterHistory,
  groupByDay,
  type HistoryFilter,
} from '@/features/stats/model/aggregate';
import type { SessionRecord, SubjectRecord } from '@/lib/db';
import { duration } from '@/lib/format';
import { relativeDay } from '@/lib/time';
import { IconButton } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/Dialog';
import { EmptyState } from '@/ui/EmptyState';
import { Segmented } from '@/ui/Segmented';
import s from '@/features/stats/ui/History.module.css';

const PAGE = 20;

interface HistoryProps {
  readonly sessions: readonly SessionRecord[];
  readonly subjects: readonly SubjectRecord[];
  readonly today: string;
}

export function History({ sessions, subjects, today }: HistoryProps) {
  const [filter, setFilter] = useState<HistoryFilter>(EMPTY_FILTER);
  const [limit, setLimit] = useState(PAGE);
  const [toDelete, setToDelete] = useState<SessionRecord | null>(null);

  const filtered = useMemo(() => filterHistory(sessions, filter), [sessions, filter]);
  const groups = useMemo(() => groupByDay(filtered.slice(0, limit)), [filtered, limit]);
  const total = filtered.reduce((sum, x) => sum + x.actualMs, 0);
  const dirty = filter !== EMPTY_FILTER;

  const set = (patch: Partial<HistoryFilter>) => {
    setFilter((f) => ({ ...f, ...patch }));
    setLimit(PAGE);
  };

  return (
    <section className={s.root} aria-labelledby="history-title">
      <header className={s.head}>
        <div className={s.titles}>
          <span className={s.index}>06</span>
          <h2 id="history-title" className={s.title}>
            История сессий
          </h2>
        </div>
        <span className={s.found}>
          {filtered.length} · {duration(total)}
        </span>
      </header>

      <div className={s.filters} role="group" aria-label="Фильтры истории">
        <label className={s.filter}>
          <span className="caps">Предмет</span>
          <select
            value={filter.subjectId}
            onChange={(e) => {
              set({ subjectId: e.target.value });
            }}
          >
            <option value="all">Все предметы</option>
            {subjects.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
                {x.archived ? ' (архив)' : ''}
              </option>
            ))}
            <option value="none">Без предмета</option>
          </select>
        </label>
        <label className={s.filter}>
          <span className="caps">С</span>
          <input
            type="date"
            value={filter.from}
            max={filter.to || today}
            onChange={(e) => {
              set({ from: e.target.value });
            }}
          />
        </label>
        <label className={s.filter}>
          <span className="caps">По</span>
          <input
            type="date"
            value={filter.to}
            min={filter.from || undefined}
            max={today}
            onChange={(e) => {
              set({ to: e.target.value });
            }}
          />
        </label>
        <Segmented
          size="sm"
          label="Статус"
          value={filter.status}
          onChange={(status) => {
            set({ status });
          }}
          options={[
            { value: 'all', label: 'Все' },
            { value: 'completed', label: 'Завершённые' },
            { value: 'interrupted', label: 'Прерванные' },
          ]}
        />
        {dirty ? (
          <button
            type="button"
            className={s.reset}
            onClick={() => {
              setFilter(EMPTY_FILTER);
            }}
          >
            Сбросить
          </button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          compact
          art="search"
          title={sessions.length === 0 ? 'История пуста' : 'Ничего не нашлось'}
          text={
            sessions.length === 0
              ? 'Каждая завершённая или прерванная сессия попадёт сюда.'
              : 'Измените фильтры — например, расширьте даты.'
          }
          {...(dirty
            ? {
                action: {
                  label: 'Сбросить фильтры',
                  onClick: () => {
                    setFilter(EMPTY_FILTER);
                  },
                },
              }
            : {})}
        />
      ) : (
        <div className={s.groups}>
          {groups.map((g) => (
            <div key={g.day} className={s.group}>
              <div className={s.dayHead}>
                <span className={s.day}>{relativeDay(g.day, today)}</span>
                <span className={s.dayTotal}>{duration(g.totalMs)}</span>
              </div>
              <ul className={s.items}>
                <AnimatePresence initial={false}>
                  {g.items.map((x) => (
                    <motion.li
                      key={x.id}
                      className={s.item}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <SessionRow
                        session={x}
                        subject={subjects.find((sub) => sub.id === x.subjectId)}
                      />
                      <IconButton
                        icon="trash"
                        label="Удалить запись"
                        className={s.del}
                        onClick={() => {
                          setToDelete(x);
                        }}
                      />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          ))}
          {filtered.length > limit ? (
            <button
              type="button"
              className={s.more}
              onClick={() => {
                setLimit((l) => l + PAGE);
              }}
            >
              Показать ещё {Math.min(PAGE, filtered.length - limit)}
            </button>
          ) : null}
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        tone="danger"
        title="Удалить запись?"
        description="Сессия исчезнет из истории и статистики. Это нельзя отменить."
        confirmLabel="Удалить"
        onCancel={() => {
          setToDelete(null);
        }}
        onConfirm={() => {
          if (toDelete) void sessionsRepo.remove(toDelete.id);
          setToDelete(null);
        }}
      />
    </section>
  );
}
