import { motion } from 'motion/react';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from '@/ui/Icon';
import s from '@/ui/Button.module.css';

type Variant = 'solid' | 'mode' | 'line' | 'ghost' | 'danger';
type Size = 'md' | 'lg' | 'sm';

type NativeProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationEnd' | 'style'
>;

interface ButtonProps extends NativeProps {
  readonly variant?: Variant;
  readonly size?: Size;
  readonly icon?: IconName;
  readonly trailing?: ReactNode;
  readonly block?: boolean;
}

/** Кнопка с тактильным нажатием: короткое «проседание» и возврат на пружине. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'line',
    size = 'md',
    icon,
    trailing,
    block = false,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      className={[s.btn, s[variant], s[size], block ? s.block : '', className ?? ''].join(' ')}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 700, damping: 30 }}
      {...rest}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} /> : null}
      {children ? <span className={s.label}>{children}</span> : null}
      {trailing}
    </motion.button>
  );
});

interface IconButtonProps extends NativeProps {
  readonly icon: IconName;
  readonly label: string;
  readonly variant?: 'ghost' | 'line';
  readonly size?: number;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = 'ghost', size = 20, className, type = 'button', ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={[s.iconBtn, s[variant], className ?? ''].join(' ')}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 700, damping: 30 }}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </motion.button>
  );
});
