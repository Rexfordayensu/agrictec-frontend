'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, CreditCard, Smartphone, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { useSubscription } from '@/hooks/use-subscription';
import { FEATURE_NAMES, normalizePlans, planAccess } from '@/lib/subscriptions/plans';
import { formatGHS } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useReadOnly } from '@/lib/read-only';
import { usePlatformStore } from '@/store/platform-store';
import { useSubscriptionStore } from '@/store/subscription-store';
import type { Plan } from '@/types/admin';
import type { MockPaymentMethod, PlanFeature } from '@/types/subscription';

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
  // "paystack": real payments; "demo": simulated (development only).
  const live = usePlatformStore((s) => s.payments.mode === 'paystack');
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
        if (next.subscription.payment?.reference === reference && next.subscription.payment.status === 'paid')
          toast.success('Payment received. Your plan is active.');
        else
          toast.info('Your payment is still being processed', {
            description: 'Approve it on your phone if asked. Your plan switches on as soon as it is paid.',
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

  return (
    <div className="@container/plans max-w-full min-w-0 space-y-4 sm:space-y-5">
      {live ? (
        <div className="border-accent/30 bg-accent/10 text-text-dim rounded-2xl border p-4 text-sm">
          <p className="text-text font-semibold">Secure payments by Paystack</p>
          <p className="mt-1">
            Pay with MTN MoMo, Telecel Cash, AirtelTigo Money or a card on Paystack&apos;s secure
            page. AgriCtec never sees your card or wallet details. Plans last one month and do not
            renew automatically.
          </p>
        </div>
      ) : (
        <div className="border-gold/30 bg-gold/10 text-text-dim rounded-2xl border p-4 text-sm">
          <p className="text-text font-semibold">Demo payments · no money is charged</p>
          <p className="mt-1">
            Try a subscription with a simulated mobile money or card payment. No payment details
            are collected.
          </p>
        </div>
      )}
      <Card className="min-w-0 rounded-3xl p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-text-mute text-xs">Your current plan</p>
            <h3 className="text-ink-green font-display mt-1 text-2xl font-bold break-words">
              {current.name}
            </h3>
            {snapshot?.subscription.expiresAt && (
              <p className="text-text-dim mt-2 text-xs">
                Active until {dateLabel(snapshot.subscription.expiresAt)}. No automatic renewal.
              </p>
            )}
          </div>
          <Badge color={snapshot?.subscription.mode === 'paystack' ? 'green' : 'gold'} className="max-w-full whitespace-normal">
            {snapshot?.subscription.mode === 'paystack' ? 'Paid subscription' : 'Demo subscription'}
          </Badge>
        </div>
        <div className="border-border mt-4 border-t pt-4">
          <p className="text-text text-sm font-semibold">
            {snapshot?.creditsRemaining === null
              ? 'Unlimited AI credits'
              : `${snapshot?.creditsRemaining ?? 0} AI credits remaining`}
          </p>
          <p className="text-text-mute mt-1 text-xs">
            One assistant question uses 1 credit. One crop scan uses 5. Yield estimates and PDFs use
            no credits.
          </p>
          <p className="text-text-mute mt-1 text-xs">
            Premium includes {plans.find((p) => p.id === 'premium')?.aiCredits ?? 100} credits
            shared across questions and scans. Credits reset on the first day of each month;
            changing plans does not reset usage.
          </p>
          {snapshot && (
            <p className="text-text-mute mt-1 text-xs">
              Used this month: {snapshot.creditsUsed}. Next reset: {dateLabel(snapshot.resetsAt)}.
            </p>
          )}
        </div>
      </Card>
      <div>
        <h3 className="text-text text-lg font-bold">Choose what fits your farm</h3>
        <p className="text-text-dim mt-1 text-sm">
          All plans keep your farm records, MoMo tracking, credit score, loan comparisons and market
          information.
        </p>
      </div>
      <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 @xl/plans:grid-cols-2 @6xl/plans:grid-cols-4">
        {plans
          .filter((p) => p.active || p.id === current.id)
          .map((plan) => {
            const access = planAccess(plan);
            const isCurrent = plan.id === current.id;
            return (
              <article
                key={plan.id}
                className={cn(
                  'flex min-w-0 flex-col rounded-3xl border p-4 sm:p-5',
                  plan.id === 'premium' ? 'border-accent/50 bg-accent/5' : 'border-border bg-glass',
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-text font-display min-w-0 text-xl font-bold break-words">
                    {plan.name}
                  </h4>
                  {isCurrent ? (
                    <Badge color="green" className="max-w-full whitespace-normal">
                      Current plan
                    </Badge>
                  ) : plan.id === 'premium' ? (
                    <Badge color="purple" className="max-w-full whitespace-normal">
                      For growing farms
                    </Badge>
                  ) : null}
                </div>
                <p className="text-text mt-3 flex flex-wrap items-baseline gap-x-1 gap-y-1 font-bold">
                  <span className="min-w-0 text-3xl break-words">{formatGHS(plan.priceGHS)}</span>
                  <span className="text-text-mute text-sm font-normal">/ month</span>
                </p>
                <p className="text-text-dim mt-3 text-sm">
                  {plan.id === 'advanced'
                    ? 'Unlimited AI credits'
                    : plan.id === 'premium'
                      ? `${plan.aiCredits ?? 100} AI credits / month`
                      : 'AI tools not included'}
                </p>
                <p className="text-text-mute mt-2 text-xs leading-relaxed break-words">
                  {plan.features.join(' · ')}
                </p>
                <ul className="mt-4 flex-1 space-y-2.5">
                  {(Object.keys(FEATURE_NAMES) as PlanFeature[]).map((feature) => (
                    <li key={feature} className="flex min-w-0 items-start gap-2 text-sm">
                      {access[feature] ? (
                        <Check
                          size={16}
                          className="text-ink-green mt-0.5 shrink-0"
                          aria-hidden="true"
                        />
                      ) : (
                        <span
                          className="text-text-mute w-4 shrink-0 text-center"
                          aria-hidden="true"
                        >
                          −
                        </span>
                      )}
                      <span
                        className={cn(
                          'min-w-0 break-words',
                          access[feature] ? 'text-text' : 'text-text-mute',
                        )}
                      >
                        {FEATURE_NAMES[feature]}
                        {!access[feature] && ' not included'}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  icon={Sparkles}
                  variant={plan.id === 'premium' ? 'primary' : 'ghost'}
                  className="mt-5 w-full min-w-0 px-3 leading-snug whitespace-normal sm:px-4"
                  mutates
                  disabled={!ready || readOnly || isCurrent || !plan.active}
                  onClick={() => choose(plan)}
                >
                  <span className="min-w-0 break-words">
                    {isCurrent
                      ? 'Your current plan'
                      : plan.id === 'free'
                        ? 'Switch to Free'
                        : `Choose ${plan.name}`}
                  </span>
                </Button>
              </article>
            );
          })}
      </div>
      {payment && (
        <Card className="min-w-0 rounded-2xl p-4 sm:p-6">
          <h3 className="text-text font-semibold">
            {payment.status === 'paid' ? 'Latest receipt' : 'Latest demo receipt'}
          </h3>
          <dl className="text-text-dim mt-3 grid min-w-0 grid-cols-1 gap-4 text-sm @lg/plans:grid-cols-2 [&_dd]:break-words [&>div]:min-w-0">
            <div>
              <dt className="text-text-mute">Status</dt>
              <dd>
                {payment.status === 'paid'
                  ? `Paid${payment.channel ? ` by ${payment.channel === 'mobile_money' ? 'mobile money' : payment.channel}` : ''}${payment.brand ? ` (${payment.brand.toUpperCase()})` : ''}`
                  : 'Simulated — no money charged'}
              </dd>
            </div>
            <div>
              <dt className="text-text-mute">Plan / amount</dt>
              <dd>
                {plans.find((p) => p.id === payment.planId)?.name} · {formatGHS(payment.amountGHS)}
              </dd>
            </div>
            <div>
              <dt className="text-text-mute">Reference</dt>
              <dd className="font-mono text-xs break-all">{payment.reference}</dd>
            </div>
            <div>
              <dt className="text-text-mute">Date</dt>
              <dd>{dateLabel(payment.createdAt)}</dd>
            </div>
          </dl>
        </Card>
      )}
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
