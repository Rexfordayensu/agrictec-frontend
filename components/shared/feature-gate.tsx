'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Construction } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { usePlatformStore } from '@/store/platform-store';
import type { FeatureKey } from '@/types/admin';
import { PlanGate } from '@/components/subscription/plan-gate';
import type { PlanFeature } from '@/types/subscription';

/**
 * Renders the page only while the admin has its feature switched on. Otherwise the farmer sees
 * a friendly "unavailable" card (the nav item is hidden too, but links and bookmarks still work).
 */
export function FeatureGate({ flag, children }: { flag: FeatureKey; children: ReactNode }) {
  const enabled = usePlatformStore((s) => s.flags[flag]);
  if (!enabled) return <FeatureUnavailable />;
  if (['aiAssistant', 'cropDoctor', 'yieldPredictor'].includes(flag))
    return <PlanGate feature={flag as PlanFeature}>{children}</PlanGate>;
  return <>{children}</>;
}

/** The card shown in place of a switched-off feature. */
export function FeatureUnavailable() {
  return (
    <Card padding="lg" className="mx-auto mt-6 max-w-lg text-center" role="status">
      <div className="bg-gold/15 text-ink-gold mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl">
        <Construction size={26} aria-hidden="true" />
      </div>
      <h2 className="text-text text-lg font-semibold">This feature is currently unavailable</h2>
      <p className="text-text-dim mx-auto mt-2 max-w-sm text-sm">
        It has been switched off for now. Your records and other features are not affected. Please
        check back later.
      </p>
      <Link
        href="/dashboard"
        className="group border-border bg-glass text-text hover:border-accent/50 hover:bg-glass-strong mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-5 text-sm font-semibold transition-colors"
      >
        <ArrowLeft
          size={16}
          aria-hidden="true"
          className="transition-transform group-hover:-translate-x-0.5"
        />
        Back to Dashboard
      </Link>
    </Card>
  );
}
