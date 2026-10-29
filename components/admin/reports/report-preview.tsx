'use client';

import { format } from 'date-fns';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { PRIMARY_CLASS } from '@/components/admin/shared/action-styles';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import type { AdminReport } from '@/lib/admin/admin-reports';
import { cn } from '@/lib/utils';
import type { ReportFormat } from '@/services/admin/reports.service';

/** The report as it will be exported: headline tiles, then each table. */
export function ReportBody({ report }: { report: AdminReport }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {report.summary.map((item) => (
          <div key={item.label} className="border-border bg-glass rounded-xl border px-3.5 py-3">
            <p className="text-text-mute text-[11px] font-semibold tracking-wide uppercase">
              {item.label}
            </p>
            <p className="font-display text-text mt-1 truncate text-lg font-bold tabular-nums">
              {item.value}
            </p>
          </div>
        ))}
      </div>
      {report.tables.map((table) => (
        <section key={table.title}>
          <h3 className="text-text mb-2 text-sm font-semibold">{table.title}</h3>
          <div className="border-border overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead className="bg-glass text-text-mute text-[11px] tracking-wider uppercase">
                <tr>
                  {table.headers.map((header, i) => (
                    <th
                      key={header}
                      scope="col"
                      className={cn(
                        'px-3 py-2 font-semibold whitespace-nowrap',
                        table.numeric.includes(i) && 'text-right',
                      )}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {table.rows.length === 0 && (
                  <tr>
                    <td colSpan={table.headers.length} className="text-text-mute px-3 py-4">
                      Nothing to show yet.
                    </td>
                  </tr>
                )}
                {table.rows.map((row, r) => (
                  <tr key={r} className="hover:bg-glass">
                    {row.map((cell, i) => (
                      <td
                        key={i}
                        className={cn(
                          'text-text px-3 py-2 whitespace-nowrap',
                          table.numeric.includes(i) && 'text-right tabular-nums',
                          i === 0 && 'font-medium',
                        )}
                      >
                        {typeof cell === 'number' ? cell.toLocaleString('en-GH') : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

/** A ready-made report in a centred modal, with its CSV and PDF downloads. */
export function ReportPreview({
  report,
  onClose,
  onExport,
  busy,
}: {
  report: AdminReport | null;
  onClose: () => void;
  onExport: (format: ReportFormat) => void;
  busy: ReportFormat | null;
}) {
  if (!report) return null;
  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={report.title}
      description={`${report.description} Data as of ${format(new Date(report.generatedAt), 'd MMM yyyy, HH:mm')}.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="ghost"
            icon={FileSpreadsheet}
            loading={busy === 'csv'}
            disabled={busy !== null}
            onClick={() => onExport('csv')}
          >
            CSV
          </Button>
          <Button
            icon={FileText}
            loading={busy === 'pdf'}
            disabled={busy !== null}
            onClick={() => onExport('pdf')}
            className={PRIMARY_CLASS}
          >
            Download PDF
          </Button>
        </>
      }
    >
      <ReportBody report={report} />
    </Modal>
  );
}
