import { AnimatePresence, motion } from 'motion/react';
import { useSettings } from '@/features/settings/store';
import { IconButton } from '@/ui/Button';
import { Kbd } from '@/ui/Kbd';
import s from '@/features/timer/ui/Onboarding.module.css';

const STEPS = [
  { title: 'Выберите предмет', text: 'Справа сверху. Время сессии запишется на него.' },
  {
    title: 'Нажмите «Начать учёбу»',
    text: 'Шкала покажет, сколько прошло. Пауза — той же кнопкой или Пробелом.',
  },
  {
    title: 'Следите за планом',
    text: 'После 25 минут учёбы — короткий перерыв, после четырёх — длинный.',
  },
] as const;

/** Подсказка при первом визите: три шага одной строкой, закрывается навсегда. */
export function Onboarding() {
  const done = useSettings((s) => s.onboardingDone);
  const update = useSettings((s) => s.update);
  return (
    <AnimatePresence initial={false}>
      {!done ? (
        <motion.aside
          className={s.root}
          aria-label="Как пользоваться"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={s.inner}>
            <ol className={s.steps}>
              {STEPS.map((step, i) => (
                <motion.li
                  key={step.title}
                  className={s.step}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.1, duration: 0.4 }}
                >
                  <span className={s.num}>{String(i + 1).padStart(2, '0')}</span>
                  <span className={s.copy}>
                    <span className={s.title}>{step.title}</span>
                    <span className={s.text}>{step.text}</span>
                  </span>
                </motion.li>
              ))}
            </ol>
            <div className={s.side}>
              <span className={s.keys}>
                Все клавиши — <Kbd>?</Kbd>
              </span>
              <IconButton
                icon="close"
                label="Понятно, скрыть подсказку"
                onClick={() => {
                  update({ onboardingDone: true });
                }}
              />
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
