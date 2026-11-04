import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from '@/ui/Button';
import { IconButton } from '@/ui/Button';
import s from '@/ui/Dialog.module.css';

interface DialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly description?: string;
  readonly children?: ReactNode;
  readonly footer?: ReactNode;
  readonly size?: 'sm' | 'md';
}

/**
 * Модальное окно на нативном <dialog>: ловушка фокуса, Esc и inert-фон — от браузера.
 * На телефоне выезжает снизу листом, на десктопе появляется по центру.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'sm',
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={[s.dialog, s[size]].join(' ')}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Клик по подложке (вне содержимого) закрывает окно.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={s.body}>
        <header className={s.head}>
          <h2 id={titleId} className={s.title}>
            {title}
          </h2>
          <IconButton icon="close" label="Закрыть" onClick={onClose} />
        </header>
        {description ? (
          <p id={descId} className={s.desc}>
            {description}
          </p>
        ) : null}
        {children}
        {footer ? <footer className={s.foot}>{footer}</footer> : null}
      </div>
    </dialog>
  );
}

interface ConfirmProps {
  readonly open: boolean;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly tone?: 'danger' | 'default';
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = 'default',
  onConfirm,
  onCancel,
}: ConfirmProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Отмена
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'solid'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
