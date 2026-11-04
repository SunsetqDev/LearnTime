import type { SVGProps } from 'react';

/**
 * Собственный набор иконок «Фокус»: сетка 24, линия 1.5, прямые окончания —
 * как гравировка на приборе. Без заливок, кроме точек-индикаторов.
 */
const PATHS = {
  play: <path d="M8 5.5v13l10.5-6.5L8 5.5Z" />,
  pause: (
    <>
      <path d="M8.5 5.5v13" />
      <path d="M15.5 5.5v13" />
    </>
  ),
  skip: (
    <>
      <path d="M6 6v12l8.5-6L6 6Z" />
      <path d="M18 6v12" />
    </>
  ),
  reset: (
    <>
      <path d="M5 12a7 7 0 1 0 2.05-4.95" />
      <path d="M5 4.5V8h3.5" />
    </>
  ),
  stop: <rect x="6.5" y="6.5" width="11" height="11" />,
  timer: (
    <>
      <path d="M3.5 15.5h17" />
      <path d="M3.5 12.5v3M8 13.5v2M12.5 12.5v3M17 13.5v2M20.5 12.5v3" />
      <path d="M12.5 4.5v8" />
      <circle cx="12.5" cy="4.5" r="1" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19.5h16" />
      <path d="M6.5 16.5v-5M11 16.5V6.5M15.5 16.5v-8M20 16.5v-3" />
    </>
  ),
  layers: (
    <>
      <path d="M4 7.5h16M4 12h16M4 16.5h10" />
      <path d="M17.5 16.5h2.5" />
    </>
  ),
  medal: (
    <>
      <circle cx="12" cy="14" r="5.5" />
      <path d="M9 9 6.5 3.5h4L12 7M15 9l2.5-5.5h-4" />
      <path d="M12 11.5v5M9.5 14h5" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <path d="M15 4.5v5M9 14.5v5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  close: <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />,
  chevronDown: <path d="m7 10 5 5 5-5" />,
  chevronRight: <path d="m10 7 5 5-5 5" />,
  chevronLeft: <path d="m14 7-5 5 5 5" />,
  archive: (
    <>
      <path d="M4 5.5h16v4H4z" />
      <path d="M5.5 9.5v9h13v-9M10 13h4" />
    </>
  ),
  unarchive: (
    <>
      <path d="M4 5.5h16v4H4z" />
      <path d="M5.5 9.5v9h13v-9M12 17v-5M9.5 14.5 12 12l2.5 2.5" />
    </>
  ),
  edit: (
    <>
      <path d="m14.5 5.5 4 4L9 19H5v-4l9.5-9.5Z" />
      <path d="m12.5 7.5 4 4" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />
      <path d="M5 19.5h14" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" />
      <path d="M5 19.5h14" />
    </>
  ),
  bell: (
    <>
      <path d="M6.5 16.5v-5a5.5 5.5 0 0 1 11 0v5l1.5 2h-14l1.5-2Z" />
      <path d="M10 20.5h4" />
    </>
  ),
  volume: (
    <>
      <path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  moon: <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
    </>
  ),
  monitor: (
    <>
      <path d="M3.5 5.5h17v11h-17z" />
      <path d="M9 20h6M12 16.5V20" />
    </>
  ),
  keyboard: (
    <>
      <path d="M3 6.5h18v11H3z" />
      <path d="M6.5 10h1M10 10h1M13.5 10h1M17 10h.5M6.5 13.5h.5M9 14h6M17 13.5h.5" />
    </>
  ),
  expand: <path d="M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15" />,
  flame: (
    <>
      <path d="M12 21c3.6 0 6-2.5 6-5.8 0-3.7-3-5.7-4-9.7-2 1.4-3 3.4-3 5.5-1-.5-1.8-1.5-2-2.8C7.3 9.6 6 11.6 6 15.2 6 18.5 8.4 21 12 21Z" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 12h9" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 6.5h15M9.5 6.5v-2h5v2" />
      <path d="M6.5 6.5 7.5 20h9l1-13.5M10 10.5v6M14 10.5v6" />
    </>
  ),
  calendar: (
    <>
      <path d="M4 6h16v14H4zM4 10h16" />
      <path d="M8.5 3.5V7M15.5 3.5V7" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.5v1" />
    </>
  ),
  lock: (
    <>
      <path d="M6 10.5h12v9.5H6z" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  filter: <path d="M4 6h16l-6 7v5.5l-4-2V13L4 6Z" />,
  dot: <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />,
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  readonly name: IconName;
  readonly size?: number;
  /** Подпись для скринридера. Без неё иконка декоративная. */
  readonly label?: string;
}

export function Icon({ name, size = 20, label, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
