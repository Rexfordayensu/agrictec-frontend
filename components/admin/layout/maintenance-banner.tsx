'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Construction } from 'lucide-react';
import { usePlatformStatus } from '@/hooks/admin/use-platform-status';
import { useCan } from '@/hooks/admin/use-can';

/** Across the whole console while maintenance mode is on: farmers can't use the app. */
export function MaintenanceBanner() {
  const status = usePlatformStatus();
  const canManage = useCan('settings.manage');
  if (!status?.flags.maintenanceMode) return null;
  const endsAt = status.flags.maintenanceEndsAt;
  return (
    <div
      role="status"
      className="bg-danger-strong mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-4 py-2.5 text-sm text-white shadow-[0_8px_24px_-8px_rgba(239,68,68,0.6)] lg:mt-0"
    >
      <Construction size={17} aria-hidden="true" className="shrink-0" />
      <p className="min-w-0 flex-1 font-semibold">
        Maintenance mode is ON — farmers cannot use the app
        {endsAt && (
          <span className="font-normal opacity-90">
            {' '}
            · ends {format(new Date(endsAt), "d MMM 'at' HH:mm")}
          </span>
        )}
      </p>
      {canManage && (
        <Link
          href="/admin/settings/maintenance"
          className="inline-flex min-h-9 items-center rounded-lg bg-white/15 px-3 text-xs font-bold hover:bg-white/25"
        >
          Manage
        </Link>
      )}
    </div>
  );
}
