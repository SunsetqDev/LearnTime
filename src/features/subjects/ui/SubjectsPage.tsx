import { AnimatePresence, motion, Reorder, useDragControls } from 'motion/react';
import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSessions } from '@/features/sessions/store';
import { colorVar, PRESET_SUBJECTS } from '@/features/subjects/palette';
import { selectActive, selectArchived, subjectsRepo, useSubjects } from '@/features/subjects/store';
import { SubjectEditor } from '@/features/subjects/ui/SubjectEditor';
import type { SubjectRecord } from '@/lib/db';
import { duration, plural } from '@/lib/format';
import { Button, IconButton } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { Icon } from '@/ui/Icon';
import { PageHeader } from '@/ui/PageHeader';
import s from '@/features/subjects/ui/SubjectsPage.module.css';

interface Totals {
  readonly ms: number;
  readonly count: number;
}

function useTotals(): Map<string, Totals> {
  const sessions = useSessions((st) => st.all);
  return useMemo(() => {
    const map = new Map<string, Totals>();
    for (const x of sessions) {
      if (!x.subjectId) continue;
      const t = map.get(x.subjectId) ?? { ms: 0, count: 0 };
      map.set(x.subjectId, { ms: t.ms + x.actualMs, count: t.count + 1 });
    }
    return map;
  }, [sessions]);
}

interface RowProps {
  readonly subject: SubjectRecord;
  readonly totals: Totals | undefined;
  readonly max: number;
  readonly index: number;
  readonly count: number;
  readonly onEdit: () => void;
  readonly onMove: (delta: number) => void;
  readonly onDrop: () => void;
}

function SubjectRow({ subject, totals, max, index, count, onEdit, onMove, onDrop }: RowProps) {
  const controls = useDragControls();
  const share = max > 0 && totals ? totals.ms / max : 0;
  return (
    <Reorder.Item
      value={subject}
      dragListener={false}
      dragControls={controls}
      className={s.row}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16, transition: { duration: 0.2 } }}
      whileDrag={{ scale: 1.01, backgroundColor: 'var(--paper-raised)' }}
      onDragEnd={onDrop}
    >
      <button
        type="button"
        className={s.handle}
        aria-label={`Переместить «${subject.name}». Alt + стрелки — с клавиатуры`}
        onPointerDown={(e) => {
          controls.start(e);
        }}
        onKeyDown={(e) => {
          if (!e.altKey) return;
          if (e.key === 'ArrowUp' && index > 0) {
            e.preventDefault();
            onMove(-1);
          }
          if (e.key === 'ArrowDown' && index < count - 1) {
            e.preventDefault();
            onMove(1);
          }
        }}
      >
        <svg width="12" height="16" viewBox="0 0 12 16" aria-hidden="true">
          {[3, 8, 13].map((y) => (
            <g key={y} fill="currentColor">
              <circle cx="3" cy={y} r="1.2" />
              <circle cx="9" cy={y} r="1.2" />
            </g>
          ))}
        </svg>
      </button>
      <span
        className={s.swatch}
        style={{ background: colorVar(subject.color) }}
        aria-hidden="true"
      />
      <div className={s.main}>
        <span className={s.name}>{subject.name}</span>
        <span className={s.share} aria-hidden="true">
          <motion.span
            className={s.shareFill}
            style={{ background: colorVar(subject.color), transformOrigin: 'left' }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: share }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 + index * 0.04 }}
          />
        </span>
      </div>
      <span className={s.stat}>
        <span className="num">{duration(totals?.ms ?? 0)}</span>
        <span className={s.statNote}>
          {totals?.count ?? 0} {plural(totals?.count ?? 0, ['сессия', 'сессии', 'сессий'])}
        </span>
      </span>
      <div className={s.actions}>
        <IconButton icon="edit" label={`Изменить «${subject.name}»`} onClick={onEdit} />
        <IconButton
          icon="archive"
          label={`В архив «${subject.name}»`}
          onClick={() => {
            void subjectsRepo.setArchived(subject.id, true);
          }}
        />
      </div>
    </Reorder.Item>
  );
}

export default function SubjectsPage() {
  const active = useSubjects(selectActive);
  const archived = useSubjects(selectArchived);
  const ready = useSubjects((st) => st.ready);
  const totals = useTotals();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<SubjectRecord | null>(null);
  const [creatingLocal, setCreatingLocal] = useState(false);
  const creating = creatingLocal || params.get('new') === '1';
  const [showArchive, setShowArchive] = useState(false);

  /**
   * Порядок при перетаскивании держим как список id поверх данных из базы:
   * пока запись в IndexedDB не вернулась, список не «прыгает» назад.
   * Если набор предметов изменился (добавили, убрали в архив) — черновик игнорируется.
   */
  const [draft, setDraft] = useState<readonly string[] | null>(null);
  const draftRef = useRef<readonly string[] | null>(null);
  const order = useMemo(() => {
    if (!draft || draft.length !== active.length) return [...active];
    const byId = new Map(active.map((x) => [x.id, x]));
    const mapped = draft.map((id) => byId.get(id));
    return mapped.every(Boolean) ? (mapped as SubjectRecord[]) : [...active];
  }, [draft, active]);

  const setOrder = (next: readonly SubjectRecord[]) => {
    const ids = next.map((x) => x.id);
    draftRef.current = ids;
    setDraft(ids);
  };

  const closeEditor = () => {
    setCreatingLocal(false);
    setEditing(null);
    if (params.has('new')) {
      params.delete('new');
      setParams(params, { replace: true });
    }
  };

  const max = Math.max(0, ...active.map((x) => totals.get(x.id)?.ms ?? 0));
  const commitOrder = (ids: readonly string[] | null) => {
    if (ids) void subjectsRepo.reorder(ids);
  };
  const move = (index: number, delta: number) => {
    const next = [...order];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(index + delta, 0, item);
    setOrder(next);
    commitOrder(next.map((x) => x.id));
  };

  const presetsLeft = PRESET_SUBJECTS.filter(
    (p) => !active.some((x) => x.name.toLocaleLowerCase('ru') === p.toLocaleLowerCase('ru')),
  );

  return (
    <div className={s.page}>
      <PageHeader
        index="03"
        title="Предметы"
        lead="Время каждой сессии привязывается к предмету — так видно, куда уходят часы подготовки."
        actions={
          <Button
            variant="solid"
            icon="plus"
            onClick={() => {
              setCreatingLocal(true);
            }}
          >
            Новый предмет
          </Button>
        }
      />

      {ready && active.length === 0 ? (
        <EmptyState
          art="subjects"
          title="Добавьте первый предмет"
          text="Начните с готовых — их можно переименовать и перекрасить в любой момент."
        />
      ) : null}

      {order.length > 0 ? (
        <Reorder.Group axis="y" values={order} onReorder={setOrder} className={s.list} as="ol">
          <AnimatePresence initial={false}>
            {order.map((x, i) => (
              <SubjectRow
                key={x.id}
                subject={x}
                totals={totals.get(x.id)}
                max={max}
                index={i}
                count={order.length}
                onEdit={() => {
                  setEditing(x);
                }}
                onMove={(d) => {
                  move(i, d);
                }}
                onDrop={() => {
                  commitOrder(draftRef.current);
                }}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      ) : null}

      {presetsLeft.length > 0 ? (
        <section className={s.presets} aria-label="Быстрое добавление">
          <span className="caps">Быстро добавить</span>
          <div className={s.chips}>
            {presetsLeft.map((p) => (
              <motion.button
                key={p}
                type="button"
                className={s.chip}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  void subjectsRepo.create(p);
                }}
              >
                <Icon name="plus" size={14} />
                {p}
              </motion.button>
            ))}
          </div>
        </section>
      ) : null}

      {archived.length > 0 ? (
        <section className={s.archive}>
          <button
            type="button"
            className={s.archiveToggle}
            aria-expanded={showArchive}
            onClick={() => {
              setShowArchive((v) => !v);
            }}
          >
            <span className="caps">Архив · {archived.length}</span>
            <motion.span animate={{ rotate: showArchive ? 90 : 0 }}>
              <Icon name="chevronRight" size={16} />
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {showArchive ? (
              <motion.ul
                className={s.archiveList}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                {archived.map((x) => (
                  <li key={x.id} className={s.archivedRow}>
                    <span
                      className={s.swatch}
                      style={{ background: colorVar(x.color) }}
                      aria-hidden="true"
                    />
                    <span className={s.name}>{x.name}</span>
                    <span className={s.statNote}>{duration(totals.get(x.id)?.ms ?? 0)}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="unarchive"
                      onClick={() => {
                        void subjectsRepo.setArchived(x.id, false);
                      }}
                    >
                      Вернуть
                    </Button>
                  </li>
                ))}
              </motion.ul>
            ) : null}
          </AnimatePresence>
          <p className={s.archiveNote}>
            Предметы не удаляются: история и статистика по ним сохраняются.
          </p>
        </section>
      ) : null}

      <SubjectEditor open={creating || editing !== null} subject={editing} onClose={closeEditor} />
    </div>
  );
}
