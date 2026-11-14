'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { FileText, Landmark, Leaf, Loader2, Smartphone, Zap, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { dashPanel, PanelHeading } from '@/components/dashboard/dashboard-ui';
import type { DashboardRange } from '@/lib/dashboard-summary';
import { financialReportError } from '@/lib/financial-report-state';
import { saveBlob } from '@/lib/loans/application-status';
import {
  notifyReadOnly,
  readOnlyProps,
  READ_ONLY_CLASS,
  useEntriesReadOnly,
} from '@/lib/read-only';
import { cn } from '@/lib/utils';
import { financialService } from '@/services/financial.service';
import { useModalStore } from '@/store/modal-store';
import { usePlatformStore } from '@/store/platform-store';

const tile =
  'border-border bg-glass hover:bg-glass-strong hover:border-accent/40 flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center text-sm font-semibold text-text transition-colors';

/** The four everyday jobs, one tap each. The PDF is built by the server from saved records. */
export function QuickActions({ range }: { range: DashboardRange }) {
  const openModal = useModalStore((state) => state.openModal);
  const loansOn = usePlatformStore((state) => state.flags.loans);
  const readOnly = useEntriesReadOnly();
  const [busy, setBusy] = useState(false);

  async function report() {
    setBusy(true);
    try {
      const created = await financialService.createReport(range);
      const { blob, filename } = await financialService.downloadReport(created);
      saveBlob(blob, filename);
    } catch (cause) {
      toast.error(financialReportError(cause, 'pdf'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="quick-title" className={dashPanel}>
      <PanelHeading id="quick-title" icon={Zap} title="Quick Actions" />
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          {...readOnlyProps(readOnly)}
          onClick={readOnly ? notifyReadOnly : () => openModal('record')}
          className={cn(tile, readOnly && READ_ONLY_CLASS)}
        >
          <Mark icon={Leaf} />
          Add Farm Record
        </button>
        <button
          type="button"
          {...readOnlyProps(readOnly)}
          onClick={readOnly ? notifyReadOnly : () => openModal('momo')}
          className={cn(tile, readOnly && READ_ONLY_CLASS)}
        >
          <Mark icon={Smartphone} />
          Add Transaction
        </button>
        <button type="button" disabled={busy} onClick={() => void report()} className={tile}>
          {busy ? (
            <Mark>
              <Loader2 size={20} aria-hidden="true" className="animate-spin" />
            </Mark>
          ) : (
            <Mark icon={FileText} />
          )}
          {busy ? 'Preparing PDF…' : 'Generate Report (PDF)'}
        </button>
        {loansOn ? (
          <Link href="/loans?tab=lenders" className={tile}>
            <Mark icon={Landmark} />
            Check Loan Eligibility
          </Link>
        ) : (
          <Link href="/reports" className={tile}>
            <Mark icon={FileText} />
            View reports
          </Link>
        )}
      </div>
    </section>
  );
}

function Mark({ icon: Icon, children }: { icon?: LucideIcon; children?: ReactNode }) {
  return (
    <span className="bg-icon-bg text-icon inline-flex size-10 items-center justify-center rounded-xl">
      {Icon ? <Icon size={20} aria-hidden="true" /> : children}
    </span>
  );
}
