import { Suspense } from 'react';
import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/layout/require-permission';
import { RiskMonitor } from '@/components/admin/risk/risk-monitor';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = { title: 'Risk & Fraud' };

/** Guarded by risk.review (every scan and decision checks it again in the service). */
export default function RiskPage() {
  return (
    <RequirePermission permission="risk.review">
      {/* The table keeps its filters in the URL (search params need a Suspense boundary). */}
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
        <RiskMonitor />
      </Suspense>
    </RequirePermission>
  );
}
