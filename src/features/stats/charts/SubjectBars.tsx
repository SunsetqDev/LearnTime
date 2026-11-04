import { scaleLinear } from 'd3-scale';
import { motion } from 'motion/react';
import type { Period, SubjectShare } from '@/features/stats/model/aggregate';
import { ChartFrame, DataTable } from '@/features/stats/charts/ChartFrame';
import { subjectMeta } from '@/features/subjects/meta';
import type { SubjectRecord } from '@/lib/db';
import { duration, plural } from '@/lib/format';
import { EmptyState } from '@/ui/EmptyState';
import { Segmented } from '@/ui/Segmented';
import s from '@/features/stats/charts/charts.module.css';

interface SubjectBarsProps {
  readonly shares: readonly SubjectShare[];
  readonly subjects: readonly SubjectRecord[];
  readonly period: Period;
  readonly onPeriod: (p: Period) => void;
}

/**
 * Распределение по предметам — горизонтальные полосы с прямыми подписями:
 * длины сравниваются точнее, чем секторы пирога, и легенда не нужна.
 */
export function SubjectBars({ shares, subjects, period, onPeriod }: SubjectBarsProps) {
  const x = scaleLinear()
    .domain([0, shares[0]?.ms ?? 1])
    .range([0, 1]);

  const chart =
    shares.length === 0 ? (
      <EmptyState
        compact
        art="chart"
        title="Нет сессий за период"
        text="Выберите период шире или проведите сессию с предметом."
      />
    ) : (
      <ol className={s.subjects}>
        {shares.map((x0, i) => {
          const meta = subjectMeta(x0.subjectId, subjects);
          return (
            <li key={x0.subjectId ?? 'none'} className={s.subjectRow}>
              <div className={s.subjectTop}>
                <span className={s.subjectName}>
                  <span
                    className={s.subjectSwatch}
                    style={{ background: meta.color }}
                    aria-hidden="true"
                  />
                  <span>{meta.name}</span>
                </span>
                <span className={s.subjectValue}>
                  {duration(x0.ms)}
                  <span className={s.subjectShare}>{Math.round(x0.share * 100)}%</span>
                </span>
              </div>
              <div className={s.track} aria-hidden="true">
                <motion.div
                  className={s.trackFill}
                  style={{ background: meta.color }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: x(x0.ms) }}
                  transition={{ duration: 0.8, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </li>
          );
        })}
      </ol>
    );

  const table = (
    <DataTable>
      <thead>
        <tr>
          <th>Предмет</th>
          <th>Сессий</th>
          <th>Доля</th>
          <th>Время</th>
        </tr>
      </thead>
      <tbody>
        {shares.map((x0) => (
          <tr key={x0.subjectId ?? 'none'}>
            <td>{subjectMeta(x0.subjectId, subjects).name}</td>
            <td>
              {x0.count} {plural(x0.count, ['сессия', 'сессии', 'сессий'])}
            </td>
            <td>{Math.round(x0.share * 100)}%</td>
            <td>{duration(x0.ms)}</td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );

  return (
    <ChartFrame
      index="03"
      title="По предметам"
      controls={
        <Segmented
          size="sm"
          label="Период распределения"
          value={period}
          onChange={onPeriod}
          options={[
            { value: 'week', label: '7 дней' },
            { value: 'month', label: '30 дней' },
            { value: 'all', label: 'Всё' },
          ]}
        />
      }
      chart={chart}
      table={table}
    />
  );
}
