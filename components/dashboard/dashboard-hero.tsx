'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Database, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { formatGHS } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useFarmStore } from '@/store/farm-store';
import { useModalStore } from '@/store/modal-store';
import { useProfileStore } from '@/store/profile-store';
import { useUiStore } from '@/store/ui-store';

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Net profit headline with an income-vs-expenses split bar. */
function ProfitSummary() {
  const { profit, margin, income, expenses, monthly6, recordCount, momo } = useFarmStats();
  const total = income + expenses;
  const thisMonth = [
    { label: 'Income this month', value: formatGHS(monthly6.income[5] ?? 0) },
    { label: 'Spent this month', value: formatGHS(monthly6.expense[5] ?? 0) },
    { label: 'Entries logged', value: String(recordCount + momo.count) },
  ];
  const incomeShare = total > 0 ? (income / total) * 100 : 50;

  return (
    <div>
      <p className="text-text-mute text-[11px] font-semibold tracking-wider uppercase">
        Net profit · all records
      </p>
      <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-2">
        <p
          className={cn(
            'text-4xl leading-none font-extrabold tracking-tight @xl:text-5xl',
            profit < 0 ? 'text-ink-red' : 'text-text',
          )}
        >
          {formatGHS(profit)}
        </p>
        <Badge color={margin >= 0 ? 'green' : 'red'} className="mb-1">
          {margin}% margin
        </Badge>
      </div>

      <div
        className="bg-glass-strong mt-5 flex h-2.5 w-full overflow-hidden rounded-full"
        role="img"
        aria-label={`Income ${formatGHS(income)} versus expenses ${formatGHS(expenses)}`}
      >
        <div
          className="animate-progress-grow h-full bg-linear-to-r from-[#10b981] to-[#34d399]"
          style={{ width: `${incomeShare}%` }}
        />
        <div className="h-full flex-1 bg-linear-to-r from-[#f87171] to-[#ef4444]" />
      </div>
      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="bg-accent size-2.5 rounded-full" />
          <dt className="text-text-dim">Income</dt>
          <dd className="text-text font-semibold">{formatGHS(income)}</dd>
        </div>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="bg-danger size-2.5 rounded-full" />
          <dt className="text-text-dim">Expenses</dt>
          <dd className="text-text font-semibold">{formatGHS(expenses)}</dd>
        </div>
      </dl>

      <dl className="mt-5 grid grid-cols-1 gap-2 @md:grid-cols-3">
        {thisMonth.map((item) => (
          <div key={item.label} className="border-border bg-glass rounded-xl border px-3.5 py-2.5">
            <dt className="text-text-mute text-[11px]">{item.label}</dt>
            <dd className="text-text text-base font-bold">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Shown before any data exists: offers sample data or a first record. */
function Onboarding() {
  const loadSampleData = useFarmStore((s) => s.loadSampleData);
  const openModal = useModalStore((s) => s.openModal);
  const dismissed = useUiStore((s) => s.samplePromptDismissed);
  const dismiss = useUiStore((s) => s.dismissSamplePrompt);
  const [loading, setLoading] = useState(false);

  async function handleLoad() {
    setLoading(true);
    try {
      await loadSampleData();
      toast.success('Sample data loaded. Explore your dashboard!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load sample data');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-accent/30 bg-accent/5 rounded-2xl border p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="bg-accent/15 text-ink-green inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
          <Database size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-text font-bold">
            {dismissed
              ? 'Add your first farm record'
              : 'New here? Load sample data to explore the app'}
          </h3>
          <p className="text-text-dim mt-1 text-sm">
            {dismissed
              ? 'Every sale, cost and activity you record builds your digital financial identity.'
              : 'Adds 12 farm records and 6 MoMo transactions from the last 6 months. You can delete them anytime.'}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {!dismissed && (
          <Button mutates onClick={handleLoad} loading={loading} icon={Sparkles}>
            Load sample data
          </Button>
        )}
        <Button
          variant={dismissed ? 'primary' : 'ghost'}
          icon={Plus}
          mutates
          disabled={loading}
          onClick={() => {
            dismiss();
            openModal('record');
          }}
        >
          {dismissed ? 'Add your first record' : 'Start fresh'}
        </Button>
      </div>
    </div>
  );
}

/** Greeting, headline numbers and quick actions. */
export function DashboardHero({ className }: { className?: string }) {
  const { hasData } = useFarmStats();
  const name = useProfileStore((s) => s.profile?.name.trim());
  const now = new Date();
  const firstName = name ? name.split(/\s+/)[0] : 'Farmer';

  return (
    <section
      aria-labelledby="dashboard-greeting"
      className={cn(
        'border-border bg-glass shadow-glass @container relative overflow-hidden rounded-3xl border p-5 sm:p-7',
        className,
      )}
    >
      {/* Decorative colour washes */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.22),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.16),transparent_70%)]"
      />

      {/* h-full + mt-auto: when the grid row is taller, the quick actions sit at the bottom. */}
      <div className="relative flex h-full flex-col gap-6">
        <div>
          <p className="text-text-dim text-sm">{format(now, 'EEEE, d MMMM yyyy')}</p>
          <h2
            id="dashboard-greeting"
            className="font-display text-ink-green mt-1 w-fit text-2xl leading-tight font-bold @md:text-3xl"
          >
            {greeting(now.getHours())}, {firstName}
          </h2>
        </div>

        {hasData ? <ProfitSummary /> : <Onboarding />}

        <QuickActions className="mt-auto" />
      </div>
    </section>
  );
}
