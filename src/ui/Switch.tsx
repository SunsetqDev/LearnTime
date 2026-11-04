import { motion } from 'motion/react';
import { useId, type ReactNode } from 'react';
import s from '@/ui/Switch.module.css';

interface SwitchProps {
  readonly checked: boolean;
  readonly onChange: (v: boolean) => void;
  readonly label: string;
  readonly hint?: ReactNode;
  readonly disabled?: boolean;
}

/** Переключатель-строка настроек: подпись слева, тумблер справа, вся строка кликабельна. */
export function Switch({ checked, onChange, label, hint, disabled = false }: SwitchProps) {
  const id = useId();
  return (
    <div className={s.row}>
      <label htmlFor={id} className={s.text}>
        <span className={s.label}>{label}</span>
        {hint ? <span className={s.hint}>{hint}</span> : null}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={[s.switch, checked ? s.on : ''].join(' ')}
        onClick={() => {
          onChange(!checked);
        }}
      >
        <motion.span
          className={s.knob}
          animate={{ x: checked ? 18 : 0 }}
          transition={{ type: 'spring', stiffness: 700, damping: 36 }}
        />
      </button>
    </div>
  );
}
