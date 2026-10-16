/**
 * The Tymebox symbol: a time box with a 12-hour dial and an hourglass whose
 * sand settles in amber.
 *
 * The geometry is copied from the brand manual
 * (docs/brand/tymebox-brand-manual.html, §01–02), which is the source of
 * truth; change it there first. Colours come from the --tw-logo and --tw-sand
 * tokens, so the symbol follows the theme.
 */

export type SymbolVariant = 'full' | 'reduced';

export type TymeboxSymbolProps = {
  /** Rendered width and height in px. */
  size: number;
  /** Defaults by size: the dial turns to noise below 48px (manual §04). */
  variant?: SymbolVariant;
  /** Accessible name; omit when the symbol sits next to the wordmark. */
  title?: string;
  className?: string;
};

const FRAME = 'var(--tw-logo)';
const SAND = 'var(--tw-sand)';

function FullSymbol() {
  return (
    <>
      <rect
        x="8"
        y="8"
        width="84"
        height="84"
        rx="20"
        fill="none"
        stroke={FRAME}
        strokeWidth="7"
      />
      <path
        d="M50 8V15M50 85V92M8 50H15M85 50H92"
        fill="none"
        stroke={FRAME}
        strokeWidth="7"
        strokeLinecap="round"
      />
      {/* 12 marks centred on the hours. The manual writes this as
          pathLength="120" with dasharray "3 7"; these are the same lengths on
          the real circumference (2π·28), which every renderer honours. */}
      <circle
        cx="50"
        cy="50"
        r="28"
        fill="none"
        stroke={FRAME}
        strokeWidth="4"
        strokeDasharray="4.398 10.263"
        strokeDashoffset="2.199"
      />
      <path
        d="M39 33H61L50 50Z"
        fill={FRAME}
        fillOpacity="0.16"
        stroke={FRAME}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M39 67H61L50 50Z"
        fill={SAND}
        stroke={FRAME}
        strokeWidth="5"
        strokeLinejoin="round"
      />
    </>
  );
}

function ReducedSymbol() {
  return (
    <>
      <rect
        x="9"
        y="9"
        width="82"
        height="82"
        rx="22"
        fill="none"
        stroke={FRAME}
        strokeWidth="10"
      />
      <path
        d="M32 27H68L50 50Z"
        fill="none"
        stroke={FRAME}
        strokeWidth="8"
        strokeLinejoin="round"
      />
      <path
        d="M32 73H68L50 50Z"
        fill={SAND}
        stroke={FRAME}
        strokeWidth="8"
        strokeLinejoin="round"
      />
    </>
  );
}

export function TymeboxSymbol({ size, variant, title, className }: TymeboxSymbolProps) {
  const kind = variant ?? (size < 48 ? 'reduced' : 'full');
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {kind === 'full' ? <FullSymbol /> : <ReducedSymbol />}
    </svg>
  );
}
