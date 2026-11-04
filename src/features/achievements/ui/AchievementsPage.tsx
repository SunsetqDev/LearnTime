import { motion } from 'motion/react';
import { useMemo } from 'react';
import { evaluate } from '@/features/achievements/model/rules';
import { useAchievements } from '@/features/achievements/store';
import { Medal } from '@/features/achievements/ui/Medal';
import { streak } from '@/features/habits/model/habits';
import { useSessions } from '@/features/sessions/store';
import { useSettings } from '@/features/settings/store';
import { useNow } from '@/features/timer/now';
import { plural } from '@/lib/format';
import { dayKey, humanDate } from '@/lib/time';
import { CountUp } from '@/ui/CountUp';
import { Icon } from '@/ui/Icon';
import { PageHeader } from '@/ui/PageHeader';
import s from '@/features/achievements/ui/AchievementsPage.module.css';

const fmt = (v: number, target: number) =>
  target >= 10 || Number.isInteger(target)
    ? `${Math.floor(Math.min(v, target) * 10) / 10}`.replace('.', ',')
    : `${v}`;

export default function AchievementsPage() {
  const sessions = useSessions((st) => st.all);
  const goal = useSettings((st) => st.goal);
  const unlockedAt = useAchievements((st) => st.unlocked);
  const today = dayKey(useNow());
  const states = useMemo(() => evaluate({ sessions, today, goal }), [sessions, today, goal]);
  const st = useMemo(() => streak(sessions, today), [sessions, today]);
  const opened = states.filter((a) => a.unlocked).length;

  // Сначала открытые (новые выше), затем ближайшие к открытию.
  const sorted = [...states].sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    if (a.unlocked) return (unlockedAt.get(b.def.id) ?? 0) - (unlockedAt.get(a.def.id) ?? 0);
    return b.progress - a.progress;
  });

  return (
    <div className={s.page}>
      <PageHeader
        index="04"
        title="Достижения"
        lead="Награды за привычку, а не за удачу: каждая требует регулярной работы. Условия видны сразу."
      />

      <section className={s.habit} aria-label="Серия дней">
        <div className={s.big}>
          <span className="caps">Серия</span>
          <span className={s.bigValue}>
            <CountUp value={st.current} />
            <span className={s.bigUnit}>{plural(st.current, ['день', 'дня', 'дней'])}</span>
          </span>
          <span className={s.bigNote}>
            {st.todayCounted
              ? 'Сегодня засчитан'
              : st.current > 0
                ? 'Сегодня ещё не засчитан — одна завершённая сессия продлит серию'
                : 'Завершите сессию, чтобы начать серию'}
          </span>
        </div>
        <div className={s.big}>
          <span className="caps">Рекорд</span>
          <span className={s.bigValue}>
            <CountUp value={st.best} />
            <span className={s.bigUnit}>{plural(st.best, ['день', 'дня', 'дней'])}</span>
          </span>
        </div>
        <div className={s.big}>
          <span className="caps">Открыто</span>
          <span className={s.bigValue}>
            <CountUp value={opened} />
            <span className={s.bigUnit}>из {states.length}</span>
          </span>
        </div>
      </section>

      <ol className={s.grid}>
        {sorted.map((a, i) => {
          const at = unlockedAt.get(a.def.id);
          return (
            <motion.li
              key={a.def.id}
              layout
              className={[s.item, a.unlocked ? s.open : ''].join(' ')}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.45,
                delay: Math.min(i, 10) * 0.035,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <Medal
                glyph={a.def.glyph}
                label={a.def.label}
                progress={a.progress}
                unlocked={a.unlocked}
                delay={0.1 + Math.min(i, 10) * 0.035}
              />
              <div className={s.copy}>
                <h3 className={s.title}>
                  {a.def.title}
                  {!a.unlocked ? (
                    <Icon name="lock" size={14} className={s.lock} label="Ещё не открыто" />
                  ) : null}
                </h3>
                <p className={s.condition}>{a.def.condition}</p>
                {a.unlocked ? (
                  <p className={s.meta}>{at ? `Получено ${humanDate(dayKey(at))}` : 'Получено'}</p>
                ) : (
                  <p className={s.meta}>
                    <span className="num">
                      {fmt(a.value, a.def.target)} / {a.def.target}
                    </span>
                    <span className={s.bar} aria-hidden="true">
                      <motion.span
                        className={s.barFill}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: a.progress }}
                        transition={{
                          duration: 0.8,
                          delay: 0.2 + Math.min(i, 10) * 0.035,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                      />
                    </span>
                  </p>
                )}
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
