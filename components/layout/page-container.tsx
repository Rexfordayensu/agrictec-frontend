'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/** Re-mounts on every route change so each page settles in with a short transition. */
export function PageContainer({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-page-in">
      {children}
    </div>
  );
}
