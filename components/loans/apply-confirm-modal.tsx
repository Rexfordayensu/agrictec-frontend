'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CircleCheck, Copy, PartyPopper, Send, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { findPartner } from '@/components/loans/loan-schema';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { useGhanaCardStatus } from '@/hooks/use-ghana-card';
import { checkEligibility, monthlyRepayment } from '@/lib/calculations/loan';
import { formatGHS } from '@/lib/format';
import { useFarmStore } from '@/store/farm-store';
import { useLoanStore, type LoanDraft } from '@/store/loan-store';
import { usePlatformStore } from '@/store/platform-store';
import { useProfileStore } from '@/store/profile-store';
import type { LoanApplication } from '@/types';

/** The review-and-submit step. Eligibility is always re-checked here for the chosen lender. */
function ApplyContent({ draft, onClose }: { draft: LoanDraft; onClose: () => void }) {
  const records = useFarmStore((s) => s.records);
  const name = useProfileStore((s) => s.profile?.name.trim()) || 'Not provided';
  const { credit, creditLabel, loanRules } = useFarmStats();
  const lenders = usePlatformStore((s) => s.lenders);
  const submit = useLoanStore((s) => s.submit);
  const ghanaCard = useGhanaCardStatus();
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [application, setApplication] = useState<LoanApplication | null>(null);

  const partner = findPartner(draft.partnerId, lenders);
  if (!partner) return null;

  const eligibility = checkEligibility({
    amount: draft.amount,
    records,
    score: credit.score,
    partner,
    rules: loanRules,
    ghanaCard,
  });
  const repayment = monthlyRepayment(draft.amount, partner.rate, draft.months);

  async function handleSubmit() {
    if (!partner) return;
    setSending(true);
    try {
      const sent = await submit(
        {
          partnerId: partner.id,
          amount: draft.amount,
          purpose: draft.purpose,
          months: draft.months,
          monthly: repayment.monthly,
        },
        credit.score,
      );
      setApplication(sent);
      toast.success(`Application sent to ${partner.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send the application');
    } finally {
      setSending(false);
    }
  }

  if (application) {
    return (
      <div className="animate-fade-in py-4 text-center">
        <span className="bg-accent/15 text-ink-green mx-auto inline-flex size-16 items-center justify-center rounded-full">
          <PartyPopper size={30} aria-hidden="true" />
        </span>
        <h3 className="font-display text-text mt-4 text-xl font-bold">Application sent</h3>
        <p className="text-text-dim mt-1 text-sm">
          {partner.name} will review your AgriCtec records and contact you.
        </p>
        <div className="border-border bg-glass mx-auto mt-5 flex max-w-xs items-center justify-between gap-3 rounded-xl border px-4 py-3">
          <div className="text-left">
            <p className="text-text-mute text-[11px]">Reference number</p>
            <p className="text-text font-mono text-lg font-bold">{application.reference}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(application.reference);
              toast.success('Reference copied');
            }}
            aria-label="Copy reference number"
            className="text-text-dim hover:bg-glass-strong hover:text-text inline-flex size-10 items-center justify-center rounded-lg"
          >
            <Copy size={16} aria-hidden="true" />
          </button>
        </div>
        <ol className="text-text-dim mx-auto mt-5 max-w-sm space-y-2 text-left text-sm">
          <li>1. The lender reviews your financial records (usually 3–5 days).</li>
          <li>2. They may call to verify your farm and identity.</li>
          <li>3. Keep recording sales to strengthen your file.</li>
        </ol>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button
            onClick={() => {
              onClose();
              useLoanStore.getState().setTab('applications');
            }}
          >
            Track application
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  const summary: [string, string][] = [
    ['Lender', `${partner.name} (${partner.rate}% p.a.)`],
    ['Amount', formatGHS(draft.amount)],
    ['Purpose', draft.purpose],
    ['Term', `${draft.months} months`],
    ['Monthly payment', formatGHS(repayment.monthly)],
    ['Farmer', name],
    ['Credit score', `${credit.score} (${creditLabel})`],
  ];

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {summary.map(([label, value]) => (
          <div key={label} className="border-border bg-glass rounded-xl border px-3 py-2.5">
            <dt className="text-text-mute text-[11px]">{label}</dt>
            <dd className="text-text text-sm font-semibold break-words">{value}</dd>
          </div>
        ))}
      </dl>

      {eligibility.eligible ? (
        <p className="border-accent/40 bg-accent/10 text-ink-green flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold">
          <CircleCheck size={16} aria-hidden="true" /> You meet {partner.name}&apos;s requirements
        </p>
      ) : (
        <div className="border-danger/40 bg-danger/5 rounded-xl border p-3.5" role="alert">
          <p className="text-ink-red flex items-center gap-2 text-sm font-bold">
            <XCircle size={16} aria-hidden="true" /> Not eligible yet
          </p>
          <ul className="text-text mt-2 list-disc space-y-1 pl-5 text-sm">
            {eligibility.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <Link
            href="/records"
            onClick={onClose}
            className="text-ink-green mt-2 inline-block text-sm font-semibold"
          >
            Improve my records
          </Link>
        </div>
      )}

      <label className="border-border bg-glass flex cursor-pointer items-start gap-3 rounded-xl border p-3.5">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          disabled={!eligibility.eligible}
          className="mt-0.5 size-5 shrink-0 accent-[#10b981]"
        />
        <span className="text-text text-sm">
          I agree to share my AgriCtec financial records with {partner.name}
        </span>
      </label>

      <div className="border-border flex flex-wrap justify-end gap-2 border-t pt-4">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          icon={Send}
          loading={sending}
          disabled={!eligibility.eligible || !consent}
          onClick={handleSubmit}
        >
          Submit application
        </Button>
      </div>
    </div>
  );
}

export function ApplyConfirmModal() {
  const draft = useLoanStore((s) => s.confirm);
  const closeConfirm = useLoanStore((s) => s.closeConfirm);
  const lenders = usePlatformStore((s) => s.lenders);
  const partner = draft ? findPartner(draft.partnerId, lenders) : undefined;

  return (
    <Modal
      open={draft !== null}
      onClose={closeConfirm}
      title={partner ? `Apply to ${partner.name}` : 'Apply for a loan'}
    >
      {draft && (
        // Re-mount per draft so consent and success state always start fresh.
        <ApplyContent
          key={`${draft.partnerId}-${draft.amount}-${draft.months}`}
          draft={draft}
          onClose={closeConfirm}
        />
      )}
    </Modal>
  );
}
