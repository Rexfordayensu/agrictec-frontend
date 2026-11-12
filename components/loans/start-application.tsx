'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FilePlus2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useReadOnly } from '@/lib/read-only';
import { applicationsService } from '@/services/applications.service';
import { ApiError } from '@/services/api';
import type { LoanProduct } from '@/types/products';

/** "Start your application": amount, period and purpose, then the full application page. */
export function StartApplication({ product }: { product: LoanProduct }) {
  const router = useRouter();
  const readOnly = useReadOnly();
  const { terms } = product;
  const [amount, setAmount] = useState(terms.minAmount ? String(Number(terms.minAmount)) : '');
  const [months, setMonths] = useState(String(terms.minMonths ?? terms.maxMonths ?? 12));
  const [purpose, setPurpose] = useState(terms.purpose ?? '');
  const [busy, setBusy] = useState(false);
  const valid =
    /^\d+(\.\d{1,2})?$/.test(amount.trim()) &&
    Number(amount) > 0 &&
    /^\d+$/.test(months) &&
    Number(months) >= 1 &&
    purpose.trim().length >= 3;

  async function start() {
    if (!valid || busy) return;
    setBusy(true);
    try {
      const app = await applicationsService.start({
        productId: product.id,
        amount: amount.trim(),
        months: Number(months),
        purpose: purpose.trim(),
      });
      router.push(`/loans/applications/${app.id}`);
    } catch (cause) {
      const existing =
        cause instanceof ApiError && cause.code === 'application_exists'
          ? (cause.data.applicationId as string | undefined)
          : undefined;
      if (existing) router.push(`/loans/applications/${existing}`);
      else toast.error(cause instanceof Error ? cause.message : 'Could not start the application.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border-accent/30 bg-accent/5 space-y-3 rounded-2xl border p-4">
      <div>
        <p className="text-text font-semibold">Apply through AgriCtec</p>
        <p className="text-text-dim mt-1 text-xs leading-relaxed">
          You prepare your application here. AgriCtec checks it against your records and, with
          your consent, sends it with your transaction history to {product.lender.name}. The
          lender makes the decision.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <FormField label="Amount (GHS)" htmlFor="apply-amount">
          <Input
            id="apply-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </FormField>
        <FormField label="Repay over (months)" htmlFor="apply-months">
          <Input
            id="apply-months"
            inputMode="numeric"
            value={months}
            onChange={(e) => setMonths(e.target.value)}
          />
        </FormField>
        <FormField label="What is it for?" htmlFor="apply-purpose">
          <Input
            id="apply-purpose"
            value={purpose}
            maxLength={300}
            onChange={(e) => setPurpose(e.target.value)}
          />
        </FormField>
      </div>
      <Button icon={FilePlus2} mutates loading={busy} disabled={!valid || readOnly} onClick={() => void start()}>
        Start your application
      </Button>
    </section>
  );
}
