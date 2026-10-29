'use client';

import { useEffect, useState } from 'react';
import {
  Check,
  Download,
  Landmark,
  ReceiptText,
  Smartphone,
  Table2,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { PRIMARY_CLASS } from '@/components/admin/shared/action-styles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CROPS } from '@/constants/crops';
import { REGIONS } from '@/constants/regions';
import {
  DATASETS,
  datasetById,
  defaultColumns,
  type BuilderResult,
  type BuilderSpec,
  type DatasetId,
} from '@/lib/admin/report-builder';
import { downloadFile } from '@/lib/export/csv';
import { cn } from '@/lib/utils';
import { reportsService } from '@/services/admin/reports.service';

const PREVIEW_ROWS = 20;

const DATASET_ICONS: Record<DatasetId, LucideIcon> = {
  farmers: Users,
  records: ReceiptText,
  momo: Smartphone,
  applications: Landmark,
};

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-text mb-2.5 flex items-center gap-2 text-sm font-semibold">
        <span className="bg-purple/15 text-ink-purple inline-flex size-6 items-center justify-center rounded-full text-xs font-bold">
          {n}
        </span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

/**
 * Custom reports: a dataset, its columns and filters (region, crop, date range), a live preview
 * of the first 20 rows, and a CSV export (audited as report.export).
 */
export function ReportBuilder() {
  const [spec, setSpec] = useState<BuilderSpec>({
    dataset: 'farmers',
    columns: defaultColumns('farmers'),
  });
  const [result, setResult] = useState<BuilderResult | null>(null);
  const [exporting, setExporting] = useState(false);
  const dataset = datasetById(spec.dataset);

  // Refresh the preview whenever the choices change.
  useEffect(() => {
    let active = true;
    reportsService.preview(spec).then(
      (next) => active && setResult(next),
      (cause: unknown) => {
        if (active)
          toast.error(cause instanceof Error ? cause.message : 'Could not load the preview');
      },
    );
    return () => {
      active = false;
    };
  }, [spec]);

  const set = (patch: Partial<BuilderSpec>) => setSpec({ ...spec, ...patch });
  const toggleColumn = (key: string) =>
    set({
      columns: spec.columns.includes(key)
        ? spec.columns.filter((c) => c !== key)
        : [...spec.columns, key],
    });
  const filtered = Boolean(spec.region || spec.crop || spec.from || spec.to);

  async function exportCSV() {
    setExporting(true);
    try {
      const { filename, csv, rows } = await reportsService.exportCustom(spec);
      downloadFile(csv, filename);
      toast.success(`Exported ${rows.toLocaleString()} rows`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not export');
    } finally {
      setExporting(false);
    }
  }

  return (
    <section
      aria-labelledby="builder-title"
      className="border-border bg-glass overflow-hidden rounded-2xl border"
    >
      <header className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="bg-purple/12 text-ink-purple inline-flex size-10 items-center justify-center rounded-xl">
            <Table2 size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 id="builder-title" className="text-text text-base font-semibold">
              Report builder
            </h2>
            <p className="text-text-mute text-xs">
              Choose the data and columns you need, filter it, then export.
            </p>
          </div>
        </div>
        <Button
          icon={Download}
          loading={exporting}
          disabled={!result || result.total === 0 || spec.columns.length === 0}
          onClick={() => void exportCSV()}
          className={PRIMARY_CLASS}
        >
          Export CSV
        </Button>
      </header>

      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Step n={1} title="Dataset">
            <div role="radiogroup" aria-label="Dataset" className="grid grid-cols-2 gap-2">
              {DATASETS.map((d) => {
                const Icon = DATASET_ICONS[d.id];
                const on = d.id === spec.dataset;
                return (
                  <button
                    key={d.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setSpec({ dataset: d.id, columns: defaultColumns(d.id) })}
                    className={cn(
                      'flex min-h-16 flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors',
                      on ? 'border-purple/50 bg-purple/10' : 'border-border hover:bg-glass-strong',
                    )}
                  >
                    <Icon
                      size={16}
                      aria-hidden="true"
                      className={on ? 'text-ink-purple' : 'text-text-mute'}
                    />
                    <span className="text-text text-xs font-semibold">{d.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-text-mute mt-2 text-xs">{dataset.description}</p>
          </Step>

          <Step n={2} title="Columns">
            <div className="mb-2 flex gap-3 text-xs font-semibold">
              <button
                type="button"
                onClick={() => set({ columns: dataset.columns.map((c) => c.key) })}
                className="text-ink-purple min-h-8 hover:underline"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => set({ columns: defaultColumns(spec.dataset) })}
                className="text-text-mute hover:text-text min-h-8"
              >
                Reset
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {dataset.columns.map((c) => {
                const on = spec.columns.includes(c.key);
                return (
                  <button
                    key={c.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleColumn(c.key)}
                    className={cn(
                      'inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-xs font-semibold transition-colors',
                      on
                        ? 'border-purple/50 bg-purple/15 text-ink-purple'
                        : 'border-border text-text-dim hover:text-text hover:bg-glass-strong',
                    )}
                  >
                    {on && <Check size={12} aria-hidden="true" />}
                    {c.label}
                  </button>
                );
              })}
            </div>
          </Step>

          <Step n={3} title="Filters">
            <div className="grid grid-cols-2 gap-2">
              <Select
                aria-label="Region"
                value={spec.region ?? ''}
                onChange={(e) => set({ region: e.target.value || undefined })}
                className="col-span-2"
              >
                <option value="">All regions</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Crop"
                value={spec.crop ?? ''}
                onChange={(e) => set({ crop: e.target.value || undefined })}
                className="col-span-2"
              >
                <option value="">All crops</option>
                {CROPS.filter((c) => c !== 'Other').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <label className="min-w-0">
                <span className="text-text-mute mb-1 block text-[11px] font-semibold">
                  {dataset.dateLabel} from
                </span>
                <Input
                  type="date"
                  value={spec.from ?? ''}
                  max={spec.to}
                  onChange={(e) => set({ from: e.target.value || undefined })}
                />
              </label>
              <label className="min-w-0">
                <span className="text-text-mute mb-1 block text-[11px] font-semibold">to</span>
                <Input
                  type="date"
                  value={spec.to ?? ''}
                  min={spec.from}
                  onChange={(e) => set({ to: e.target.value || undefined })}
                />
              </label>
            </div>
            {filtered && (
              <button
                type="button"
                onClick={() =>
                  set({ region: undefined, crop: undefined, from: undefined, to: undefined })
                }
                className="text-ink-purple mt-2 min-h-8 text-xs font-semibold hover:underline"
              >
                Clear filters
              </button>
            )}
          </Step>
        </div>

        <div className="min-w-0">
          <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-text text-sm font-semibold">Preview</h3>
            <p className="text-text-mute text-xs" aria-live="polite">
              {result
                ? `${result.total.toLocaleString()} row${result.total === 1 ? '' : 's'} match · showing the first ${Math.min(PREVIEW_ROWS, result.total)}`
                : 'Loading…'}
            </p>
          </div>
          {!result ? (
            <Skeleton className="h-80 w-full rounded-xl" />
          ) : spec.columns.length === 0 ? (
            <p className="border-border text-text-mute rounded-xl border border-dashed p-8 text-center text-sm">
              Pick at least one column.
            </p>
          ) : result.total === 0 ? (
            <p className="border-border text-text-mute rounded-xl border border-dashed p-8 text-center text-sm">
              No rows match these filters.
            </p>
          ) : (
            <div className="border-border max-h-[28rem] overflow-auto rounded-xl border">
              <table className="w-full text-left text-xs">
                <caption className="sr-only">Report preview, first {PREVIEW_ROWS} rows</caption>
                <thead className="bg-bg-2 text-text-mute sticky top-0 text-[11px] tracking-wider uppercase">
                  <tr>
                    {result.headers.map((h) => (
                      <th key={h} scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {result.rows.slice(0, PREVIEW_ROWS).map((row, r) => (
                    <tr key={r} className="hover:bg-glass">
                      {row.map((cell, i) => (
                        <td
                          key={i}
                          className={cn(
                            'text-text max-w-64 truncate px-3 py-2 whitespace-nowrap',
                            typeof cell === 'number' && 'text-right tabular-nums',
                          )}
                        >
                          {typeof cell === 'number' ? cell.toLocaleString('en-GH') : cell || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
