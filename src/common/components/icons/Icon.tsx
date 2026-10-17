/**
 * Line icons for the app chrome, drawn on a 24px grid with a 1.75 stroke in
 * currentColor so they take the colour of the text around them. Emoji stay in
 * copy (streaks, notifications), never as interface icons.
 */

const PATHS = {
  home: 'M3.5 10.5 12 3.5l8.5 7M5.5 9v11h13V9M10 20v-5.5h4V20',
  plus: 'M12 5v14M5 12h14',
  history: 'M4 4.5h16v4.5H4zM5.5 9v10.5h13V9M10 13h4',
  timer: 'M10 2.5h4M12 2.5v3M12 13.5v-4M12 21a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15z',
  signOut:
    'M14 4h4.5a1.5 1.5 0 0 1 1.5 1.5v13a1.5 1.5 0 0 1-1.5 1.5H14M10 16l-4-4 4-4M6 12h10',
  system:
    'M4.5 4.5h15a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 15V6a1.5 1.5 0 0 1 1.5-1.5zM8.5 20h7M12 16.5V20',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  moon: 'M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  pencil: 'M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3zM14 7l3 3',
  board:
    'M4.5 4h15A1.5 1.5 0 0 1 21 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-13A1.5 1.5 0 0 1 4.5 4zM9 4v16M15 4v16',
  play: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM10 8.5v7l6-3.5z',
  chart: 'M4 4v16h16M8 15l3.5-4.5 3 3L19 8',
  clock: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM12 7.5V12l3 2',
  chevronRight: 'M9 6l6 6-6 6',
  chevronDown: 'M6 9l6 6 6-6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  flag: 'M5.5 21V4M5.5 4.5H17l-2.5 4 2.5 4H5.5',
} as const;

export type IconName = keyof typeof PATHS;

export type IconProps = {
  name: IconName;
  /** Rendered size in px (default 18). */
  size?: number;
  className?: string;
};

export function Icon({ name, size = 18, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
