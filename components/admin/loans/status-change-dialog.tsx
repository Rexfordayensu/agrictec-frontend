'use client';

import { useId, useState } from 'react';
import { format } from 'date-fns';
import { ArrowRight, Eye } from 'lucide-react';
import { toast } from 'sonner';
import {
  APPROVE_CLASS,
  PRIMARY_CLASS,
  REJECT_CLASS,
} from '@/components/admin/shared/action-styles';
import { StatusBadge } from '@/components/admin/shared/status-badge';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { statusChangeSchema } from '@/lib/admin/loan-pipeline';
import { LOAN_STATUS_LABELS, noteRequired } from '@/lib/admin/loan-status';
import { formatGHS } from '@/lib/format';
import { loanApplicationsService } from '@/services/admin/loan-applications.service';
import type { LoanApplication, LoanStatus } from '@/types/admin';

/** The confirm button for each target status. */
export const STATUS_ACTION: Record<LoanStatus, { label: string; className: string }> = {
  submitted: { label: 'Move', className: PRIMARY_CLASS },
  under_review: { label: 'Start review', className: PRIMARY_CLASS },
  approved: { label: 'Approve', className: APPROVE_CLASS },
  rejected: { label: 'Reject', className: REJECT_CLASS },
  disbursed: { label: 'Mark disbursed', className: APPROVE_CLASS },
  repaid: { label: 'Mark repaid', className: APPROVE_CLASS },
  defaulted: { label: 'Mark defaulted', className: REJECT_CLASS },
};

type Field = 'note' | 'disbursedOn' | 'disbursementRef' | 'status';

export interface StatusChange {
  app: LoanApplication;
  to: LoanStatus;
}

/**
 * Confirms a move along the pipeline. Approved, rejected and defaulted need a note; disbursed
 * also asks for the date and the transfer reference. The farmer's "My Applications" timeline
 * shows the new step (and the note) straight away. The service checks and audits it again.
 */
export function StatusChangeDialog({
  change,
  farmerName,
  lenderName,
  onClose,
  onDone,
}: {
  /** Null = closed. */
  change: StatusChange | null;
  farmerName: string;
  lenderName: string;
  onClose: () => void;
  onDone: (updated: LoanApplication) => void;
}) {
  if (!change) return null;
  return (
    <ChangeForm
      key={`${change.app.id}-${change.to}`}
      change={change}
      farmerName={farmerName}
      lenderName={lenderName}
      onClose={onClose}
      onDone={onDone}
    />
  );
}

function ChangeForm({
  change: { app, to },
  farmerName,
  lenderName,
  onClose,
  onDone,
}: {
  change: StatusChange;
  farmerName: string;
  lenderName: string;
  onClose: () => void;
  onDone: (updated: LoanApplication) => void;
}) {
  const id = useId();
  const [note, setNote] = useState('');
  const [disbursedOn, setDisbursedOn] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [disbursementRef, setDisbursementRef] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [busy, setBusy] = useState(false);
  const disbursing = to === 'disbursed';
  const required = noteRequired(to);
  const action = STATUS_ACTION[to];

  async function submit() {
    const input = { note, ...(disbursing && { disbursedOn, disbursementRef }) };
    const parsed = statusChangeSchema(app, to).safeParse(input);
    if (!parsed.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? 'status') as Field;
        next[field] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const updated = await loanApplicationsService.updateStatus(app.id, to, input);
      toast.success(`${app.reference} is now ${LOAN_STATUS_LABELS[to].toLowerCase()}`);
      onDone(updated);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not change the status');
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={`Move to ${LOAN_STATUS_LABELS[to]}`}
      description={`${app.reference} · ${farmerName} · ${formatGHS(app.amount)} from ${lenderName}`}
      dirty={!busy && (note.trim() !== '' || disbursementRef.trim() !== '')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form={id} loading={busy} className={action.className}>
            {action.label}
          </Button>
        </>
      }
    >
      <form
        id={id}
        noValidate
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="border-border bg-bg-2/60 flex flex-wrap items-center justify-center gap-3 rounded-xl border px-4 py-3">
          <StatusBadge kind="loan" status={app.status} />
          <ArrowRight size={16} aria-hidden="true" className="text-text-mute" />
          <StatusBadge kind="loan" status={to} />
          <span className="sr-only">
            From {LOAN_STATUS_LABELS[app.status]} to {LOAN_STATUS_LABELS[to]}
          </span>
        </div>

        {errors.status && (
          <p role="alert" className="text-ink-red text-sm">
            {errors.status}
          </p>
        )}

        {disbursing && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Disbursement date" htmlFor={`${id}-date`} error={errors.disbursedOn}>
              <Input
                id={`${id}-date`}
                type="date"
                value={disbursedOn}
                max={format(new Date(), 'yyyy-MM-dd')}
                min={app.createdAt.slice(0, 10)}
                error={Boolean(errors.disbursedOn)}
                onChange={(e) => setDisbursedOn(e.target.value)}
              />
            </FormField>
            <FormField
              label="Transfer reference"
              htmlFor={`${id}-ref`}
              error={errors.disbursementRef}
            >
              <Input
                id={`${id}-ref`}
                value={disbursementRef}
                maxLength={40}
                placeholder="e.g. MTN-58201934"
                autoComplete="off"
                error={Boolean(errors.disbursementRef)}
                onChange={(e) => setDisbursementRef(e.target.value)}
              />
            </FormField>
          </div>
        )}

        <FormField
          label={required ? 'Note (required)' : 'Note (optional)'}
          htmlFor={`${id}-note`}
          error={errors.note}
        >
          <Textarea
            id={`${id}-note`}
            rows={3}
            maxLength={500}
            value={note}
            error={Boolean(errors.note)}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              to === 'rejected'
                ? 'e.g. Income records cover only 3 months. Reapply after the next harvest.'
                : to === 'approved'
                  ? 'e.g. Records and MoMo history check out. Funds within 5 working days.'
                  : 'What happened, in a sentence.'
            }
          />
        </FormField>

        <p className="text-text-mute flex items-start gap-1.5 text-xs">
          <Eye size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
          The farmer sees this step{note.trim() ? ' and your note' : ''} on their “My Applications”
          timeline.
        </p>
      </form>
    </Modal>
  );
}
