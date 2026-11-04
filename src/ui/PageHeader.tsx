import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import s from '@/ui/PageHeader.module.css';

interface PageHeaderProps {
  readonly index: string;
  readonly title: string;
  readonly lead?: ReactNode;
  readonly actions?: ReactNode;
}

const EASE = [0.16, 1, 0.3, 1] as const;

/** Заголовок раздела в духе студийного сайта: номер, крупное слово, короткий лид и линия. */
export function PageHeader({ index, title, lead, actions }: PageHeaderProps) {
  return (
    <header className={s.root}>
      <div className={s.row}>
        <div className={s.titles}>
          <span className={s.index}>{index} —</span>
          <h1 className={s.title}>
            <motion.span
              className={s.titleInner}
              initial={{ y: '105%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 0.7, ease: EASE }}
            >
              {title}
            </motion.span>
          </h1>
        </div>
        {actions ? <div className={s.actions}>{actions}</div> : null}
      </div>
      {lead ? (
        <motion.p
          className={s.lead}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
        >
          {lead}
        </motion.p>
      ) : null}
    </header>
  );
}
