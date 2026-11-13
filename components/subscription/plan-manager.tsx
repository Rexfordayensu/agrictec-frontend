'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Bot,
  CalendarDays,
  Check,
  CreditCard,
  Crown,
  Database,
  Download,
  FileText,
  Layers,
  Maximize2,
  MoreHorizontal,
  ScanLine,
  Settings2,
  Smartphone,
  Sprout,
  Stethoscope,
  Wallet,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useSubscription } from '@/hooks/use-subscription';
import { FEATURE_NAMES, normalizePlans, planAccess } from '@/lib/subscriptions/plans';
import { formatGHS } from '@/lib/format';
import { saveBlob } from '@/lib/loans/application-status';
import { cn } from '@/lib/utils';
import { subscriptionService } from '@/services/subscription.service';
import { useReadOnly } from '@/lib/read-only';
import { usePlatformStore } from '@/store/platform-store';
import { useSubscriptionStore } from '@/store/subscription-store';
import type { Plan } from '@/types/admin';
import type { BillingItem, MockPaymentMethod, PlanFeature } from '@/types/subscription';

const dateLabel = (value: string) =>
  new Date(value).toLocaleDateString('en-GH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Accra',
  });

export function PlanManager() {
  const savedPlans = usePlatformStore((s) => s.plans);
  const plans = normalizePlans(savedPlans);
  const { plan: current, snapshot, ready } = useSubscription();
  const checkout = useSubscriptionStore((s) => s.checkoutMock);
  const startCheckout = useSubscriptionStore((s) => s.startCheckout);
  // "paystack": Paystack (test or live key); "demo": simulated, local development only;
  // "off": the live platform has no payment provider yet, so paid plans can't be bought.
  const mode = usePlatformStore((s) => s.payments.mode);
  const live = mode === 'paystack';
  const off = mode === 'off';
  const readOnly = useReadOnly();
  const [selectedId, setSelectedId] = useState<Plan['id'] | null>(null);
  const [method, setMethod] = useState<MockPaymentMethod>('mobile-money');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const selected = plans.find((p) => p.id === selectedId);
  const payment = snapshot?.subscription.payment;
  const confirming = useRef(false);

  // Back from Paystack (?reference=…): ask the API how the payment went, once.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') ?? params.get('trxref');
    if (!reference || confirming.current || !ready) return;
    confirming.current = true;
    params.delete('reference');
    params.delete('trxref');
    const rest = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : ''));
    useSubscriptionStore
      .getState()
      .confirmPayment(reference)
      .then((next) => {
        if (
          next.subscription.payment?.reference === reference &&
          next.subscription.payment.status === 'paid'
        )
          toast.success('Payment received. Your plan is active.');
        else
          toast.info('Your payment is still being processed', {
            description:
              'Approve it on your phone if asked. Your plan switches on as soon as it is paid.',
          });
      })
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'Could not check this payment.'),
      );
  }, [ready]);

  function choose(plan: Plan) {
    setConsent(false);
    setSelectedId(plan.id);
  }

  async function confirm() {
    if (!selected || !consent || busy || readOnly) return;
    setBusy(true);
    try {
      if (live && selected.id !== 'free') {
        // Paystack's secure page takes the payment, then sends the farmer back here.
        window.location.assign(await startCheckout(selected.id, method));
        return;
      }
      await checkout(selected.id, method);
      setSelectedId(null);
      toast.success(
        selected.id === 'free' ? 'Switched to Free' : `${selected.name} activated in demo mode`,
        { description: 'No money was charged.' },
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not activate this plan.');
    } finally {
      setBusy(false);
    }
  }

  const remaining = snapshot?.creditsRemaining;
  const limit = snapshot?.creditsLimit;
  const visible = plans.filter((p) => p.active || p.id === current.id);

  return (
    <div className="@container/plans max-w-full min-w-0 space-y-5">
      <section
        aria-labelledby="plans-title"
        className="rounded-card relative isolate overflow-hidden p-6 text-white sm:p-8"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-cover"
          style={{
            backgroundImage: "url('/images/weather/weather-banner.jpg')",
            backgroundPosition: '60% 60%',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              'linear-gradient(90deg, rgba(4,60,40,0.97) 0%, rgba(6,82,52,0.9) 45%, rgba(6,82,52,0.3) 75%, rgba(6,82,52,0.1) 100%)',
          }}
        />
        <div className="flex items-center gap-6">
          <span className="hidden size-24 shrink-0 items-center justify-center rounded-3xl bg-[#dff5e8] text-[#0b6b40] @md/plans:inline-flex">
            <Wallet size={44} aria-hidden="true" />
          </span>
          <span aria-hidden="true" className="hidden h-20 w-px bg-white/40 @md/plans:block" />
          <div className="min-w-0">
            <h2
              id="plans-title"
              className="text-display leading-tight font-extrabold tracking-tight"
            >
              Plans &amp; Billing
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/90">
              Choose a plan that fits your farm and unlock more tools to grow, track and access
              financing.
            </p>
          </div>
        </div>
      </section>

      <section
        aria-label="Your current plan"
        className="rounded-card border-accent/25 bg-accent/6 flex flex-wrap items-center gap-x-6 gap-y-4 border p-4 sm:p-5"
      >
        <div className="flex shrink-0 items-center gap-4 whitespace-nowrap">
          <span className="bg-accent/15 text-ink-green inline-flex size-14 shrink-0 items-center justify-center rounded-2xl">
            <Crown size={28} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-text-dim text-sm">Your current plan</p>
            <p className="text-text text-2xl font-extrabold">{current.name}</p>
            <span className="bg-accent/15 text-ink-green mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold">
              <span aria-hidden="true" className="bg-accent size-2 rounded-full" />
              {snapshot?.subscription.expiresAt
                ? `Active until ${dateLabel(snapshot.subscription.expiresAt)}`
                : 'No expiry'}
            </span>
          </div>
        </div>
        <div className="grid min-w-0 flex-1 basis-[20rem] grid-cols-3 gap-3">
          <Stat
            icon={Database}
            value={remaining === null ? 'Unlimited' : String(remaining ?? 0)}
            label="AI credits left"
          />
          <Stat
            icon={ScanLine}
            value={remaining === null ? 'Unlimited' : String(Math.floor((remaining ?? 0) / 5))}
            label="Crop scans left"
          />
          <Stat
            icon={FileText}
            value={limit === null ? 'Unlimited' : String(limit ?? 0)}
            label="Shared credits/month"
          />
        </div>
        <a
          href="#choose-plan"
          className="border-accent/50 text-ink-green hover:bg-accent/8 inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold @3xl/plans:w-auto"
        >
          <Settings2 size={16} aria-hidden="true" /> Manage plan
        </a>
      </section>

      <p className="text-text-mute -mt-2 px-1 text-xs">
        {live
          ? 'Secure payments by Paystack: MTN MoMo, Telecel Cash, AirtelTigo Money or card. Plans last one month and do not renew automatically.'
          : off
            ? 'Paid plans aren’t available yet: online payments are not switched on. The Free plan works as usual.'
            : 'Demo payments: no money is charged and no payment details are collected.'}{' '}
        One assistant question uses 1 credit, one crop scan uses 5. Credits reset on the 1st of each
        month
        {snapshot
          ? ` (next: ${dateLabel(snapshot.resetsAt)}; used this month: ${snapshot.creditsUsed})`
          : ''}
        .
      </p>

      <section id="choose-plan" aria-labelledby="choose-title" className="scroll-mt-24">
        <h2 id="choose-title" className="text-text text-xl font-bold">
          Choose a plan for your farm
        </h2>
        <p className="text-text-dim mt-1 text-sm">
          All plans keep your farm records, MoMo tracking, AgriCtec score, loan product comparisons
          and market information.
        </p>
        <div className="mt-4 grid min-w-0 grid-cols-1 items-stretch gap-4 @xl/plans:grid-cols-2 @6xl/plans:grid-cols-4">
          {visible.map((plan) => {
            const access = planAccess(plan);
            const isCurrent = plan.id === current.id;
            const Icon = PLAN_ICON[plan.id] ?? Sprout;
            const missing = (Object.keys(FEATURE_NAMES) as PlanFeature[]).filter((f) => !access[f]);
            return (
              <article
                key={plan.id}
                className={cn(
                  'relative flex min-w-0 flex-col rounded-3xl border p-5',
                  isCurrent ? 'border-accent bg-accent/6 border-2' : 'border-border bg-glass',
                )}
              >
                {isCurrent && (
                  <span className="absolute top-4 right-4 rounded-full bg-[#0b6b40] px-2.5 py-0.5 text-xs font-semibold text-white">
                    Current Plan
                  </span>
                )}
                <span className="bg-accent/12 text-ink-green inline-flex size-11 items-center justify-center rounded-xl">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h3 className="text-text mt-3 text-xl font-bold">{plan.name}</h3>
                <p className="text-text mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold">{formatGHS(plan.priceGHS)}</span>
                  <span className="text-text-dim text-sm">/month</span>
                </p>
                <p className="text-text-dim mt-2 text-sm leading-snug">{TAGLINE[plan.id] ?? ''}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="text-text flex items-start gap-2">
                      <Check
                        size={16}
                        aria-hidden="true"
                        className="text-ink-green mt-0.5 shrink-0"
                      />
                      {feature}
                    </li>
                  ))}
                  {missing.map((feature) => (
                    <li key={feature} className="text-text-mute flex items-start gap-2">
                      <X size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                      {FEATURE_NAMES[feature]}
                      <span className="sr-only"> not included</span>
                    </li>
                  ))}
                </ul>
                <Button
                  icon={isCurrent ? Check : undefined}
                  variant={isCurrent ? 'primary' : 'ghost'}
                  className="mt-5 w-full min-w-0 whitespace-normal"
                  mutates
                  disabled={
                    !ready || readOnly || isCurrent || !plan.active || (off && plan.id !== 'free')
                  }
                  onClick={() => choose(plan)}
                >
                  {isCurrent
                    ? 'Your Current Plan'
                    : plan.id === 'free'
                      ? 'Switch to Free'
                      : off
                        ? 'Not available yet'
                        : `Choose ${plan.name}`}
                </Button>
              </article>
            );
          })}
        </div>
      </section>

      <Comparison plans={visible} currentId={current.id} />
      <BillingHistory refreshKey={payment?.reference ?? ''} />

      <Modal
        open={Boolean(selected)}
        onClose={() => {
          if (!busy) setSelectedId(null);
        }}
        title={selected?.id === 'free' ? 'Switch to Free' : live ? 'Checkout' : 'Demo checkout'}
        size="md"
        className="@container/checkout min-w-0"
        closeOnBackdrop={!busy}
        footer={
          selected && (
            <>
              <Button variant="ghost" disabled={busy} onClick={() => setSelectedId(null)}>
                Cancel
              </Button>
              <Button
                mutates
                disabled={!consent || readOnly}
                loading={busy}
                onClick={() => void confirm()}
                className="min-w-0 whitespace-normal"
              >
                <span className="min-w-0 break-words">
                  {selected.id === 'free'
                    ? 'Confirm switch to Free'
                    : live
                      ? `Pay ${formatGHS(selected.priceGHS)} with Paystack`
                      : `Simulate ${formatGHS(selected.priceGHS)} payment`}
                </span>
              </Button>
            </>
          )
        }
      >
        {selected && (
          <div className="min-w-0 space-y-4 sm:space-y-5">
            <p className="text-text font-semibold break-words">
              {selected.name} · {formatGHS(selected.priceGHS)} per month
            </p>
            <p className="text-text-dim text-sm">
              {selected.id === 'free'
                ? 'Paid tools will lock immediately. Your saved farm data stays available.'
                : live
                  ? 'You will pay on Paystack’s secure page and come back here. Your plan lasts one month and does not renew automatically.'
                  : 'This is a payment simulation. Do not enter real card or mobile money details. Your demo plan lasts one month and does not renew automatically.'}
            </p>
            {selected.id !== 'free' && (
              <fieldset>
                <legend className="text-text mb-2 text-sm font-semibold">
                  {live ? 'Pay with' : 'Demo payment method'}
                </legend>
                <div className="grid min-w-0 grid-cols-1 gap-3 @sm/checkout:grid-cols-2">
                  {(['mobile-money', 'card'] as const).map((option) => (
                    <label
                      key={option}
                      className={cn(
                        'flex min-h-14 min-w-0 cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm',
                        method === option ? 'border-accent bg-accent/10' : 'border-border',
                      )}
                    >
                      <input
                        type="radio"
                        name="mock-payment-method"
                        value={option}
                        checked={method === option}
                        disabled={busy}
                        onChange={() => setMethod(option)}
                        className="size-4 shrink-0"
                      />
                      {option === 'card' ? (
                        <CreditCard size={16} aria-hidden="true" className="shrink-0" />
                      ) : (
                        <Smartphone size={16} aria-hidden="true" className="shrink-0" />
                      )}
                      <span className="min-w-0 break-words">
                        {option === 'card' ? 'Card' : 'Mobile money'}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <label className="text-text-dim flex min-w-0 cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={consent}
                disabled={busy}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-1 size-4 shrink-0"
              />
              <span className="min-w-0 break-words">
                {selected.id === 'free'
                  ? 'I understand paid features will become unavailable.'
                  : live
                    ? `I agree to pay ${formatGHS(selected.priceGHS)} for one month of ${selected.name}.`
                    : 'I understand this simulates a payment and no money will be taken.'}
              </span>
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}

const PLAN_ICON: Record<string, LucideIcon> = {
  free: Sprout,
  basic: Layers,
  premium: Crown,
  advanced: Zap,
};

const TAGLINE: Record<string, string> = {
  free: 'Get started and keep basic farm records.',
  basic: 'Essential tools for individual farmers.',
  premium: 'Most popular for growing farmers.',
  advanced: 'Full access for larger and commercial farms.',
};

function Stat({ icon: Icon, value, label }: { icon: LucideIcon; value: string; label: string }) {
  return (
    <div className="border-border/70 min-w-0 pl-3 first:pl-0 @3xl/plans:pl-5 @3xl/plans:first:pl-0 [&:not(:first-child)]:border-l">
      <p className="text-text flex items-center gap-2 text-xl font-extrabold tabular-nums sm:text-2xl">
        <Icon size={22} aria-hidden="true" className="text-ink-green shrink-0" />
        {value}
      </p>
      <p className="text-text-dim mt-0.5 text-sm">{label}</p>
    </div>
  );
}

const ROW_ICONS: Record<PlanFeature, LucideIcon> = {
  pdfReports: FileText,
  aiAssistant: Bot,
  cropDoctor: Stethoscope,
  yieldPredictor: Sprout,
};

/** Every plan's tools side by side, from the plans the admin publishes. */
function Comparison({ plans, currentId }: { plans: Plan[]; currentId: string }) {
  const yes = <Check size={18} aria-label="Included" className="text-ink-green mx-auto" />;
  const no = (
    <span aria-label="Not included" className="text-text-mute">
      —
    </span>
  );
  return (
    <section
      aria-labelledby="compare-title"
      className="rounded-card border-border bg-glass border p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="compare-title" className="text-text text-xl font-bold">
          Feature comparison
        </h2>
        <a
          href="#choose-plan"
          className="border-border text-text hover:bg-glass-strong inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold"
        >
          <Maximize2 size={15} aria-hidden="true" /> Compare plans
        </a>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-136 text-sm">
          <thead>
            <tr className="bg-glass-strong">
              <th className="text-text rounded-l-xl px-4 py-3 text-left font-bold">Features</th>
              {plans.map((plan, i) => (
                <th
                  key={plan.id}
                  className={cn('px-2 py-3', i === plans.length - 1 && 'rounded-r-xl')}
                >
                  <span
                    className={cn(
                      'inline-block min-w-20 rounded-full px-3 py-1 text-sm font-semibold',
                      plan.id === currentId ? 'bg-[#0b6b40] text-white' : 'bg-accent/10 text-text',
                    )}
                  >
                    {plan.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            <tr>
              <td className="text-text px-4 py-2.5">
                <span className="inline-flex items-center gap-2.5">
                  <FileText size={16} aria-hidden="true" className="text-text-dim" /> Farm records
                  &amp; MoMo tracking
                </span>
              </td>
              {plans.map((plan) => (
                <td key={plan.id} className="px-2 py-2.5 text-center">
                  {yes}
                </td>
              ))}
            </tr>
            {(Object.keys(FEATURE_NAMES) as PlanFeature[]).map((feature) => {
              const Icon = ROW_ICONS[feature];
              return (
                <tr key={feature}>
                  <td className="text-text px-4 py-2.5">
                    <span className="inline-flex items-center gap-2.5">
                      <Icon size={16} aria-hidden="true" className="text-text-dim" />{' '}
                      {FEATURE_NAMES[feature]}
                    </span>
                  </td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="px-2 py-2.5 text-center">
                      {planAccess(plan)[feature] ? yes : no}
                    </td>
                  ))}
                </tr>
              );
            })}
            <tr>
              <td className="text-text px-4 py-2.5">
                <span className="inline-flex items-center gap-2.5">
                  <Database size={16} aria-hidden="true" className="text-text-dim" /> AI credits
                  (per month)
                </span>
              </td>
              {plans.map((plan) => (
                <td key={plan.id} className="text-text px-2 py-2.5 text-center font-semibold">
                  {plan.aiCredits === null ? 'Unlimited' : plan.aiCredits ? plan.aiCredits : no}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

const STATUS_STYLE: Record<BillingItem['status'], { label: string; className: string }> = {
  paid: { label: 'Paid', className: 'bg-accent/15 text-ink-green' },
  simulated: { label: 'Simulated', className: 'bg-accent/15 text-ink-green' },
  pending: { label: 'Pending', className: 'bg-gold/20 text-ink-gold' },
  failed: { label: 'Failed', className: 'bg-danger/15 text-ink-red' },
};

/** The farmer's payments (GET /me/subscription/payments) with a PDF receipt for each. */
function BillingHistory({ refreshKey }: { refreshKey: string }) {
  const [items, setItems] = useState<BillingItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    subscriptionService.payments(controller.signal).then(
      (list) => {
        setItems(list);
        setError(null);
      },
      (cause: unknown) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'Could not load your payments.');
      },
    );
    return () => controller.abort();
  }, [refreshKey]);

  async function download(reference: string) {
    setBusy(reference);
    try {
      saveBlob(await subscriptionService.receipt(reference), `AgriCtec_Receipt_${reference}.pdf`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not download the receipt.');
    } finally {
      setBusy(null);
    }
  }

  const latest = items?.find((i) => i.status === 'paid' || i.status === 'simulated');
  return (
    <section
      aria-labelledby="billing-title"
      className="rounded-card border-border bg-glass @container border p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="billing-title" className="text-text text-xl font-bold">
            Billing history
          </h2>
          <p className="text-text-dim text-sm">Your subscription payments and receipts.</p>
        </div>
        {latest && (
          <Button
            variant="ghost"
            icon={Download}
            loading={busy === latest.reference}
            onClick={() => void download(latest.reference)}
          >
            Download receipt
          </Button>
        )}
      </div>
      {error ? (
        <p role="alert" className="text-text-dim mt-4 text-sm">
          {error}
        </p>
      ) : items === null ? (
        <p role="status" className="text-text-dim mt-4 text-sm">
          Loading your payments…
        </p>
      ) : items.length === 0 ? (
        <p className="text-text-dim mt-4 text-sm">
          No payments yet. Payments for paid plans appear here with a receipt.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-xl text-sm">
            <thead>
              <tr className="bg-glass-strong text-text text-left">
                <th className="rounded-l-xl px-4 py-3 font-semibold">Date</th>
                <th className="px-2 py-3 font-semibold">Plan</th>
                <th className="px-2 py-3 font-semibold">Amount</th>
                <th className="px-2 py-3 font-semibold">Status</th>
                <th className="px-2 py-3 font-semibold">Reference</th>
                <th className="rounded-r-xl px-2 py-3">
                  <span className="sr-only">Receipt</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {items.map((item) => {
                const style = STATUS_STYLE[item.status];
                return (
                  <tr key={item.reference}>
                    <td className="text-text px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays size={16} aria-hidden="true" className="text-text-dim" />
                        {dateLabel(item.paidAt ?? item.createdAt)}
                      </span>
                    </td>
                    <td className="text-text px-2 py-3">
                      <span className="inline-flex items-center gap-2">
                        <Crown size={15} aria-hidden="true" className="text-ink-green" />{' '}
                        {item.planName}
                      </span>
                    </td>
                    <td className="text-text px-2 py-3 font-semibold tabular-nums">
                      {item.currency} {Number(item.amountGHS).toLocaleString('en-GH')}
                    </td>
                    <td className="px-2 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          style.className,
                        )}
                      >
                        {style.label}
                      </span>
                    </td>
                    <td className="text-text-dim max-w-56 truncate px-2 py-3 font-mono text-xs">
                      {item.reference}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <button
                        type="button"
                        aria-label={`Download the receipt for ${item.reference}`}
                        title="Download receipt"
                        disabled={busy === item.reference}
                        onClick={() => void download(item.reference)}
                        className="text-text-dim hover:bg-glass-strong hover:text-text inline-flex size-9 items-center justify-center rounded-lg disabled:opacity-50"
                      >
                        <MoreHorizontal size={18} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
