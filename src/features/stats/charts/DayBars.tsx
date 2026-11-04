import { max } from 'd3-array';
import { scaleBand, scaleLinear } from 'd3-scale';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import type { DayBucket } from '@/features/stats/model/aggregate';
import { ChartFrame, LegendItem, DataTable } from '@/features/stats/charts/ChartFrame';
import { roundedTopRect } from '@/features/stats/charts/geometry';
import { TipRow, TipTitle, Tooltip } from '@/features/stats/charts/Tooltip';
import { useWidth } from '@/features/stats/charts/useWidth';
import { subjectMeta } from '@/features/subjects/meta';
import type { SubjectRecord } from '@/lib/db';
import { compactDuration, duration } from '@/lib/format';
import { humanDate, parseDay, weekdayShort } from '@/lib/time';
import { Segmented } from '@/ui/Segmented';
import s from '@/features/stats/charts/charts.module.css';

export type DayRange = 'week' | 'month';

interface DayBarsProps {
  readonly days: readonly DayBucket[];
  readonly range: DayRange;
  readonly onRange: (r: DayRange) => void;
  readonly subjects: readonly SubjectRecord[];
  readonly goalMinutes: number | null;
  readonly today: string;
}

const H = 220;
const M = { top: 16, right: 0, bottom: 28, left: 40 };
const GAP = 2; // зазор цвета фона между сегментами стопки

/** Столбики по дням, сложенные из предметов, с линией дневной цели. */
export function DayBars({ days, range, onRange, subjects, goalMinutes, today }: DayBarsProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  // Порядок слоёв — по порядку предметов пользователя, чтобы цвета стояли на своих местах.
  const keys = useMemo(() => {
    const set = new Set<string>();
    for (const d of days) for (const k of d.bySubject.keys()) set.add(k);
    return [...set]
      .map((k) => subjectMeta(k === '' ? null : k, subjects))
      .sort((a, b) => a.order - b.order);
  }, [days, subjects]);

  const innerW = width - M.left - M.right;
  const innerH = H - M.top - M.bottom;
  const x = scaleBand()
    .domain(days.map((d) => d.day))
    .range([0, innerW])
    .paddingInner(range === 'week' ? 0.42 : 0.28);
  const top = Math.max((max(days, (d) => d.totalMs) ?? 0) / 60_000, goalMinutes ?? 0, 30);
  // Деления — круглыми минутами: 15, 30, 60 или 120, чтобы ось читалась как часы, а не «1,7 ч».
  const step = [15, 30, 60, 120, 180].find((st) => top / st <= 5) ?? 240;
  const yMax = Math.ceil(top / step) * step;
  const y = scaleLinear()
    .domain([0, yMax])
    .range([H - M.top - M.bottom, 0]);
  const ticks = Array.from({ length: yMax / step + 1 }, (_, i) => i * step);
  const bw = x.bandwidth();
  const labelEvery = range === 'week' ? 1 : width < 520 ? 7 : 5;
  const hovered = hover === null ? null : days[hover];

  const chart = (
    <div
      ref={ref}
      className={s.wrap}
      onPointerLeave={() => {
        setHover(null);
      }}
    >
      <svg
        width={width}
        height={H}
        role="img"
        aria-label={`Время учёбы по дням за ${range === 'week' ? 'неделю' : 'месяц'}`}
      >
        <g transform={`translate(${M.left},${M.top})`}>
          {ticks.map((t) => (
            <g key={t} transform={`translate(0,${y(t)})`}>
              <line x2={innerW} className={t === 0 ? s.baseline : s.grid} />
              <text x={-8} dy="0.32em" textAnchor="end" className={s.axis}>
                {t === 0 ? '0' : compactDuration(t * 60_000)}
              </text>
            </g>
          ))}

          {days.map((d, i) => {
            const x0 = x(d.day) ?? 0;
            let acc = 0;
            const segs = keys.filter((k) => (d.bySubject.get(k.id ?? '') ?? 0) > 0);
            return (
              <g
                key={d.day}
                opacity={hover === null || hover === i ? 1 : 0.45}
                className={s.barGroup}
              >
                <motion.g
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  style={{ transformOrigin: `0px ${M.top + innerH}px`, transformBox: 'view-box' }}
                  transition={{
                    duration: 0.6,
                    delay: i * (range === 'week' ? 0.04 : 0.012),
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  {segs.map((k, j) => {
                    const minutes = (d.bySubject.get(k.id ?? '') ?? 0) / 60_000;
                    const yTop = y(acc + minutes);
                    const yBottom = y(acc);
                    acc += minutes;
                    const isTop = j === segs.length - 1;
                    const h = Math.max(0, yBottom - yTop - (j > 0 ? GAP : 0));
                    return (
                      <path
                        key={k.id ?? 'none'}
                        d={
                          isTop
                            ? roundedTopRect(x0, yTop, bw, h, 4)
                            : `M${x0},${yTop}h${bw}v${h}h${-bw}Z`
                        }
                        fill={k.color}
                      />
                    );
                  })}
                </motion.g>
                {d.day === today ? (
                  <circle
                    cx={x0 + bw / 2}
                    cy={H - M.top - M.bottom + 6}
                    r={2}
                    className={s.todayDot}
                  />
                ) : null}
                {i % labelEvery === 0 || range === 'week' ? (
                  <text
                    x={x0 + bw / 2}
                    y={H - M.top - M.bottom + 20}
                    textAnchor="middle"
                    className={d.day === today ? s.axisStrong : s.axis}
                  >
                    {range === 'week' ? weekdayShort(d.day) : parseDay(d.day).getDate()}
                  </text>
                ) : null}
                {/* Зона наведения шире столбика */}
                <rect
                  x={x0 - (x.step() - bw) / 2}
                  y={0}
                  width={x.step()}
                  height={H - M.top - M.bottom}
                  fill="transparent"
                  onPointerEnter={() => {
                    setHover(i);
                  }}
                  onPointerDown={() => {
                    setHover(i);
                  }}
                />
              </g>
            );
          })}

          {goalMinutes ? (
            <g transform={`translate(0,${y(goalMinutes)})`} className={s.goal} pointerEvents="none">
              <line x2={innerW} />
              <text x={4} y={-6}>
                цель {compactDuration(goalMinutes * 60_000)}
              </text>
            </g>
          ) : null}
        </g>
      </svg>
      <Tooltip
        width={width}
        at={
          hovered && hover !== null
            ? { x: M.left + (x(hovered.day) ?? 0) + bw / 2, y: M.top + y(hovered.totalMs / 60_000) }
            : null
        }
      >
        {hovered ? (
          <>
            <TipTitle>{humanDate(hovered.day, true)}</TipTitle>
            {keys
              .filter((k) => (hovered.bySubject.get(k.id ?? '') ?? 0) > 0)
              .reverse()
              .map((k) => (
                <TipRow
                  key={k.id ?? 'none'}
                  color={k.color}
                  label={k.name}
                  value={duration(hovered.bySubject.get(k.id ?? '') ?? 0)}
                />
              ))}
            <TipRow label="Всего" value={duration(hovered.totalMs)} />
          </>
        ) : null}
      </Tooltip>
    </div>
  );

  const table = (
    <DataTable>
      <thead>
        <tr>
          <th>День</th>
          <th>Сессий</th>
          <th>Время</th>
        </tr>
      </thead>
      <tbody>
        {[...days].reverse().map((d) => (
          <tr key={d.day}>
            <td>{humanDate(d.day, true)}</td>
            <td>{d.count}</td>
            <td>{duration(d.totalMs)}</td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );

  return (
    <ChartFrame
      index="02"
      title="По дням"
      controls={
        <Segmented
          size="sm"
          label="Период графика"
          value={range}
          onChange={onRange}
          options={[
            { value: 'week', label: 'Неделя' },
            { value: 'month', label: 'Месяц' },
          ]}
        />
      }
      chart={chart}
      table={table}
      legend={
        keys.length > 1
          ? keys.map((k) => <LegendItem key={k.id ?? 'none'} color={k.color} label={k.name} />)
          : null
      }
    />
  );
}
