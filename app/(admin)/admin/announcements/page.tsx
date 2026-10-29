import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AnnouncementsManager } from '@/components/admin/announcements/announcements-manager';
import { RequirePermission } from '@/components/admin/layout/require-permission';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = { title: 'Announcements' };

/** Banners for farmers. Guarded by announcements.send (checked again by every service call). */
export default function AnnouncementsPage() {
  return (
    <RequirePermission permission="announcements.send">
      {/* The manager reads ?new=1&regions=… (search params need a Suspense boundary). */}
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
        <AnnouncementsManager />
      </Suspense>
    </RequirePermission>
  );
}
