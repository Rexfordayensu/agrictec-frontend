'use client';

import type { ReactNode } from 'react';
import { CircleCheck, Columns3, FileText, ShieldCheck } from 'lucide-react';
import { loanUi } from '@/components/loans/loan-ui';
import { LenderLogo } from '@/components/shared/lender-logo';
import { Button } from '@/components/ui/button';
import { EligibilityCheck } from '@/components/loans/eligibility-check';
import { StartApplication } from '@/components/loans/start-application';
import { Modal } from '@/components/ui/modal';
import { formatGhanaDate, formatDate } from '@/lib/format';
import {
  amountRange,
  feeText,
  FREQUENCY_LABELS,
  monthRange,
  rateText,
  requirementAsk,
  requirementGroups,
  VERIFICATION_LABELS,
} from '@/lib/loan-products';
import { NOT_PROVIDED } from '@/lib/lenders';
import { cn } from '@/lib/utils';
import type { LoanProduct } from '@/types/products';

export const MAX_COMPARE = 3;

const regionsText = (p: LoanProduct) =>
  p.terms.supportedRegions?.length ? p.terms.supportedRegions.join(', ') : NOT_PROVIDED;
const counts = (p: LoanProduct) => {
  const mandatory = p.requirements.filter((r) => r.required).length;
  return `${mandatory} mandatory, ${p.requirements.length - mandatory} optional`;
};

/** A published product: its lender, amounts, rate and period, and a compare toggle. */
export function ProductCard({
  product,
  comparing,
  compareFull,
  onToggleCompare,
  onOpen,
}: {
  product: LoanProduct;
  comparing: boolean;
  compareFull: boolean;
  onToggleCompare: () => void;
  onOpen: () => void;
}) {
  return (
    <div className={cn(loanUi.panel, 'flex h-full flex-col gap-3')}>
      <div className="flex items-start gap-3">
        <LenderLogo
          name={product.lender.name}
          color={product.lender.color}
          logoPath={product.lender.logoPath}
          size={40}
        />
        <div className="min-w-0 flex-1">
          <p className="text-text font-semibold wrap-break-word">{product.name}</p>
          <p className="text-text-mute text-xs">{product.lender.name}</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <Fact label="Amount">{amountRange(product.terms)}</Fact>
        <Fact label="Interest">{rateText(product.terms)}</Fact>
        <Fact label="Period">{monthRange(product.terms)}</Fact>
        <Fact label="Requirements">{counts(product)}</Fact>
      </dl>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <Button size="sm" variant="ghost" icon={FileText} onClick={onOpen}>
          Details
        </Button>
        <label
          className={cn(
            'text-text-dim flex min-h-9 items-center gap-2 text-xs font-semibold',
            !comparing && compareFull ? 'opacity-50' : 'cursor-pointer',
          )}
        >
          <input
            type="checkbox"
            checked={comparing}
            disabled={!comparing && compareFull}
            onChange={onToggleCompare}
            className="accent-accent size-4"
          />
          Compare
        </label>
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-text-mute">{label}</dt>
      <dd className="text-text font-semibold wrap-break-word">{children}</dd>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 py-2.5 sm:grid-cols-[11rem_1fr] sm:gap-3">
      <dt className="text-text-mute text-xs font-semibold">{label}</dt>
      <dd className="text-text text-sm wrap-break-word">
        {children || <span className="text-text-mute">{NOT_PROVIDED}</span>}
      </dd>
    </div>
  );
}

/** Every term and requirement of one product, with where it comes from. */
export function ProductDetails({
  product,
  onClose,
}: {
  product: LoanProduct;
  onClose: () => void;
}) {
  const { terms } = product;
  return (
    <Modal open size="lg" onClose={onClose} title={product.name}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <LenderLogo
            name={product.lender.name}
            color={product.lender.color}
            logoPath={product.lender.logoPath}
            size={44}
          />
          <div>
            <p className="text-text text-sm font-semibold">{product.lender.name}</p>
            <p className="text-ink-green flex items-center gap-1.5 text-xs font-semibold">
              <ShieldCheck size={13} aria-hidden="true" /> Licence verified by AgriCtec
            </p>
          </div>
        </div>
        {terms.description && (
          <p className="text-text-dim text-sm leading-relaxed whitespace-pre-line">
            {terms.description}
          </p>
        )}

        <dl className="divide-border divide-y">
          <Row label="Purpose">{terms.purpose}</Row>
          <Row label="Amount">
            {amountRange(terms) === NOT_PROVIDED ? null : amountRange(terms)}
          </Row>
          <Row label="Interest">
            {terms.interestRate ? (
              <>
                {rateText(terms)}
                {terms.rateNote && (
                  <span className="text-text-dim block text-xs">{terms.rateNote}</span>
                )}
              </>
            ) : null}
          </Row>
          <Row label="Fees">
            {terms.fees.length ? (
              <ul className="space-y-0.5">
                {terms.fees.map((fee) => (
                  <li key={fee.name}>
                    {feeText(fee)}
                    {fee.note ? <span className="text-text-dim"> · {fee.note}</span> : ''}
                  </li>
                ))}
              </ul>
            ) : null}
          </Row>
          <Row label="Repayment period">
            {monthRange(terms) === NOT_PROVIDED ? null : monthRange(terms)}
          </Row>
          <Row label="Repayments">
            {terms.repaymentFrequency ? FREQUENCY_LABELS[terms.repaymentFrequency] : null}
          </Row>
          <Row label="Collateral">{terms.collateral}</Row>
          <Row label="Guarantor">{terms.guarantor}</Row>
          <Row label="Regions served">{terms.supportedRegions?.join(', ')}</Row>
          <Row label="History assessed">
            {terms.assessmentMonths ? `${terms.assessmentMonths} months of transactions` : null}
          </Row>
          <Row label="Official source">{product.source}</Row>
          <Row label="Terms last checked">
            {product.sourceCheckedOn ? formatDate(product.sourceCheckedOn) : null}
          </Row>
        </dl>

        <section aria-labelledby="product-requirements">
          <h3 id="product-requirements" className={loanUi.title}>
            What {product.lender.name} asks for
          </h3>
          {product.requirements.length === 0 ? (
            <p className="text-text-dim mt-2 text-sm">The lender lists no specific requirements.</p>
          ) : (
            <div className="mt-3 space-y-4">
              {requirementGroups(product.requirements).map((group) => (
                <div key={group.category}>
                  <p className="text-text-mute mb-1.5 text-[11px] font-semibold tracking-wider uppercase">
                    {group.label}
                  </p>
                  <ul className="space-y-2">
                    {group.items.map((r) => (
                      <li key={r.key} className="border-border bg-glass rounded-xl border p-3">
                        <p className="text-text flex flex-wrap items-center gap-2 text-sm font-semibold">
                          <CircleCheck size={14} aria-hidden="true" className="text-text-mute" />
                          {r.name}
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                              r.required
                                ? 'bg-gold/15 text-ink-gold'
                                : 'bg-glass-strong text-text-mute',
                            )}
                          >
                            {r.required ? 'Mandatory' : 'Optional'}
                          </span>
                        </p>
                        {r.description && (
                          <p className="text-text-dim mt-1 text-xs">{r.description}</p>
                        )}
                        {requirementAsk(r) && (
                          <p className="text-text-dim mt-1 text-xs">{requirementAsk(r)}</p>
                        )}
                        <p className="text-text-mute mt-1 text-[11px]">
                          {VERIFICATION_LABELS[r.verification]}
                          {r.visibleIf ? ' · only in some cases' : ''}
                          {r.source ? ` · ${r.source}` : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <EligibilityCheck product={product} />

        <StartApplication product={product} />
        <p className="text-text-mute text-xs">
          Version {product.version}, published {formatGhanaDate(product.publishedAt)}. These are the
          lender’s stated terms, not an offer: the lender decides every loan.
        </p>
      </div>
    </Modal>
  );
}

/** The chosen products side by side. */
export function CompareProducts({
  products,
  onClose,
}: {
  products: LoanProduct[];
  onClose: () => void;
}) {
  const rows: [string, (p: LoanProduct) => ReactNode][] = [
    ['Lender', (p) => p.lender.name],
    ['Amount', (p) => amountRange(p.terms)],
    ['Interest', (p) => rateText(p.terms)],
    ['Fees', (p) => (p.terms.fees.length ? p.terms.fees.map(feeText).join('; ') : NOT_PROVIDED)],
    ['Repayment period', (p) => monthRange(p.terms)],
    [
      'Repayments',
      (p) =>
        p.terms.repaymentFrequency ? FREQUENCY_LABELS[p.terms.repaymentFrequency] : NOT_PROVIDED,
    ],
    ['Collateral', (p) => p.terms.collateral ?? NOT_PROVIDED],
    ['Guarantor', (p) => p.terms.guarantor ?? NOT_PROVIDED],
    ['Regions', regionsText],
    ['Requirements', counts],
    ['Terms checked', (p) => (p.sourceCheckedOn ? formatDate(p.sourceCheckedOn) : NOT_PROVIDED)],
  ];
  return (
    <Modal open size="xl" onClose={onClose} title="Compare loan products">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr>
              <th scope="col" className="w-36 pb-3" />
              {products.map((p) => (
                <th
                  key={p.id}
                  scope="col"
                  className="text-text pr-4 pb-3 align-bottom font-semibold"
                >
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {rows.map(([label, value]) => (
              <tr key={label}>
                <th
                  scope="row"
                  className="text-text-mute py-2.5 pr-3 align-top text-xs font-semibold"
                >
                  {label}
                </th>
                {products.map((p) => {
                  const shown = value(p);
                  return (
                    <td
                      key={p.id}
                      className={cn(
                        'py-2.5 pr-4 align-top',
                        shown === NOT_PROVIDED ? 'text-text-mute' : 'text-text',
                      )}
                    >
                      {shown}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-text-mute mt-4 text-xs">
        As each lender states them. “Not provided” means the lender didn’t say; ask it directly.
      </p>
    </Modal>
  );
}

export function CompareBar({
  count,
  onCompare,
  onClear,
}: {
  count: number;
  onCompare: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="border-accent/40 bg-accent/10 sticky bottom-24 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 backdrop-blur min-[900px]:bottom-4">
      <p className="text-text text-sm font-semibold">
        {count} of {MAX_COMPARE} chosen{count < 2 ? ': choose one more to compare' : ''}
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={onClear}>
          Clear
        </Button>
        <Button size="sm" icon={Columns3} disabled={count < 2} onClick={onCompare}>
          Compare
        </Button>
      </div>
    </div>
  );
}
