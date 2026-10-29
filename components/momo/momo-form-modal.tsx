'use client';

import { useId, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import {
  generateMomoReference,
  MOMO_NETWORKS,
  momoSchema,
  type MomoFormInput,
  type MomoFormValues,
} from '@/components/momo/momo-schema';
import { NETWORK_STYLES } from '@/components/momo/momo-filters';
import { NetworkLogo } from '@/components/momo/network-logo';
import { Button } from '@/components/ui/button';
import { FormField, fieldErrorId, fieldHintId } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { todayISO } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useFarmStore } from '@/store/farm-store';
import { useModalStore } from '@/store/modal-store';
import type { MomoTransaction, NewMomoInput } from '@/types';

const DIRECTIONS = [
  {
    value: 'in',
    label: 'Received',
    hint: 'Money in',
    icon: ArrowDownLeft,
    tone: 'border-accent/50 bg-accent/10 text-ink-green',
  },
  {
    value: 'out',
    label: 'Sent',
    hint: 'Money out',
    icon: ArrowUpRight,
    tone: 'border-danger/50 bg-danger/10 text-ink-red',
  },
] as const;

function toFormValues(
  transaction?: MomoTransaction,
  defaults?: Partial<NewMomoInput>,
): MomoFormInput {
  return transaction
    ? {
        direction: transaction.direction,
        counterparty: transaction.counterparty,
        amount: transaction.amount,
        reference: transaction.reference,
        network: transaction.network ?? 'MTN',
        date: transaction.date,
      }
    : {
        direction: defaults?.direction ?? 'in',
        counterparty: defaults?.counterparty ?? '',
        amount: defaults?.amount ?? '',
        reference: defaults?.reference ?? '',
        network: defaults?.network ?? 'MTN',
        date: defaults?.date ?? todayISO(),
      };
}

/** App-wide add/edit MoMo modal. Open it with useModalStore().openModal('momo', id?). */
export function MomoFormModal() {
  const modal = useModalStore((s) => s.modal);
  const editingId = useModalStore((s) => s.editingId);
  const closeModal = useModalStore((s) => s.closeModal);
  const defaults = useModalStore((s) => s.momoDefaults);
  const editing = useFarmStore((s) =>
    editingId ? s.momo.find((t) => t.id === editingId) : undefined,
  );
  const formId = useId();
  const [saving, setSaving] = useState(false);

  return (
    <Modal
      open={modal === 'momo'}
      onClose={closeModal}
      title={editing ? 'Edit MoMo Transaction' : 'New MoMo Transaction'}
      footer={
        <>
          <Button variant="ghost" onClick={closeModal}>
            Cancel
          </Button>
          <Button mutates type="submit" form={formId} loading={saving}>
            {editing ? 'Update transaction' : 'Save transaction'}
          </Button>
        </>
      }
    >
      <MomoForm
        key={editing?.id ?? `new-${defaults?.direction ?? 'any'}`}
        formId={formId}
        editing={editing}
        defaults={defaults}
        onDone={closeModal}
        onSavingChange={setSaving}
      />
    </Modal>
  );
}

function MomoForm({
  formId,
  editing,
  defaults,
  onDone,
  onSavingChange,
}: {
  formId: string;
  editing?: MomoTransaction;
  defaults?: Partial<NewMomoInput>;
  onDone: () => void;
  onSavingChange: (saving: boolean) => void;
}) {
  const addMomo = useFarmStore((s) => s.addMomo);
  const updateMomo = useFarmStore((s) => s.updateMomo);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<MomoFormInput, unknown, MomoFormValues>({
    resolver: zodResolver(momoSchema),
    defaultValues: toFormValues(editing, defaults),
  });
  const direction = useWatch({ control, name: 'direction' });
  const network = useWatch({ control, name: 'network' });

  async function onSubmit(values: MomoFormValues) {
    const input: NewMomoInput = {
      direction: values.direction,
      counterparty: values.counterparty,
      amount: values.amount,
      reference: values.reference?.toUpperCase() || generateMomoReference(),
      network: values.network,
      date: values.date,
    };
    onSavingChange(true);
    try {
      if (editing) {
        await updateMomo(editing.id, input);
        toast.success('Transaction updated');
      } else {
        await addMomo(input);
        toast.success('MoMo transaction saved');
      }
      reset();
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save the transaction');
    } finally {
      onSavingChange(false);
    }
  }

  const describe = (id: string, hasError: boolean, hint?: boolean) =>
    hasError ? fieldErrorId(id) : hint ? fieldHintId(id) : undefined;

  return (
    <form id={formId} noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <fieldset>
        <legend className="text-text-dim mb-1.5 text-xs font-semibold tracking-wide uppercase">
          Direction
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {DIRECTIONS.map(({ value, label, hint, icon: Icon, tone }) => (
            <label key={value} className="relative">
              <input
                type="radio"
                value={value}
                className="peer sr-only"
                {...register('direction')}
              />
              <span
                className={cn(
                  'peer-focus-visible:outline-accent flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 transition-colors peer-focus-visible:outline-2',
                  direction === value
                    ? tone
                    : 'border-border bg-bg-2 text-text-dim hover:text-text',
                )}
              >
                <Icon size={18} aria-hidden="true" className="shrink-0" />
                <span>
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="text-text-mute block text-[11px]">{hint}</span>
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <FormField
        label="Counterparty"
        htmlFor="momo-counterparty"
        error={errors.counterparty?.message}
      >
        <Input
          id="momo-counterparty"
          placeholder="e.g., Buyer name or vendor"
          error={Boolean(errors.counterparty)}
          aria-describedby={describe('momo-counterparty', Boolean(errors.counterparty))}
          {...register('counterparty')}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4">
        <FormField label="Amount (GHS)" htmlFor="momo-amount" error={errors.amount?.message}>
          <Input
            id="momo-amount"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="0.00"
            error={Boolean(errors.amount)}
            aria-describedby={describe('momo-amount', Boolean(errors.amount))}
            {...register('amount')}
          />
        </FormField>

        <fieldset>
          <legend className="text-text-dim mb-1.5 text-xs font-semibold tracking-wide uppercase">
            Network
          </legend>
          <div className="grid grid-cols-3 gap-1.5">
            {MOMO_NETWORKS.map((option) => (
              <label key={option} className="relative">
                <input
                  type="radio"
                  value={option}
                  className="peer sr-only"
                  {...register('network')}
                />
                <span
                  className={cn(
                    'peer-focus-visible:outline-accent flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-1 text-xs font-semibold transition-colors peer-focus-visible:outline-2',
                    network === option
                      ? NETWORK_STYLES[option].chip
                      : 'border-border bg-bg-2 text-text-dim hover:text-text',
                  )}
                >
                  <NetworkLogo network={option} size={20} />
                  {option}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Reference"
          htmlFor="momo-reference"
          hint="Leave blank to generate one"
          error={errors.reference?.message}
        >
          <Input
            id="momo-reference"
            placeholder="Transaction ID"
            autoCapitalize="characters"
            className="font-mono"
            error={Boolean(errors.reference)}
            aria-describedby={describe('momo-reference', Boolean(errors.reference), true)}
            {...register('reference')}
          />
        </FormField>

        <FormField label="Date" htmlFor="momo-date" error={errors.date?.message}>
          <Input
            id="momo-date"
            type="date"
            max={todayISO()}
            error={Boolean(errors.date)}
            aria-describedby={describe('momo-date', Boolean(errors.date))}
            {...register('date')}
          />
        </FormField>
      </div>
    </form>
  );
}
