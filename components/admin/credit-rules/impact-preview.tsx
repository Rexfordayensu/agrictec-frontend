'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronDown,
  Minus,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserX,
  type LucideIcon,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { BANDS, type FarmerImpact, type Impact } from '@/lib/admin/credit-rules';
import { bandTone } from '@/lib/admin/score-tone';
import { cn } from '@/lib/utils';

/** "+12" in green, "−8" in red, "0" in grey. */
export function DeltaBadge({ delta, className }: { delta: number; className?: string }) {
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums',
        delta > 0
          ? 'bg-accent/12 text-ink-green'
          : delta < 0
            ? 'bg-danger/12 text-ink-red'
            : 'bg-glass-strong text-text-mute',
        className,
      )}
    >
      {delta !== 0 && <Icon size={12} aria-hidden="true" />}
      {delta > 0 ? '+' : delta < 0 ? '−' : '±'}
      {Math.abs(delta)}
    </span>
  );
}

/** "Re-scoring 24 of 60 farmers": a thin bar while the preview works through every farmer. */
function ScoringProgress({ progress }: { progress: { done: number; total: number } | null }) {
  const percent = progress?.total ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <p className="text-text-mute text-xs" aria-live="polite">
        {progress
          ? `Re-scoring ${progress.done} of ${progress.total} farmers…`
          : 'Re-scoring every farmer…'}
      </p>
      <span
        role="progressbar"
        aria-label="Impact preview progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="bg-glass-strong block h-1 w-full overflow-hidden rounded-full"
      >
        <span
          className="bg-purple block h-full rounded-full transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      </span>
    </div>
  );
}

/** A farmer row: name, live → draft score, change. */
function FarmerRow({ farmer }: { farmer: FarmerImpact }) {
  return (
    <li>
      <Link
        href={`/admin/farmers/${farmer.userId}`}
        className="hover:bg-glass-strong -mx-2 flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm transition-colors"
      >
        <span className="text-text min-w-0 flex-1 truncate">{farmer.name}</span>
        <span className="text-text-mute shrink-0 text-xs tabular-nums">
          {farmer.current}
          <ArrowRight size={11} aria-hidden="true" className="mx-0.5 inline" />
          <span className="text-text font-semibold">{farmer.draft}</span>
        </span>
        <DeltaBadge delta={farmer.delta} />
      </Link>
    </li>
  );
}

/** "5 farmers would become eligible", opening to their names. */
function Disclosure({
  icon: Icon,
  tone,
  title,
  farmers,
  empty,
}: {
  icon: LucideIcon;
  tone: 'good' | 'bad';
  title: string;
  farmers: FarmerImpact[];
  empty: string;
}) {
  const [open, setOpen] = useState(false);
  const count = farmers.length;
  return (
    <div className="border-border rounded-xl border">
      <button
        type="button"
        aria-expanded={open}
        disabled={count === 0}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-12 w-full items-center gap-3 px-3 text-left disabled:cursor-default"
      >
        <span
          className={cn(
            'inline-flex size-8 shrink-0 items-center justify-center rounded-lg',
            count === 0
              ? 'bg-glass-strong text-text-mute'
              : tone === 'good'
                ? 'bg-accent/12 text-ink-green'
                : 'bg-danger/12 text-ink-red',
          )}
        >
          <Icon size={15} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-text block text-sm font-semibold">
            <span className="tabular-nums">{count}</span> {title}
          </span>
          {count === 0 && <span className="text-text-mute block text-xs">{empty}</span>}
        </span>
        {count > 0 && (
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={cn('text-text-mute transition-transform', open && 'rotate-180')}
          />
        )}
      </button>
      {open && count > 0 && (
        <ul className="border-border max-h-56 overflow-y-auto border-t px-3 py-2">
          {farmers.map((f) => (
            <FarmerRow key={f.userId} farmer={f} />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Every farmer re-scored with the draft, live, as the admin edits (nothing is saved): the
 * average, the bands before and after, eligibility won or lost, and the biggest moves.
 */
export function ImpactPreview({
  impact,
  calculating = false,
  progress = null,
  liveVersion,
  hasChanges,
  error,
}: {
  /** Null until the first calculation finishes. */
  impact: Impact | null;
  /** The shown impact is for an earlier draft: a newer one is being worked out. */
  calculating?: boolean;
  progress?: { done: number; total: number } | null;
  liveVersion: number;
  hasChanges: boolean;
  /** The draft can't be scored as it stands (e.g. weights off 100). */
  error?: string;
}) {
  if (!impact) {
    return (
      <div className="space-y-3" role="status" aria-label="Scoring every farmer">
        <ScoringProgress progress={progress} />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  const total = impact.farmers.length;
  const delta = impact.averageDraft - impact.averageCurrent;
  const peak = Math.max(1, ...BANDS.flatMap((b) => [impact.bandsCurrent[b], impact.bandsDraft[b]]));

  return (
    <div className="space-y-5" aria-busy={calculating}>
      {calculating && <ScoringProgress progress={progress} />}
      {/* Average */}
      <div>
        <p className="text-text-mute text-xs font-semibold">Average score</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-text-mute font-display text-2xl font-bold tabular-nums">
            {impact.averageCurrent}
          </span>
          <ArrowRight size={18} aria-hidden="true" className="text-text-mute" />
          <span className="font-display text-text text-3xl font-bold tabular-nums">
            {impact.averageDraft}
          </span>
          <DeltaBadge delta={delta} className="text-sm" />
        </div>
        <p className="text-text-mute mt-1 text-xs">
          {hasChanges
            ? `${impact.changedScores} of ${total} farmers’ scores would change.`
            : `Live v${liveVersion}. Change a rule to see its effect on all ${total} farmers.`}
        </p>
        {error && (
          <p className="text-ink-gold mt-2 text-xs font-semibold">
            Preview only: {error.charAt(0).toLowerCase() + error.slice(1)}
          </p>
        )}
      </div>

      {/* Bands before and after */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-text-mute text-xs font-semibold">Farmers per band</p>
          <p className="flex items-center gap-3 text-[11px]">
            <span className="text-text-mute flex items-center gap-1.5">
              <span aria-hidden="true" className="bg-text-mute/40 size-2 rounded-sm" /> Live
            </span>
            <span className="text-text flex items-center gap-1.5">
              <span aria-hidden="true" className="bg-purple size-2 rounded-sm" /> Draft
            </span>
          </p>
        </div>
        <div
          role="img"
          aria-label={BANDS.map(
            (b) => `${b}: ${impact.bandsCurrent[b]} now, ${impact.bandsDraft[b]} with the draft`,
          ).join('; ')}
          className="grid grid-cols-4 gap-3"
        >
          {BANDS.map((band) => {
            const before = impact.bandsCurrent[band];
            const after = impact.bandsDraft[band];
            return (
              <div key={band} className="min-w-0">
                <div className="flex h-28 items-end justify-center gap-1">
                  {[
                    { key: 'live', count: before, color: 'bg-text-mute/40' },
                    { key: 'draft', count: after, color: 'bg-purple' },
                  ].map((bar) => (
                    <div key={bar.key} className="flex h-full w-5 flex-col justify-end">
                      <span className="text-text-mute mb-1 text-center text-[10px] font-semibold tabular-nums">
                        {bar.count}
                      </span>
                      <span
                        className={cn(
                          'block rounded-t-md transition-[height] duration-300',
                          bar.color,
                        )}
                        style={{ height: `${(bar.count / peak) * 80}%` }}
                      />
                    </div>
                  ))}
                </div>
                <p className={cn('mt-1.5 text-center text-xs font-semibold', bandTone(band).text)}>
                  {band}
                </p>
                <p className="text-text-mute text-center text-[11px] tabular-nums">
                  {after - before === 0
                    ? '±0'
                    : `${after - before > 0 ? '+' : '−'}${Math.abs(after - before)}`}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Eligibility */}
      <div className="space-y-2">
        <p className="text-text-mute text-xs font-semibold">Loan eligibility</p>
        <Disclosure
          icon={UserCheck}
          tone="good"
          title={`farmer${impact.gained.length === 1 ? '' : 's'} would become eligible`}
          farmers={impact.gained}
          empty="No one newly qualifies"
        />
        <Disclosure
          icon={UserX}
          tone="bad"
          title={`farmer${impact.lost.length === 1 ? '' : 's'} would lose eligibility`}
          farmers={impact.lost}
          empty="No one loses access"
        />
      </div>

      {/* Biggest moves */}
      <div>
        <p className="text-text-mute mb-1.5 text-xs font-semibold">Biggest changes</p>
        {impact.biggest.length === 0 ? (
          <p className="text-text-mute border-border rounded-xl border border-dashed px-3 py-4 text-center text-xs">
            No score changes yet.
          </p>
        ) : (
          <ol>
            {impact.biggest.map((f) => (
              <FarmerRow key={f.userId} farmer={f} />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
