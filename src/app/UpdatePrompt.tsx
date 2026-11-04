import { AnimatePresence, motion } from 'motion/react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/ui/Button';
import { toast } from '@/ui/toast';
import s from '@/app/UpdatePrompt.module.css';

/**
 * Service Worker: приложение работает офлайн. Новая версия не подменяется посреди
 * сессии — пользователь сам решает, когда обновиться.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onOfflineReady() {
      toast({
        kind: 'info',
        title: 'Работает без интернета',
        text: 'Фокус сохранён на устройстве.',
      });
    },
  });

  return (
    <AnimatePresence>
      {needRefresh ? (
        <motion.div
          role="status"
          className={s.bar}
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        >
          <span>Доступна новая версия</span>
          <span className={s.actions}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setNeedRefresh(false);
              }}
            >
              Позже
            </Button>
            <Button
              size="sm"
              variant="solid"
              onClick={() => {
                void updateServiceWorker(true);
              }}
            >
              Обновить
            </Button>
          </span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
