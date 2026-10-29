'use client';

import { Check, Globe, MapPin, Sprout, Users, type LucideIcon } from 'lucide-react';
import { CROPS } from '@/constants/crops';
import { REGIONS } from '@/constants/regions';
import { estimateReach, type AnnouncementAudience } from '@/lib/admin/announcements';
import { cn } from '@/lib/utils';
import type { Crop } from '@/types';
import type { FarmerAccount } from '@/types/admin';

export type AudienceKind = AnnouncementAudience['kind'];

export interface AudienceDraft {
  kind: AudienceKind;
  regions: string[];
  crops: Crop[];
}

const KINDS: { value: AudienceKind; label: string; icon: LucideIcon }[] = [
  { value: 'all', label: 'Everyone', icon: Globe },
  { value: 'region', label: 'Regions', icon: MapPin },
  { value: 'crop', label: 'Crops', icon: Sprout },
];

const CROP_OPTIONS = CROPS.filter((c) => c !== 'Other');

/** The audience the draft describes (an empty pick stays empty, so it can't be saved). */
export function toAudience(draft: AudienceDraft): AnnouncementAudience {
  if (draft.kind === 'region') return { kind: 'region', regions: draft.regions };
  if (draft.kind === 'crop') return { kind: 'crop', crops: draft.crops };
  return { kind: 'all' };
}

/** "~23 farmers" (or "No farmers yet"). */
export const reachLabel = (count: number) =>
  count === 0 ? 'No farmers yet' : `~${count} farmer${count === 1 ? '' : 's'}`;

/**
 * Who sees the announcement: everyone, some regions or growers of some crops, with a live
 * count of the registered farmers it reaches today.
 */
export function AudiencePicker({
  value,
  onChange,
  farmers,
  error,
}: {
  value: AudienceDraft;
  onChange: (value: AudienceDraft) => void;
  farmers: FarmerAccount[];
  error?: string;
}) {
  const reach = estimateReach(toAudience(value), farmers);
  const options: string[] = value.kind === 'region' ? REGIONS : CROP_OPTIONS;
  const picked: string[] = value.kind === 'region' ? value.regions : value.crops;
  const setPicked = (next: string[]) =>
    onChange(
      value.kind === 'region'
        ? { ...value, regions: REGIONS.filter((r) => next.includes(r)) }
        : { ...value, crops: CROP_OPTIONS.filter((c) => next.includes(c)) },
    );

  return (
    <fieldset className="min-w-0">
      <legend className="text-text-dim mb-1.5 flex w-full items-center justify-between text-xs font-semibold">
        <span>Audience</span>
        <span
          aria-live="polite"
          className={cn(
            'inline-flex items-center gap-1 font-semibold tabular-nums',
            reach === 0 ? 'text-ink-gold' : 'text-ink-purple',
          )}
        >
          <Users size={13} aria-hidden="true" />
          {reach === 0 ? 'No farmers in this audience yet' : `Reaches ${reachLabel(reach)}`}
        </span>
      </legend>

      <div
        role="radiogroup"
        aria-label="Audience"
        className="border-border bg-bg-2 grid grid-cols-3 gap-1 rounded-xl border p-1"
      >
        {KINDS.map(({ value: kind, label, icon: Icon }) => {
          const selected = value.kind === kind;
          return (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange({ ...value, kind })}
              className={cn(
                'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors',
                selected
                  ? 'bg-purple/15 text-ink-purple'
                  : 'text-text-mute hover:text-text hover:bg-glass',
              )}
            >
              <Icon size={15} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>

      {value.kind !== 'all' && (
        <div className="border-border mt-3 rounded-xl border p-3">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <p className="text-text-mute text-xs">
              {picked.length === 0
                ? `Pick at least one ${value.kind === 'region' ? 'region' : 'crop'}.`
                : `${picked.length} of ${options.length} selected`}
            </p>
            <button
              type="button"
              onClick={() => setPicked(picked.length === options.length ? [] : options)}
              className="text-ink-purple min-h-8 text-xs font-semibold"
            >
              {picked.length === options.length ? 'Clear' : 'Select all'}
            </button>
          </div>
          <div
            role="group"
            aria-label={value.kind === 'region' ? 'Regions' : 'Crops'}
            className="flex flex-wrap gap-1.5"
          >
            {options.map((option) => {
              const on = picked.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setPicked(on ? picked.filter((p) => p !== option) : [...picked, option])
                  }
                  className={cn(
                    'inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-xs font-semibold transition-colors',
                    on
                      ? 'border-purple/50 bg-purple/15 text-ink-purple'
                      : 'border-border text-text-dim hover:text-text hover:bg-glass',
                  )}
                >
                  {on && <Check size={12} aria-hidden="true" />}
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-ink-red mt-2 text-xs font-semibold">
          {error}
        </p>
      )}
    </fieldset>
  );
}
