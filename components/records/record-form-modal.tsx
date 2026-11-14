'use client';

import { useEffect, useId, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Banknote, Landmark, Smartphone, type LucideIcon } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { NETWORK_STYLES } from '@/components/momo/momo-filters';
import { MomoReceiptField } from '@/components/momo/momo-receipt-field';
import { MOMO_NETWORKS } from '@/components/momo/momo-schema';
import { NetworkLogo } from '@/components/momo/network-logo';
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
import {
  CATEGORIES,
  categoryLabel,
  duplicateRetry,
  GHANA_BANKS,
  isPossibleDuplicate,
  PAYMENT_METHODS,
  type PaymentMethod,
} from '@/lib/transactions';
import { CROPS } from '@/constants/crops';
import { todayISO } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ApiError } from '@/services/api';
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

const METHOD_OPTIONS: { value: PaymentMethod; icon: LucideIcon; hint: string }[] = [
  { value: 'cash', icon: Banknote, hint: 'Paid in cash' },
  { value: 'bank', icon: Landmark, hint: 'Bank transfer or deposit' },
  { value: 'mobile_money', icon: Smartphone, hint: 'MTN, Telecel or AirtelTigo' },
];

const isMethod = (value?: string | null): value is PaymentMethod =>
  value === 'cash' || value === 'bank' || value === 'mobile_money';

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
        // Older records kept free text here: the farmer picks one of the three when editing.
        paymentMethod: isMethod(record.paymentMethod) ? record.paymentMethod : '',
        network: record.network ?? '',
        bankName: record.bankName ?? '',
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
        paymentMethod: isMethod(defaults?.paymentMethod) ? defaults.paymentMethod : '',
        network: defaults?.network ?? '',
        bankName: defaults?.bankName ?? '',
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
  // Paid by mobile money without a receipt yet: nothing can be saved.
  const [needsReceipt, setNeedsReceipt] = useState(false);

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
          <Button
            mutates
            type="submit"
            form={formId}
            loading={saving}
            disabled={needsReceipt}
            title={needsReceipt ? 'Add the MoMo receipt first' : undefined}
          >
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
        onNeedsReceiptChange={setNeedsReceipt}
      />
    </Modal>
  );
}

function RecordForm({
  formId,
  editing,
  defaults,
  receipt: imported,
  onDone,
  onSavingChange,
  onNeedsReceiptChange,
}: {
  formId: string;
  editing?: FarmRecord;
  defaults?: Partial<NewRecordInput>;
  /** A receipt the farmer imported ("Import receipt"): saved with the new record. */
  receipt?: File;
  onDone: () => void;
  onSavingChange: (saving: boolean) => void;
  onNeedsReceiptChange: (needed: boolean) => void;
}) {
  const [duplicate, setDuplicate] = useState<RecordFormValues>();
  const [receipt, setReceipt] = useState<File | null>(imported ?? null);
  const [receiptError, setReceiptError] = useState<string>();
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
  const method = useWatch({ control, name: 'paymentMethod' });
  const network = useWatch({ control, name: 'network' });
  const resetCategory = () => setValue('category', '');
  const money = type !== 'activity';
  const momo = money && method === 'mobile_money';
  const bank = money && method === 'bank';
  // An edited record that already has its receipt on file needs no new one.
  const receiptOnFile = Boolean(editing?.evidenceCount);
  const receiptRequired = momo && !receiptOnFile;
  const blocked = receiptRequired && !receipt;
  useEffect(() => {
    onNeedsReceiptChange(blocked);
    return () => onNeedsReceiptChange(false);
  }, [blocked, onNeedsReceiptChange]);

  function changeReceipt(file: File | null, error?: string) {
    setReceipt(file);
    setReceiptError(error);
  }

  async function onSubmit(values: RecordFormValues, confirmed = false) {
    const paid = values.type === 'activity' ? null : (values.paymentMethod as PaymentMethod);
    if (paid === 'mobile_money' && !receiptOnFile && !receipt) {
      setReceiptError('Add the MoMo receipt. AgriCtec checks it before verifying the record.');
      return;
    }
    const input: NewRecordInput = {
      type: values.type,
      category: values.type === 'activity' ? null : values.category || null,
      direction: values.type === 'financing' ? values.direction : null,
      paymentMethod: paid,
      network: paid === 'mobile_money' ? (values.network as FarmRecord['network']) : null,
      bankName: paid === 'bank' ? values.bankName?.trim() || null : null,
      externalReference: paid ? values.externalReference?.trim() || null : null,
      ...(confirmed ? duplicateRetry({}) : {}),
      description: values.description,
      crop: values.crop,
      amount: values.amount,
      date: values.date,
      notes: values.notes?.trim() || undefined,
    };
    // A receipt goes with money records only (an activity has nothing to prove).
    const withReceipt = paid ? (receipt ?? undefined) : undefined;
    onSavingChange(true);
    try {
      if (editing) {
        // The receipt goes first, so a switch to mobile money is accepted with it on file.
        if (withReceipt)
          await transactionsService.upload('farm', editing.id, withReceipt, 'receipt', () => {});
        await updateRecord(editing.id, input);
        toast.success(
          paid === 'mobile_money' ? 'Record updated and sent for review' : 'Record updated',
        );
      } else {
        await addRecord(input, withReceipt);
        if (paid === 'mobile_money')
          toast.success('Record sent for review', {
            description:
              'AgriCtec will check the MoMo receipt and verify it. You will get a notification.',
          });
        else toast.success(withReceipt ? 'Record saved with its receipt' : 'Record saved');
      }
      if (withReceipt || editing) {
        const { userId, load } = useFarmStore.getState();
        if (userId) await load(userId, { silent: true });
      }
      reset();
      onDone();
    } catch (error) {
      if (isPossibleDuplicate(error)) {
        setDuplicate(values);
        return;
      }
      if (
        error instanceof ApiError &&
        (error.code === 'receipt_required' || error.code === 'receipt_reused')
      ) {
        setReceiptError(error.message);
        return;
      }
      // Keep the modal open so nothing the farmer typed is lost.
      toast.error(error instanceof Error ? error.message : 'Could not save the record');
    } finally {
      onSavingChange(false);
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

      {money && (
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

      {money && (
        <fieldset
          aria-describedby={errors.paymentMethod ? fieldErrorId('record-method') : undefined}
        >
          <legend className="text-text-dim mb-1.5 text-xs font-semibold tracking-wide uppercase">
            {type === 'expense' ? 'How did you pay?' : 'How was the money paid?'}
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {METHOD_OPTIONS.map(({ value, icon: Icon, hint }) => (
              <label key={value} className="relative">
                <input
                  type="radio"
                  value={value}
                  className="peer sr-only"
                  {...register('paymentMethod')}
                />
                <span
                  className={cn(
                    'peer-focus-visible:outline-accent flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 transition-colors peer-focus-visible:outline-2',
                    method === value
                      ? 'border-accent bg-accent/10 text-text'
                      : 'border-border bg-bg-2 text-text-dim hover:text-text',
                  )}
                >
                  <Icon
                    size={20}
                    aria-hidden="true"
                    className={cn('shrink-0', method === value && 'text-icon')}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{PAYMENT_METHODS[value]}</span>
                    <span className="text-text-mute block text-xs">{hint}</span>
                  </span>
                </span>
              </label>
            ))}
          </div>
          {errors.paymentMethod && (
            <p
              id={fieldErrorId('record-method')}
              role="alert"
              className="text-ink-red mt-1.5 text-xs font-medium"
            >
              {errors.paymentMethod.message}
            </p>
          )}
        </fieldset>
      )}

      {bank && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Bank name" htmlFor="record-bank" error={errors.bankName?.message}>
            <Input
              id="record-bank"
              list="record-bank-names"
              placeholder="e.g., GCB Bank"
              autoComplete="off"
              error={Boolean(errors.bankName)}
              aria-describedby={describe('record-bank', Boolean(errors.bankName))}
              {...register('bankName')}
            />
            <datalist id="record-bank-names">
              {GHANA_BANKS.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </FormField>
          <FormField
            label="Bank reference"
            htmlFor="record-reference"
            hint="From the deposit slip, transfer or bank alert"
            error={errors.externalReference?.message}
          >
            <Input
              id="record-reference"
              placeholder="e.g., FT2611130042"
              autoCapitalize="characters"
              className="font-mono"
              error={Boolean(errors.externalReference)}
              aria-describedby={describe('record-reference', Boolean(errors.externalReference))}
              {...register('externalReference')}
            />
          </FormField>
        </div>
      )}

      {momo && (
        <>
          <fieldset aria-describedby={errors.network ? fieldErrorId('record-network') : undefined}>
            <legend className="text-text-dim mb-1.5 text-xs font-semibold tracking-wide uppercase">
              MoMo network
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
            {errors.network && (
              <p
                id={fieldErrorId('record-network')}
                role="alert"
                className="text-ink-red mt-1.5 text-xs font-medium"
              >
                {errors.network.message}
              </p>
            )}
          </fieldset>
          <FormField
            label="MoMo transaction ID"
            htmlFor="record-reference"
            hint="Optional. From the MoMo message."
            error={errors.externalReference?.message}
          >
            <Input
              id="record-reference"
              placeholder="e.g., MP261113.0915.Q12345"
              autoCapitalize="characters"
              className="font-mono"
              {...register('externalReference')}
            />
          </FormField>
        </>
      )}

      {momo &&
        (receiptOnFile && !receipt ? (
          <p className="bg-icon-bg text-icon rounded-xl px-3 py-2 text-sm font-medium">
            The MoMo receipt is on file. Saving changes sends the record for a fresh review.
          </p>
        ) : (
          <MomoReceiptField file={receipt} onChange={changeReceipt} error={receiptError} />
        ))}
      {bank && (
        <MomoReceiptField
          file={receipt}
          onChange={changeReceipt}
          error={receiptError}
          required={false}
          label="Bank receipt or slip"
          hint="A photo or PDF of the deposit slip, transfer confirmation or bank alert (up to 5 MB). It helps AgriCtec verify the record later."
        />
      )}
      {money && method === 'cash' && (
        <p className="text-text-mute text-xs leading-relaxed">
          Cash entries are your own record.
          {receipt
            ? ` The receipt ${receipt.name} is saved with it.`
            : ' If you have a receipt, attach it later from Evidence & review.'}
        </p>
      )}

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
