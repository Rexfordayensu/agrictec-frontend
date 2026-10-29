import { useState } from 'react';
import { toast } from 'sonner';
import { REPORT_ORDER } from '@/components/reports/report-meta';
import { useReportBuilder } from '@/hooks/use-report-data';
import { generateReportPDF } from '@/lib/pdf/generate-report';
import { usePlatformStore } from '@/store/platform-store';
import type { ReportType } from '@/types';
import { useSubscription } from '@/hooks/use-subscription';
import { useSubscriptionStore } from '@/store/subscription-store';

export type DownloadTarget = ReportType | 'all';

export const PDF_UNAVAILABLE =
  'PDF downloads require Basic, Premium or Advanced and must be available on the platform.';

/**
 * Downloads one report, or all four as a single combined PDF, with a busy state per target.
 * `enabled` is false while the admin has PDF reports switched off; downloads are then refused.
 */
export function useReportDownload() {
  const buildReport = useReportBuilder();
  const platformEnabled = usePlatformStore((s) => s.flags.pdfReports);
  const { allows } = useSubscription();
  const enabled = platformEnabled && allows('pdfReports');
  const [busy, setBusy] = useState<DownloadTarget | null>(null);

  async function download(target: DownloadTarget) {
    if (!usePlatformStore.getState().flags.pdfReports) {
      toast.error(PDF_UNAVAILABLE);
      return;
    }
    setBusy(target);
    try {
      useSubscriptionStore.getState().assertFeature('pdfReports');
      const now = new Date();
      await generateReportPDF(
        target === 'all'
          ? REPORT_ORDER.map((type) => buildReport(type, now))
          : buildReport(target, now),
      );
      toast.success(target === 'all' ? 'Complete financial file downloaded' : 'Report downloaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create the PDF');
    } finally {
      setBusy(null);
    }
  }

  return { busy, download, enabled };
}
