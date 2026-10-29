'use client';

import { readOnlyProps, READ_ONLY_CLASS, useReadOnly } from '@/lib/read-only';
import { useRef, useState } from 'react';
import Image from 'next/image';
import { History, Leaf, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { SEVERITY_COLORS } from '@/components/crop-doctor/diagnosis-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useFarmStore } from '@/store/farm-store';
import type { Diagnosis } from '@/types';

type Filter = 'all' | 'issues' | 'healthy';

const FILTER_LABELS: Record<Filter, string> = {
  all: 'All',
  issues: 'Needs attention',
  healthy: 'Healthy',
};

/** The last 10 saved scans as a thumbnail grid, filterable by outcome. */
export function DiagnosisHistory() {
  const diagnoses = useFarmStore((state) => state.diagnoses);
  const deleteDiagnosis = useFarmStore((state) => state.deleteDiagnosis);
  const readOnly = useReadOnly();
  const [selected, setSelected] = useState<Diagnosis | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const deleteLock = useRef(false);

  const recent = diagnoses.slice(0, 10);
  const issues = recent.filter((d) => d.severity !== 'None');
  const shown =
    filter === 'issues'
      ? issues
      : filter === 'healthy'
        ? recent.filter((d) => d.severity === 'None')
        : recent;
  const counts: Record<Filter, number> = {
    all: recent.length,
    issues: issues.length,
    healthy: recent.length - issues.length,
  };

  async function remove() {
    if (!selected || deleteLock.current) return;
    deleteLock.current = true;
    setDeleting(true);
    try {
      await deleteDiagnosis(selected.id);
      setSelected(null);
      toast.success('Diagnosis deleted');
    } catch {
      toast.error('Could not delete the diagnosis. Please try again.');
    } finally {
      deleteLock.current = false;
      setDeleting(false);
    }
  }

  return (
    <Card className="@container rounded-3xl">
      <CardHeader className="flex-wrap">
        <div>
          <CardTitle className="flex items-center gap-2">
            <History size={17} aria-hidden="true" className="text-ink-green" />
            Recent Diagnoses
          </CardTitle>
          <CardSub>Your last 10 saved scans, stored on this device</CardSub>
        </div>
        {recent.length > 0 && (
          <div
            role="group"
            aria-label="Filter diagnoses"
            className="border-border bg-glass inline-flex rounded-xl border p-1"
          >
            {(Object.keys(FILTER_LABELS) as Filter[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                className={cn(
                  'min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors',
                  filter === key ? 'bg-accent/20 text-ink-green' : 'text-text-dim hover:text-text',
                )}
              >
                {FILTER_LABELS[key]} <span className="opacity-70">({counts[key]})</span>
              </button>
            ))}
          </div>
        )}
      </CardHeader>

      {recent.length === 0 ? (
        <EmptyState
          icon={Leaf}
          title="No diagnoses yet"
          description="Save a diagnosis after scanning a crop photo to build your history."
        />
      ) : shown.length === 0 ? (
        <p className="text-text-mute py-8 text-center text-sm">No saved scans in this group.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 @md:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4">
          {shown.map((diagnosis) => (
            <li
              key={diagnosis.id}
              className="group border-border bg-glass overflow-hidden rounded-2xl border transition-transform duration-200 hover:-translate-y-0.5"
            >
              <div className="bg-bg-2 relative h-36">
                {diagnosis.imageThumb ? (
                  <Image
                    src={diagnosis.imageThumb}
                    fill
                    sizes="(max-width: 640px) 100vw, 300px"
                    alt={`Saved ${diagnosis.crop ?? 'crop'} photo`}
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <span className="text-ink-green flex size-full items-center justify-center">
                    <Leaf size={36} aria-hidden="true" />
                  </span>
                )}
                <span className="absolute top-2.5 left-2.5">
                  <Badge color={SEVERITY_COLORS[diagnosis.severity]}>{diagnosis.severity}</Badge>
                </span>
                <button
                  type="button"
                  aria-label={`Delete ${diagnosis.disease} diagnosis`}
                  {...readOnlyProps(readOnly)}
                  onClick={readOnly ? undefined : () => setSelected(diagnosis)}
                  className={cn(
                    'hover:bg-danger absolute top-2 right-2 inline-flex size-9 items-center justify-center rounded-lg bg-black/55 text-white backdrop-blur transition-colors',
                    readOnly && READ_ONLY_CLASS,
                  )}
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
              <div className="p-3.5">
                <p className="text-text truncate text-sm font-semibold">{diagnosis.disease}</p>
                <p className="text-text-mute mt-1 text-xs">
                  {formatDate(diagnosis.date)}
                  {diagnosis.crop ? ` · ${diagnosis.crop}` : ''}
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <div
                    className="bg-glass-strong h-1.5 flex-1 overflow-hidden rounded-full"
                    aria-hidden="true"
                  >
                    <div
                      className="bg-accent h-full rounded-full"
                      style={{ width: `${diagnosis.confidence}%` }}
                    />
                  </div>
                  <span className="text-text-dim text-[11px] tabular-nums">
                    {diagnosis.confidence}% confidence
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={selected !== null}
        title="Delete diagnosis?"
        message="This removes the saved diagnosis and its thumbnail from your history."
        confirmLabel="Delete diagnosis"
        danger
        loading={deleting}
        onConfirm={() => void remove()}
        onCancel={() => {
          if (!deleting) setSelected(null);
        }}
      />
    </Card>
  );
}
