import { max } from 'd3-array';
import { scaleBand, scaleLinear } from 'd3-scale';
import { area, curveMonotoneX } from 'd3-shape';
import { motion } from 'motion/react';
import { useState } from 'react';
import { BEST_WINDOW, type HourProfile } from '@/features/stats/model/aggregate';
import { ChartFrame, DataTable } from '@/features/stats/charts/ChartFrame';
import { roundedTopRect } from '@/features/stats/charts/geometry';
import { TipRow, TipTitle, Tooltip } from '@/features/stats/charts/Tooltip';
import { useWidth } from '@/features/stats/charts/useWidth';
import { duration } from '@/lib/format';
import s from '@/features/stats/charts/charts.module.css';

const H = 180;
const M = { top: 28, right: 0, bottom: 24, left: 0 };
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const hh = (h: number) => `${String(h % 24).padStart(2, '0')}:00`;

/** Когда вы учитесь: минуты по часу начала сессии + подсвеченное лучшее трёхчасовое окно. */
export function HourBars({ profile }: { readonly profile: HourProfile }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const innerW = width - M.left - M.right;
  const innerH = H - M.top - M.bottom;
  const x = scaleBand<number>().domain(HOURS).range([0, innerW]).paddingInner(0.3);
  const y = scaleLinear()
    .domain([0, Math.max(10, max(profile.hours) ?? 0)])
    .range([innerH, 0]);
  const bw = x.bandwidth();

  // Сглаженный силуэт за столбиками — общий ритм дня читается с первого взгляда.
  const silhouette =
    area<number>()
      .x((h) => (x(h) ?? 0) + bw / 2)
      .y0(innerH)
      .y1((h) => y(profile.hours[h] ?? 0))
      .curve(curveMonotoneX)(HOURS) ?? '';

  const best = profile.bestStart;
  const bandX = best === null ? 0 : (x(best) ?? 0) - (x.step() - bw) / 2;
  const bandW = x.step() * BEST_WINDOW;

  const chart = (
    <div
      ref={ref}
      className={s.wrap}
      onPointerLeave={() => {
        setHover(null);
      }}
    >
      <svg width={width} height={H} role="img" aria-label="Распределение учёбы по часам суток">
        <g transform={`translate(${M.left},${M.top})`}>
          {best !== null && best + BEST_WINDOW <= 24 ? (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <rect
                x={bandX}
                y={-M.top + 4}
                width={bandW}
                height={innerH + M.top - 4}
                className={s.bestBand}
                rx={4}
              />
              <text x={bandX + 6} y={-M.top + 18} className={s.bestLabel}>
                лучшее время
              </text>
            </motion.g>
          ) : null}
          <path d={silhouette} fill="var(--ink)" opacity={0.05} />
          <line x2={innerW} y1={innerH} y2={innerH} className={s.baseline} />
          {HOURS.map((h) => {
            const v = profile.hours[h] ?? 0;
            const x0 = x(h) ?? 0;
            const inBest = best !== null && h >= best && h < best + BEST_WINDOW;
            return (
              <g key={h} opacity={hover === null || hover === h ? 1 : 0.5} className={s.barGroup}>
                <motion.path
                  d={roundedTopRect(x0, y(v), bw, innerH - y(v), 3)}
                  fill={inBest ? 'var(--c-focus)' : 'var(--ink-3)'}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  style={{ transformOrigin: `0px ${M.top + innerH}px`, transformBox: 'view-box' }}
                  transition={{ duration: 0.6, delay: h * 0.02, ease: [0.16, 1, 0.3, 1] }}
                />
                {h % (width < 520 ? 6 : 3) === 0 ? (
                  <text x={x0 + bw / 2} y={innerH + 16} textAnchor="middle" className={s.axis}>
                    {String(h).padStart(2, '0')}
                  </text>
                ) : null}
                <rect
                  x={x0 - (x.step() - bw) / 2}
                  width={x.step()}
                  y={-M.top}
                  height={H}
                  fill="transparent"
                  onPointerEnter={() => {
                    setHover(h);
                  }}
                  onPointerDown={() => {
                    setHover(h);
                  }}
                />
              </g>
            );
          })}
        </g>
      </svg>
      <Tooltip
        width={width}
        at={
          hover === null
            ? null
            : { x: M.left + (x(hover) ?? 0) + bw / 2, y: M.top + y(profile.hours[hover] ?? 0) }
        }
      >
        {hover === null ? null : (
          <>
            <TipTitle>
              {hh(hover)}–{hh(hover + 1)}
            </TipTitle>
            <TipRow
              label="Начато сессий на"
              value={duration((profile.hours[hover] ?? 0) * 60_000)}
            />
          </>
        )}
      </Tooltip>
    </div>
  );

  const table = (
    <DataTable>
      <thead>
        <tr>
          <th>Час</th>
          <th>Время</th>
        </tr>
      </thead>
      <tbody>
        {HOURS.filter((h) => (profile.hours[h] ?? 0) > 0).map((h) => (
          <tr key={h}>
            <td>
              {hh(h)}–{hh(h + 1)}
            </td>
            <td>{duration((profile.hours[h] ?? 0) * 60_000)}</td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );

  return (
    <ChartFrame
      index="05"
      title="Лучшее время для учёбы"
      note={
        best === null
          ? 'Нужно хотя бы 5 сессий, чтобы увидеть закономерность.'
          : `Чаще всего вы учитесь с ${hh(best)} до ${hh(best + BEST_WINDOW)} — ${Math.round(profile.bestShare * 100)}% всего времени. Сложные темы стоит ставить сюда.`
      }
      chart={chart}
      table={table}
    />
  );
}
