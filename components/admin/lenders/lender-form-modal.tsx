'use client';

import { useId, type ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Check, Save } from 'lucide-react';
import { toast } from 'sonner';
import { PRIMARY_CLASS } from '@/components/admin/shared/action-styles';
import {
  emptyLenderForm,
  formToLenderInput,
  LENDER_COLORS,
  lenderFormSchema,
  lenderToForm,
  type LenderFormValues,
} from '@/components/admin/lenders/lender-schema';
import { LenderLogo } from '@/components/shared/lender-logo';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { REGIONS } from '@/constants/regions';
import { INSTITUTION_TYPE_LABELS, PARTNERSHIP_LABELS } from '@/lib/lenders';
import { cn } from '@/lib/utils';
import { lendersService } from '@/services/admin/lenders.service';
import type { AdminLender } from '@/types/admin';

/** "Add lender" or "Edit <name>". Mounted per opening. */
export function LenderFormModal({
  lender,
  open,
  lenders,
  onClose,
  onSaved,
}: {
  /** The lender being edited; undefined adds a new one. */
  lender?: AdminLender;
  open: boolean;
  /** Every lender, for the unique-name check. */
  lenders: AdminLender[];
  onClose: () => void;
  onSaved: (saved: AdminLender) => void;
}) {
  if (!open) return null;
  return (
    <LenderForm
      key={lender?.id ?? 'new'}
      lender={lender}
      lenders={lenders}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="border-border space-y-4 border-t pt-4 first:border-t-0 first:pt-0">
      <legend className="text-text text-sm font-semibold">{title}</legend>
      {hint && <p className="text-text-mute -mt-2 text-xs">{hint}</p>}
      {children}
    </fieldset>
  );
}

function LenderForm({
  lender,
  lenders,
  onClose,
  onSaved,
}: {
  lender?: AdminLender;
  lenders: AdminLender[];
  onClose: () => void;
  onSaved: (saved: AdminLender) => void;
}) {
  const id = useId();
  const others = lenders.filter((l) => l.id !== lender?.id).map((l) => l.name);
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<LenderFormValues>({
    resolver: zodResolver(lenderFormSchema(others)),
    defaultValues: lender ? lenderToForm(lender) : emptyLenderForm(),
    mode: 'onTouched',
  });
  const [name, color] = useWatch({ control, name: ['name', 'color'] });

  async function save(form: LenderFormValues) {
    try {
      const input = formToLenderInput(form);
      const saved = lender
        ? await lendersService.update(lender.id, input)
        : await lendersService.create(input);
      if (lender && lender.licenceStatus !== 'unverified' && saved.licenceStatus === 'unverified')
        toast.warning(`${saved.name}: identity details changed, so check its licence again`);
      else toast.success(lender ? `${saved.name} updated` : `${saved.name} added as a draft`);
      onSaved(saved);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not save the lender';
      setError('root', { message });
      toast.error(message);
    }
  }

  const field = (key: keyof LenderFormValues) => `${id}-${key}`;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={lender ? `Edit ${lender.name}` : 'Add lender'}
      description="Enter only what the institution publishes officially. Leave anything unknown empty: farmers see “Not provided”."
      dirty={isDirty && !isSubmitting}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={id}
            icon={Save}
            loading={isSubmitting}
            className={PRIMARY_CLASS}
          >
            {lender ? 'Save changes' : 'Add as draft'}
          </Button>
        </>
      }
    >
      <form id={id} noValidate className="space-y-5" onSubmit={handleSubmit(save)}>
        <Section title="Institution">
          <div className="flex items-center gap-3">
            <LenderLogo
              name={name || 'Lender'}
              color={color}
              logoPath={lender?.logoPath}
              size={44}
            />
            <p className="text-text-mute text-xs">
              {lender
                ? 'Upload the official logo on the lender’s page. Without one, its initials show on this colour.'
                : 'After saving, you can upload the official logo on the lender’s page.'}
            </p>
          </div>
          <FormField label="Official name" htmlFor={field('name')} error={errors.name?.message}>
            <Input
              id={field('name')}
              autoComplete="off"
              error={Boolean(errors.name)}
              {...register('name')}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Institution type" htmlFor={field('institutionType')}>
              <Select id={field('institutionType')} {...register('institutionType')}>
                {Object.entries(INSTITUTION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label="Registered business name"
              htmlFor={field('registeredName')}
              error={errors.registeredName?.message}
            >
              <Input id={field('registeredName')} {...register('registeredName')} />
            </FormField>
          </div>
          <FormField
            label="Description"
            htmlFor={field('description')}
            error={errors.description?.message}
            hint="What the institution says about itself and its farm lending."
          >
            <Textarea id={field('description')} rows={3} {...register('description')} />
          </FormField>
          <Controller
            control={control}
            name="color"
            render={({ field: colour }) => (
              <fieldset>
                <legend className="text-text-dim mb-2 text-xs font-semibold">
                  Colour (shown behind its initials when there is no logo)
                </legend>
                <div className="flex flex-wrap gap-2">
                  {LENDER_COLORS.map((swatch) => {
                    const selected = colour.value.toLowerCase() === swatch;
                    return (
                      <button
                        key={swatch}
                        type="button"
                        aria-label={`Colour ${swatch}`}
                        aria-pressed={selected}
                        onClick={() => colour.onChange(swatch)}
                        className={cn(
                          'ring-offset-bg-2 inline-flex size-9 items-center justify-center rounded-full ring-offset-2',
                          selected ? 'ring-text ring-2' : 'hover:ring-border hover:ring-2',
                        )}
                        style={{ backgroundColor: swatch }}
                      >
                        {selected && <Check size={16} aria-hidden="true" className="text-white" />}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}
          />
        </Section>

        <Section
          title="Regulation"
          hint="Changing the name, type, regulator or licence reference later clears the licence check."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Regulator"
              htmlFor={field('regulator')}
              error={errors.regulator?.message}
              hint="e.g. Bank of Ghana"
            >
              <Input id={field('regulator')} {...register('regulator')} />
            </FormField>
            <FormField
              label="Licence or registration reference"
              htmlFor={field('licenceRef')}
              error={errors.licenceRef?.message}
            >
              <Input id={field('licenceRef')} {...register('licenceRef')} />
            </FormField>
          </div>
        </Section>

        <Section title="Official contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Website" htmlFor={field('website')} error={errors.website?.message}>
              <Input
                id={field('website')}
                type="url"
                inputMode="url"
                placeholder="https://"
                error={Boolean(errors.website)}
                {...register('website')}
              />
            </FormField>
            <FormField label="Email" htmlFor={field('email')} error={errors.email?.message}>
              <Input
                id={field('email')}
                type="email"
                error={Boolean(errors.email)}
                {...register('email')}
              />
            </FormField>
            <FormField label="Telephone" htmlFor={field('phone')} error={errors.phone?.message}>
              <Input
                id={field('phone')}
                type="tel"
                error={Boolean(errors.phone)}
                {...register('phone')}
              />
            </FormField>
            <FormField label="Head office region" htmlFor={field('region')}>
              <Select id={field('region')} {...register('region')}>
                <option value="">Not provided</option>
                {REGIONS.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <FormField label="Physical address" htmlFor={field('address')}>
            <Textarea id={field('address')} rows={2} {...register('address')} />
          </FormField>
        </Section>

        <Section title="Agricultural lending and partnership">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Offers agricultural loans" htmlFor={field('offersAgriLoans')}>
              <Select id={field('offersAgriLoans')} {...register('offersAgriLoans')}>
                <option value="unknown">Not provided</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </Select>
            </FormField>
            <FormField
              label="Partnership with AgriCtec"
              htmlFor={field('partnershipStatus')}
              hint="Separate from the licence: a licensed lender is not a partner unless it agreed."
            >
              <Select id={field('partnershipStatus')} {...register('partnershipStatus')}>
                {Object.entries(PARTNERSHIP_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <Controller
            control={control}
            name="supportedRegions"
            render={({ field: regions }) => (
              <fieldset>
                <legend className="text-text-dim mb-2 text-xs font-semibold">
                  Regions it serves (leave all unticked if not provided)
                </legend>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {REGIONS.map((region) => {
                    const on = regions.value.includes(region);
                    return (
                      <label
                        key={region}
                        className="text-text flex min-h-9 cursor-pointer items-center gap-2 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() =>
                            regions.onChange(
                              on
                                ? regions.value.filter((r) => r !== region)
                                : [...regions.value, region],
                            )
                          }
                          className="accent-accent size-4"
                        />
                        {region}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}
          />
        </Section>

        {errors.root && (
          <p role="alert" className="text-ink-red text-sm">
            {errors.root.message}
          </p>
        )}
      </form>
    </Modal>
  );
}
