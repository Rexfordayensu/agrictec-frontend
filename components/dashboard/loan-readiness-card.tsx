'use client';

import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { usePlatformStore } from '@/store/platform-store';

export function LoanReadinessCard() {
  const { credit, creditLabel, readiness } = useFarmStats();
  const enabled = usePlatformStore((state) => state.flags.loans);
  if (!enabled) return null;
  const done = readiness.filter((item) => item.done).length;
  const next = readiness.find((item) => !item.done);
  return (
    <Card className="farmer-dashboard-credit farmer-dashboard-panel">
      <CardHeader>
        <div>
          <CardTitle>Credit readiness</CardTitle>
          <CardSub>Based on all your records and profile</CardSub>
        </div>
        <ShieldCheck size={21} aria-hidden="true" className="text-ink-green" />
      </CardHeader>
      <div className="farmer-dashboard-credit-score">
        <p>
          {credit.score}
          <span> / 850</span>
        </p>
        <span>{creditLabel}</span>
      </div>
      <Progress
        value={readiness.length ? (done / readiness.length) * 100 : 0}
        label={`${done} of ${readiness.length} preparation steps complete`}
      />
      <p className="farmer-dashboard-credit-next">
        {next
          ? next.description
          : 'Your preparation checklist is complete. Explore your credit details.'}
      </p>
      <Link href="/loans" className="farmer-dashboard-text-link">
        View readiness details <ArrowRight size={16} aria-hidden="true" />
      </Link>
      <p className="farmer-dashboard-footnote">This score does not guarantee loan approval.</p>
    </Card>
  );
}
