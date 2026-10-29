'use client';

import { Check } from 'lucide-react';
import { REVIEW_STEP, STEPS } from '@/components/onboarding/onboarding-schemas';
import { cn } from '@/lib/utils';

/**
 * "Step 2 of 6" with a bar, then a dot per step (labels from 640px). Dots of steps already
 * reached are buttons that jump back to them.
 */
export function StepProgress({
  step,
  reached,
  onJump,
}: {
  step: number;
  reached: number;
  onJump: (step: number) => void;
}) {
  const review = step >= REVIEW_STEP;
  const percent = review ? 100 : Math.round((step / STEPS.length) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-text text-sm font-semibold" aria-live="polite">
          {review ? 'Review and submit' : `Step ${step + 1} of ${STEPS.length}`}
        </p>
        <p className="text-text-mute text-xs">{review ? 'Almost done' : STEPS[step]?.label}</p>
      </div>
      <div
        role="progressbar"
        aria-label="Onboarding progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="bg-glass-strong mt-2.5 h-1.5 overflow-hidden rounded-full"
      >
        <div
          className="bg-accent h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.max(percent, 4)}%` }}
        />
      </div>
      <ol className="mt-4 flex items-start justify-between gap-1">
        {STEPS.map((s, index) => {
          const done = index < step || review;
          const current = index === step;
          const reachable = index <= reached && !current;
          const dot = (
            <span
              className={cn(
                'inline-flex size-7 items-center justify-center rounded-full border text-[11px] font-bold tabular-nums transition-colors',
                current
                  ? 'border-accent bg-accent text-[#022c22]'
                  : done
                    ? 'border-accent/50 bg-accent/15 text-ink-green'
                    : 'border-border text-text-mute',
              )}
            >
              {done && !current ? <Check size={13} aria-hidden="true" /> : index + 1}
            </span>
          );
          const label = (
            <span
              className={cn(
                'mt-1.5 hidden text-center text-[11px] leading-tight font-semibold sm:block',
                current ? 'text-text' : 'text-text-mute',
              )}
            >
              {s.label}
            </span>
          );
          return (
            <li key={s.id} className="flex min-w-0 flex-1 flex-col items-center">
              {reachable ? (
                <button
                  type="button"
                  onClick={() => onJump(index)}
                  aria-label={`Go back to step ${index + 1}: ${s.label}`}
                  className="flex min-h-11 min-w-11 flex-col items-center rounded-lg"
                >
                  {dot}
                  {label}
                </button>
              ) : (
                <span
                  aria-current={current ? 'step' : undefined}
                  className="flex min-h-11 flex-col items-center"
                >
                  {dot}
                  <span className="sr-only">
                    Step {index + 1}: {s.label}
                    {done ? ' (done)' : ''}
                  </span>
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
