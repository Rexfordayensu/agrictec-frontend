'use client';

import { readOnlyProps, READ_ONLY_CLASS, useReadOnly } from '@/lib/read-only';
import { useRef, useState } from 'react';
import Image from 'next/image';
import { Bug, Check, ChevronDown, ChevronRight, History, Leaf, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DiagnosisCard } from '@/components/crop-doctor/diagnosis-card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useFarmStore } from '@/store/farm-store';
import { safeImageThumb } from '@/lib/profile-photo';
import type { Diagnosis, Severity } from '@/types';

/** Rows shown before "View all". */
const FIRST = 3;

const PILL: Record<Severity, string> = {
  High: 'bg-danger/10 text-ink-red',
  Moderate: 'bg-gold/15 text-ink-gold',
  None: 'bg-accent/12 text-ink-green',
};
const LEVEL: Record<Severity, string> = {
  High: 'bg-danger/15 text-ink-red',
  Moderate: 'bg-gold/25 text-ink-gold',
  None: '',
};
const PEST = /worm|pest|beetle|aphid|insect|caterpillar|borer|mite|weevil|locust/i;

/** The first sentence of the saved treatment, as the row's short advice. */
function summary(diagnosis: Diagnosis): string {
  if (diagnosis.severity === 'None') return 'No disease detected. Your crop looks healthy.';
  const first = diagnosis.treatment.split(/(?<=\.)\s+/)[0]?.trim() ?? '';
  return first || diagnosis.treatment;
}

/** The farmer's saved scans (GET /me/diagnoses), newest first, with details and delete. */
export function DiagnosisHistory() {
  const diagnoses = useFarmStore((state) => state.diagnoses);
  const deleteDiagnosis = useFarmStore((state) => state.deleteDiagnosis);
  const readOnly = useReadOnly();
  const [open, setOpen] = useState<Diagnosis | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [all, setAll] = useState(false);
  const deleteLock = useRef(false);

  const shown = all ? diagnoses : diagnoses.slice(0, FIRST);

  async function remove() {
    if (!open || deleteLock.current) return;
    deleteLock.current = true;
    setDeleting(true);
    try {
      await deleteDiagnosis(open.id);
      setConfirming(false);
      setOpen(null);
      toast.success('Diagnosis deleted');
    } catch {
      toast.error('Could not delete the diagnosis. Please try again.');
    } finally {
      deleteLock.current = false;
      setDeleting(false);
    }
  }

  return (
    <section
      aria-labelledby="scans-title"
      className="rounded-card border-border bg-glass @container/scans border p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <span className="bg-icon-bg text-icon inline-flex size-12 shrink-0 items-center justify-center rounded-xl">
            <History size={24} aria-hidden="true" />
          </span>
          <div>
            <h2 id="scans-title" className="text-text text-xl font-bold">
              Your crop scans
            </h2>
            <p className="text-text-dim text-sm">
              View your recent diagnoses and treatment advice.
            </p>
          </div>
        </div>
        {diagnoses.length > FIRST && (
          <Button
            variant="ghost"
            icon={all ? ChevronDown : ChevronRight}
            aria-expanded={all}
            onClick={() => setAll(!all)}
          >
            {all ? 'Show fewer' : `View all (${diagnoses.length})`}
          </Button>
        )}
      </div>

      {diagnoses.length === 0 ? (
        <div className="border-border mt-5 flex flex-col items-center rounded-2xl border border-dashed px-4 py-8 text-center">
          <span className="bg-icon-bg text-icon inline-flex size-12 items-center justify-center rounded-xl">
            <Leaf size={24} aria-hidden="true" />
          </span>
          <p className="text-text mt-3 font-bold">No scans yet</p>
          <p className="text-text-dim mt-1 max-w-sm text-sm">
            Scan a leaf above. Each diagnosis is saved here with its treatment advice.
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {shown.map((diagnosis) => {
            const thumb = safeImageThumb(diagnosis.imageThumb);
            const healthy = diagnosis.severity === 'None';
            const Icon = healthy ? Check : PEST.test(diagnosis.disease) ? Bug : Leaf;
            return (
              <li
                key={diagnosis.id}
                className="border-border grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-4 gap-y-3 rounded-2xl border p-3 @2xl/scans:grid-cols-[4rem_8rem_minmax(0,1fr)_auto]"
              >
                <span className="bg-bg-2 relative size-16 overflow-hidden rounded-xl">
                  {thumb ? (
                    <Image
                      src={thumb}
                      fill
                      sizes="64px"
                      alt={`${diagnosis.crop ?? 'Crop'} leaf photo`}
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-ink-green flex size-full items-center justify-center">
                      <Leaf size={26} aria-hidden="true" />
                    </span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="text-text block font-bold">{diagnosis.crop ?? 'Crop'}</span>
                  <span className="text-text-dim block text-sm">{formatDate(diagnosis.date)}</span>
                </span>
                <span className="col-span-2 flex min-w-0 flex-col gap-2 @2xl/scans:col-span-1 @5xl/scans:flex-row @5xl/scans:items-center @5xl/scans:gap-5">
                  <span
                    className={cn(
                      'flex w-full min-w-0 items-center gap-2.5 rounded-xl px-3 py-2 @5xl/scans:w-[46%] @5xl/scans:shrink-0',
                      PILL[diagnosis.severity],
                    )}
                  >
                    <Icon size={18} aria-hidden="true" className="shrink-0" />
                    <span className="min-w-0 flex-1 text-sm font-bold wrap-break-word">
                      {healthy ? 'Healthy tissue' : diagnosis.disease}
                    </span>
                    {!healthy && (
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          LEVEL[diagnosis.severity],
                        )}
                      >
                        {diagnosis.severity}
                      </span>
                    )}
                  </span>
                  <span className="text-text-dim min-w-0 text-sm leading-snug">
                    {summary(diagnosis)}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  icon={ChevronRight}
                  onClick={() => setOpen(diagnosis)}
                  aria-label={`View details: ${diagnosis.disease}, ${formatDate(diagnosis.date)}`}
                  className="col-span-2 min-w-0 @2xl/scans:col-span-1"
                >
                  View details
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={open !== null && !confirming}
        onClose={() => setOpen(null)}
        title={open ? `${open.crop ?? 'Crop'} scan` : 'Crop scan'}
        description={open ? `Scanned ${formatDate(open.date)}` : undefined}
        size="lg"
        footer={
          <div className="flex w-full flex-wrap justify-between gap-2">
            <Button
              variant="ghost"
              icon={Trash2}
              {...readOnlyProps(readOnly)}
              onClick={readOnly ? undefined : () => setConfirming(true)}
              className={cn('text-ink-red', readOnly && READ_ONLY_CLASS)}
            >
              Delete scan
            </Button>
            <Button onClick={() => setOpen(null)}>Close</Button>
          </div>
        }
      >
        {open && (
          <div className="space-y-4">
            {safeImageThumb(open.imageThumb) && (
              <span className="bg-bg-2 relative block h-48 overflow-hidden rounded-2xl">
                <Image
                  src={safeImageThumb(open.imageThumb)!}
                  fill
                  sizes="600px"
                  alt={`${open.crop ?? 'Crop'} leaf photo`}
                  unoptimized
                  className="object-cover"
                />
              </span>
            )}
            <DiagnosisCard result={open} />
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={confirming}
        title="Delete diagnosis?"
        message="This removes the saved diagnosis and its thumbnail from your history."
        confirmLabel="Delete diagnosis"
        danger
        loading={deleting}
        onConfirm={() => void remove()}
        onCancel={() => {
          if (!deleting) setConfirming(false);
        }}
      />
    </section>
  );
}
