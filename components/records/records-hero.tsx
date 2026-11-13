'use client';

import { useRef, useState } from 'react';
import { FileText, Info, LayoutGrid, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { readOnlyProps, READ_ONLY_CLASS, useReadOnly } from '@/lib/read-only';
import { cn } from '@/lib/utils';
import { useFarmStore } from '@/store/farm-store';
import { useModalStore } from '@/store/modal-store';
import './records.css';

const RECEIPT_TYPES = 'image/jpeg,image/png,image/webp,application/pdf';
const secondary =
  'border-border bg-glass text-text hover:bg-glass-strong inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 text-small font-semibold transition-colors';

/**
 * The welcome banner: one place to add a record, import a receipt (saved with the new record as
 * evidence), jump to the record templates, or read what is worth recording.
 */
export function RecordsHero() {
  const hasRecords = useFarmStore((s) => s.records.length > 0);
  const openModal = useModalStore((s) => s.openModal);
  const openRecordWithReceipt = useModalStore((s) => s.openRecordWithReceipt);
  const readOnly = useReadOnly();
  const fileInput = useRef<HTMLInputElement>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  function showTemplates() {
    const card = document.getElementById('record-templates');
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  }

  return (
    <section
      aria-labelledby="records-hero-title"
      className="records-hero rounded-card border-border relative isolate overflow-hidden border p-5 sm:p-7"
      style={{
        background:
          'linear-gradient(100deg, var(--records-hero-from) 0%, var(--records-hero-to) 100%)',
      }}
    >
      <div className="@container relative z-10 max-w-[48rem]">
        <h2
          id="records-hero-title"
          className="text-display leading-tight font-extrabold tracking-tight text-[var(--records-hero-title)]"
        >
          Every strong financial profile <br className="hidden sm:block" />
          starts with good records.
        </h2>
        <p className="text-text-dim mt-3 max-w-[36rem] text-sm leading-relaxed">
          Record your income, expenses, activities and financing to build reports, track your farm
          progress, and be ready for loan opportunities.
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Button mutates icon={Plus} onClick={() => openModal('record')}>
            {hasRecords ? 'Add a record' : 'Add your first record'}
          </Button>
          <button
            type="button"
            {...readOnlyProps(readOnly)}
            onClick={readOnly ? undefined : () => fileInput.current?.click()}
            className={cn(secondary, readOnly && READ_ONLY_CLASS)}
          >
            <FileText size={16} aria-hidden="true" /> Import receipt
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
          <button type="button" onClick={showTemplates} className={secondary}>
            <LayoutGrid size={16} aria-hidden="true" /> View templates
          </button>
          <button type="button" onClick={() => setGuideOpen(true)} className={secondary}>
            <Info size={16} aria-hidden="true" /> Learn what to record
          </button>
        </div>
      </div>
      <FarmIllustration />
      <Modal open={guideOpen} onClose={() => setGuideOpen(false)} title="What to record">
        <div className="text-text-dim space-y-4 text-sm leading-relaxed">
          <p>
            Record every money movement on the farm, on the day it happens, with the real amount.
            Lenders look for regular, complete and checkable records.
          </p>
          <dl className="space-y-3">
            {[
              ['Income', 'Crop and livestock sales, produce deliveries and other farm income.'],
              [
                'Expenses',
                'Seed, fertilizer, labour, transport, equipment, irrigation and land rent.',
              ],
              [
                'Activities',
                'Planting, weeding, spraying and harvest: the work, even without money.',
              ],
              [
                'Financing',
                'Loans received, repayments and interest. These are kept apart from farm income.',
              ],
            ].map(([term, text]) => (
              <div key={term}>
                <dt className="text-text font-semibold">{term}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
          <p>
            Attach a receipt or MoMo statement where you can. AgriCtec reviewers check the evidence,
            and verified entries count for more with lenders.
          </p>
        </div>
      </Modal>
    </section>
  );
}

/** Decoration: a checklist clipboard with a seedling, in front of fields, trees and a barn. */
function FarmIllustration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 520 220"
      preserveAspectRatio="xMaxYMax meet"
      className="pointer-events-none absolute right-0 bottom-0 -z-0 hidden h-full w-[38%] max-w-[440px] md:block"
    >
      <defs>
        <linearGradient id="rh-board">
          <stop stopColor="#7cad67" />
          <stop offset="1" stopColor="#2b8a5d" />
        </linearGradient>
        <linearGradient id="rh-leaf" x2="1" y2="1">
          <stop stopColor="#bee85c" />
          <stop offset="1" stopColor="#53ac45" />
        </linearGradient>
        <linearGradient id="rh-field" x2="1" y2="1">
          <stop stopColor="#cfdf8c" />
          <stop offset="1" stopColor="#68ba66" />
        </linearGradient>
        <linearGradient id="rh-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#e8f6ee" stopOpacity="0" />
          <stop offset="1" stopColor="#d9f0e2" />
        </linearGradient>
      </defs>
      <rect x="140" y="0" width="380" height="220" fill="url(#rh-sky)" />
      {/* Hills and fields */}
      <path d="M0 132Q75 135 130 80T260 62T385 49T520 62V220H0Z" fill="#c9e8dc" opacity=".45" />
      <path d="M0 162Q90 155 200 122T390 103T520 117V220H0Z" fill="#bfe3c7" />
      <path d="M0 194 Q 230 140 520 150 V 220 H 0 Z" fill="url(#rh-field)" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path
          key={i}
          d={`M${250 + i * 45} 220 L ${360 + i * 28} 158`}
          stroke="#d7b75f"
          strokeWidth="9"
          opacity="0.75"
        />
      ))}
      {/* Barn */}
      <g transform="translate(400 108)">
        <path d="M0 22 L 32 0 L 64 22 Z" fill="#8a5a3c" />
        <rect x="6" y="22" width="52" height="34" fill="#b9845c" />
        <rect x="24" y="34" width="16" height="22" fill="#6f4429" />
      </g>
      {/* Trees */}
      {[
        [370, 112, 16],
        [480, 98, 20],
        [505, 118, 14],
      ].map(([x, y, r]) => (
        <g key={x}>
          <rect x={x - 2} y={y + r - 4} width="4" height="16" fill="#7a5a3a" />
          <circle cx={x} cy={y} r={r} fill="#64b85b" />
          <circle cx={x - 9} cy={y + 3} r={r * 0.65} fill="#76c965" />
          <circle cx={x + 8} cy={y + 8} r={r * 0.75} fill="#3f9a54" />
        </g>
      ))}
      {/* Clipboard */}
      <g transform="translate(135 48) rotate(5)">
        <rect x="3" y="3" width="110" height="150" rx="12" fill="#267451" opacity=".18" />
        <rect x="0" y="0" width="110" height="150" rx="12" fill="url(#rh-board)" />
        <rect x="9" y="12" width="92" height="130" rx="6" fill="#ffffff" />
        <circle cx="55" cy="-8" r="12" fill="url(#rh-board)" />
        <circle cx="55" cy="-8" r="4" fill="#edf8ee" />
        <rect x="31" y="-8" width="48" height="18" rx="3" fill="url(#rh-board)" />
        {[30, 58, 86, 114].map((y, i) => (
          <g key={y}>
            {i < 2 ? (
              <path
                d={`M20 ${y} l6 6 l11 -12`}
                stroke="#2f8f5b"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
              />
            ) : (
              <rect x="20" y={y - 6} width="14" height="12" rx="3" fill="#dbeee2" />
            )}
            <rect x="45" y={y - 4} width="45" height="6" rx="3" fill="#cfe6d8" />
          </g>
        ))}
      </g>
      {/* Seedling */}
      <g transform="translate(95 120)">
        <path d="M30 80 Q 26 50 30 20" stroke="#3c9a4f" strokeWidth="5" fill="none" />
        <path d="M30 40 Q 0 30 2 6 Q 28 10 30 40 Z" fill="url(#rh-leaf)" />
        <path d="M31 30 Q 56 12 66 26 Q 52 46 31 30 Z" fill="url(#rh-leaf)" />
        <ellipse cx="30" cy="84" rx="34" ry="9" fill="#8b6a43" />
      </g>
    </svg>
  );
}
