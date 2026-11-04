import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Suspense, useState } from 'react';
import { NavLink, useLocation, useOutlet } from 'react-router-dom';
import { AppHotkeys } from '@/app/AppHotkeys';
import { KeyboardHelp } from '@/app/KeyboardHelp';
import { NAV } from '@/app/nav';
import { UpdatePrompt } from '@/app/UpdatePrompt';
import { ui, useUi } from '@/app/uiStore';
import { FocusOverlay } from '@/features/timer/ui/FocusOverlay';
import { IconButton } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Toasts } from '@/ui/Toasts';
import s from '@/app/Layout.module.css';

const EASE = [0.16, 1, 0.3, 1] as const;

function Wordmark() {
  const reduce = useReducedMotion();
  const letters = 'Фокус'.split('');
  return (
    <NavLink to="/" className={s.brand ?? ''} aria-label="Фокус — на главную">
      <span className={s.mark} aria-hidden="true">
        <span className={s.markBar} />
        <span className={s.markNeedle} />
      </span>
      <span className={s.word} aria-hidden="true">
        {letters.map((l, i) => (
          <motion.span
            key={i}
            initial={reduce ? false : { y: '110%' }}
            animate={{ y: '0%' }}
            transition={{ duration: 0.7, delay: 0.1 + i * 0.05, ease: EASE }}
          >
            {l}
          </motion.span>
        ))}
      </span>
    </NavLink>
  );
}

function TopNav() {
  return (
    <nav className={s.topNav} aria-label="Разделы">
      <ul>
        {NAV.map((item, i) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => [s.topLink, isActive ? s.on : ''].join(' ')}
            >
              {({ isActive }) => (
                <>
                  <span className={s.index}>{String(i + 1).padStart(2, '0')}</span>
                  <span>{item.label}</span>
                  {isActive ? (
                    <motion.span
                      layoutId="nav-underline"
                      className={s.underline}
                      transition={{ type: 'spring', stiffness: 480, damping: 40 }}
                    />
                  ) : null}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function TabBar() {
  return (
    <nav className={s.tabBar} aria-label="Разделы">
      <ul>
        {NAV.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => [s.tab, isActive ? s.on : ''].join(' ')}
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <motion.span
                      layoutId="tab-indicator"
                      className={s.tabIndicator}
                      transition={{ type: 'spring', stiffness: 520, damping: 42 }}
                    />
                  ) : null}
                  <Icon name={item.icon} size={22} />
                  <span className={s.tabLabel}>{item.short}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const closeFocus = () => {
  ui.setFocus(false);
};

/** Замораживает текущую страницу, чтобы при уходе анимировалась именно она, а не новая. */
function FrozenOutlet() {
  const outlet = useOutlet();
  const [frozen] = useState(outlet);
  return frozen;
}

/** Анимированная смена страниц: старая уходит вверх, новая поднимается снизу. */
function AnimatedOutlet() {
  const location = useLocation();
  const reduce = useReducedMotion();
  const key = location.pathname.split('/')[1] ?? '';
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={key}
        className={s.page}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE } }}
        exit={
          reduce
            ? { opacity: 0 }
            : { opacity: 0, y: -8, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }
        }
      >
        <Suspense fallback={<div className={s.loading} aria-busy="true" />}>
          <FrozenOutlet />
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

export function Layout() {
  const location = useLocation();
  const focusMode = useUi((st) => st.focusMode);
  const current = NAV.find((n) =>
    n.to === '/' ? location.pathname === '/' : location.pathname.startsWith(n.to),
  );
  const index = current ? NAV.indexOf(current) + 1 : 0;
  return (
    <div className={s.shell}>
      <a className={s.skip} href="#content">
        К содержимому
      </a>
      <header className={s.header}>
        <Wordmark />
        <TopNav />
        <div className={s.meta}>
          <IconButton
            icon="keyboard"
            label="Горячие клавиши (?)"
            className={s.help}
            onClick={() => {
              ui.setHelp(true);
            }}
          />
          <span className="caps">
            {current
              ? `${String(index).padStart(2, '0')} / ${String(NAV.length).padStart(2, '0')}`
              : ''}
          </span>
        </div>
        <motion.span
          className={s.headerRule}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.1, ease: EASE }}
          aria-hidden="true"
        />
      </header>
      <main id="content" className={s.content} tabIndex={-1}>
        <AnimatedOutlet />
      </main>
      <TabBar />
      <Toasts />
      <AppHotkeys />
      <UpdatePrompt />
      <KeyboardHelp />
      <FocusOverlay open={focusMode} onClose={closeFocus} />
    </div>
  );
}
