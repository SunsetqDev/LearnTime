import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import s from '@/ui/Field.module.css';

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  readonly label: string;
  readonly hint?: ReactNode;
  readonly error?: string | null;
  readonly counter?: boolean;
  readonly hideLabel?: boolean;
}

/** Поле ввода «на линейке»: без рамки-коробки, только нижняя линия, которая окрашивается при фокусе. */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  {
    label,
    hint,
    error,
    counter = false,
    hideLabel = false,
    className,
    id,
    maxLength,
    value,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  const length = typeof value === 'string' ? value.length : 0;
  return (
    <div className={[s.root, error ? s.invalid : '', className ?? ''].join(' ')}>
      <div className={s.top}>
        <label htmlFor={inputId} className={hideLabel ? 'sr-only' : 'caps'}>
          {label}
        </label>
        {counter && maxLength ? (
          <span className={s.counter} aria-hidden="true">
            {length}/{maxLength}
          </span>
        ) : null}
      </div>
      <input
        ref={ref}
        id={inputId}
        className={s.input}
        maxLength={maxLength}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? hintId : undefined}
        {...rest}
      />
      <span className={s.line} aria-hidden="true" />
      {error || hint ? (
        <p id={hintId} className={error ? s.error : s.hint}>
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
});
