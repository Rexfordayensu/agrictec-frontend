'use client';

import { useId, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import {
  recordSchema,
  type RecordFormInput,
  type RecordFormValues,
} from '@/components/records/record-schema';
import { Button } from '@/components/ui/button';
import { FormField, fieldErrorId } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CATEGORIES, categoryLabel, duplicateRetry, isPossibleDuplicate } from '@/lib/transactions';
import { CROPS } from '@/constants/crops';
import { todayISO } from '@/lib/format';
import { transactionsService } from '@/services/transactions.service';
import { useFarmStore } from '@/store/farm-store';
import { useModalStore } from '@/store/modal-store';
import type { FarmRecord, NewRecordInput } from '@/types';

const TYPE_OPTIONS = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'activity', label: 'Activity (no money)' },
  { value: 'financing', label: 'Financing (separate from farm profit)' },
] as const;

function toFormValues(record?: FarmRecord, defaults?: Partial<NewRecordInput>): RecordFormInput {
  return record
    ? {
        type: record.type,
        description: record.description,
        crop: record.crop,
        amount: record.type === 'activity' && record.amount === 0 ? '' : record.amount,
        date: record.date,
        notes: record.notes ?? '',
        category: record.category ?? '',
        direction: record.direction ?? 'in',
        paymentMethod: record.paymentMethod ?? '',
        externalReference: record.externalReference ?? '',
      }
    : {
        type: 'income',
        description: '',
        crop: 'Maize',
        amount: '',
        date: todayISO(),
        notes: '',
        ...defaults,
        category: defaults?.category ?? '',
        direction: defaults?.direction ?? 'in',
        paymentMethod: defaults?.paymentMethod ?? '',
        externalReference: defaults?.externalReference ?? '',
      };
}

/** App-wide add/edit record modal. Open it with useModalStore().openModal('record', id?). */
export function RecordFormModal() {
  const modal = useModalStore((s) => s.modal);
  const editingId = useModalStore((s) => s.editingId);
  const recordDefaults = useModalStore((s) => s.recordDefaults);
  const receipt = useModalStore((s) => s.receipt);
  const closeModal = useModalStore((s) => s.closeModal);
  const editing = useFarmStore((s) =>
    editingId ? s.records.find((r) => r.id === editingId) : undefined,
  );
  const formId = useId();
  const [saving, setSaving] = useState(false);

  return (
    <Modal
      open={modal === 'record'}
      onClose={closeModal}
      title={editing ? 'Edit Farm Record' : 'New Farm Record'}
      footer={
        <>
          <Button variant="ghost" onClick={closeModal}>
            Cancel
          </Button>
          <Button mutates type="submit" form={formId} loading={saving}>
            {editing ? 'Update record' : 'Save record'}
          </Button>
        </>
      }
    >
      {/* Mounted only while open, and re-mounted per record, so defaults are always fresh. */}
      <RecordForm
        key={editing?.id ?? 'new'}
        formId={formId}
        editing={editing}
        defaults={recordDefaults}
        receipt={editing ? undefined : receipt}
        onDone={closeModal}
        onSavingChange={setSaving}
      />
    </Modal>
  );
}

function RecordForm({
  formId,
  editing,
  defaults,
  receipt,
  onDone,
  onSavingChange,
}: {
  formId: string;
  editing?: FarmRecord;
  defaults?: Partial<NewRecordInput>;
  /** Attached as evidence (a receipt) once the new record is saved. */
  receipt?: File;
  onDone: () => void;
  onSavingChange: (saving: boolean) => void;
}) {
  const [duplicate, setDuplicate] = useState<RecordFormValues>();
  const addRecord = useFarmStore((s) => s.addRecord);
  const updateRecord = useFarmStore((s) => s.updateRecord);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<RecordFormInput, unknown, RecordFormValues>({
    resolver: zodResolver(recordSchema),
    defaultValues: toFormValues(editing, defaults),
  });

  const type = useWatch({ control, name: 'type' });
  const resetCategory = () => setValue('category', '');

  async function onSubmit(values: RecordFormValues, confirmed = false) {
    const input: NewRecordInput = {
      type: values.type,
      category: values.type === 'activity' ? null : values.category || null,
      direction: values.type === 'financing' ? values.direction : null,
      paymentMethod: values.paymentMethod?.trim() || null,
      externalReference: values.externalReference?.trim() || null,
      ...(confirmed ? duplicateRetry({}) : {}),
      description: values.description,
      crop: values.crop,
      amount: values.amount,
      date: values.date,
      notes: values.notes?.trim() || undefined,
    };
    onSavingChange(true);
    try {
      if (editing) {
        await updateRecord(editing.id, input);
        toast.success('Record updated');
      } else {
        const record = await addRecord(input);
        if (receipt) await attachReceipt(record.id, receipt);
        else toast.success('Record saved successfully');
      }
      reset();
      onDone();
    } catch (error) {
      if (isPossibleDuplicate(error)) {
        setDuplicate(values);
        return;
      }
      // Keep the modal open so nothing the farmer typed is lost.
      toast.error(error instanceof Error ? error.message : 'Could not save the record');
    } finally {
      onSavingChange(false);
    }
  }

  /** Uploads the imported receipt to the new record; the record stays saved if this fails. */
  async function attachReceipt(recordId: string, file: File) {
    try {
      await transactionsService.upload('farm', recordId, file, 'receipt', () => undefined);
      toast.success('Record saved with its receipt');
      const { userId, load } = useFarmStore.getState();
      if (userId) await load(userId, { silent: true });
    } catch (error) {
      toast.warning(
        `Record saved, but the receipt could not be attached: ${error instanceof Error ? error.message : 'please try again'}. Attach it from Evidence & review.`,
      );
    }
  }

  const describe = (id: string, hasError: boolean) => (hasError ? fieldErrorId(id) : undefined);

  return (
    <form
      id={formId}
      noValidate
      onSubmit={handleSubmit((values) => onSubmit(values))}
      className="space-y-4"
    >
      {receipt && (
        <p className="border-accent/30 bg-accent/8 text-text rounded-xl border px-3 py-2 text-sm">
          Receipt attached: <strong className="font-semibold">{receipt.name}</strong>. It is saved
          with this record as evidence for AgriCtec to review.
        </p>
      )}
      {duplicate && (
        <div role="alert" className="bg-gold/10 space-y-2 rounded-xl p-3 text-sm">
          <p>
            A possible duplicate has the same date, amount, type and category. Is this a separate
            entry?
          </p>
          <Button mutates type="button" onClick={() => void onSubmit(duplicate, true)}>
            Save anyway
          </Button>
          <Button variant="ghost" type="button" onClick={() => setDuplicate(undefined)}>
            Keep editing
          </Button>
        </div>
      )}
      <FormField label="Record type" htmlFor="record-type" error={errors.type?.message}>
        <Select
          id="record-type"
          error={Boolean(errors.type)}
          {...register('type', { onChange: () => resetCategory() })}
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>

      {type !== 'activity' && (
        <FormField label="Category" htmlFor="record-category">
          <Select id="record-category" {...register('category')}>
            <option value="">Uncategorised</option>
            {CATEGORIES[type].map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </Select>
        </FormField>
      )}
      {type === 'financing' && (
        <FormField label="Financing direction" htmlFor="record-direction">
          <Select id="record-direction" {...register('direction')}>
            <option value="in">Money in</option>
            <option value="out">Money out</option>
          </Select>
        </FormField>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Payment method" htmlFor="record-method" hint="Optional">
          <Input id="record-method" {...register('paymentMethod')} />
        </FormField>
        <FormField label="External reference" htmlFor="record-reference" hint="Optional">
          <Input id="record-reference" {...register('externalReference')} />
        </FormField>
      </div>
      <FormField
        label="Description"
        htmlFor="record-description"
        error={errors.description?.message}
      >
        <Input
          id="record-description"
          placeholder="e.g., Sold maize to buyer"
          error={Boolean(errors.description)}
          aria-describedby={describe('record-description', Boolean(errors.description))}
          {...register('description')}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Crop" htmlFor="record-crop" error={errors.crop?.message}>
          <Select id="record-crop" error={Boolean(errors.crop)} {...register('crop')}>
            {CROPS.map((crop) => (
              <option key={crop} value={crop}>
                {crop}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          label={type === 'activity' ? 'Amount (optional)' : 'Amount (GHS)'}
          htmlFor="record-amount"
          error={errors.amount?.message}
        >
          <Input
            id="record-amount"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="0.00"
            error={Boolean(errors.amount)}
            aria-describedby={describe('record-amount', Boolean(errors.amount))}
            {...register('amount')}
          />
        </FormField>
      </div>

      <FormField
        label="Date"
        htmlFor="record-date"
        error={errors.date?.message}
        hint="Entries added within 45 days of their date build your AgriCtec score."
      >
        <Input
          id="record-date"
          type="date"
          max={todayISO()}
          error={Boolean(errors.date)}
          aria-describedby={describe('record-date', Boolean(errors.date))}
          {...register('date')}
        />
      </FormField>

      <FormField label="Notes" htmlFor="record-notes" hint="Optional" error={errors.notes?.message}>
        <Textarea
          id="record-notes"
          placeholder="Anything worth remembering: buyer, quantity, weather…"
          error={Boolean(errors.notes)}
          {...register('notes')}
        />
      </FormField>
    </form>
  );
}
