import { motion } from 'motion/react';
import type { Summary } from '@/features/stats/model/aggregate';
import { duration } from '@/lib/format';
import { CountUp } from '@/ui/CountUp';
import s from '@/features/stats/ui/SummaryStrip.module.css';

/** Часы и минуты крупно: «12» ч «40» мин — цифры набегают, единицы спокойные. */
function HoursValue({ ms }: { readonly ms: number }) {
  const minutes = Math.round(ms / 60_000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return (
    <span className={s.value}>
      {h > 0 ? (
        <>
          <CountUp value={h} />
          <span className={s.unit}>ч</span>
        </>
      ) : null}
      <CountUp value={m} />
      <span className={s.unit}>мин</span>
    </span>
  );
}

export function SummaryStrip({ summary }: { readonly summary: Summary }) {
  const main = [
    { label: 'Сегодня', ms: summary.todayMs },
    { label: 'Эта неделя', ms: summary.weekMs },
    { label: 'Этот месяц', ms: summary.monthMs },
    { label: 'Всего', ms: summary.totalMs },
  ];
  return (
    <section aria-label="Сводка" className={s.root}>
      <dl className={s.main}>
        {main.map((item, i) => (
          <motion.div
            key={item.label}
            className={s.item}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }}
          >
            <dt className="caps">{item.label}</dt>
            <dd>
              <HoursValue ms={item.ms} />
            </dd>
          </motion.div>
        ))}
      </dl>
      <dl className={s.minor}>
        <div>
          <dt>Средняя сессия</dt>
          <dd className="num">{duration(summary.avgMs)}</dd>
        </div>
        <div>
          <dt>Сессий</dt>
          <dd className="num">
            <CountUp value={summary.sessions} />
          </dd>
        </div>
        <div>
          <dt>Прервано</dt>
          <dd className="num">
            <CountUp
              value={Math.round(summary.interruptedShare * 100)}
              format={(n) => `${Math.round(n)}%`}
            />
          </dd>
        </div>
        <div>
          <dt>Активных дней</dt>
          <dd className="num">
            <CountUp value={summary.activeDays} />
          </dd>
        </div>
      </dl>
    </section>
  );
}
