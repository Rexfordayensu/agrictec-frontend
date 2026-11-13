'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Profile } from '@/types';

/** What every step component takes: the answers so far and where to send its own. */
export interface StepProps {
  /** The id of the step's <form>, so the wizard's Continue button can submit it. */
  formId: string;
  data: Partial<Profile>;
  onSubmit: (patch: Partial<Profile>) => Promise<void> | void;
  /** Saves answers as they change, before Continue (the onboarding wizard's draft). */
  onDraft?: (patch: Partial<Profile>) => void;
}

/**
 * A step's heading. It takes focus when the step appears, so screen readers announce the new
 * step and keyboard users start at its top. With autoFocus off (a step reused in a dialog) it
 * is not shown.
 */
export function StepHeader({
  icon: Icon,
  title,
  description,
  autoFocus = true,
}: {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus({ preventScroll: true });
  }, [autoFocus]);
  // Inside a dialog (editing from the profile page) the dialog's own title is used instead.
  if (!autoFocus) return null;
  return (
    <div className="mb-6 flex items-start gap-3.5">
      <span className="bg-icon-bg text-icon inline-flex size-12 shrink-0 items-center justify-center rounded-xl">
        <Icon size={24} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h2
          ref={ref}
          tabIndex={-1}
          className="font-display text-text text-xl leading-tight font-bold outline-none"
        >
          {title}
        </h2>
        <p className="text-text-dim mt-1 text-sm">{description}</p>
      </div>
    </div>
  );
}

/** Back (ghost) and Continue (primary); step 6 adds "Skip for now". */
export function WizardNav({
  formId,
  onBack,
  onSkip,
  busy,
  continueLabel = 'Continue',
  continueIcon = ArrowRight,
  finalStep = false,
}: {
  formId: string;
  onBack?: () => void;
  onSkip?: () => void;
  busy: boolean;
  continueLabel?: string;
  continueIcon?: LucideIcon;
  finalStep?: boolean;
}) {
  return (
    <div className="onboarding-actions" role="group" aria-label="Step navigation">
      {onBack ? (
        <Button
          type="button"
          variant="ghost"
          icon={ArrowLeft}
          onClick={onBack}
          disabled={busy}
          className="onboarding-back"
        >
          Back
        </Button>
      ) : (
        <span className="onboarding-nav-spacer" />
      )}
      {onSkip && (
        <Button
          type="button"
          variant="ghost"
          onClick={onSkip}
          disabled={busy}
          className="onboarding-skip"
        >
          Skip for now
        </Button>
      )}
      <Button
        type="submit"
        form={formId}
        icon={continueIcon}
        loading={busy}
        className="onboarding-next"
      >
        {continueLabel}
      </Button>
      <p className="onboarding-action-hint" role="status">
        {busy
          ? 'Saving your details…'
          : finalStep
            ? 'Review and confirm your details before finishing.'
            : 'Your answers save when you continue.'}
      </p>
    </div>
  );
}
