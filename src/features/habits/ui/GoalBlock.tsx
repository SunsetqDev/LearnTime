import { motion } from 'motion/react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { goalProgress, streak } from '@/features/habits/model/habits';
import { useSessions } from '@/features/sessions/store';
import { useSettings } from '@/features/settings/store';
import { useNow } from '@/features/timer/now';
import { duration, plural } from '@/lib/format';
import { dayKey } from '@/lib/time';
import { Icon } from '@/ui/Icon';
import s from '@/features/habits/ui/GoalBlock.module.css';

/** Цель дня (полоса с делениями) и серия дней — над хронологией на главном экране. */
export function GoalBlock() {
  const sessions = useSessions((st) => st.all);
  const goal = useSettings((st) => st.goal);
  const today = dayKey(useNow());
  const p = useMemo(() => goalProgress(sessions, today, goal), [sessions, today, goal]);
  const st = useMemo(() => streak(sessions, today), [sessions, today]);

  const fmt = (v: number) =>
    goal.kind === 'minutes'
      ? duration(v * 60_000)
      : `${v} ${plural(v, ['сессия', 'сессии', 'сессий'])}`;
  const segments = goal.kind === 'sessions' ? goal.value : 0;

  return (
    <div className={s.root}>
      <div className={s.row}>
        <span className="caps">Цель дня</span>
        <Link to="/settings#goal" className={s.edit}>
          {fmt(p.target)}
        </Link>
      </div>
      <div
        className={s.track}
        role="progressbar"
        aria-label="Цель дня"
        aria-valuemin={0}
        aria-valuemax={p.target}
        aria-valuenow={Math.min(p.value, p.target)}
        aria-valuetext={`${fmt(p.value)} из ${fmt(p.target)}`}
      >
        <motion.span
          className={[s.fill, p.done ? s.done : ''].join(' ')}
          initial={false}
          animate={{ scaleX: Math.min(1, p.ratio) }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
        {segments > 1 && segments <= 12
          ? Array.from({ length: segments - 1 }, (_, i) => (
              <span
                key={i}
                className={s.notch}
                style={{ left: `${((i + 1) / segments) * 100}%` }}
              />
            ))
          : null}
      </div>
      <div className={s.row}>
        <span className={s.value}>
          {p.done ? <Icon name="check" size={14} /> : null}
          {fmt(p.value)}
          {p.ratio > 1 ? (
            <span className={s.over}> · +{Math.round((p.ratio - 1) * 100)}%</span>
          ) : null}
        </span>
        <span
          className={[s.streak, st.atRisk ? s.risk : ''].join(' ')}
          title={`Рекорд: ${st.best}`}
        >
          <Icon name="flame" size={14} />
          {st.current} {plural(st.current, ['день', 'дня', 'дней'])} подряд
        </span>
      </div>
    </div>
  );
}
