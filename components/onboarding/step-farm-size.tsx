'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftRight, Ruler } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  farmSizeDefaults,
  farmSizePatch,
  farmSizeSchema,
  type FarmSizeValues,
} from '@/components/onboarding/onboarding-schemas';
import { StepHeader, type StepProps } from '@/components/onboarding/wizard-nav';
import { FormField, fieldErrorId } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { ACRES_PER_HECTARE, SIZE_UNITS } from '@/lib/profile';
import { cn } from '@/lib/utils';
import type { SizeUnit } from '@/types';

const UNIT_LABEL: Record<SizeUnit, string> = { acres: 'Acres', hectares: 'Hectares' };
const fmt = (value: number) => value.toLocaleString('en-GH', { maximumFractionDigits: 2 });
const plural = (value: number, word: string) => `${fmt(value)} ${word}${value === 1 ? '' : 's'}`;

/** "2 hectares ≈ 4.94 acres" (or the other way round). */
function conversion(size: number, unit: SizeUnit): string | null {
  if (!Number.isFinite(size) || size <= 0) return null;
  return unit === 'hectares'
    ? `${plural(size, 'hectare')} ≈ ${plural(size * ACRES_PER_HECTARE, 'acre')}`
    : `${plural(size, 'acre')} ≈ ${plural(size / ACRES_PER_HECTARE, 'hectare')}`;
}

/** Step 3: farm size in acres or hectares (stored in acres, shown back in the chosen unit). */
export function StepFarmSize({
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
  } = useForm<FarmSizeValues>({
    resolver: zodResolver(farmSizeSchema),
    defaultValues: farmSizeDefaults(data),
  });
  const size = useWatch({ control, name: 'size' });
  const unit = useWatch({ control, name: 'sizeUnit' });
  const converted = conversion(size, unit);

  return (
    <form
      id={formId}
      noValidate
      onSubmit={handleSubmit((values) => onSubmit(farmSizePatch(values)))}
    >
      <StepHeader
        icon={Ruler}
        title="How big is your farm?"
        description="An estimate is fine. You can change it later in your profile."
        autoFocus={autoFocusHeading}
      />

      <div className="space-y-4">
        <Controller
          control={control}
          name="sizeUnit"
          render={({ field }) => (
            <div
              role="radiogroup"
              aria-label="Unit"
              className="border-border bg-bg-2 grid grid-cols-2 gap-1 rounded-xl border p-1"
            >
              {SIZE_UNITS.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={field.value === option}
                  onClick={() => field.onChange(option)}
                  className={cn(
                    'min-h-11 rounded-lg text-sm font-semibold transition-colors',
                    field.value === option
                      ? 'bg-accent/15 text-ink-green'
                      : 'text-text-mute hover:text-text hover:bg-glass',
                  )}
                >
                  {UNIT_LABEL[option]}
                </button>
              ))}
            </div>
          )}
        />

        <FormField label={`Farm size (${unit})`} htmlFor="onb-size" error={errors.size?.message}>
          <div className="relative">
            <Input
              id="onb-size"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="e.g. 5"
              error={Boolean(errors.size)}
              aria-describedby={errors.size ? fieldErrorId('onb-size') : 'onb-size-conversion'}
              className="pr-24 text-lg font-semibold tabular-nums"
              {...register('size', { valueAsNumber: true })}
            />
            <span className="text-text-mute pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm">
              {unit}
            </span>
          </div>
        </FormField>

        <p
          id="onb-size-conversion"
          aria-live="polite"
          className={cn(
            'flex min-h-11 items-center gap-2 rounded-xl px-3.5 text-sm',
            converted ? 'bg-accent/8 text-text' : 'text-text-mute',
          )}
        >
          <ArrowLeftRight size={15} aria-hidden="true" className="text-ink-green shrink-0" />
          {converted ?? '1 hectare = 2.47 acres'}
        </p>
      </div>
    </form>
  );
}
