'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Sprout } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  cropsDefaults,
  cropsPatch,
  cropsSchema,
  type CropsValues,
} from '@/components/onboarding/onboarding-schemas';
import { StepHeader, type StepProps } from '@/components/onboarding/wizard-nav';
import { CropIcon } from '@/components/ui/crop-icon';
import { FormField, fieldErrorId } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { CROPS } from '@/constants/crops';
import { cn } from '@/lib/utils';

/** Step 4: every crop on the farm (at least one); "Other" asks for the name. */
export function StepCrops({
  formId,
  data,
  onSubmit,
  autoFocusHeading = true,
}: StepProps & { autoFocusHeading?: boolean }) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CropsValues>({
    resolver: zodResolver(cropsSchema),
    defaultValues: cropsDefaults(data),
  });
  const picked = useWatch({ control, name: 'primaryCrops' });

  return (
    <form id={formId} noValidate onSubmit={handleSubmit((values) => onSubmit(cropsPatch(values)))}>
      <StepHeader
        icon={Sprout}
        title="What do you grow?"
        description="Pick every crop on your farm. You can choose as many as you like."
        autoFocus={autoFocusHeading}
      />

      <Controller
        control={control}
        name="primaryCrops"
        render={({ field }) => (
          <fieldset>
            <legend className="text-text-dim mb-2 flex w-full items-center justify-between text-xs font-semibold tracking-wide uppercase">
              <span>Crops</span>
              <span className="text-text-mute font-normal normal-case tabular-nums">
                {field.value.length} selected
              </span>
            </legend>
            <div
              aria-describedby={errors.primaryCrops ? 'onb-crops-error' : undefined}
              className="flex flex-wrap gap-2"
            >
              {CROPS.map((crop, index) => {
                const on = field.value.includes(crop);
                return (
                  <button
                    key={crop}
                    // The first chip takes focus when nothing is picked and Continue is pressed.
                    ref={index === 0 ? field.ref : undefined}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      field.onChange(
                        on
                          ? field.value.filter((c) => c !== crop)
                          : CROPS.filter((c) => c === crop || field.value.includes(c)),
                      )
                    }
                    className={cn(
                      'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
                      on
                        ? 'border-accent bg-accent/15 text-ink-green'
                        : 'glass border-border text-text-dim hover:text-text',
                    )}
                  >
                    {on ? (
                      <Check size={15} aria-hidden="true" />
                    ) : (
                      <CropIcon crop={crop} size={16} />
                    )}
                    {crop}
                  </button>
                );
              })}
            </div>
            {errors.primaryCrops && (
              <p id="onb-crops-error" role="alert" className="text-ink-red mt-2 text-xs">
                {errors.primaryCrops.message}
              </p>
            )}
          </fieldset>
        )}
      />

      {picked.includes('Other') && (
        <FormField
          label="Other crop name(s)"
          htmlFor="onb-other-crops"
          error={errors.otherCrops?.message}
          className="mt-5"
        >
          <Input
            id="onb-other-crops"
            placeholder="e.g. Garden eggs, Watermelon"
            maxLength={120}
            error={Boolean(errors.otherCrops)}
            aria-describedby={errors.otherCrops ? fieldErrorId('onb-other-crops') : undefined}
            {...register('otherCrops')}
          />
        </FormField>
      )}
    </form>
  );
}
