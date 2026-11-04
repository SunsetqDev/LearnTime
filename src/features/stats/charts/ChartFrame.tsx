import { AnimatePresence, motion } from 'motion/react';
import { useId, useState, type ReactNode } from 'react';
import s from '@/features/stats/charts/ChartFrame.module.css';

interface ChartFrameProps {
  readonly index: string;
  readonly title: string;
  readonly note?: ReactNode;
  readonly controls?: ReactNode;
  readonly chart: ReactNode;
  /** Та же информация таблицей — для скринридеров, печати и тех, кому так удобнее. */
  readonly table: ReactNode;
  readonly legend?: ReactNode;
  readonly className?: string | undefined;
}

/** Секция аналитики: номер, заголовок, управление, график ⇄ таблица. Без карточек и теней — только линии. */
export function ChartFrame({
  index,
  title,
  note,
  controls,
  chart,
  table,
  legend,
  className,
}: ChartFrameProps) {
  const [asTable, setAsTable] = useState(false);
  const id = useId();
  return (
    <section className={[s.frame, className ?? ''].join(' ')} aria-labelledby={id}>
      <header className={s.head}>
        <div className={s.titles}>
          <span className={s.index}>{index}</span>
          <h2 id={id} className={s.title}>
            {title}
          </h2>
        </div>
        <div className={s.controls}>
          {controls}
          <button
            type="button"
            className={s.view}
            aria-pressed={asTable}
            onClick={() => {
              setAsTable((v) => !v);
            }}
          >
            {asTable ? 'График' : 'Таблица'}
          </button>
        </div>
      </header>
      {note ? <p className={s.note}>{note}</p> : null}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={asTable ? 'table' : 'chart'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className={s.body}
        >
          {asTable ? <div className={s.tableWrap}>{table}</div> : chart}
        </motion.div>
      </AnimatePresence>
      {legend && !asTable ? <div className={s.legend}>{legend}</div> : null}
    </section>
  );
}

export function LegendItem({ color, label }: { readonly color: string; readonly label: string }) {
  return (
    <span className={s.legendItem}>
      <span className={s.legendSwatch} style={{ background: color }} aria-hidden="true" />
      {label}
    </span>
  );
}

export function DataTable({ children }: { readonly children: ReactNode }) {
  return <table className={s.table}>{children}</table>;
}
