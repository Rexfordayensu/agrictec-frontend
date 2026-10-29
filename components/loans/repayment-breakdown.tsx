import { formatGHS } from '@/lib/format';
import type { LoanPartner, RepaymentResult } from '@/types';

/** Amortized repayment details. Estimates only; the lender sets final terms. */
export function RepaymentBreakdown({
  amount,
  months,
  partner,
  repayment,
}: {
  amount: number;
  months: number;
  partner: LoanPartner;
  repayment: RepaymentResult;
}) {
  const principalShare = repayment.total > 0 ? (amount / repayment.total) * 100 : 100;
  const rows: [string, string][] = [
    ['Loan amount', formatGHS(amount)],
    ['Interest rate', `${partner.rate}% per year`],
    ['Term', `${months} months`],
  ];

  return (
    <div className="space-y-4">
      <div className="border-accent/30 bg-accent/10 rounded-2xl border p-4 text-center">
        <p className="text-text-dim text-xs">Monthly payment</p>
        <p className="text-ink-green text-3xl font-extrabold tracking-tight tabular-nums">
          {formatGHS(repayment.monthly)}
        </p>
        <p className="text-text-mute text-xs">for {months} months</p>
      </div>

      <dl className="divide-border divide-y text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 py-2">
            <dt className="text-text-dim">{label}</dt>
            <dd className="text-text font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 py-2">
          <dt className="text-text-dim">Total repayment</dt>
          <dd className="text-text font-semibold tabular-nums">{formatGHS(repayment.total)}</dd>
        </div>
        <div className="flex justify-between gap-3 py-2">
          <dt className="text-text-dim">Total interest</dt>
          <dd className="text-ink-gold font-semibold tabular-nums">
            {formatGHS(repayment.interest)}
          </dd>
        </div>
      </dl>

      <div>
        <div
          className="bg-glass-strong flex h-2 overflow-hidden rounded-full"
          role="img"
          aria-label={`Principal ${formatGHS(amount)}, interest ${formatGHS(repayment.interest)}`}
        >
          <div className="bg-accent h-full" style={{ width: `${principalShare}%` }} />
          <div className="bg-gold h-full flex-1" />
        </div>
        <div className="text-text-mute mt-1.5 flex justify-between text-[11px]">
          <span>Principal {Math.round(principalShare)}%</span>
          <span>Interest {100 - Math.round(principalShare)}%</span>
        </div>
      </div>

      <p className="text-text-mute text-xs">Estimates only. The lender sets final terms.</p>
    </div>
  );
}
