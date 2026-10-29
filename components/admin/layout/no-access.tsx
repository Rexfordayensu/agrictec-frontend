'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ADMIN_HOME, findAdminNavItem } from '@/constants/admin-navigation';
import { ROLE_LABELS } from '@/lib/admin/permissions';
import { useAdminRole } from '@/hooks/admin/use-can';
import type { AdminRole } from '@/types/admin';

export interface NoAccessProps {
  /** Name of the blocked page. Defaults to the nav label for the current route. */
  pageLabel?: string;
  /** Defaults to the signed-in admin's role. */
  role?: AdminRole;
}

/** Shown in place of a page the admin's role can't open. */
export function NoAccess({ pageLabel, role }: NoAccessProps) {
  const pathname = usePathname();
  const currentRole = useAdminRole();
  const effectiveRole = role ?? currentRole;
  const label = pageLabel ?? findAdminNavItem(pathname)?.label ?? 'this page';

  return (
    <Card padding="lg" className="mx-auto mt-6 max-w-lg text-center" role="alert">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-[#a78bfa]/30 bg-[#a78bfa]/10 text-[#a78bfa]">
        <Lock size={26} aria-hidden="true" />
      </div>
      <h2 className="text-text text-lg font-semibold">You don&apos;t have access to this page</h2>
      <p className="text-text-dim mx-auto mt-2 max-w-sm text-sm">
        {effectiveRole
          ? `Your role (${ROLE_LABELS[effectiveRole]}) can't open ${label}.`
          : `You can't open ${label}.`}{' '}
        Ask a Super Admin if you need access.
      </p>
      <Link
        href={ADMIN_HOME}
        className="group border-border bg-glass text-text hover:bg-glass-strong mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-5 text-sm font-semibold transition-colors hover:border-[#a78bfa]/50"
      >
        <ArrowLeft
          size={16}
          aria-hidden="true"
          className="transition-transform group-hover:-translate-x-0.5"
        />
        Back to Overview
      </Link>
    </Card>
  );
}
