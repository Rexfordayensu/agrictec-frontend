'use client';

import {
  ChevronRight,
  Coins,
  Layers,
  Leaf,
  ShoppingBag,
  Sprout,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { readOnlyProps, READ_ONLY_CLASS, useReadOnly } from '@/lib/read-only';
import { cn } from '@/lib/utils';
import { useModalStore } from '@/store/modal-store';
import type { NewRecordInput } from '@/types';

/** Common records, each opening the form with its type and category filled in. */
export const RECORD_TEMPLATES: {
  label: string;
  icon: LucideIcon;
  defaults: Partial<NewRecordInput>;
}[] = [
  { label: 'Crop sale (income)', icon: Leaf, defaults: { type: 'income', category: 'crop_sale' } },
  {
    label: 'Fertilizer purchase (expense)',
    icon: ShoppingBag,
    defaults: { type: 'expense', category: 'fertilizer' },
  },
  {
    label: 'Labour cost (expense)',
    icon: Users,
    defaults: { type: 'expense', category: 'labour' },
  },
  {
    label: 'Planting activity (activity)',
    icon: Sprout,
    defaults: { type: 'activity', description: 'Planting' },
  },
  {
    label: 'Loan repayment (financing)',
    icon: Coins,
    defaults: { type: 'financing', category: 'loan_repayment', direction: 'out' },
  },
];

export function RecordTemplates({ className }: { className?: string }) {
  const openRecordWithDefaults = useModalStore((s) => s.openRecordWithDefaults);
  const readOnly = useReadOnly();
  return (
    <section
      id="record-templates"
      aria-labelledby="templates-title"
      className={cn(
        'rounded-card border-border bg-glass shadow-glass min-w-0 overflow-hidden border',
        className,
      )}
    >
      <div className="bg-accent/10 flex items-center gap-3 px-4 py-4 sm:px-5">
        <Layers size={24} aria-hidden="true" className="text-ink-green shrink-0" />
        <div>
          <h2 id="templates-title" className="text-text text-[15px] font-bold">
            What you can record
          </h2>
          <p className="text-text-mute text-[11px]">Common records for your farm</p>
        </div>
      </div>
      <ul className="space-y-2 p-3 sm:p-4">
        {RECORD_TEMPLATES.map((t) => (
          <li key={t.label}>
            <button
              type="button"
              {...readOnlyProps(readOnly)}
              onClick={readOnly ? undefined : () => openRecordWithDefaults(t.defaults)}
              className={cn(
                'border-border hover:border-accent/40 hover:bg-glass-strong flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 text-left text-sm transition-colors',
                readOnly && READ_ONLY_CLASS,
              )}
            >
              <t.icon size={18} aria-hidden="true" className="text-ink-green shrink-0" />
              <span className="text-text flex-1">{t.label}</span>
              <ChevronRight size={16} aria-hidden="true" className="text-text-mute shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
