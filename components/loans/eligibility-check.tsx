'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Ban,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  Clock,
  FileText,
  Gauge,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge, type BadgeColor } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { formatGhanaDate } from '@/lib/format';
import { FREQUENCY_LABELS } from '@/lib/loan-products';
import { useReadOnly } from '@/lib/read-only';
import { cn } from '@/lib/utils';
import { eligibilityService } from '@/services/eligibility.service';
import { useModalStore } from '@/store/modal-store';
import type { EligibilityOutcome, EligibilityResult, RuleStatus } from '@/types/eligibility';
import type { LoanProduct } from '@/types/products';

// Exact to the pesewa, as the server worked it out (never rounded to whole cedis here).
const money = (value: string) =>
  `GHS ${Number(value).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const OUTCOME: Record<EligibilityOutcome, { color: BadgeColor; icon: LucideIcon; tone: string }> = {
  meets_preliminary: { color: 'green', icon: CircleCheck, tone: 'border-accent/35 bg-accent/8' },
  additional_information: { color: 'gold', icon: CircleAlert, tone: 'border-gold/35 bg-gold/8' },
  does_not_meet: { color: 'red', icon: Ban, tone: 'border-danger/35 bg-danger/8' },
  unable_to_assess: { color: 'blue', icon: CircleHelp, tone: 'border-border bg-glass' },
};

const RULE: Record<RuleStatus, { label: string; icon: LucideIcon; className: string }> = {
  met: { label: 'Met', icon: CircleCheck, className: 'text-ink-green' },
  not_met: { label: 'Not met', icon: Ban, className: 'text-ink-red' },
  needs_info: { label: 'More needed', icon: CircleAlert, className: 'text-ink-gold' },
  unknown: { label: 'Can’t assess', icon: CircleHelp, className: 'text-text-mute' },
  expired: { label: 'Rule out of date', icon: Clock, className: 'text-text-mute' },
  not_yet_in_effect: { label: 'Not yet in effect', icon: Clock, className: 'text-text-mute' },
};

/**
 * "Check my eligibility": the farmer's recorded transactions against this product's published
 * terms and the lender's confirmed rules, worked out by the server. A preliminary result with
 * its reasons, never a loan decision.
 */
export function EligibilityCheck({ product }: { product: LoanProduct }) {
  const readOnly = useReadOnly();
  const { terms } = product;
  const defaultMonths = terms.minMonths ?? terms.maxMonths ?? 12;
  const [amount, setAmount] = useState(terms.minAmount ? String(Number(terms.minAmount)) : '');
  const [months, setMonths] = useState(String(defaultMonths));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<EligibilityResult | null>(null);

  const amountValid = /^\d+(\.\d{1,2})?$/.test(amount.trim()) && Number(amount) > 0;
  const monthsValid = /^\d+$/.test(months) && Number(months) >= 1 && Number(months) <= 360;

  async function run() {
    if (!amountValid || !monthsValid || busy) return;
    setBusy(true);
    try {
      setResult(await eligibilityService.check(product.id, amount.trim(), Number(months)));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not check eligibility.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="eligibility-title"
      className="border-border bg-glass space-y-4 rounded-2xl border p-4"
    >
      <div>
        <h3 id="eligibility-title" className="text-text flex items-center gap-2 font-semibold">
          <Gauge size={17} aria-hidden="true" className="text-ink-green" />
          Check your eligibility
        </h3>
        <p className="text-text-dim mt-1 text-xs leading-relaxed">
          Compares your recorded transactions with what {product.lender.name} has published for this
          product. A preliminary check, not a loan decision.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <FormField label="Amount you want (GHS)" htmlFor="eligibility-amount">
          <Input
            id="eligibility-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 5000"
          />
        </FormField>
        <FormField label="Repay over (months)" htmlFor="eligibility-months">
          <Input
            id="eligibility-months"
            inputMode="numeric"
            value={months}
            onChange={(e) => setMonths(e.target.value)}
          />
        </FormField>
        <Button
          icon={Gauge}
          loading={busy}
          disabled={!amountValid || !monthsValid || readOnly}
          onClick={() => void run()}
        >
          Check
        </Button>
      </div>
      {result && <Result result={result} />}
    </section>
  );
}

function Result({ result }: { result: EligibilityResult }) {
  const openModal = useModalStore((s) => s.openModal);
  const style = OUTCOME[result.outcome];
  const Icon = style.icon;
  const { figures, repayment, affordability, period } = result;
  const needsIdentity = result.rules.some(
    (r) => r.metric === 'ghana_card_verified' && r.status !== 'met',
  );
  const needsRecords = result.rules.some(
    (r) => r.status === 'needs_info' && r.metric !== 'ghana_card_verified',
  );

  return (
    <div className="space-y-4" aria-live="polite">
      <div className={cn('rounded-2xl border p-4', style.tone)}>
        <Badge color={style.color}>
          <Icon size={12} aria-hidden="true" />
          {result.outcomeLabel}
        </Badge>
        <p className="text-text mt-2 text-sm leading-relaxed">{result.summary}</p>
        <p className="text-text-mute mt-2 text-xs">{result.disclaimer}</p>
      </div>

      <Block title="Your recorded history">
        <p className="text-text-mute mb-2 text-xs">
          {period.months} months, {formatGhanaDate(period.from)} to {formatGhanaDate(period.to)}
          {period.source === 'default'
            ? ' (the lender has not said how much history it assesses; 12 months shown)'
            : ' (the period the lender assesses)'}
          .
        </p>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Figure label="Documented income" value={money(figures.income)} />
          <Figure label="Documented expenses" value={money(figures.expenses)} />
          <Figure label="Net cash flow" value={money(figures.net)} />
          <Figure label="Average a month" value={money(figures.averageMonthlyNet)} />
          <Figure
            label="Entries"
            value={`${figures.entries}`}
            hint={`${figures.farmRecords} farm, ${figures.momoEntries} MoMo`}
          />
          <Figure
            label="Verified"
            value={figures.verifiedShare === null ? '—' : `${Number(figures.verifiedShare)}%`}
            hint="of income and costs"
          />
          <Figure
            label="Months with records"
            value={`${figures.monthsWithRecords} of ${period.months}`}
          />
          <Figure label="Recorded loans owed" value={money(figures.outstandingRecordedLoans)} />
        </dl>
      </Block>

      <Block title="Repayments on the lender's terms">
        {repayment.available ? (
          <p className="text-text-dim text-sm">
            {repayment.payments === 1
              ? `One payment of ${money(repayment.instalment)}`
              : `${repayment.payments} payments of ${money(repayment.instalment)}`}{' '}
            (
            {FREQUENCY_LABELS[repayment.frequency as keyof typeof FREQUENCY_LABELS] ??
              repayment.frequency}
            ). Total {money(repayment.totalRepayment)}, of which interest{' '}
            {money(repayment.totalInterest)}
            {Number(repayment.totalFees) > 0 ? `, plus fees of ${money(repayment.totalFees)}` : ''}.
          </p>
        ) : (
          <p className="text-text-dim text-sm">{repayment.reason}</p>
        )}
        {affordability.available ? (
          <div className="mt-2 text-sm">
            <p className="text-text-dim">
              Average monthly net cash flow {money(affordability.averageMonthlyNet)} − existing loan
              repayments {money(affordability.existingMonthlyDebtService)} − this loan{' '}
              {money(affordability.proposedAverageMonthly)} a month ={' '}
              <span
                className={cn(
                  'font-semibold',
                  Number(affordability.leftAfterRepayments) < 0 ? 'text-ink-red' : 'text-text',
                )}
              >
                {money(affordability.leftAfterRepayments)}
              </span>
              .
            </p>
            {affordability.note && (
              <p className="text-text-mute mt-1 text-xs">{affordability.note}</p>
            )}
          </div>
        ) : null}
      </Block>

      {result.rules.length > 0 && (
        <Block title="What the lender asks, checked">
          <ul className="space-y-2">
            {result.rules.map((rule) => {
              const status = RULE[rule.status];
              const StatusIcon = status.icon;
              return (
                <li key={rule.key} className="border-border rounded-xl border p-3">
                  <p className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-text font-semibold">{rule.name}</span>
                    <span
                      className={cn(
                        'flex items-center gap-1 text-xs font-semibold',
                        status.className,
                      )}
                    >
                      <StatusIcon size={13} aria-hidden="true" />
                      {status.label}
                      {!rule.required && ' (optional)'}
                    </span>
                  </p>
                  <p className="text-text-dim mt-1 text-xs leading-relaxed">{rule.explanation}</p>
                  {(rule.source || rule.reviewedOn) && (
                    <p className="text-text-mute mt-1 text-xs">
                      {rule.source}
                      {rule.source && rule.reviewedOn ? ' · ' : ''}
                      {rule.reviewedOn ? `confirmed ${formatGhanaDate(rule.reviewedOn)}` : ''}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </Block>
      )}

      {result.toProvide.length > 0 && (
        <Block title="To provide when you apply">
          <ul className="text-text-dim list-disc space-y-1 pl-5 text-sm">
            {result.toProvide.map((item) => (
              <li key={item.key}>
                {item.name}
                {item.required ? '' : ' (optional)'}
                {item.conditional ? ' (only in some cases)' : ''}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {result.notes.length > 0 && (
        <ul className="text-text-mute space-y-1 text-xs">
          {result.notes.map((note) => (
            <li key={note}>• {note}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        {needsRecords && (
          <Button size="sm" variant="ghost" icon={FileText} onClick={() => openModal('record')}>
            Add a record
          </Button>
        )}
        {needsIdentity && (
          <Link
            href="/settings/verification"
            className="text-ink-green inline-flex min-h-9 items-center text-sm font-semibold hover:underline"
          >
            Ghana Card verification
          </Link>
        )}
        <Link
          href="/reports"
          className="text-ink-green inline-flex min-h-9 items-center text-sm font-semibold hover:underline"
        >
          Download your transaction statement (PDF)
        </Link>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-text mb-2 text-sm font-semibold">{title}</p>
      {children}
    </div>
  );
}

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border-border rounded-xl border p-2.5">
      <dt className="text-text-mute text-xs">{label}</dt>
      <dd className="text-text text-sm font-semibold tabular-nums">{value}</dd>
      {hint && <dd className="text-text-mute text-xs">{hint}</dd>}
    </div>
  );
}
