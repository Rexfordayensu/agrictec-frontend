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
import { CROPS } from '@/constants/crops';
import { todayISO } from '@/lib/format';
import { useFarmStore } from '@/store/farm-store';
import { useModalStore } from '@/store/modal-store';
import type { FarmRecord, NewRecordInput } from '@/types';

const TYPE_OPTIONS = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'activity', label: 'Activity (no money)' },
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
      }
    : {
        type: 'income',
        description: '',
        crop: 'Maize',
        amount: '',
        date: todayISO(),
        notes: '',
        ...defaults,
      };
}

/** App-wide add/edit record modal. Open it with useModalStore().openModal('record', id?). */
export function RecordFormModal() {
  const modal = useModalStore((s) => s.modal);
  const editingId = useModalStore((s) => s.editingId);
  const recordDefaults = useModalStore((s) => s.recordDefaults);
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
  onDone,
  onSavingChange,
}: {
  formId: string;
  editing?: FarmRecord;
  defaults?: Partial<NewRecordInput>;
  onDone: () => void;
  onSavingChange: (saving: boolean) => void;
}) {
  const addRecord = useFarmStore((s) => s.addRecord);
  const updateRecord = useFarmStore((s) => s.updateRecord);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RecordFormInput, unknown, RecordFormValues>({
    resolver: zodResolver(recordSchema),
    defaultValues: toFormValues(editing, defaults),
  });

  const type = useWatch({ control, name: 'type' });

  async function onSubmit(values: RecordFormValues) {
    const input: NewRecordInput = {
      type: values.type,
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
        await addRecord(input);
        toast.success('Record saved successfully');
      }
      reset();
      onDone();
    } catch (error) {
      // Keep the modal open so nothing the farmer typed is lost.
      toast.error(error instanceof Error ? error.message : 'Could not save the record');
    } finally {
      onSavingChange(false);
    }
  }

  const describe = (id: string, hasError: boolean) => (hasError ? fieldErrorId(id) : undefined);

  return (
    <form id={formId} noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Record type" htmlFor="record-type" error={errors.type?.message}>
        <Select id="record-type" error={Boolean(errors.type)} {...register('type')}>
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>

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

      <FormField label="Date" htmlFor="record-date" error={errors.date?.message}>
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
