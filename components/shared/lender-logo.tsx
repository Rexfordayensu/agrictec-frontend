'use client';

import { useState } from 'react';
import { lenderInitials } from '@/lib/lenders';
import { cn } from '@/lib/utils';
import { apiUrl } from '@/services/api';

/**
 * The institution's uploaded logo, or its initials on its colour. Never a made-up logo: if the
 * image can't be loaded, the initials show instead.
 */
export function LenderLogo({
  name,
  color,
  logoPath,
  size = 40,
  className,
}: {
  name: string;
  color: string;
  logoPath?: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size };
  if (logoPath && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- served by the API, already resized
      <img
        src={apiUrl(logoPath)}
        alt={`${name} logo`}
        style={box}
        onError={() => setFailed(true)}
        className={cn('shrink-0 rounded-xl bg-white object-contain p-1', className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{ ...box, backgroundColor: color, fontSize: Math.round(size * 0.36) }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl font-bold text-white',
        className,
      )}
    >
      {lenderInitials(name) || '•'}
    </span>
  );
}
