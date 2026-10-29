'use client';

import { ArrowRight, Download, FileStack, Loader2 } from 'lucide-react';
import { REPORT_META, REPORT_ORDER } from '@/components/reports/report-meta';
import { useReportDownload } from '@/components/reports/use-report-download';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { useReportBuilder } from '@/hooks/use-report-data';
import { cn } from '@/lib/utils';
import { useReportStore } from '@/store/report-store';
import type { ReportType } from '@/types';

/** A tiny white "page" with the report's colour band, peeking out of a tinted panel. */
function PaperThumb({ type }: { type: ReportType }) {
  const meta = REPORT_META[type];
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative flex h-28 items-end justify-center overflow-hidden rounded-t-2xl bg-linear-to-br',
        meta.wash,
      )}
    >
      <div className="w-40 translate-y-4 rounded-t-lg bg-white shadow-xl ring-1 ring-black/5 transition-transform duration-300 group-hover:translate-y-1">
        <div className="h-4 rounded-t-lg" style={{ backgroundColor: meta.paper }} />
        <div className="space-y-1.5 p-2.5">
          <span className="block h-1.5 w-2/3 rounded-full bg-slate-300" />
          <div className="grid grid-cols-2 gap-1">
            <span className="h-4 rounded bg-slate-100" />
            <span className="h-4 rounded bg-slate-100" />
          </div>
          <span className="block h-1 w-full rounded-full bg-slate-100" />
          <span className="block h-1 w-5/6 rounded-full bg-slate-100" />
          <span className="block h-1 w-3/4 rounded-full bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

function itemsLabel(type: ReportType, count: number): string {
  if (type === 'tax') return '12 months';
  if (type === 'loan') return '5 credit factors';
  return `${count} line item${count === 1 ? '' : 's'}`;
}

/** The report library: preview any report, download one, or download all four as one file. */
export function ReportCardsGrid({ className }: { className?: string }) {
  const openPreview = useReportStore((s) => s.openPreview);
  const buildReport = useReportBuilder();
  const { busy, download, enabled: pdfEnabled } = useReportDownload();

  return (
    <Card className={cn('@container', className)}>
      <CardHeader className="flex-wrap">
        <div>
          <CardTitle>Report Library</CardTitle>
          <CardSub>
            {pdfEnabled
              ? 'Preview a report, then download it as a PDF to share with lenders'
              : 'Preview your reports. PDF downloads are currently unavailable.'}
          </CardSub>
        </div>
        {pdfEnabled && (
          <Button
            size="sm"
            variant="ghost"
            icon={FileStack}
            loading={busy === 'all'}
            disabled={busy !== null && busy !== 'all'}
            onClick={() => download('all')}
          >
            All 4 as one PDF
          </Button>
        )}
      </CardHeader>

      <ul className="grid grid-cols-1 gap-4 @lg:grid-cols-2">
        {REPORT_ORDER.map((type) => {
          const meta = REPORT_META[type];
          const Icon = meta.icon;
          const report = buildReport(type);
          return (
            <li
              key={type}
              className={cn(
                'group border-border bg-glass hover:shadow-glass relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-1',
                meta.hoverBorder,
              )}
            >
              <PaperThumb type={type} />
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'inline-flex size-10 shrink-0 items-center justify-center rounded-xl shadow-lg',
                      meta.tone,
                    )}
                  >
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-text font-bold">{report.title}</h3>
                    <p className="text-text-dim mt-0.5 text-sm">{meta.description}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="bg-glass-strong text-text-dim rounded-full px-2.5 py-0.5 text-[11px]">
                    {meta.audience}
                  </span>
                  <span className="bg-glass-strong text-text-dim rounded-full px-2.5 py-0.5 text-[11px]">
                    {itemsLabel(type, report.table?.rows.length ?? 0)}
                  </span>
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                  {/* Stretched button: clicking anywhere on the card opens the preview. */}
                  <button
                    type="button"
                    onClick={() => openPreview(type)}
                    className="text-ink-green inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold after:absolute after:inset-0 after:content-['']"
                  >
                    Preview
                    <ArrowRight
                      size={15}
                      aria-hidden="true"
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </button>
                  {pdfEnabled && (
                    <button
                      type="button"
                      onClick={() => download(type)}
                      disabled={busy !== null}
                      aria-label={`Download ${report.title} as PDF`}
                      className="border-border bg-glass text-text-dim hover:bg-glass-strong hover:text-text relative z-10 inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors disabled:opacity-60"
                    >
                      {busy === type ? (
                        <Loader2 size={15} aria-hidden="true" className="animate-spin" />
                      ) : (
                        <Download size={15} aria-hidden="true" />
                      )}
                      PDF
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
