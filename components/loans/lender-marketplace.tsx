'use client';

import { useState, type ReactNode } from 'react';
import { ExternalLink, Landmark, Search, ShieldCheck } from 'lucide-react';
import {
  CompareBar,
  CompareProducts,
  MAX_COMPARE,
  ProductCard,
  ProductDetails,
} from '@/components/loans/loan-products';
import { loanUi } from '@/components/loans/loan-ui';
import { StatementDownload } from '@/components/loans/statement-download';
import { LenderLogo } from '@/components/shared/lender-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { formatGhanaDate } from '@/lib/format';
import {
  INSTITUTION_TYPE_LABELS,
  NOT_PROVIDED,
  PARTNERSHIP_LABELS,
  safeWebsite,
  yesNo,
} from '@/lib/lenders';
import { searchLenders } from '@/lib/loans/loan-path';
import { cn } from '@/lib/utils';
import { usePlatformStore } from '@/store/platform-store';
import type { InstitutionType, Lender } from '@/types/admin';
import type { LoanProduct } from '@/types/products';

const typeLabel = (type: string) => INSTITUTION_TYPE_LABELS[type as InstitutionType] ?? type;

/**
 * The lender marketplace: every farmer sees the same published lenders, each licence-checked
 * against an official source. Nothing is filled in: an unknown value says "Not provided", and
 * with no lender published the page says so.
 */
export function LenderMarketplace() {
  const lenders = usePlatformStore((s) => s.lenders);
  const products = usePlatformStore((s) => s.loanProducts);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const shown = searchLenders(lenders, query, typeLabel);
  const open = lenders.find((l) => l.id === openId) ?? null;
  const openProduct = products.find((p) => p.id === productId) ?? null;
  // A product that left the marketplace (unpublished, lender hidden) drops out of the comparison.
  const chosen = compareIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is LoanProduct => Boolean(p));
  const productCount = (lenderId: string) =>
    products.filter((p) => p.lender.id === lenderId).length;
  const toggleCompare = (id: string) =>
    setCompareIds((ids) =>
      ids.includes(id)
        ? ids.filter((x) => x !== id)
        : ids.length < MAX_COMPARE
          ? [...ids, id]
          : ids,
    );

  if (lenders.length === 0) {
    return (
      <section
        aria-labelledby="no-lenders-title"
        className={cn(loanUi.panel, 'flex flex-col items-center gap-3 py-12 text-center')}
      >
        <span className="bg-glass-strong text-text-mute inline-flex size-14 items-center justify-center rounded-2xl">
          <Landmark size={26} aria-hidden="true" />
        </span>
        <h3 id="no-lenders-title" className={loanUi.title}>
          No verified lenders are currently available.
        </h3>
        <p className="text-text-dim max-w-md text-sm leading-relaxed">
          Once approved financial institutions are added, their agricultural loan products will
          appear here, and you can apply to them through AgriCtec.
        </p>
        <StatementDownload />
      </section>
    );
  }

  return (
    <div className="space-y-8">
      {products.length > 0 && (
        <section aria-labelledby="products-title" className="space-y-4">
          <div>
            <h3 id="products-title" className={loanUi.title}>
              Loan products
            </h3>
            <p className={loanUi.sub}>
              Terms and requirements as each lender states them, with their source. Tick up to{' '}
              {MAX_COMPARE} to compare.
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-4 @3xl:grid-cols-2 @6xl:grid-cols-3">
            {products.map((product) => (
              <li key={product.id}>
                <ProductCard
                  product={product}
                  comparing={compareIds.includes(product.id)}
                  compareFull={chosen.length >= MAX_COMPARE}
                  onToggleCompare={() => toggleCompare(product.id)}
                  onOpen={() => setProductId(product.id)}
                />
              </li>
            ))}
          </ul>
          <CompareBar
            count={chosen.length}
            onCompare={() => setComparing(true)}
            onClear={() => setCompareIds([])}
          />
        </section>
      )}
      <section aria-labelledby="lenders-title" className="space-y-4">
        <div className="flex flex-col gap-3 @xl:flex-row @xl:items-end @xl:justify-between">
          <div>
            <h3 id="lenders-title" className={loanUi.title}>
              Verified lenders
            </h3>
            <p className={loanUi.sub}>
              Each licence was checked against an official source by AgriCtec. Listing here is not
              an offer or an approval.
            </p>
          </div>
          <label className="relative block w-full @xl:w-72">
            <span className="sr-only">Search lenders</span>
            <Search
              size={16}
              aria-hidden="true"
              className="text-text-mute pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, type or region"
              className="pl-10"
            />
          </label>
        </div>

        {shown.length === 0 ? (
          <p className={cn(loanUi.panel, 'text-text-dim text-sm')} role="status">
            No lender matches “{query}”.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 @3xl:grid-cols-2">
            {shown.map((lender) => (
              <li key={lender.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(lender.id)}
                  className={cn(
                    loanUi.panel,
                    'hover:border-accent/40 flex h-full w-full items-start gap-4 text-left transition-colors',
                  )}
                >
                  <LenderLogo
                    name={lender.name}
                    color={lender.color}
                    logoPath={lender.logoPath}
                    size={48}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="text-text block font-semibold wrap-break-word">
                      {lender.name}
                    </span>
                    <span className="text-text-mute block text-xs">
                      {typeLabel(lender.institutionType)}
                      {lender.region ? ` · ${lender.region}` : ''}
                    </span>
                    <span className="text-ink-green mt-2 flex items-center gap-1.5 text-xs font-semibold">
                      <ShieldCheck size={13} aria-hidden="true" />
                      Licence verified
                      {lender.verifiedAt ? ` ${formatGhanaDate(lender.verifiedAt)}` : ''}
                    </span>
                    <span className="text-text-dim mt-1 block text-xs">
                      Agricultural loans: {yesNo(lender.offersAgriLoans)} ·{' '}
                      {productCount(lender.id)}{' '}
                      {productCount(lender.id) === 1 ? 'product' : 'products'} on AgriCtec
                    </span>
                    {lender.partnershipStatus === 'partner' && (
                      <span className="bg-accent/15 text-ink-green mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold">
                        {PARTNERSHIP_LABELS.partner}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {open && (
          <LenderDetails
            lender={open}
            products={products.filter((p) => p.lender.id === open.id)}
            onOpenProduct={(id) => {
              setOpenId(null);
              setProductId(id);
            }}
            onClose={() => setOpenId(null)}
          />
        )}
      </section>
      {openProduct && <ProductDetails product={openProduct} onClose={() => setProductId(null)} />}
      {comparing && chosen.length >= 2 && (
        <CompareProducts products={chosen} onClose={() => setComparing(false)} />
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 py-2.5 sm:grid-cols-[10rem_1fr] sm:gap-3">
      <dt className="text-text-mute text-xs font-semibold">{label}</dt>
      <dd className="text-text text-sm wrap-break-word">
        {children || <span className="text-text-mute">{NOT_PROVIDED}</span>}
      </dd>
    </div>
  );
}

function LenderDetails({
  lender,
  products,
  onOpenProduct,
  onClose,
}: {
  lender: Lender;
  products: LoanProduct[];
  onOpenProduct: (id: string) => void;
  onClose: () => void;
}) {
  const website = safeWebsite(lender.website);
  return (
    <Modal open onClose={onClose} size="lg" title={lender.name}>
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <LenderLogo
            name={lender.name}
            color={lender.color}
            logoPath={lender.logoPath}
            size={64}
          />
          <div className="min-w-0">
            <p className="text-text-dim text-sm">{typeLabel(lender.institutionType)}</p>
            <p className="text-ink-green mt-1 flex items-center gap-1.5 text-xs font-semibold">
              <ShieldCheck size={13} aria-hidden="true" /> Licence verified by AgriCtec
            </p>
          </div>
        </div>

        {lender.description && (
          <p className="text-text-dim text-sm leading-relaxed whitespace-pre-line">
            {lender.description}
          </p>
        )}

        <dl className="divide-border divide-y">
          <Row label="Registered name">{lender.registeredName}</Row>
          <Row label="Regulator">{lender.regulator}</Row>
          <Row label="Licence reference">{lender.licenceRef}</Row>
          <Row label="Last verified">
            {lender.verifiedAt ? formatGhanaDate(lender.verifiedAt) : null}
          </Row>
          <Row label="Official source">{lender.verificationSource}</Row>
          <Row label="Agricultural loans">{yesNo(lender.offersAgriLoans)}</Row>
          <Row label="Regions served">{lender.supportedRegions.join(', ')}</Row>
          <Row label="Head office region">{lender.region}</Row>
          <Row label="Address">{lender.address}</Row>
          <Row label="Telephone">
            {lender.phone && (
              <a href={`tel:${lender.phone.replace(/[^\d+]/g, '')}`} className="text-ink-green">
                {lender.phone}
              </a>
            )}
          </Row>
          <Row label="Email">
            {lender.email && (
              <a href={`mailto:${lender.email}`} className="text-ink-green">
                {lender.email}
              </a>
            )}
          </Row>
          <Row label="Website">
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-green inline-flex items-center gap-1"
              >
                {website.replace(/^https?:\/\//, '')}
                <ExternalLink size={13} aria-hidden="true" />
                <span className="sr-only">(opens the lender’s own website)</span>
              </a>
            )}
          </Row>
          <Row label="Partnership with AgriCtec">
            {PARTNERSHIP_LABELS[lender.partnershipStatus]}
          </Row>
        </dl>

        <div className="border-border bg-glass rounded-2xl border p-4">
          <p className="text-text text-sm font-semibold">Loan products</p>
          {products.length === 0 ? (
            <p className="text-text-dim mt-1 text-sm">
              {lender.name} has not published loan products on AgriCtec yet. To ask about a loan,
              contact the lender through the official details above.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {products.map((product) => (
                <li key={product.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-text text-sm">{product.name}</span>
                  <Button size="sm" variant="ghost" onClick={() => onOpenProduct(product.id)}>
                    View terms
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-text-mute text-xs">
          Details come from the lender’s official information, checked by AgriCtec. The lender
          decides every loan.
        </p>
      </div>
    </Modal>
  );
}
