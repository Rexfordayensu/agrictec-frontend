'use client';

import { useFarmStats } from '@/hooks/use-farm-stats';
import { useGhanaCardStatus } from '@/hooks/use-ghana-card';
import { formatGHS } from '@/lib/format';

export function LoansHero() {
  const { credit, creditLabel, borrowingPower } = useFarmStats();
  const ghanaCard = useGhanaCardStatus();

  return (
    <header className="space-y-4">
      <div>
        <h1 className="font-display text-ink-green text-2xl leading-tight font-bold sm:text-3xl">
          Loans &amp; Credit
        </h1>
        <p className="text-text-dim mt-1 text-sm">
          Compare loan costs, understand your credit score and track your applications.
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        <div className="border-border bg-glass rounded-2xl border p-4">
          <dt className="text-text-dim text-xs font-semibold">Your credit score</dt>
          <dd className="mt-1">
            <span className="text-text text-xl font-bold @lg:text-2xl">{credit.score}</span>{' '}
            <span className="text-text-mute text-sm">/ 850</span>
            <p className="text-text-mute mt-1 text-xs">{creditLabel}</p>
          </dd>
        </div>
        <div className="border-border bg-glass rounded-2xl border p-4">
          <dt className="text-text-dim text-xs font-semibold">Estimated borrowing limit</dt>
          <dd className="mt-1">
            <span className="text-ink-green text-xl font-bold break-words @lg:text-2xl">
              {borrowingPower > 0 ? formatGHS(borrowingPower) : 'No estimate yet'}
            </span>
            <p className="text-text-mute mt-1 text-xs">
              {borrowingPower > 0 ? 'Based on recorded farm profit' : 'Add farm sales and costs'}
            </p>
          </dd>
        </div>
      </dl>
      <p className="text-text-mute text-xs leading-relaxed">
        Your score and estimated limit do not confirm approval. The lender decides the final amount
        and terms.
      </p>
      {ghanaCard === 'verified' && (
        <p className="text-ink-green text-xs font-semibold">
          Ghana Card verified. Choose a loan below to check its requirements.
        </p>
      )}
    </header>
  );
}
