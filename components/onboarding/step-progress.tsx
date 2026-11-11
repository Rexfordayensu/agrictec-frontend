'use client';

import { useId, useState } from 'react';
import { Check, ChevronDown, CloudUpload } from 'lucide-react';
import { REVIEW_STEP, STEPS } from '@/components/onboarding/onboarding-schemas';
import { cn } from '@/lib/utils';

const STEP_HELP = [
  'Give your farm a name',
  'Region and community',
  'Acres or hectares',
  'What you grow',
  'How your farm is run',
  'Optional · add it later',
  'Check and finish',
];
const ALL_STEPS = [...STEPS, { id: 'review', label: 'Review details' }];

export function StepProgress({
  step,
  reached,
  onJump,
  disabled = false,
}: {
  step: number;
  reached: number;
  onJump: (step: number) => void;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const percent = Math.round((Math.min(reached, REVIEW_STEP) / REVIEW_STEP) * 100);
  return (
    <aside className="onboarding-guide" aria-label="Farm setup progress">
      <div className="onboarding-progress-heading">
        <p className="onboarding-eyebrow">YOUR FARM PROFILE</p>
        <p className="onboarding-step-count" aria-live="polite">
          Step {step + 1} of {ALL_STEPS.length}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Farm details saved"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${Math.min(reached, REVIEW_STEP)} of ${REVIEW_STEP} farm details steps saved`}
        className="onboarding-progress-track"
      >
        <div style={{ width: `${percent}%` }} />
      </div>
      <button
        type="button"
        className="onboarding-step-toggle"
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={() => setExpanded((value) => !value)}
      >
        <span>
          {ALL_STEPS[step]?.label}
          {step === 5 ? ' · Optional' : ''}
        </span>
        <span>
          {expanded ? 'Hide steps' : 'View steps'}{' '}
          <ChevronDown size={16} aria-hidden="true" className={expanded ? 'rotate-180' : ''} />
        </span>
      </button>
      <nav
        id={listId}
        className="onboarding-step-list"
        data-expanded={expanded}
        aria-label="Setup steps"
      >
        <ol>
          {ALL_STEPS.map((item, index) => {
            const current = index === step;
            const done = index < reached;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={disabled || index > reached}
                  aria-current={current ? 'step' : undefined}
                  className={cn('onboarding-step-link', current && 'is-current', done && 'is-done')}
                  onClick={() => {
                    if (!current) onJump(index);
                    setExpanded(false);
                  }}
                >
                  <span className="onboarding-step-number" aria-hidden="true">
                    {done && !current ? <Check size={16} /> : index + 1}
                  </span>
                  <span>
                    <span className="onboarding-step-label">{item.label}</span>
                    <span className="onboarding-step-help">{STEP_HELP[index]}</span>
                  </span>
                  <span className="sr-only">
                    {current
                      ? 'Current step'
                      : done
                        ? 'Completed step'
                        : index > reached
                          ? 'Not yet available'
                          : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <p className="onboarding-save-note">
        <CloudUpload size={17} aria-hidden="true" />
        <span>Each step is saved when you continue. You can return to saved steps.</span>
      </p>
    </aside>
  );
}
