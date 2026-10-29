'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Handshake, House, Users, Warehouse } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  farmTypeDefaults,
  farmTypePatch,
  farmTypeSchema,
  type FarmTypeValues,
} from '@/components/onboarding/onboarding-schemas';
import { RadioCards, type RadioCardOption } from '@/components/onboarding/radio-cards';
import { StepHeader, type StepProps } from '@/components/onboarding/wizard-nav';
import { FormField, fieldErrorId } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import type { FarmType } from '@/types';

const OPTIONS: RadioCardOption<FarmType>[] = [
  {
    value: 'Smallholder',
    label: 'Smallholder',
    description: 'Family farm, usually under 10 acres',
    icon: House,
  },
  {
    value: 'Commercial',
    label: 'Commercial',
    description: 'Larger farm run as a business',
    icon: Building2,
  },
  {
    value: 'Cooperative',
    label: 'Cooperative',
    description: 'Part of a farmer group or cooperative',
    icon: Users,
  },
  {
    value: 'Out-grower',
    label: 'Out-grower',
    description: 'Grows for a company under contract',
    icon: Handshake,
  },
];

/** Step 5: the kind of farm, with the cooperative's or the buying company's name. */
export function StepFarmType({
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
  } = useForm<FarmTypeValues>({
    resolver: zodResolver(farmTypeSchema),
    defaultValues: farmTypeDefaults(data),
  });
  const farmType = useWatch({ control, name: 'farmType' });

  return (
    <form
      id={formId}
      noValidate
      onSubmit={handleSubmit((values) => onSubmit(farmTypePatch(values)))}
    >
      <StepHeader
        icon={Warehouse}
        title="How is your farm run?"
        description="Choose the option that fits best."
        autoFocus={autoFocusHeading}
      />

      <Controller
        control={control}
        name="farmType"
        render={({ field }) => (
          <RadioCards
            label="Farm type"
            options={OPTIONS}
            value={field.value}
            onChange={field.onChange}
            firstRef={field.ref}
            invalid={Boolean(errors.farmType)}
            describedBy={errors.farmType ? 'onb-farm-type-error' : undefined}
          />
        )}
      />
      {errors.farmType && (
        <p id="onb-farm-type-error" role="alert" className="text-ink-red mt-2 text-xs">
          {errors.farmType.message}
        </p>
      )}

      {farmType === 'Cooperative' && (
        <FormField
          label="Cooperative name"
          htmlFor="onb-coop"
          error={errors.cooperativeName?.message}
          className="mt-5"
        >
          <Input
            id="onb-coop"
            placeholder="e.g. Ejura Maize Farmers Cooperative"
            maxLength={100}
            error={Boolean(errors.cooperativeName)}
            aria-describedby={errors.cooperativeName ? fieldErrorId('onb-coop') : undefined}
            {...register('cooperativeName')}
          />
        </FormField>
      )}
      {farmType === 'Out-grower' && (
        <FormField
          label="Company you grow for (optional)"
          htmlFor="onb-company"
          error={errors.outgrowerCompany?.message}
          className="mt-5"
        >
          <Input
            id="onb-company"
            placeholder="e.g. a cocoa or grain buyer"
            maxLength={100}
            error={Boolean(errors.outgrowerCompany)}
            {...register('outgrowerCompany')}
          />
        </FormField>
      )}
    </form>
  );
}
