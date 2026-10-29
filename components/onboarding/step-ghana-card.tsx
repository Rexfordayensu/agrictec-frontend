'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Clock, IdCard, LockKeyhole, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  ghanaCardDefaults,
  ghanaCardStepSchema,
  type GhanaCardStepValues,
} from '@/components/onboarding/onboarding-schemas';
import { RadioCards } from '@/components/onboarding/radio-cards';
import { StepHeader, type StepProps } from '@/components/onboarding/wizard-nav';
import { FormField, fieldErrorId, fieldHintId } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { hashGhanaCard } from '@/lib/admin/card-hash';
import { formatGhanaCard, maskFullGhanaCard } from '@/lib/profile';
import type { GhanaCardInfo } from '@/types';

/** The "later" warning, also shown on the review screen. */
export function GhanaCardLaterWarning() {
  return (
    <div
      role="note"
      className="border-gold/40 bg-gold/10 text-ink-gold flex items-start gap-3 rounded-2xl border p-4 text-sm"
    >
      <TriangleAlert size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
      <p>
        You can use AgriCtec without a Ghana Card, but you will <strong>NOT</strong> be able to
        apply for loans until you verify it. You can add it any time from your Profile.
      </p>
    </div>
  );
}

/**
 * Step 6 (optional): a Ghana Card, or "later". Only the masked number and a SHA-256 hash leave
 * this step; the full number stays in this form's memory and is never saved.
 */
export function StepGhanaCard({
  formId,
  data,
  onSubmit,
  autoFocusHeading = true,
}: StepProps & { autoFocusHeading?: boolean }) {
  const {
    handleSubmit,
    control,
    register,
    setValue,
    formState: { errors },
  } = useForm<GhanaCardStepValues>({
    resolver: zodResolver(ghanaCardStepSchema),
    defaultValues: ghanaCardDefaults(data),
  });
  const choice = useWatch({ control, name: 'choice' });
  const savedMasked = useWatch({ control, name: 'savedMasked' });
  const [hashing, setHashing] = useState(false);

  async function submit(values: GhanaCardStepValues) {
    if (values.choice === 'later') {
      await onSubmit({ ghanaCard: { status: 'not_provided' } });
      return;
    }
    if (!values.cardNumber && values.savedMasked) {
      await onSubmit({ ghanaCard: data.ghanaCard as GhanaCardInfo });
      return;
    }
    setHashing(true);
    try {
      // The admin console exists, so a new card is "pending" until an admin approves it.
      await onSubmit({
        ghanaCard: {
          status: 'pending',
          masked: maskFullGhanaCard(values.cardNumber),
          hash: await hashGhanaCard(values.cardNumber),
        },
      });
    } finally {
      setHashing(false);
    }
  }

  return (
    <form id={formId} noValidate aria-busy={hashing} onSubmit={handleSubmit(submit)}>
      <StepHeader
        icon={IdCard}
        title="Verify your Ghana Card"
        description="Optional. A verified Ghana Card is needed to apply for loans."
        autoFocus={autoFocusHeading}
      />

      <Controller
        control={control}
        name="choice"
        render={({ field }) => (
          <RadioCards
            label="Ghana Card"
            value={field.value}
            onChange={field.onChange}
            firstRef={field.ref}
            invalid={Boolean(errors.choice)}
            describedBy={errors.choice ? 'onb-card-choice-error' : undefined}
            tone={field.value === 'later' ? 'gold' : 'accent'}
            options={[
              {
                value: 'have',
                label: 'I have a Ghana Card',
                description: 'Our team checks it, usually within one working day.',
                icon: ShieldCheck,
              },
              {
                value: 'later',
                label: 'I’ll do this later',
                description: 'Use the app now and add your card from your Profile.',
                icon: Clock,
              },
            ]}
          />
        )}
      />
      {errors.choice && (
        <p id="onb-card-choice-error" role="alert" className="text-ink-red mt-2 text-xs">
          {errors.choice.message}
        </p>
      )}

      {choice === 'have' && (
        <div className="mt-5 space-y-4">
          {savedMasked && (
            <div className="border-accent/30 bg-accent/8 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm">
              <p className="text-text">
                Saved card: <span className="font-semibold tabular-nums">{savedMasked}</span>
              </p>
              <button
                type="button"
                onClick={() => setValue('savedMasked', '')}
                className="text-ink-green min-h-11 text-xs font-semibold hover:underline"
              >
                Use a different card
              </button>
            </div>
          )}
          {!savedMasked && (
            <>
              <Controller
                control={control}
                name="cardNumber"
                render={({ field }) => (
                  <FormField
                    label="Ghana Card number"
                    htmlFor="onb-card"
                    error={errors.cardNumber?.message}
                    hint="Format: GHA-123456789-0. Dashes are added for you."
                  >
                    <Input
                      id="onb-card"
                      ref={field.ref}
                      name={field.name}
                      value={field.value}
                      onBlur={field.onBlur}
                      onChange={(event) => field.onChange(formatGhanaCard(event.target.value))}
                      autoComplete="off"
                      spellCheck={false}
                      inputMode="text"
                      placeholder="GHA-123456789-0"
                      maxLength={15}
                      error={Boolean(errors.cardNumber)}
                      aria-describedby={
                        errors.cardNumber ? fieldErrorId('onb-card') : fieldHintId('onb-card')
                      }
                      className="font-semibold tracking-wide uppercase tabular-nums"
                    />
                  </FormField>
                )}
              />
              <div>
                <label className="border-border flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-sm">
                  <input
                    type="checkbox"
                    className="accent-accent mt-0.5 size-4.5 shrink-0"
                    aria-invalid={errors.confirmOwner ? true : undefined}
                    aria-describedby={errors.confirmOwner ? 'onb-card-owner-error' : undefined}
                    {...register('confirmOwner')}
                  />
                  <span className="text-text">I confirm this Ghana Card belongs to me.</span>
                </label>
                {errors.confirmOwner && (
                  <p id="onb-card-owner-error" role="alert" className="text-ink-red mt-1.5 text-xs">
                    {errors.confirmOwner.message}
                  </p>
                )}
              </div>
            </>
          )}
          <p className="text-text-mute flex items-start gap-2 text-xs leading-relaxed">
            <LockKeyhole size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
            Your full card number is never stored: only a masked version (like GHA-******789-0) and
            a one-way fingerprint used to spot duplicate cards.
          </p>
        </div>
      )}

      {choice === 'later' && (
        <div className="mt-5">
          <GhanaCardLaterWarning />
        </div>
      )}
    </form>
  );
}
