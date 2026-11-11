'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, FilePlus2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { PRIMARY_CLASS } from '@/components/admin/shared/action-styles';
import { Badge, type BadgeColor } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { formatGhanaDate } from '@/lib/format';
import { amountRange, rateText } from '@/lib/loan-products';
import { loanProductsService } from '@/services/admin/loan-products.service';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import type { AdminProduct, ProductStatus } from '@/types/products';
import { LogoLoader } from '@/components/ui/logo-loader';

const STATUS: Record<ProductStatus, { label: string; color: BadgeColor }> = {
  draft: { label: 'Draft', color: 'blue' },
  published: { label: 'Published', color: 'green' },
  unpublished: { label: 'Unpublished', color: 'gold' },
};

export const productHref = (lenderId: string, productId: string) =>
  `/admin/lenders/${encodeURIComponent(lenderId)}/products/${encodeURIComponent(productId)}`;

/** A lender's loan products on its console page, and "Add product". */
export function LenderProducts({
  lenderId,
  lenderListed,
}: {
  lenderId: string;
  lenderListed: boolean;
}) {
  const router = useRouter();
  const syncVersion = useAdminDataStore((s) => s.syncVersion);
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    loanProductsService.listForLender(lenderId).then(
      (list) => active && setProducts(list),
      (cause: unknown) =>
        active && setError(cause instanceof Error ? cause.message : 'Could not load products'),
    );
    return () => {
      active = false;
    };
  }, [lenderId, syncVersion]);

  async function create() {
    setBusy(true);
    try {
      const created = await loanProductsService.create(lenderId, name.trim());
      toast.success(`${created.draft.name} added as a draft`);
      router.push(productHref(lenderId, created.id));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not add the product');
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-text text-base font-semibold">Loan products</h2>
          <p className="text-text-mute mt-1 text-xs">
            Each product’s terms and requirements come from the lender’s official information.
            {lenderListed ? '' : ' Farmers see published products only once the lender is listed.'}
          </p>
        </div>
        <Button
          size="sm"
          icon={FilePlus2}
          className={PRIMARY_CLASS}
          onClick={() => setAdding(true)}
        >
          Add product
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-ink-red mt-4 text-sm">
          {error}
        </p>
      ) : products === null ? (
        <LogoLoader size="sm" label="Loading products" className="mt-4" />
      ) : products.length === 0 ? (
        <p className="text-text-dim mt-4 flex items-center gap-2 text-sm">
          <Package size={16} aria-hidden="true" /> No products yet.
        </p>
      ) : (
        <ul className="divide-border mt-3 divide-y">
          {products.map((p) => {
            const shown = p.published ?? p.draft;
            return (
              <li key={p.id}>
                <Link
                  href={productHref(lenderId, p.id)}
                  className="hover:bg-glass-strong -mx-2 flex items-center gap-3 rounded-xl px-2 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="text-text block text-sm font-semibold">{shown.name}</span>
                    <span className="text-text-mute block text-xs">
                      {amountRange(shown.terms)} · {rateText(shown.terms)}
                      {p.published
                        ? ` · version ${p.published.version}, ${formatGhanaDate(p.published.publishedAt)}`
                        : ''}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    {p.published && p.draftChanged && (
                      <Badge color="purple">Unpublished edits</Badge>
                    )}
                    <Badge color={STATUS[p.status].color}>{STATUS[p.status].label}</Badge>
                  </span>
                  <ChevronRight size={16} aria-hidden="true" className="text-text-mute shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {adding && (
        <Modal
          open
          size="sm"
          onClose={() => setAdding(false)}
          title="Add a loan product"
          description="Use the product’s name as the lender publishes it. You fill in its terms next."
          footer={
            <>
              <Button variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button
                loading={busy}
                disabled={name.trim().length < 2}
                className={PRIMARY_CLASS}
                onClick={create}
              >
                Add as draft
              </Button>
            </>
          }
        >
          <FormField label="Product name" htmlFor="new-product-name">
            <Input
              id="new-product-name"
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>
        </Modal>
      )}
    </Card>
  );
}
