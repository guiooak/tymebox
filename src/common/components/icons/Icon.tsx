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
  moreVertical:
    'M12 6.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5zM12 13.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5zM12 20.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5z',
  flag: 'M5.5 21V4M5.5 4.5H17l-2.5 4 2.5 4H5.5',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  repeat: 'M4 12V9a3 3 0 0 1 3-3h12M16 3l3 3-3 3M20 12v3a3 3 0 0 1-3 3H5M8 21l-3-3 3-3',
  calendar: 'M4 6.5h16V20H4zM4 10.5h16M8.5 3.5v4M15.5 3.5v4',
  cycle:
    'M19.5 11a7.5 7.5 0 0 0-13.6-3.6M4.5 4.5v3.5H8M4.5 13a7.5 7.5 0 0 0 13.6 3.6M19.5 19.5V16H16',
  users:
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.3a3.5 3.5 0 0 1 0 6.4M18 13.8a6.5 6.5 0 0 1 3.5 6.2',
  globe:
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.5 9h17M3.5 15h17M12 3c2.5 2.4 3.8 5.4 3.8 9s-1.3 6.6-3.8 9M12 3C9.5 5.4 8.2 8.4 8.2 12s1.3 6.6 3.8 9',
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
