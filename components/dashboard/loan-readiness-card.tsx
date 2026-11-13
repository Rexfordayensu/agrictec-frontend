'use client';

import Link from 'next/link';
import { ArrowRight, Check, ChevronRight, CircleAlert, CircleCheck, Landmark } from 'lucide-react';
import { dashPanel, PanelHeading } from '@/components/dashboard/dashboard-ui';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useCreditStore } from '@/store/credit-store';
import { usePlatformStore } from '@/store/platform-store';

/** Where each checklist item is done (keys from the server's build_readiness). */
const ITEM_HREF: Record<string, string> = {
  records: '/records',
  momo: '/momo',
  profile: '/settings/profile',
  ghanaCard: '/settings/verification',
};

/**
 * The server's loan-readiness checklist (GET /me/credit readiness): the share done, and each
 * item with a link to finish it. The same list the admin sees on the farmer's profile.
 */
export function LoanReadinessCard() {
  const summary = useCreditStore((state) => state.summary);
  const loansOn = usePlatformStore((state) => state.flags.loans);
  const items = summary?.readiness ?? [];
  const done = items.filter((item) => item.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  return (
    <section aria-labelledby="readiness-title" className={dashPanel}>
      <PanelHeading
        id="readiness-title"
        icon={Landmark}
        title="Loan Readiness"
        sub="How ready your records are for a lender."
        aside={
          loansOn && (
            <Link
              href="/loans"
              className="border-border text-ink-green hover:bg-glass-strong inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
            >
              See details <ArrowRight size={13} aria-hidden="true" />
            </Link>
          )
        }
      />
      {!summary ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : (
        <>
          <p className="text-text text-4xl leading-none font-bold tabular-nums">{pct}%</p>
          <div
            role="progressbar"
            aria-label={`${done} of ${items.length} readiness steps done`}
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            className="bg-border mt-3 h-2 overflow-hidden rounded-full"
          >
            <div className="bg-accent h-full rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <ul className="divide-border mt-3 divide-y">
            {items.map((item) => {
              const href = !item.done ? ITEM_HREF[item.key] : undefined;
              const body = (
                <>
                  {item.done ? (
                    <CircleCheck size={18} aria-hidden="true" className="text-ink-green shrink-0" />
                  ) : (
                    <CircleAlert size={18} aria-hidden="true" className="text-ink-gold shrink-0" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="text-text block text-sm font-medium">{item.label}</span>
                    {!item.done && (
                      <span className="text-text-mute block truncate text-xs">
                        {item.description}
                      </span>
                    )}
                  </span>
                  <span className="sr-only">{item.done ? '(done)' : '(to do)'}</span>
                  {item.done && <Check size={16} aria-hidden="true" className="text-ink-green" />}
                  {href && <ChevronRight size={16} aria-hidden="true" className="text-text-mute" />}
                </>
              );
              return (
                <li key={item.key}>
                  {href ? (
                    <Link href={href} className={cn(row, 'hover:bg-glass-strong')}>
                      {body}
                    </Link>
                  ) : (
                    <div className={row}>{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

const row = '-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5';
