'use client';

import { useId, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import {
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
import { Select } from '@/components/ui/select';
import {
  ALL_CATEGORIES,
  categoryLabel,
  duplicateRetry,
  isPossibleDuplicate,
} from '@/lib/transactions';
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
        reference: transaction.reference ?? '',
        category: transaction.category ?? '',
        paymentMethod: transaction.paymentMethod ?? '',
        externalReference: transaction.externalReference ?? '',
        network: transaction.network,
        date: transaction.date,
      }
    : {
        direction: defaults?.direction ?? 'in',
        counterparty: defaults?.counterparty ?? '',
        amount: defaults?.amount ?? '',
        reference: defaults?.reference ?? '',
        category: '',
        paymentMethod: '',
        externalReference: '',
        network: defaults?.network,
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
  const [duplicate, setDuplicate] = useState<MomoFormValues>();
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

  async function onSubmit(values: MomoFormValues, confirmed = false) {
    const input: NewMomoInput = {
      direction: values.direction,
      counterparty: values.counterparty,
      amount: values.amount,
      reference: values.reference?.trim() || '',
      category: values.category || null,
      paymentMethod: values.paymentMethod?.trim() || null,
      externalReference: values.externalReference?.trim() || null,
      ...(confirmed ? duplicateRetry({}) : {}),
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
      if (isPossibleDuplicate(error)) {
        setDuplicate(values);
        return;
      }
      toast.error(error instanceof Error ? error.message : 'Could not save the transaction');
    } finally {
      onSavingChange(false);
    }
  }

  const describe = (id: string, hasError: boolean, hint?: boolean) =>
    hasError ? fieldErrorId(id) : hint ? fieldHintId(id) : undefined;

  return (
    <form
      id={formId}
      noValidate
      onSubmit={handleSubmit((values) => onSubmit(values))}
      className="space-y-4"
    >
      {duplicate && (
        <div role="alert" className="bg-gold/10 space-y-2 rounded-xl p-3 text-sm">
          <p>
            A possible duplicate has the same date, amount, direction and category. Is this a
            separate entry?
          </p>
          <Button mutates type="button" onClick={() => void onSubmit(duplicate, true)}>
            Save anyway
          </Button>
          <Button variant="ghost" type="button" onClick={() => setDuplicate(undefined)}>
            Keep editing
          </Button>
        </div>
      )}
      <label className="block space-y-2 text-xs font-semibold">
        Category
        <Select {...register('category')}>
          <option value="">Uncategorised</option>
          {ALL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c)}
            </option>
          ))}
        </Select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Payment method" htmlFor="momo-method" hint="Optional">
          <Input id="momo-method" {...register('paymentMethod')} />
        </FormField>
        <FormField label="External reference" htmlFor="momo-external" hint="Optional">
          <Input id="momo-external" {...register('externalReference')} />
        </FormField>
      </div>
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
        label={direction === 'out' ? 'Who you paid' : 'Who paid you'}
        htmlFor="momo-counterparty"
        error={errors.counterparty?.message}
      >
        <Input
          id="momo-counterparty"
          placeholder={direction === 'out' ? 'e.g., Input supplier or worker' : 'e.g., Buyer name'}
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
          hint="Optional. Leave blank if not provided."
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

        <FormField
          label="Date"
          htmlFor="momo-date"
          error={errors.date?.message}
          hint="Transactions added within 45 days of their date build your AgriCtec score."
        >
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
