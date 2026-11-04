import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Heatmap as HeatmapData, HeatCell } from '@/features/stats/model/aggregate';
import { ChartFrame, DataTable } from '@/features/stats/charts/ChartFrame';
import { TipRow, TipTitle, Tooltip } from '@/features/stats/charts/Tooltip';
import { useWidth } from '@/features/stats/charts/useWidth';
import { duration } from '@/lib/format';
import { humanDate, monthShort, parseDay } from '@/lib/time';
import s from '@/features/stats/charts/charts.module.css';

const GAP = 3;
const LEFT = 26;
const TOP = 18;
const WEEKDAY_LABELS = ['пн', '', 'ср', '', 'пт', '', ''] as const;

interface HeatmapProps {
  readonly data: HeatmapData;
  readonly activeDays: number;
}

/** Год активности: колонки — недели, строки — дни недели. Уровень — личный перцентиль. */
export function Heatmap({ data, activeDays }: HeatmapProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [boxRef, boxWidth] = useWidth<HTMLDivElement>(900);
  // Ячейка растягивается на всю ширину секции, но не меньше 10 и не больше 18 px.
  const CELL = Math.max(10, Math.min(18, Math.floor((boxWidth - LEFT) / data.weeks.length) - GAP));
  const STEP = CELL + GAP;
  const [hover, setHover] = useState<{
    cell: HeatCell;
    x: number;
    y: number;
    viewW: number;
  } | null>(null);
  const width = LEFT + data.weeks.length * STEP;
  const height = TOP + 7 * STEP;

  // Подписи месяцев над первой неделей, где начинается месяц.
  const months = useMemo(() => {
    const out: { col: number; label: string }[] = [];
    let prev = -1;
    data.weeks.forEach((week, col) => {
      const first = week[0];
      if (!first) return;
      const m = parseDay(first.day).getMonth();
      if (m !== prev) {
        if (col > 0 || parseDay(first.day).getDate() <= 7) out.push({ col, label: monthShort(m) });
        prev = m;
      }
    });
    return out.filter((m, i, arr) => i === 0 || m.col - (arr[i - 1]?.col ?? 0) >= 3);
  }, [data.weeks]);

  // На телефоне начинаем с правого края — с текущей недели.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of data.weeks.flat()) {
      if (c.future) continue;
      const key = c.day.slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + c.ms);
    }
    return [...map.entries()].reverse();
  }, [data.weeks]);

  const chart = (
    <div className={s.wrap} ref={boxRef}>
      <div
        className={s.heatScroll}
        ref={scrollRef}
        onPointerLeave={() => {
          setHover(null);
        }}
      >
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Тепловая карта за год: ${activeDays} активных дней`}
        >
          {months.map((m) => (
            <text key={m.col} x={LEFT + m.col * STEP} y={10} className={s.axis}>
              {m.label}
            </text>
          ))}
          {WEEKDAY_LABELS.map((l, i) =>
            l ? (
              <text key={i} x={0} y={TOP + i * STEP + CELL - 2} className={s.axis}>
                {l}
              </text>
            ) : null,
          )}
          {data.weeks.map((week, col) =>
            week.map((cell, row) => (
              <rect
                key={cell.day}
                x={LEFT + col * STEP}
                y={TOP + row * STEP}
                width={CELL}
                height={CELL}
                rx={2}
                data-level={cell.level}
                data-future={cell.future}
                className={[s.cell, hover?.cell.day === cell.day ? s.cellActive : ''].join(' ')}
                style={{ '--col': col } as CSSProperties}
                onPointerEnter={() => {
                  const el = scrollRef.current;
                  if (cell.future || !el) return;
                  setHover({
                    cell,
                    x: LEFT + col * STEP + CELL / 2 - el.scrollLeft,
                    y: TOP + row * STEP,
                    viewW: Math.min(width, el.clientWidth),
                  });
                }}
              />
            )),
          )}
        </svg>
      </div>
      <Tooltip width={hover?.viewW ?? width} at={hover ? { x: hover.x, y: hover.y } : null}>
        {hover ? (
          <>
            <TipTitle>{humanDate(hover.cell.day, true)}</TipTitle>
            <TipRow label="Учёба" value={hover.cell.ms > 0 ? duration(hover.cell.ms) : 'нет'} />
          </>
        ) : null}
      </Tooltip>
    </div>
  );

  const table = (
    <DataTable>
      <thead>
        <tr>
          <th>Месяц</th>
          <th>Время</th>
        </tr>
      </thead>
      <tbody>
        {monthly.map(([key, ms]) => (
          <tr key={key}>
            <td>
              {monthShort(Number(key.slice(5)) - 1)} {key.slice(0, 4)}
            </td>
            <td>{duration(ms)}</td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );

  return (
    <ChartFrame
      index="04"
      title="Год активности"
      note={`${activeDays} активных дней. Цвет — насколько день насыщенный относительно ваших обычных дней.`}
      chart={chart}
      table={table}
      legend={
        <span className={s.heatLegend} aria-hidden="true">
          <span>меньше</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <svg key={l} width={11} height={11}>
              <rect
                width={11}
                height={11}
                rx={2}
                data-level={l}
                className={s.cell}
                style={{ animation: 'none' }}
              />
            </svg>
          ))}
          <span>больше</span>
        </span>
      }
    />
  );
}
