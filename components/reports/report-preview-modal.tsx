'use client';

import { useState } from 'react';
import { Download, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { REPORT_META } from '@/components/reports/report-meta';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useReportBuilder } from '@/hooks/use-report-data';
import { PDF_UNAVAILABLE } from '@/components/reports/use-report-download';
import { generateReportPDF } from '@/lib/pdf/generate-report';
import { usePlatformStore } from '@/store/platform-store';
import { formatGeneratedAt, type ReportData } from '@/lib/reports/build-report-data';
import { cn } from '@/lib/utils';
import { useReportStore } from '@/store/report-store';
import { useSubscription } from '@/hooks/use-subscription';
import { useSubscriptionStore } from '@/store/subscription-store';

/** HTML rendering of ReportData: the same data (and layout order) as the PDF. */
function ReportDocument({ data }: { data: ReportData }) {
  const Icon = REPORT_META[data.type].icon;
  const farmerFields: [string, string][] = [
    ['Farmer', data.farmer.name],
    ['Farm', data.farmer.farm],
    ['Region', data.farmer.region],
    ['Constituency', data.farmer.constituency],
    ['Community', data.farmer.community],
    ['Phone', data.farmer.phone],
    ['Farm size', data.farmer.acres],
    ['Crops', data.farmer.crops],
    ['Generated', formatGeneratedAt(data.generatedAt)],
  ];

  return (
    <article className="space-y-6">
      {/* Branded header, mirroring the PDF's emerald band */}
      <header className="flex items-center justify-between gap-4 rounded-2xl bg-linear-to-br from-[#059669] to-[#10b981] p-5 text-white">
        <div>
          <p className="font-display text-xl font-bold">AgriCtec</p>
          <p className="text-xs text-white/85">Digital Financial Identity Report</p>
        </div>
        <div className="flex items-center gap-2 text-right">
          <span className="text-sm font-bold sm:text-base">{data.title}</span>
          <Icon size={20} aria-hidden="true" className="shrink-0" />
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {farmerFields.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-text-mute text-[11px] font-semibold tracking-wider uppercase">
              {label}
            </dt>
            <dd className="text-text truncate text-sm font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="report-summary">
        <h3 id="report-summary" className="text-text mb-3 text-sm font-bold">
          Summary
        </h3>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.summary.map((item) => (
            <div key={item.label} className="border-border bg-glass rounded-xl border p-3">
              <dt className="text-text-mute text-xs">{item.label}</dt>
              <dd className="text-text mt-0.5 text-base font-bold break-words">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {data.table && (
        <section aria-labelledby="report-table">
          <h3 id="report-table" className="text-text mb-3 text-sm font-bold">
            {data.table.title}
          </h3>
          <div className="border-border max-h-80 overflow-auto rounded-xl border">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead className="sticky top-0 bg-[#10b981] text-white">
                <tr>
                  {data.table.headers.map((header, i) => (
                    <th
                      key={header}
                      scope="col"
                      className={cn(
                        'px-3 py-2 text-xs font-semibold',
                        data.table?.align[i] === 'right' ? 'text-right' : 'text-left',
                      )}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.table.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={data.table.headers.length}
                      className="text-text-mute px-3 py-6 text-center"
                    >
                      No entries recorded yet.
                    </td>
                  </tr>
                ) : (
                  data.table.rows.map((row, r) => (
                    <tr key={r} className="border-border even:bg-accent/5 border-t">
                      {row.map((cell, i) => (
                        <td
                          key={i}
                          className={cn(
                            'text-text-dim px-3 py-2',
                            data.table?.align[i] === 'right' &&
                              'text-text text-right font-medium whitespace-nowrap tabular-nums',
                          )}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
              {data.table.totalRow && (
                <tfoot className="bg-bg-2 sticky bottom-0">
                  <tr className="border-accent/40 border-t-2">
                    {data.table.totalRow.map((cell, i) => (
                      <td
                        key={i}
                        className={cn(
                          'text-text px-3 py-2 font-bold',
                          data.table?.align[i] === 'right' && 'text-right tabular-nums',
                        )}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>
      )}

      {data.sections?.map((section) => {
        const ai = section.heading === 'AI Assessment';
        return (
          <section
            key={section.heading}
            className={cn(
              'rounded-2xl border p-4',
              ai
                ? 'border-purple/30 from-purple/10 to-info/5 bg-linear-to-br'
                : 'border-border bg-glass',
            )}
          >
            <h3
              className={cn(
                'flex items-center gap-2 text-sm font-bold',
                ai ? 'text-ink-purple' : 'text-text',
              )}
            >
              {ai && <Sparkles size={15} aria-hidden="true" />}
              {section.heading}
            </h3>
            <p className="text-text-dim mt-2 text-sm leading-relaxed whitespace-pre-line">
              {section.body}
            </p>
          </section>
        );
      })}

      <p className="text-text-mute text-xs">
        Figures are self-reported by the farmer and have not been independently verified.
      </p>
    </article>
  );
}

export function ReportPreviewModal() {
  const type = useReportStore((s) => s.type);
  const openedAt = useReportStore((s) => s.openedAt);
  const closePreview = useReportStore((s) => s.closePreview);
  const buildReport = useReportBuilder();
  const [downloading, setDownloading] = useState(false);
  const { allows } = useSubscription();
  const pdfEnabled = allows('pdfReports');

  // Built from the same function as the PDF, at the moment the preview opened.
  const data = type ? buildReport(type, openedAt ? new Date(openedAt) : undefined) : null;

  async function download() {
    if (!data) return;
    if (!usePlatformStore.getState().flags.pdfReports) {
      toast.error(PDF_UNAVAILABLE);
      return;
    }
    setDownloading(true);
    try {
      useSubscriptionStore.getState().assertFeature('pdfReports');
      await generateReportPDF(data);
      toast.success('Report downloaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create the PDF');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Modal
      open={data !== null}
      onClose={closePreview}
      title={data ? `${data.title} preview` : 'Report preview'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={closePreview}>
            Close
          </Button>
          {/* Disabled buttons don't show tooltips, so the hint lives on a wrapper. */}
          <span title="Coming soon" className="inline-flex">
            <Button variant="ghost" icon={Send} disabled aria-describedby="share-soon">
              Share with lender
              <span
                id="share-soon"
                className="bg-gold/15 text-ink-gold rounded-full px-2 py-0.5 text-[10px] font-bold"
              >
                Soon
              </span>
            </Button>
          </span>
          {pdfEnabled ? (
            <Button icon={Download} loading={downloading} onClick={download}>
              {downloading ? 'Creating PDF…' : 'Download PDF'}
            </Button>
          ) : (
            <span className="text-text-mute self-center text-xs">{PDF_UNAVAILABLE}</span>
          )}
        </>
      }
    >
      {data && <ReportDocument data={data} />}
    </Modal>
  );
}
