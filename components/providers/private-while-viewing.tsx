'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LockKeyhole } from 'lucide-react';
import { IconTile } from '@/components/ui/icon-tile';
import { isPrivateWhileViewing } from '@/lib/read-only';
import { useAuthStore } from '@/store/auth-store';

const VIEWABLE = [
  { href: '/profile', label: 'Profile and verification' },
  { href: '/loans/applications', label: 'Loan applications' },
  { href: '/settings', label: 'Settings' },
  { href: '/market', label: 'Market' },
  { href: '/weather', label: 'Weather' },
];

/**
 * While an admin views the app as a farmer, pages holding the farmer's money, statements or
 * assistant conversation show this instead: those stay private (the API refuses them too).
 */
export function PrivateWhileViewing({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const viewing = useAuthStore((s) => s.impersonation !== null);
  if (!viewing || !isPrivateWhileViewing(pathname)) return children;

  return (
    <section
      aria-labelledby="private-title"
      className="border-border bg-bg-2 mx-auto mt-6 max-w-xl rounded-3xl border p-6 text-center sm:p-8"
    >
      <IconTile icon={LockKeyhole} tone="gold" size="lg" className="mx-auto" />
      <h1 id="private-title" className="text-text mt-4 text-xl font-bold">
        Private while viewing as the farmer
      </h1>
      <p className="text-text-dim mt-2 text-sm">
        A farmer&rsquo;s money, statements and assistant conversation aren&rsquo;t shown here. Their
        entries are checked one at a time in Transactions review.
      </p>
      <p className="text-text-mute mt-5 text-xs font-semibold">You can still view</p>
      <ul className="mt-2 flex flex-wrap justify-center gap-2">
        {VIEWABLE.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="border-border text-text hover:border-accent/50 inline-flex min-h-10 items-center rounded-xl border px-3.5 text-sm font-semibold transition-colors"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
