export type BlankSlateArtName = 'events' | 'milestones' | 'parking' | 'chart' | 'search';

/**
 * One drawing language across every empty state: a 64px square, 1.5px round
 * hairlines in the muted text colour, and exactly one element picked out in
 * the brand accent — the thing the user is being invited to create.
 */
export function BlankSlateArt({ name }: { name: BlankSlateArtName }) {
  const common = {
    width: 64,
    height: 64,
    viewBox: '0 0 64 64',
    fill: 'none',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  };
  const line = 'var(--tw-text-subtle)';
  const accent = 'var(--tw-primary)';

  switch (name) {
    case 'events':
      // An hourglass — the product mark, waiting to be started.
      return (
        <svg {...common}>
          <path d="M22 12h20M22 52h20" stroke={line} />
          <path d="M24 12v7c0 6 8 9 8 13s-8 7-8 13v7" stroke={line} />
          <path d="M40 12v7c0 6-8 9-8 13s8 7 8 13v7" stroke={line} />
          <path d="M27 46c1.6-4 3.6-6 5-6s3.4 2 5 6z" fill={accent} stroke={accent} />
        </svg>
      );
    case 'milestones':
      // A checklist whose first row is still blank and highlighted.
      return (
        <svg {...common}>
          <rect x="12" y="14" width="40" height="36" rx="4" stroke={line} />
          <rect x="18" y="22" width="8" height="8" rx="2" stroke={accent} />
          <path d="M32 26h14" stroke={accent} />
          <rect x="18" y="36" width="8" height="8" rx="2" stroke={line} />
          <path d="M32 40h10" stroke={line} />
        </svg>
      );
    case 'parking':
      // A note pinned to a board, corner turned.
      return (
        <svg {...common}>
          <path d="M14 16h28l8 8v24H14z" stroke={line} />
          <path d="M42 16v8h8" stroke={line} />
          <path d="M21 32h18M21 39h12" stroke={line} />
          <circle cx="46" cy="44" r="5" fill={accent} />
          <path d="M46 41.5v5M43.5 44h5" stroke="var(--tw-on-primary)" />
        </svg>
      );
    case 'chart':
      // Empty axes with the burndown's downward slope sketched in.
      return (
        <svg {...common}>
          <path d="M16 14v34h34" stroke={line} />
          <path d="M22 24l10 8 8-2 10 10" stroke={accent} strokeDasharray="4 3" />
          <circle cx="22" cy="24" r="2.5" fill={accent} stroke="none" />
        </svg>
      );
    case 'search':
      // A magnifier over a list that came back empty.
      return (
        <svg {...common}>
          <path d="M14 20h20M14 28h14M14 36h10" stroke={line} />
          <circle cx="40" cy="36" r="10" stroke={accent} />
          <path d="M47 43l6 6" stroke={accent} />
        </svg>
      );
  }
}
