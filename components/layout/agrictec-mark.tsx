'use client';

import { useId } from 'react';

// "The Growth Leaf": a leaf (the farm) with a rising line cut out of it (money and growth) that
// starts at a gold seed (a farmer's first record). The same drawing as public/icons and app/icon.svg.

const LEAF = 'M18 102C18 52 52 18 102 18C102 68 68 102 18 102Z';
const LINE = '34.5,85.5 45.2,65 66.4,63.5 85.5,28.9';
/** Below this size the seed is left out and the line drawn thicker, so the mark stays crisp. */
const SMALL = 32;

export function AgriCtecMark({
  size = 44,
  className,
  title,
}: {
  size?: number;
  className?: string;
  /** Spoken name; without it the mark is decoration next to the "AgriCtec" wordmark. */
  title?: string;
}) {
  // Unique per mark: a mark inside a hidden sidebar must not hide another mark's gradient.
  const id = useId().replace(/:/g, '');
  const small = size < SMALL;
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient
          id={`${id}-leaf`}
          x1="18"
          y1="102"
          x2="102"
          y2="18"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#059669" />
          <stop offset="1" stopColor="#34d399" />
        </linearGradient>
        <mask id={`${id}-cut`} maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="120">
          <rect width="120" height="120" fill="#fff" />
          <polyline
            points={small ? '30,90 45.2,65 66.4,63.5 82,33' : LINE}
            fill="none"
            stroke="#000"
            strokeWidth={small ? 12 : 7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {!small && <circle cx="34.5" cy="85.5" r="10.5" fill="#000" />}
        </mask>
      </defs>
      <path d={LEAF} fill={`url(#${id}-leaf)`} mask={`url(#${id}-cut)`} />
      {!small && <circle cx="34.5" cy="85.5" r="6.5" fill="var(--brand-seed)" />}
    </svg>
  );
}

/** "Agri" in the text colour, "Ctec" in green: the capital C reads as deliberate. */
export function AgriCtecWordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="text-text">Agri</span>
      <span className="text-ink-green">Ctec</span>
    </span>
  );
}
