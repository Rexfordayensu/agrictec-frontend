'use client';

import { useState } from 'react';
import { ArrowRight, SlidersHorizontal, UserRound } from 'lucide-react';
import { FarmerCombobox } from '@/components/admin/credit-rules/farmer-combobox';
import { FACTOR_COLOR } from '@/components/admin/credit-rules/fields';
import { DeltaBadge } from '@/components/admin/credit-rules/impact-preview';
import { DEFAULT_CREDIT_CONFIG } from '@/lib/admin/defaults';
import { FACTORS, type ScoringInput } from '@/lib/admin/credit-rules';
import { bandTone } from '@/lib/admin/score-tone';
import {
  calculateCreditScore,
  factorPoints,
  factorsFromCounts,
  scoreFromFactors,
  scoreLabel,
  type ScoreCounts,
} from '@/lib/calculations/credit-score';
import { cn } from '@/lib/utils';
import type { CreditScoreBreakdown } from '@/types';
import type { CreditConfig, CreditConfigInput } from '@/types/admin';

type Mode = 'farmer' | 'custom';

const asConfig = (values: CreditConfigInput): CreditConfig => ({
  ...DEFAULT_CREDIT_CONFIG,
  ...values,
});

const COUNT_FIELDS: { key: keyof ScoreCounts; label: string; max: number; step?: number }[] = [
  { key: 'activeMonths', label: 'Active months (recent)', max: 24 },
  { key: 'records', label: 'Farm records', max: 500 },
  { key: 'momo', label: 'MoMo transactions', max: 500 },
  { key: 'income', label: 'Income (GHS)', max: 10_000_000, step: 100 },
  { key: 'expenses', label: 'Expenses (GHS)', max: 10_000_000, step: 100 },
  { key: 'verifiedChecks', label: 'Checks passed (of 4)', max: 4 },
];

/** A score card: live or draft. */
function ScoreCard({
  title,
  breakdown,
  bands,
  highlight,
}: {
  title: string;
  breakdown: CreditScoreBreakdown;
  bands: CreditConfig['bands'];
  highlight?: boolean;
}) {
  const band = scoreLabel(breakdown.score, bands);
  return (
    <div
      className={cn(
        'rounded-2xl border p-4',
        highlight ? 'border-purple/50 bg-purple/8' : 'border-border bg-bg-2/50',
      )}
    >
      <p className="text-text-mute text-xs font-semibold">{title}</p>
      <p className="font-display text-text mt-1 text-4xl leading-none font-bold tabular-nums">
        {breakdown.score}
      </p>
      <p className={cn('mt-1.5 text-sm font-semibold', bandTone(band).text)}>{band}</p>
    </div>
  );
}

/**
 * Try the draft on one farmer (or made-up numbers): the score under the live rules and the
 * draft, and the points each factor adds under each.
 */
export function ScoreSimulator({
  farmers,
  live,
  draft,
  liveVersion,
}: {
  farmers: ScoringInput[];
  live: CreditConfigInput;
  draft: CreditConfigInput;
  liveVersion: number;
}) {
  const [mode, setMode] = useState<Mode>('farmer');
  const [userId, setUserId] = useState<string | null>(farmers[0]?.userId ?? null);
  const [counts, setCounts] = useState<ScoreCounts>({
    activeMonths: 4,
    records: 18,
    momo: 10,
    income: 24_000,
    expenses: 15_000,
    verifiedChecks: 2,
  });
  const liveConfig = asConfig(live);
  const draftConfig = asConfig(draft);
  const farmer = farmers.find((f) => f.userId === userId);

  const score = (config: CreditConfig): CreditScoreBreakdown =>
    mode === 'farmer' && farmer
      ? calculateCreditScore(farmer.records, farmer.momo, farmer.profile, config)
      : scoreFromFactors(factorsFromCounts(counts, config), config.weights);
  const now = score(liveConfig);
  const next = score(draftConfig);
  const nowPoints = factorPoints(now, liveConfig.weights);
  const nextPoints = factorPoints(next, draftConfig.weights);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      {/* Inputs */}
      <div className="border-border bg-glass h-fit space-y-4 rounded-2xl border p-5">
        <div
          role="group"
          aria-label="Simulate"
          className="border-border bg-bg-2 grid grid-cols-2 gap-1 rounded-xl border p-1"
        >
          {(
            [
              ['farmer', 'A farmer', UserRound],
              ['custom', 'Custom numbers', SlidersHorizontal],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              aria-pressed={mode === key}
              onClick={() => setMode(key)}
              className={cn(
                'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors',
                mode === key ? 'bg-purple/15 text-text' : 'text-text-mute hover:text-text',
              )}
            >
              <Icon size={14} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        {mode === 'farmer' ? (
          <>
            <FarmerCombobox farmers={farmers} value={userId} onChange={setUserId} />
            {farmer && (
              <dl className="grid grid-cols-3 gap-2 text-xs">
                {[
                  ['Records', farmer.records.length],
                  ['MoMo', farmer.momo.length],
                  ['Region', farmer.profile.region],
                ].map(([label, v]) => (
                  <div key={label} className="bg-bg-2/60 rounded-lg px-2.5 py-2">
                    <dt className="text-text-mute">{label}</dt>
                    <dd className="text-text mt-0.5 truncate font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {COUNT_FIELDS.map((field) => (
              <label key={field.key} className="min-w-0">
                <span className="text-text-dim mb-1.5 block text-xs font-semibold">
                  {field.label}
                </span>
                <input
                  type="number"
                  min={0}
                  max={field.max}
                  step={field.step ?? 1}
                  value={counts[field.key]}
                  onChange={(e) =>
                    setCounts((c) => ({
                      ...c,
                      [field.key]: Math.min(field.max, Math.max(0, Number(e.target.value) || 0)),
                    }))
                  }
                  className="border-border bg-bg-2 text-text focus:border-purple/70 min-h-11 w-full rounded-xl border px-3 text-sm font-semibold tabular-nums outline-none"
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="border-border bg-glass min-w-0 space-y-5 rounded-2xl border p-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <ScoreCard
            title={`Live rules (v${liveVersion})`}
            breakdown={now}
            bands={liveConfig.bands}
          />
          <div className="flex flex-col items-center gap-1.5">
            <ArrowRight size={18} aria-hidden="true" className="text-text-mute" />
            <DeltaBadge delta={next.score - now.score} />
          </div>
          <ScoreCard
            title="Draft rules"
            breakdown={next}
            bands={draftConfig.bands}
            highlight={next.score !== now.score}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-left text-sm">
            <caption className="sr-only">Each factor and the points it adds</caption>
            <thead>
              <tr className="text-text-mute border-border border-b text-[11px] font-semibold tracking-wider uppercase">
                <th scope="col" className="py-2 pr-3 font-semibold">
                  Factor
                </th>
                <th scope="col" className="py-2 pr-3 font-semibold">
                  Value
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">
                  Live pts
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">
                  Draft pts
                </th>
                <th scope="col" className="py-2 text-right font-semibold">
                  Change
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {FACTORS.map((f) => {
                const value = next[f.key];
                const change = Math.round((nextPoints[f.key] - nowPoints[f.key]) * 10) / 10;
                return (
                  <tr key={f.key}>
                    <th scope="row" className="py-2.5 pr-3 font-normal">
                      <span className="text-text flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className={cn('size-2 rounded-full', FACTOR_COLOR[f.key].dot)}
                        />
                        {f.label}
                      </span>
                      <span className="text-text-mute ml-4 text-[11px]">
                        weight {live.weights[f.key]}%
                        {draft.weights[f.key] !== live.weights[f.key] &&
                          ` → ${draft.weights[f.key]}%`}
                      </span>
                    </th>
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="bg-glass-strong block h-1.5 w-16 overflow-hidden rounded-full"
                        >
                          <span
                            className={cn('block h-full rounded-full', FACTOR_COLOR[f.key].bar)}
                            style={{ width: `${value}%` }}
                          />
                        </span>
                        <span className="text-text-dim text-xs tabular-nums">
                          {now[f.key] !== value ? `${now[f.key]} → ${value}` : value}
                        </span>
                      </span>
                    </td>
                    <td className="text-text-dim py-2.5 pr-3 text-right tabular-nums">
                      {nowPoints[f.key].toFixed(1)}
                    </td>
                    <td className="text-text py-2.5 pr-3 text-right font-semibold tabular-nums">
                      {nextPoints[f.key].toFixed(1)}
                    </td>
                    <td
                      className={cn(
                        'py-2.5 text-right text-xs font-semibold tabular-nums',
                        change > 0
                          ? 'text-ink-green'
                          : change < 0
                            ? 'text-ink-red'
                            : 'text-text-mute',
                      )}
                    >
                      {change > 0 ? '+' : change < 0 ? '−' : ''}
                      {Math.abs(change).toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-border border-t">
                <th
                  scope="row"
                  colSpan={2}
                  className="text-text-mute py-2.5 pr-3 text-xs font-normal"
                >
                  Base 300 + points (rounded)
                </th>
                <td className="text-text-dim py-2.5 pr-3 text-right font-semibold tabular-nums">
                  {now.score}
                </td>
                <td className="text-text py-2.5 pr-3 text-right font-bold tabular-nums">
                  {next.score}
                </td>
                <td className="py-2.5 text-right">
                  <DeltaBadge delta={next.score - now.score} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
