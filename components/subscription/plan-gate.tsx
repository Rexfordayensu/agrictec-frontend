'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { LockKeyhole } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useSubscription } from '@/hooks/use-subscription';
import { FEATURE_NAMES } from '@/lib/subscriptions/plans';
import type { PlanFeature } from '@/types/subscription';

export function PlanGate({ feature, children }: { feature: PlanFeature; children: ReactNode }) {
  const { plan, ready, allows } = useSubscription();
  if (!ready) return <Card role="status">Loading your plan…</Card>;
  if (allows(feature)) return <>{children}</>;
  return (
    <Card className="mx-auto max-w-xl rounded-3xl text-center">
      <LockKeyhole size={30} aria-hidden="true" className="text-ink-green mx-auto mb-4" />
      <h2 className="text-text text-xl font-bold">Unlock {FEATURE_NAMES[feature]}</h2>
      <p className="text-text-dim mt-2 text-sm">
        Your {plan.name} plan does not include this tool. Choose{' '}
        {feature === 'pdfReports' ? 'Basic, Premium or Advanced' : 'Premium or Advanced'} to use it.
      </p>
      <Link
        href="/settings/plans"
        className="bg-accent text-bg-1 mt-5 inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-semibold"
      >
        Compare plans
      </Link>
    </Card>
  );
}
