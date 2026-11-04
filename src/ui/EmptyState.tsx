import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import s from '@/ui/EmptyState.module.css';

type Art = 'sessions' | 'subjects' | 'search' | 'chart';

/** Линейные иллюстрации пустых состояний — в той же «приборной» графике, что и шкала. */
function Illustration({ art }: { readonly art: Art }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.25 } as const;
  return (
    <svg viewBox="0 0 160 96" width="160" height="96" aria-hidden="true" className={s.art}>
      {art === 'sessions' ? (
        <g {...common}>
          <path d="M8 60h144" className={s.faint} />
          {Array.from({ length: 15 }, (_, i) => (
            <path key={i} d={`M${8 + i * 10.28} 66v${i % 5 === 0 ? 10 : 5}`} className={s.faint} />
          ))}
          <path d="M8 60h52" className={s.accent} strokeWidth={2.5} />
          <path d="M60 30v34" className={s.ink} />
          <circle cx="60" cy="28" r="3" className={s.accentFill} />
        </g>
      ) : null}
      {art === 'subjects' ? (
        <g {...common}>
          {[20, 40, 60].map((y, i) => (
            <g key={y}>
              <rect
                x="28"
                y={y - 6}
                width="8"
                height="8"
                className={i === 0 ? s.accentFill : s.faint}
              />
              <path
                d={`M46 ${y - 2}h${i === 0 ? 70 : 86 - i * 14}`}
                className={i === 0 ? s.ink : s.faint}
              />
            </g>
          ))}
          <path d="M128 70v16M120 78h16" className={s.accent} strokeWidth={1.75} />
        </g>
      ) : null}
      {art === 'chart' ? (
        <g {...common}>
          <path d="M16 82h128" className={s.faint} />
          {[22, 40, 58, 76, 94, 112, 130].map((x, i) => (
            <path
              key={x}
              d={`M${x} 82v-${[6, 14, 4, 22, 10, 30, 8][i] ?? 0}`}
              className={i === 5 ? s.accent : s.faint}
              strokeWidth={6}
            />
          ))}
          <path d="M16 30h128" className={s.faint} strokeDasharray="2 4" />
        </g>
      ) : null}
      {art === 'search' ? (
        <g {...common}>
          <circle cx="70" cy="44" r="22" className={s.ink} />
          <path d="m86 60 18 18" className={s.accent} strokeWidth={2} />
          <path d="M60 44h20" className={s.faint} />
        </g>
      ) : null}
    </svg>
  );
}

interface EmptyStateProps {
  readonly art: Art;
  readonly title: string;
  readonly text: string;
  readonly action?:
    | { readonly label: string; readonly to: string }
    | { readonly label: string; readonly onClick: () => void };
  readonly children?: ReactNode;
  readonly compact?: boolean;
}

export function EmptyState({
  art,
  title,
  text,
  action,
  children,
  compact = false,
}: EmptyStateProps) {
  return (
    <motion.div
      className={[s.root, compact ? s.compact : ''].join(' ')}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Illustration art={art} />
      <div className={s.copy}>
        <h3 className={s.title}>{title}</h3>
        <p className={s.text}>{text}</p>
      </div>
      {action ? (
        'to' in action ? (
          <Link to={action.to} className={s.action}>
            {action.label}
            <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <button type="button" onClick={action.onClick} className={s.action}>
            {action.label}
            <span aria-hidden="true">→</span>
          </button>
        )
      ) : null}
      {children}
    </motion.div>
  );
}
