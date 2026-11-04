import { AnimatePresence, motion, useTransform } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { remainingMs } from '@/features/timer/model/machine';
import { useNow } from '@/features/timer/now';
import { timerActions, useTimer } from '@/features/timer/store';
import { Readout } from '@/features/timer/ui/Readout';
import { useProgress } from '@/features/timer/ui/useProgress';
import { clock, MODE_LABEL } from '@/lib/format';
import s from '@/features/timer/ui/FocusOverlay.module.css';

interface FocusOverlayProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

/**
 * Режим полного фокуса: остаётся только время и тонкая линия прогресса.
 * Браузер переводится в полноэкранный режим, курсор прячется через 2 секунды покоя.
 */
export function FocusOverlay({ open, onClose }: FocusOverlayProps) {
  return createPortal(
    <AnimatePresence>{open ? <Overlay onClose={onClose} /> : null}</AnimatePresence>,
    document.body,
  );
}

function Overlay({ onClose }: { readonly onClose: () => void }) {
  const machine = useTimer((st) => st.machine);
  const now = useNow();
  const progress = useProgress();
  const width = useTransform(progress, (p) => `scaleX(${p})`);
  const [idle, setIdle] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    el?.focus();
    if (document.fullscreenEnabled && !document.fullscreenElement) {
      void document.documentElement.requestFullscreen().catch(() => undefined);
    }
    // Вышли из полноэкранного режима кнопкой браузера — выходим и из фокуса.
    const onFs = () => {
      if (!document.fullscreenElement) onClose();
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, [onClose]);

  useEffect(() => {
    let t = window.setTimeout(() => {
      setIdle(true);
    }, 2000);
    const wake = () => {
      setIdle(false);
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        setIdle(true);
      }, 2000);
    };
    window.addEventListener('pointermove', wake);
    return () => {
      window.removeEventListener('pointermove', wake);
      window.clearTimeout(t);
    };
  }, []);

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Режим полного фокуса"
      tabIndex={-1}
      className={[s.root, idle ? s.idle : ''].join(' ')}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onDoubleClick={onClose}
    >
      <motion.div
        className={s.center}
        initial={{ scale: 0.94, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="caps">
          {MODE_LABEL[machine.mode]}
          {machine.phase === 'paused' ? ' · пауза' : ''}
        </span>
        <button
          type="button"
          className={s.time}
          onClick={timerActions.toggle}
          aria-label={`${clock(remainingMs(machine, now))}. Нажмите, чтобы ${machine.phase === 'running' ? 'поставить на паузу' : 'продолжить'}`}
        >
          <Readout
            value={clock(remainingMs(machine, now))}
            size="focus"
            dim={machine.phase === 'paused'}
          />
        </button>
      </motion.div>
      <div className={s.track} aria-hidden="true">
        <motion.div className={s.fill} style={{ transform: width }} />
      </div>
      <p className={s.hint}>
        <span>Пробел — пауза</span>
        <button type="button" onClick={onClose} className={s.exit}>
          Esc — выйти
        </button>
      </p>
    </motion.div>
  );
}
