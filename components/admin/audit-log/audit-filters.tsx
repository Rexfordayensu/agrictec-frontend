'use client';

import { RotateCcw, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { AUDIT_GROUPS, TARGET_TYPES } from '@/lib/admin/audit-groups';
import { ROLE_LABELS } from '@/lib/admin/permissions';
import { cn } from '@/lib/utils';
import type { AuditEntry, AuditFilter } from '@/types/admin';

export type AuditFilterState = Required<
  Pick<AuditFilter, 'search' | 'actorId' | 'targetType' | 'from' | 'to'>
> & { group: AuditFilter['group'] | '' };

export const EMPTY_FILTER: AuditFilterState = {
  search: '',
  actorId: '',
  group: '',
  targetType: '' as AuditEntry['targetType'],
  from: '',
  to: '',
};

const TARGET_LABELS: Record<AuditEntry['targetType'], string> = {
  farmer: 'Farmer',
  loan: 'Loan',
  lender: 'Lender',
  config: 'Credit rules',
  content: 'Content',
  announcement: 'Announcement',
  risk: 'Risk flag',
  admin: 'Team member',
  system: 'System',
};
export const targetTypeLabel = (type: AuditEntry['targetType']) => TARGET_LABELS[type];

/**
 * Who, what kind of action, on what, when, plus free-text search. Action groups are chips (one
 * tap); the rest are compact selects.
 */
export function AuditFilters({
  value,
  onChange,
  actors,
}: {
  value: AuditFilterState;
  onChange: (next: AuditFilterState) => void;
  actors: { id: string; name: string; role: AuditEntry['actorRole'] }[];
}) {
  const set = (patch: Partial<AuditFilterState>) => onChange({ ...value, ...patch });
  const active = JSON.stringify(value) !== JSON.stringify(EMPTY_FILTER);

  return (
    <div role="search" aria-label="Filter the audit log" className="space-y-3">
      <div className="-mx-4 flex scrollbar-none gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
        {[
          { id: '' as const, label: 'All actions', description: 'Everything' },
          ...AUDIT_GROUPS,
        ].map((group) => {
          const on = value.group === group.id;
          return (
            <button
              key={group.id || 'all'}
              type="button"
              aria-pressed={on}
              title={group.description}
              onClick={() => set({ group: group.id })}
              className={cn(
                'inline-flex min-h-9 shrink-0 items-center rounded-full border px-3.5 text-xs font-semibold transition-colors',
                on
                  ? 'border-purple/50 bg-purple/15 text-ink-purple'
                  : 'border-border text-text-dim hover:text-text hover:bg-glass-strong',
              )}
            >
              {group.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_11rem_11rem_9.5rem_9.5rem_auto]">
        <div className="relative min-w-0 sm:col-span-2 xl:col-span-1">
          <Search
            size={16}
            aria-hidden="true"
            className="text-text-mute pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
          />
          <Input
            type="search"
            aria-label="Search summaries, people and IDs"
            placeholder="Search summaries, people and IDs"
            value={value.search}
            onChange={(e) => set({ search: e.target.value })}
            className="pl-10"
          />
        </div>
        <Select
          aria-label="Actor"
          value={value.actorId}
          onChange={(e) => set({ actorId: e.target.value })}
        >
          <option value="">Anyone</option>
          {actors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({ROLE_LABELS[a.role]})
            </option>
          ))}
        </Select>
        <Select
          aria-label="Target type"
          value={value.targetType}
          onChange={(e) => set({ targetType: e.target.value as AuditEntry['targetType'] })}
        >
          <option value="">Any target</option>
          {TARGET_TYPES.map((t) => (
            <option key={t} value={t}>
              {TARGET_LABELS[t]}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          aria-label="From date"
          value={value.from}
          max={value.to || undefined}
          onChange={(e) => set({ from: e.target.value })}
        />
        <Input
          type="date"
          aria-label="To date"
          value={value.to}
          min={value.from || undefined}
          onChange={(e) => set({ to: e.target.value })}
        />
        <button
          type="button"
          disabled={!active}
          onClick={() => onChange(EMPTY_FILTER)}
          className="text-text-dim hover:text-text border-border hover:bg-glass-strong inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-colors disabled:opacity-40"
        >
          <RotateCcw size={14} aria-hidden="true" />
          Clear
        </button>
      </div>
    </div>
  );
}
