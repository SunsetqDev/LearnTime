import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { colorVar, NO_SUBJECT_COLOR } from '@/features/subjects/palette';
import { selectActive, useSubjects } from '@/features/subjects/store';
import { Icon } from '@/ui/Icon';
import s from '@/features/subjects/ui/SubjectPicker.module.css';

interface SubjectPickerProps {
  readonly value: string | null;
  readonly onChange: (id: string | null) => void;
  readonly disabled?: boolean;
}

interface Option {
  readonly id: string | null;
  readonly name: string;
  readonly color: string;
}

/**
 * Выпадающий список предметов по паттерну ARIA «listbox»: стрелки, Home/End,
 * поиск по первой букве, Enter — выбрать, Esc — закрыть с возвратом фокуса.
 */
export function SubjectPicker({ value, onChange, disabled = false }: SubjectPickerProps) {
  const subjects = useSubjects(selectActive);
  const all = useSubjects((st) => st.all);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const options: Option[] = [
    { id: null, name: 'Без предмета', color: NO_SUBJECT_COLOR },
    ...subjects.map((x) => ({ id: x.id, name: x.name, color: colorVar(x.color) })),
  ];
  const current = all.find((x) => x.id === value);
  const label = current?.name ?? 'Без предмета';
  const dot = current ? colorVar(current.color) : NO_SUBJECT_COLOR;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  const openList = () => {
    const index = Math.max(
      0,
      options.findIndex((o) => o.id === value),
    );
    setCursor(index);
    setOpen(true);
  };

  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  };

  const choose = (o: Option) => {
    onChange(o.id);
    close();
  };

  const onListKey = (e: KeyboardEvent) => {
    const last = options.length; // последний пункт — «Новый предмет»
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(last, c + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setCursor(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setCursor(last);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const o = options[cursor];
      if (o) choose(o);
      else navigate('/subjects?new=1');
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      close();
    } else if (e.key.length === 1) {
      const ch = e.key.toLocaleLowerCase('ru');
      const found = options.findIndex(
        (o, i) => i > 0 && o.name.toLocaleLowerCase('ru').startsWith(ch),
      );
      if (found >= 0) setCursor(found);
    }
  };

  return (
    <div className={s.root} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={s.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`Предмет: ${label}`}
        disabled={disabled}
        onClick={() => {
          if (open) close();
          else openList();
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            openList();
          }
        }}
      >
        <span className={s.dot} style={{ background: dot }} aria-hidden="true" />
        <span className={s.name}>{label}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className={s.chev}
        >
          <Icon name="chevronDown" size={16} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className={s.popover}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              tabIndex={-1}
              aria-label="Предмет сессии"
              aria-activedescendant={`${listId}-${cursor}`}
              className={s.list}
              onKeyDown={onListKey}
            >
              {options.map((o, i) => (
                <li
                  key={o.id ?? 'none'}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={o.id === value}
                  className={[s.option, i === cursor ? s.cursor : ''].join(' ')}
                  onPointerMove={() => {
                    setCursor(i);
                  }}
                  onClick={() => {
                    choose(o);
                  }}
                >
                  <span className={s.dot} style={{ background: o.color }} aria-hidden="true" />
                  <span className={s.optName}>{o.name}</span>
                  {o.id === value ? <Icon name="check" size={16} /> : null}
                </li>
              ))}
              <li
                id={`${listId}-${options.length}`}
                role="option"
                aria-selected={false}
                className={[s.option, s.create, cursor === options.length ? s.cursor : ''].join(
                  ' ',
                )}
                onPointerMove={() => {
                  setCursor(options.length);
                }}
                onClick={() => {
                  navigate('/subjects?new=1');
                }}
              >
                <Icon name="plus" size={16} />
                <span className={s.optName}>Новый предмет</span>
              </li>
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
