'use client';

import Link from 'next/link';
import {
  BarChart3,
  ChevronRight,
  CircleCheck,
  IdCard,
  Landmark,
  Smartphone,
  Sprout,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { dashPanel, IconTile, PanelHeading } from '@/components/dashboard/dashboard-ui';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardSummary } from '@/lib/dashboard-summary';
import { farmInsight } from '@/lib/dashboard-insight';
import { useCreditStore } from '@/store/credit-store';
import { usePlatformStore } from '@/store/platform-store';

/** How each unfinished readiness item (the server's checklist) becomes a next step. */
const STEPS: Record<string, { title: string; text: string; href: string; icon: LucideIcon }> = {
  records: {
    title: 'Build your financial history',
    text: 'Add more income and expense records to show regular activity.',
    href: '/records',
    icon: BarChart3,
  },
  momo: {
    title: 'Log your Mobile Money',
    text: 'Add the MoMo payments you send and receive for the farm.',
    href: '/momo',
    icon: Smartphone,
  },
  profile: {
    title: 'Complete your profile',
    text: 'Add your name, phone, farm name and acreage.',
    href: '/settings/profile',
    icon: UserRound,
  },
  ghanaCard: {
    title: 'Verify your Ghana Card',
    text: 'Identity verification is needed to apply for loan products.',
    href: '/settings/verification',
    icon: IdCard,
  },
};

/** Up to three things to do next, from the server's readiness checklist. */
export function NextSteps() {
  const summary = useCreditStore((s) => s.summary);
  const loansOn = usePlatformStore((s) => s.flags.loans);
  const lenderCount = usePlatformStore((s) => s.lenders.length);
  const steps = (summary?.readiness ?? [])
    .filter((item) => !item.done && STEPS[item.key])
    .map((item) => ({ key: item.key, ...STEPS[item.key] }));
  if (loansOn)
    steps.push({
      key: 'loans',
      title: 'Explore loan options',
      text: lenderCount
        ? 'See verified lenders and what their loan products require.'
        : 'Lenders and their requirements appear here when published.',
      href: '/loans?tab=lenders',
      icon: Landmark,
    });
  return (
    <section aria-labelledby="next-title" className={dashPanel}>
      <PanelHeading id="next-title" title="Your next steps" />
      {!summary ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : steps.length === 0 ? (
        <p className="text-text-dim flex items-center gap-2 text-sm">
          <CircleCheck size={18} aria-hidden="true" className="text-ink-green" />
          You’re up to date. Keep recording your farm activity.
        </p>
      ) : (
        <ul className="space-y-1">
          {steps.slice(0, 3).map((step) => (
            <li key={step.key}>
              <Link
                href={step.href}
                className="hover:bg-glass-strong -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5"
              >
                <IconTile icon={step.icon} />
                <span className="min-w-0 flex-1">
                  <span className="text-text block text-sm font-semibold">{step.title}</span>
                  <span className="text-text-mute block text-xs">{step.text}</span>
                </span>
                <ChevronRight size={16} aria-hidden="true" className="text-text-mute shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** One sentence about the farmer's own figures for the period. */
export function FarmInsight({ summary }: { summary: DashboardSummary | null }) {
  return (
    <section
      aria-labelledby="insight-title"
      className="rounded-card border-accent/25 from-accent/12 to-accent/4 relative min-w-0 overflow-hidden border bg-linear-to-br p-4 sm:p-5"
    >
      <PanelHeading id="insight-title" icon={Sprout} title="Farm Insight" />
      {summary ? (
        <p className="text-text-dim relative z-10 text-sm leading-relaxed">
          {farmInsight(summary)}
        </p>
      ) : (
        <Skeleton className="h-16 w-full rounded-xl" />
      )}
      <svg className="dash-insight-leaves" viewBox="0 0 150 150" fill="none" aria-hidden="true">
        <path
          d="M76 151C78 105 101 66 139 30M79 146C61 107 42 99 17 92M91 111C95 83 83 62 70 46"
          stroke="#79ca84"
          strokeWidth="3"
        />
        <path d="M103 85C101 55 118 22 149 10C151 48 132 75 103 85Z" fill="#b8edb9" />
        <path d="M84 118C49 122 25 108 4 94C41 78 64 91 84 118Z" fill="#9cdca1" />
        <path d="M93 108C120 102 135 82 149 58C113 63 95 81 93 108Z" fill="#8ed997" />
        <path d="M85 91C65 79 61 59 69 40C86 57 94 73 85 91Z" fill="#b3e9b2" />
        <path d="M76 146C51 141 29 144 16 150H76Z" fill="#b9e9b9" />
      </svg>
    </section>
  );
}
