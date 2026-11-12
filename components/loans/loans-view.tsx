'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { LoanWorkspace } from '@/components/loans/loan-workspace';
import { LoansOverview } from '@/components/loans/loans-overview';
import { loanUi } from '@/components/loans/loan-ui';
import { GhanaCardModal } from '@/components/profile/ghana-card-modal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useApplicationsStore } from '@/store/applications-store';
import { useAuthStore } from '@/store/auth-store';
import { useCreditStore } from '@/store/credit-store';
import { useLoanStore } from '@/store/loan-store';

/**
 * The page once the API has answered GET /me/credit. Until then a placeholder, and if it fails
 * a retry: the page never shows a score or limit the server did not give.
 */
export function LoansView() {
  const summary = useCreditStore((s) => s.summary);
  const status = useCreditStore((s) => s.status);
  const ghanaCardOpen = useLoanStore((s) => s.ghanaCardOpen);
  const setGhanaCardOpen = useLoanStore((s) => s.setGhanaCardOpen);
  const picked = useLoanStore((s) => s.tab);
  const setTab = useLoanStore((s) => s.setTab);
  const requested = useSearchParams().get('tab');
  const tab =
    picked ?? (requested === 'lenders' || requested === 'applications' ? requested : 'credit');

  // Applications change on their own pages (and by AgriCtec): reload them on every visit.
  useEffect(() => {
    const { status: loaded, load } = useApplicationsStore.getState();
    void load({ silent: loaded === 'ready' });
  }, []);

  if (!summary) return status === 'error' ? <CreditError /> : <LoansSkeleton />;

  return (
    <div className="@container flex flex-col gap-5">
      {tab === 'credit' ? (
        <LoansOverview />
      ) : (
        <>
          <Button variant="ghost" className="self-start" onClick={() => setTab('credit')}>
            ← Back to overview
          </Button>
          <LoanWorkspace />
        </>
      )}
      <GhanaCardModal open={ghanaCardOpen} onClose={() => setGhanaCardOpen(false)} />
    </div>
  );
}

function CreditError() {
  const [retrying, setRetrying] = useState(false);
  return (
    <section
      role="alert"
      className={`${loanUi.panel} flex flex-col items-center gap-3 py-10 text-center`}
    >
      <AlertTriangle size={28} aria-hidden="true" className="text-ink-gold" />
      <h2 className={loanUi.title}>We couldn&apos;t load your credit</h2>
      <p className="text-text-dim max-w-sm text-sm">
        Your score and loan options come from the AgriCtec server, which did not answer. Check your
        connection and try again.
      </p>
      <Button
        icon={RotateCw}
        loading={retrying}
        onClick={async () => {
          const userId = useAuthStore.getState().session?.userId;
          if (!userId) return;
          setRetrying(true);
          try {
            await useCreditStore.getState().load(userId);
          } catch {
            // The store shows the error state again.
          } finally {
            setRetrying(false);
          }
        }}
      >
        Try again
      </Button>
    </section>
  );
}

export function LoansSkeleton() {
  return (
    <div role="status" aria-label="Loading your credit" className="flex flex-col gap-6">
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="rounded-card h-32 w-full" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="rounded-card h-24" />
        <Skeleton className="rounded-card h-24" />
        <Skeleton className="rounded-card h-24" />
      </div>
      <Skeleton className="h-11 w-full rounded-2xl" />
      <Skeleton className="rounded-card h-80 w-full" />
    </div>
  );
}
