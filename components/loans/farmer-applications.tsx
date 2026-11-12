'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';
import { loanUi } from '@/components/loans/loan-ui';
import { MyApplications } from '@/components/loans/my-applications';
import { Badge } from '@/components/ui/badge';
import { LogoLoader } from '@/components/ui/logo-loader';
import { formatGhanaDate } from '@/lib/format';
import { APPLICATION_STATUS } from '@/lib/loans/application-status';
import { applicationsService } from '@/services/applications.service';
import { useLoanStore } from '@/store/loan-store';
import type { ApplicationSummary } from '@/types/applications';

const money = (value: string) =>
  `GHS ${Number(value).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * The farmer's applications: the ones prepared through AgriCtec, then (only if there are any)
 * earlier applications recorded before this process, read-only.
 */
export function FarmerApplications({ onCount }: { onCount?: (n: number) => void }) {
  const earlier = useLoanStore((s) => s.applications);
  const [apps, setApps] = useState<ApplicationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    applicationsService.list().then(
      (list) => {
        if (!active) return;
        setApps(list);
        onCount?.(list.length);
      },
      (cause: unknown) => active && setError(cause instanceof Error ? cause.message : 'Could not load'),
    );
    return () => {
      active = false;
    };
  }, [onCount]);

  return (
    <div className="space-y-5">
      <section aria-labelledby="new-applications-title" className={loanUi.panel}>
        <h3 id="new-applications-title" className={loanUi.title}>
          My applications
        </h3>
        <p className="text-text-dim mt-1 text-sm">
          Prepared here, checked by AgriCtec, then sent to the lender with your consent.
        </p>
        {error ? (
          <p role="alert" className="text-ink-red mt-3 text-sm">
            {error}
          </p>
        ) : apps === null ? (
          <LogoLoader center label="Loading your applications" className="min-h-32" />
        ) : apps.length === 0 ? (
          <p className="text-text-dim mt-4 flex items-center gap-2 text-sm">
            <FileText size={16} aria-hidden="true" />
            No applications yet. Open a lender’s loan product and choose “Start your application”.
          </p>
        ) : (
          <ul className="divide-border mt-3 divide-y">
            {apps.map((app) => (
              <li key={app.id}>
                <Link
                  href={`/loans/applications/${app.id}`}
                  className="hover:bg-glass flex flex-wrap items-center justify-between gap-3 rounded-xl px-2 py-3"
                >
                  <span className="min-w-0">
                    <span className="text-text block text-sm font-semibold">
                      {app.productName} · {app.lenderName}
                    </span>
                    <span className="text-text-mute block text-xs">
                      {app.reference} · {money(app.amount)} over {app.months} months · updated{' '}
                      {formatGhanaDate(app.updatedAt)}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge color={APPLICATION_STATUS[app.status].color}>{app.statusLabel}</Badge>
                    <ArrowRight size={15} aria-hidden="true" className="text-text-mute" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      {earlier.length > 0 && (
        <div>
          <p className="text-text-mute mb-2 px-1 text-xs">
            Earlier applications, recorded before applications were prepared through AgriCtec
            (read-only):
          </p>
          <MyApplications />
        </div>
      )}
    </div>
  );
}
