'use client';

import { useId } from 'react';
import { LEAF, LINE } from '@/components/layout/agrictec-mark';
import { cn } from '@/lib/utils';

const SIZES = { sm: 28, md: 56, lg: 84 } as const;

/**
 * The loading state everywhere: the AgriCtec leaf, its rising line drawing itself, the gold seed
 * pulsing and (md/lg) a ring turning around it. No visible text: `label` is read to screen
 * readers only. With reduced motion the mark stays still, fully drawn (app/globals.css).
 *
 * `center` fills the space it is given (a page or a panel) and centres the mark in it.
 */
export function LogoLoader({
  size = 'md',
  label = 'Loading',
  center = false,
  className,
}: {
  size?: keyof typeof SIZES;
  label?: string;
  center?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, '');
  const px = SIZES[size];
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn('logo-loader', center && 'logo-loader-center', className)}
    >
      <span
        className={cn('logo-loader-mark', size !== 'sm' && 'logo-loader-float')}
        style={{ width: px, height: px }}
      >
        {size !== 'sm' && <span aria-hidden="true" className="logo-loader-ring" />}
        <svg viewBox="0 0 120 120" width={px} height={px} aria-hidden="true">
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
                points={LINE}
                fill="none"
                stroke="#000"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="34.5" cy="85.5" r="10.5" fill="#000" />
            </mask>
          </defs>
          <path d={LEAF} fill={`url(#${id}-leaf)`} mask={`url(#${id}-cut)`} />
          {/* The growth line, drawn along the cut from the seed upwards. */}
          <polyline
            className="logo-loader-line"
            points={LINE}
            pathLength={100}
            fill="none"
            stroke="var(--brand-seed)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle className="logo-loader-seed" cx="34.5" cy="85.5" r="6.5" fill="var(--brand-seed)" />
        </svg>
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
