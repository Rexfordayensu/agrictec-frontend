'use client';

import { useRef } from 'react';
import { FileText, LayoutGrid, Plus } from 'lucide-react';
import {
  notifyReadOnly,
  readOnlyProps,
  READ_ONLY_CLASS,
  useEntriesReadOnly,
} from '@/lib/read-only';
import { cn } from '@/lib/utils';
import { useFarmStore } from '@/store/farm-store';
import { useModalStore } from '@/store/modal-store';

const RECEIPT_TYPES = 'image/jpeg,image/png,image/webp,application/pdf';
const outline =
  'inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/70 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/15';

/**
 * The welcome banner (the field photo under a green wash): add a record, import a receipt (saved
 * with the new record as evidence), or jump to the record templates.
 */
export function RecordsHero() {
  const hasRecords = useFarmStore((s) => s.records.length > 0);
  const openModal = useModalStore((s) => s.openModal);
  const openRecordWithReceipt = useModalStore((s) => s.openRecordWithReceipt);
  const readOnly = useEntriesReadOnly();
  const fileInput = useRef<HTMLInputElement>(null);

  function showTemplates() {
    const card = document.getElementById('record-templates');
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  }

  return (
    <section
      aria-labelledby="records-hero-title"
      className="rounded-card relative isolate overflow-hidden px-5 py-7 text-white sm:px-8 sm:py-8"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-cover"
        style={{
          backgroundImage: "url('/images/records/records-banner.jpg')",
          backgroundPosition: '75% 55%',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(90deg, rgba(5,72,42,0.98) 0%, rgba(8,96,56,0.9) 40%, rgba(8,96,56,0.45) 62%, rgba(8,96,56,0) 85%)',
        }}
      />
      {/* Phones: the text spans the whole banner, so the photo needs an even wash to stay readable. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[rgba(5,72,42,0.6)] sm:hidden" />
      <div className="max-w-xl">
        <h2
          id="records-hero-title"
          className="font-display text-display leading-tight font-extrabold tracking-tight"
        >
          Every strong financial profile <br className="hidden sm:block" />
          starts with good records.
        </h2>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/90">
          Record your income, expenses, activities and financing to build reports, track your farm
          progress, and be ready for loan opportunities.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            {...readOnlyProps(readOnly)}
            onClick={readOnly ? notifyReadOnly : () => openModal('record')}
            className={cn(
              'inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#b9f5cf] px-4 text-sm font-bold text-[#064e2c] shadow-sm transition-colors hover:bg-[#a3efbf]',
              readOnly && READ_ONLY_CLASS,
            )}
          >
            <Plus size={18} aria-hidden="true" />
            {hasRecords ? 'Add a record' : 'Add your first record'}
          </button>
          <button
            type="button"
            {...readOnlyProps(readOnly)}
            onClick={readOnly ? notifyReadOnly : () => fileInput.current?.click()}
            className={cn(outline, readOnly && READ_ONLY_CLASS)}
          >
            <FileText size={17} aria-hidden="true" /> Import receipt
          </button>
          <input
            ref={fileInput}
            type="file"
            accept={RECEIPT_TYPES}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) openRecordWithReceipt(file);
            }}
          />
          <button type="button" onClick={showTemplates} className={outline}>
            <LayoutGrid size={17} aria-hidden="true" /> View templates
          </button>
        </div>
      </div>
    </section>
  );
}
