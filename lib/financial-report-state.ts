import type { FinancialSummary } from '@/types/financial';

/** Activity notes alone do not provide financial figures for a report. */
export function hasReportableFigures(summary: FinancialSummary): boolean {
  return (
    summary.counts.financialRecords > 0 ||
    summary.counts.momo > 0 ||
    /[1-9]/.test(summary.financing.in.total) ||
    /[1-9]/.test(summary.financing.out.total)
  );
}

export function financialReportError(
  error: unknown,
  kind: 'summary' | 'reports' | 'pdf' | 'download' = 'summary',
): string {
  const status = error && typeof error === 'object' && 'status' in error ? error.status : undefined;
  const message = error instanceof Error ? error.message : '';
  if (status === 404 || /^not found$/i.test(message.trim())) {
    if (kind === 'download') return 'This PDF report is no longer available. Refresh the report list or create a new report.';
    return kind === 'summary'
      ? 'Your recorded figures are temporarily unavailable. Your saved records have not been changed.'
      : kind === 'reports'
        ? 'Saved reports are temporarily unavailable. Please try again later.'
        : 'PDF reports are temporarily unavailable. Please try again later.';
  }
  return message || 'Could not load your financial information. Please try again.';
}
