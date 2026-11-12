'use client';

import { useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ApiError, isSignedOut } from '@/services/api';
import { useAuthStore } from '@/store/auth-store';
import { useChatStore } from '@/store/chat-store';
import { useCreditStore } from '@/store/credit-store';
import { useLoanStore } from '@/store/loan-store';
import { usePlatformStore } from '@/store/platform-store';
import { useSubscriptionStore } from '@/store/subscription-store';

/** A failed optional API must neither close the app nor look like an empty account. */
export function OptionalDataBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const chat = useChatStore((s) => s.status);
  const credit = useCreditStore((s) => s.status);
  const loans = useLoanStore((s) => s.status);
  const platform = usePlatformStore((s) => s.status);
  const subscription = useSubscriptionStore((s) => s.status);
  const [retrying, setRetrying] = useState(false);
  const sections = [
    { label: 'Assistant history', status: chat, store: useChatStore, paths: ['/assistant'] },
    { label: 'Credit information', status: credit, store: useCreditStore, paths: ['/loans'] },
    { label: 'Loan applications', status: loans, store: useLoanStore, paths: ['/loans'] },
    { label: 'Platform content', status: platform, store: usePlatformStore,
      paths: ['/loans', '/market', '/assistant', '/crop-doctor', '/yield-predictor', '/settings/plans'] },
    { label: 'Plans and AI credits', status: subscription, store: useSubscriptionStore,
      paths: ['/settings/plans', '/assistant', '/crop-doctor', '/yield-predictor'] },
    // Only a section whose load failed: one that is still (re)loading is not an error.
  ].filter((section) => section.status === 'error');
  if (sections.length === 0) return children;
  const blocked = sections.some((section) => section.paths.some((p) => pathname === p || pathname.startsWith(p + '/')));

  async function retry() {
    const userId = useAuthStore.getState().session?.userId;
    if (!userId || retrying) return;
    setRetrying(true);
    try {
      const results = await Promise.allSettled(sections.map((section) => section.store.getState().load(userId)));
      for (const result of results) {
        if (result.status !== 'rejected') continue;
        if (isSignedOut(result.reason)) router.replace('/login');
        else if (result.reason instanceof ApiError && result.reason.code === 'maintenance') window.location.reload();
      }
    } finally {
      setRetrying(false);
    }
  }

  return (
    <>
      <section role="alert" className="border-border bg-glass mb-5 rounded-2xl border p-4">
        <h2 className="text-text text-sm font-semibold">Some sections could not be loaded</h2>
        <p className="text-text-dim mt-1 text-sm">{sections.map((section) => section.label).join(', ')}.</p>
        <p className="text-text-mute mt-1 text-xs">
          Your farm records are still available. Unavailable information has not been replaced with empty data.
        </p>
        <Button className="mt-3" size="sm" variant="ghost" loading={retrying} onClick={retry}>
          Try these sections again
        </Button>
      </section>
      {!blocked && children}
    </>
  );
}
