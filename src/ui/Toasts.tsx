import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@/ui/Icon';
import { dismissToast, useToasts } from '@/ui/toast';
import s from '@/ui/Toasts.module.css';

/** Короткие уведомления внизу экрана: новое достижение, выполненная цель. */
export function Toasts() {
  const items = useToasts((st) => st.items);
  return (
    <div className={s.viewport} role="region" aria-label="Уведомления" aria-live="polite">
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            className={[s.toast, s[t.kind]].join(' ')}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          >
            <span className={s.mark} aria-hidden="true">
              <Icon
                name={t.kind === 'achievement' ? 'medal' : t.kind === 'goal' ? 'target' : 'info'}
                size={18}
              />
            </span>
            <span className={s.copy}>
              <span className={s.title}>{t.title}</span>
              {t.text ? <span className={s.text}>{t.text}</span> : null}
            </span>
            <button
              type="button"
              className={s.close}
              aria-label="Закрыть уведомление"
              onClick={() => {
                dismissToast(t.id);
              }}
            >
              <Icon name="close" size={16} />
            </button>
            <motion.span
              className={s.timer}
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 5.2, ease: 'linear' }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
