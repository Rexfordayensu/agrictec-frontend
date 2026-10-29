'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles, Tractor } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import {
  farmNameDefaults,
  farmNameSchema,
  type FarmNameValues,
} from '@/components/onboarding/onboarding-schemas';
import { StepHeader, type StepProps } from '@/components/onboarding/wizard-nav';
import { Button } from '@/components/ui/button';
import { FormField, fieldErrorId, fieldHintId } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Step 1: the farm's name (or the farmer's own name). */
export function StepFarmName({
  formId,
  data,
  onSubmit,
  onFillDemo,
  autoFocusHeading = true,
}: StepProps & { onFillDemo?: () => void; autoFocusHeading?: boolean }) {
  const name = data.name?.trim() ?? '';
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<FarmNameValues>({
    resolver: zodResolver(farmNameSchema),
    defaultValues: farmNameDefaults(data),
  });
  const useName = useWatch({ control, name: 'useNameAsFarmName' });

  return (
    <form
      id={formId}
      noValidate
      onSubmit={handleSubmit((values) =>
        onSubmit({ farmName: values.farmName.trim(), useNameAsFarmName: values.useNameAsFarmName }),
      )}
    >
      <StepHeader
        icon={Tractor}
        title="What is your farm called?"
        description="This is how your farm will appear on your reports to lenders."
        autoFocus={autoFocusHeading}
      />

      <div className="space-y-4">
        <FormField
          label="Farm name"
          htmlFor="onb-farm-name"
          error={errors.farmName?.message}
          hint="2 to 80 characters, e.g. Owusu Family Farm"
        >
          <Input
            id="onb-farm-name"
            autoComplete="organization"
            placeholder="e.g. Owusu Family Farm"
            maxLength={80}
            // Read-only (not disabled) while it follows the farmer's name, so it is still sent.
            readOnly={useName}
            aria-disabled={useName || undefined}
            error={Boolean(errors.farmName)}
            aria-describedby={
              errors.farmName ? fieldErrorId('onb-farm-name') : fieldHintId('onb-farm-name')
            }
            className={cn(useName && 'cursor-not-allowed opacity-60')}
            {...register('farmName')}
          />
        </FormField>

        <label
          className={cn(
            'border-border flex min-h-11 items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm',
            name ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
          )}
        >
          <input
            type="checkbox"
            disabled={!name}
            className="accent-accent size-4.5 shrink-0"
            {...register('useNameAsFarmName', {
              onChange: (event: { target: { checked: boolean } }) =>
                setValue('farmName', event.target.checked ? name : '', {
                  shouldValidate: event.target.checked,
                }),
            })}
          />
          <span className="text-text">
            Use my name as the farm name
            {name ? (
              <span className="text-text-mute"> ({name})</span>
            ) : (
              <span className="text-text-mute block text-xs">
                Add your name in your profile to use this.
              </span>
            )}
          </span>
        </label>

        {onFillDemo && (
          <div className="border-purple/30 bg-purple/8 flex flex-col gap-3 rounded-2xl border border-dashed p-4 sm:flex-row sm:items-center">
            <p className="text-text-dim min-w-0 flex-1 text-sm">
              <span className="text-text font-semibold">Just looking around?</span> Fill every step
              with sample details and jump to the review.
            </p>
            <Button type="button" variant="ghost" icon={Sparkles} onClick={onFillDemo}>
              Fill with demo details
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}
