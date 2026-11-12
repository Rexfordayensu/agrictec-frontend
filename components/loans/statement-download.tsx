'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { saveBlob } from '@/lib/loans/application-status';
import { financialService } from '@/services/financial.service';
import type { ReportMonths } from '@/types/financial';

/**
 * Until a lender is listed here, the farmer can still take their transaction history to a bank
 * or lender themselves: a PDF of their recorded figures, built on the server from their records.
 */
export function StatementDownload({ compact = false }: { compact?: boolean }) {
  const [months, setMonths] = useState<ReportMonths>(12);
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const report = await financialService.createReport(months);
      const { blob, filename } = await financialService.downloadReport(report);
      saveBlob(blob, filename);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not create the PDF.');
    } finally {
      setBusy(false);
    }
  }

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        aria-label="Period"
        value={String(months)}
        onChange={(e) => setMonths(Number(e.target.value) as ReportMonths)}
        className="w-auto"
      >
        <option value="3">Last 3 months</option>
        <option value="6">Last 6 months</option>
        <option value="12">Last 12 months</option>
      </Select>
      <Button icon={Download} loading={busy} onClick={() => void download()}>
        Download transaction history
      </Button>
    </div>
  );
  if (compact) return controls;

  return (
    <div className="border-border w-full max-w-md space-y-3 rounded-2xl border p-4 text-left">
      <p className="text-text text-sm font-semibold">Apply to a bank or lender yourself</p>
      <p className="text-text-dim text-xs leading-relaxed">
        Download your transaction history as a PDF and take it to the lender as evidence of your
        farm’s income and expenses. Each lender applies its own rules.
      </p>
      {controls}
    </div>
  );
}
