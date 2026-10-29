'use client';

import { Layers } from 'lucide-react';
import { StatusTabs } from '@/components/admin/shared/status-tabs';
import { KIND_ICON } from '@/components/admin/verifications/kind-meta';
import { KIND_LABEL, type QueueTab } from '@/lib/admin/verification-queue';
import { cn } from '@/lib/utils';
import type { VerificationKind } from '@/types/admin';

const TAB_LABELS: Record<QueueTab, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  all: 'All',
};

const KINDS: (VerificationKind | '')[] = ['', 'ghanaCard', 'phone', 'location'];

/** Pending · Approved · Rejected · All (with counts). */
export function VerificationTabs({
  tab,
  counts,
  onTab,
}: {
  tab: QueueTab;
  counts: Record<QueueTab, number>;
  onTab: (tab: QueueTab) => void;
}) {
  return (
    <StatusTabs
      label="Request status"
      value={tab}
      onChange={onTab}
      tabs={(Object.keys(TAB_LABELS) as QueueTab[]).map((value) => ({
        value,
        label: TAB_LABELS[value],
        count: counts[value],
      }))}
    />
  );
}

/** A segmented control: All kinds, Ghana Card, Phone, Location. */
export function KindFilter({
  value,
  onChange,
}: {
  value: VerificationKind | '';
  onChange: (kind: VerificationKind | '') => void;
}) {
  return (
    <div
      role="group"
      aria-label="Kind of check"
      className="border-border bg-bg-2 grid grid-cols-4 gap-1 rounded-xl border p-1 sm:inline-grid sm:w-auto"
    >
      {KINDS.map((kind) => {
        const Icon = kind ? KIND_ICON[kind] : Layers;
        const selected = value === kind;
        return (
          <button
            key={kind || 'all'}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(kind)}
            className={cn(
              'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold whitespace-nowrap transition-colors sm:px-3',
              selected ? 'bg-purple/15 text-text' : 'text-text-mute hover:text-text',
            )}
          >
            <Icon size={14} aria-hidden="true" className={selected ? 'text-ink-purple' : ''} />
            <span className={kind ? 'hidden sm:inline' : ''}>
              {kind ? KIND_LABEL[kind] : 'All'}
            </span>
            {kind && <span className="sr-only sm:hidden">{KIND_LABEL[kind]}</span>}
          </button>
        );
      })}
    </div>
  );
}
