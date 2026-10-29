'use client';

import { useId } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Check, Landmark, Save } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { monthlyRepayment } from '@/lib/calculations/loan';
import { formatGHS } from '@/lib/format';
import { cn } from '@/lib/utils';
import { lendersService } from '@/services/admin/lenders.service';
import type { Lender } from '@/types/admin';

/** "Add lender" or "Edit <name>" (null = closed). Mounted per opening. */
export function LenderFormModal({
  lender,
  open,
  lenders,
  onClose,
  onSaved,
}: {
  /** The lender being edited; undefined adds a new one. */
  lender?: Lender;
  open: boolean;
  /** Every lender, for the unique-name check. */
  lenders: Lender[];
  onClose: () => void;
  onSaved: (saved: Lender) => void;
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

function LenderForm({
  lender,
  lenders,
  onClose,
  onSaved,
}: {
  lender?: Lender;
  lenders: Lender[];
  onClose: () => void;
  onSaved: (saved: Lender) => void;
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
  const values = useWatch({ control });

  async function save(form: LenderFormValues) {
    try {
      const input = formToLenderInput(form);
      const saved = lender
        ? await lendersService.update(lender.id, input)
        : await lendersService.create(input);
      toast.success(lender ? `${saved.name} updated` : `${saved.name} added`);
      onSaved(saved);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not save the lender';
      setError('root', { message });
      toast.error(message);
    }
  }

  // The offer as a farmer would see it, for a GHS 10,000 loan over the shortest term.
  const rate = Number(values.rate) || 0;
  const months = Number(values.minMonths) || 0;
  const sample = monthlyRepayment(10_000, rate, months);
  const color = /^#[0-9a-fA-F]{6}$/.test(values.color ?? '') ? values.color : LENDER_COLORS[0];

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={lender ? `Edit ${lender.name}` : 'Add lender'}
      description="Farmers see the change on their loans page straight away."
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
            {lender ? 'Save changes' : 'Add lender'}
          </Button>
        </>
      }
    >
      <form id={id} noValidate className="space-y-5" onSubmit={handleSubmit(save)}>
        {/* Live preview */}
        <div className="border-border bg-bg-2/60 flex items-center gap-3 rounded-2xl border p-3.5">
          <span
            aria-hidden="true"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: color }}
          >
            <Landmark size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-text truncate text-sm font-semibold">
              {values.name?.trim() || 'Lender name'}
            </p>
            <p className="text-text-mute text-xs">
              {rate}% a year · up to {formatGHS(Number(values.maxAmount) || 0)} · {values.minMonths}
              –{values.maxMonths} months
            </p>
          </div>
          <p className="text-right text-xs">
            <span className="text-text-mute block">GHS 10k over {months || '—'} mo</span>
            <span className="text-text font-semibold tabular-nums">
              {months ? `${formatGHS(sample.monthly)}/mo` : '—'}
            </span>
          </p>
        </div>

        <FormField label="Name" htmlFor={`${id}-name`} error={errors.name?.message}>
          <Input
            id={`${id}-name`}
            autoComplete="off"
            error={Boolean(errors.name)}
            {...register('name')}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <FormField label="Rate (% a year)" htmlFor={`${id}-rate`} error={errors.rate?.message}>
            <Input
              id={`${id}-rate`}
              type="number"
              step="0.5"
              min={1}
              max={60}
              inputMode="decimal"
              error={Boolean(errors.rate)}
              {...register('rate', { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            label="Max amount (GHS)"
            htmlFor={`${id}-max`}
            error={errors.maxAmount?.message}
          >
            <Input
              id={`${id}-max`}
              type="number"
              step="500"
              min={500}
              inputMode="numeric"
              error={Boolean(errors.maxAmount)}
              {...register('maxAmount', { valueAsNumber: true })}
            />
          </FormField>
          <FormField label="Min score" htmlFor={`${id}-score`} error={errors.minScore?.message}>
            <Input
              id={`${id}-score`}
              type="number"
              min={300}
              max={850}
              inputMode="numeric"
              error={Boolean(errors.minScore)}
              {...register('minScore', { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            label="Min term (months)"
            htmlFor={`${id}-min-months`}
            error={errors.minMonths?.message}
          >
            <Input
              id={`${id}-min-months`}
              type="number"
              min={1}
              max={60}
              inputMode="numeric"
              error={Boolean(errors.minMonths)}
              {...register('minMonths', { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            label="Max term (months)"
            htmlFor={`${id}-max-months`}
            error={errors.maxMonths?.message}
          >
            <Input
              id={`${id}-max-months`}
              type="number"
              min={1}
              max={60}
              inputMode="numeric"
              error={Boolean(errors.maxMonths)}
              {...register('maxMonths', { valueAsNumber: true })}
            />
          </FormField>
        </div>

        <Controller
          control={control}
          name="color"
          render={({ field }) => (
            <fieldset>
              <legend className="text-text-dim mb-2 text-xs font-semibold">Colour</legend>
              <div className="flex flex-wrap items-center gap-2">
                {LENDER_COLORS.map((swatch) => {
                  const selected = field.value.toLowerCase() === swatch;
                  return (
                    <button
                      key={swatch}
                      type="button"
                      aria-label={`Colour ${swatch}`}
                      aria-pressed={selected}
                      onClick={() => field.onChange(swatch)}
                      className={cn(
                        'inline-flex size-9 items-center justify-center rounded-full ring-offset-2 ring-offset-[var(--bg-2)] transition-shadow',
                        selected ? 'ring-text ring-2' : 'hover:ring-border hover:ring-2',
                      )}
                      style={{ backgroundColor: swatch }}
                    >
                      {selected && <Check size={16} aria-hidden="true" className="text-white" />}
                    </button>
                  );
                })}
                <label className="border-border inline-flex min-h-9 items-center gap-2 rounded-xl border px-2">
                  <span className="sr-only">Custom colour</span>
                  <input
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(field.value) ? field.value : '#10b981'}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                  <input
                    aria-label="Colour hex code"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value.trim())}
                    onBlur={field.onBlur}
                    maxLength={7}
                    className="text-text w-20 bg-transparent font-mono text-xs uppercase outline-none"
                  />
                </label>
              </div>
              {errors.color && (
                <p role="alert" className="text-ink-red mt-1.5 text-xs">
                  {errors.color.message}
                </p>
              )}
            </fieldset>
          )}
        />

        <FormField
          label="Description (optional)"
          htmlFor={`${id}-description`}
          error={errors.description?.message}
          hint="One line about the lender, e.g. who it serves best."
        >
          <Textarea
            id={`${id}-description`}
            rows={2}
            maxLength={200}
            error={Boolean(errors.description)}
            {...register('description')}
          />
        </FormField>

        <Controller
          control={control}
          name="active"
          render={({ field }) => (
            <div className="border-border flex items-center justify-between gap-4 rounded-xl border px-4 py-2">
              <div>
                <p className="text-text text-sm font-semibold">Offered to farmers</p>
                <p className="text-text-mute text-xs">
                  Inactive lenders are hidden from farmers but keep their applications.
                </p>
              </div>
              <Switch checked={field.value} onChange={field.onChange} label="Offered to farmers" />
            </div>
          )}
        />

        {errors.root && (
          <p role="alert" className="text-ink-red text-sm">
            {errors.root.message}
          </p>
        )}
      </form>
    </Modal>
  );
}
