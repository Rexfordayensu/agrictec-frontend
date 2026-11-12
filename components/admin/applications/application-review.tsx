'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Download,
  FileCheck2,
  Mail,
  PlayCircle,
  Send,
  Undo2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { LogoLoader } from '@/components/ui/logo-loader';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCan } from '@/hooks/admin/use-can';
import { formatGhanaDate } from '@/lib/format';
import { APPLICATION_STATUS, LENDER_STATUSES, saveBlob } from '@/lib/loans/application-status';
import { cn } from '@/lib/utils';
import { adminApplicationsService as svc } from '@/services/admin/applications.service';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import type {
  AdminActionResult,
  AdminApplicationDetail,
  ApplicationStatus,
  LenderConfirmedStatus,
} from '@/types/applications';

const panel = 'border-border bg-glass rounded-2xl border p-5 space-y-3';
const money = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === ''
    ? '—'
    : `GHS ${Number(value).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const IDENTITY = { none: 'Not verified', reviewed: 'Reviewed by AgriCtec', nia_verified: 'NIA verified' };
const WITH_LENDER: ApplicationStatus[] = ['sent_to_lender', ...LENDER_STATUSES.slice(0, 3)];
const LENDER_STATUS_LABEL: Record<LenderConfirmedStatus, string> = {
  received_by_lender: 'Received by the lender',
  under_lender_review: 'Under the lender’s review',
  documents_requested: 'Lender asked for more documents',
  approved_by_lender: 'Approved by the lender',
  rejected_by_lender: 'Not approved by the lender',
};

type Dialog = null | 'changes' | 'approve' | 'recorded' | 'lender';

/**
 * One application in the console: what the farmer sent, whether its figures still tally with
 * their records, and the next step (review, ask for changes, approve and send, or record what
 * the lender confirmed, with its proof).
 */
export function ApplicationReview({ id }: { id: string }) {
  const canManage = useCan('loans.manage');
  const refreshConsole = useAdminDataStore((s) => s.refresh);
  const [app, setApp] = useState<AdminApplicationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setApp(await svc.get(id));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load the application.');
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function act(run: () => Promise<AdminActionResult>, done: string) {
    setBusy(true);
    try {
      const next = await run();
      // The farmer and the tally don't change with an action: keep them.
      setApp((current) => (current ? { ...current, ...next } : current));
      setDialog(null);
      if (next.sendResult === 'manual')
        toast.info('Approved. This lender has no agreed email: hand it over and record how.');
      else if (next.sendResult === 'failed')
        toast.error(`Approved, but the email failed: ${next.sendError ?? 'try again or record how it was sent'}`);
      else toast.success(done);
      void refreshConsole();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'That did not work.');
    } finally {
      setBusy(false);
    }
  }

  if (error)
    return (
      <p role="alert" className="text-ink-red text-sm">
        {error}
      </p>
    );
  if (!app) return <LogoLoader center size="lg" label="Loading the application" />;

  const download = async (get: () => Promise<Blob>, name: string) => {
    try {
      saveBlob(await get(), name);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not download.');
    }
  };
  const status = app.status;

  return (
    <div className="space-y-5">
      <Link
        href="/admin/applications"
        className="text-text-dim hover:text-text inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft size={14} aria-hidden="true" /> All applications
      </Link>

      <header className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-text-mute text-xs">{app.reference}</p>
            <h2 className="text-text text-xl font-semibold">
              {app.farmer.name} · {app.product.name}
            </h2>
            <p className="text-text-dim text-sm">
              {app.lender.name} · {money(app.amount)} over {app.months} months · {app.purpose}
            </p>
          </div>
          <Badge color={APPLICATION_STATUS[status].color}>{app.statusLabel}</Badge>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            {status === 'submitted' && (
              <Button icon={PlayCircle} loading={busy} onClick={() => void act(() => svc.startReview(app.id), 'Review started')}>
                Start review
              </Button>
            )}
            {status === 'in_review' && (
              <Button icon={CheckCircle2} onClick={() => setDialog('approve')}>
                Approve and send
              </Button>
            )}
            {(status === 'submitted' || status === 'in_review') && (
              <Button variant="ghost" icon={Undo2} onClick={() => setDialog('changes')}>
                Ask the farmer for changes
              </Button>
            )}
            {status === 'approved_for_sending' && (
              <>
                {app.lender.canReceive && (
                  <Button icon={Mail} loading={busy} onClick={() => void act(() => svc.send(app.id), 'Sent to the lender')}>
                    Email it to the lender
                  </Button>
                )}
                <Button variant="ghost" icon={Send} onClick={() => setDialog('recorded')}>
                  Record how it was handed over
                </Button>
              </>
            )}
            {WITH_LENDER.includes(status) && (
              <Button icon={FileCheck2} onClick={() => setDialog('lender')}>
                Record the lender’s update
              </Button>
            )}
          </div>
        )}
        {status === 'approved_for_sending' && !app.lender.canReceive && (
          <p className="text-text-dim text-xs">
            {app.lender.name} has not agreed to receive applications by email. Download the
            application pack and statement below, hand them over, then record how.
          </p>
        )}
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={panel} aria-labelledby="tally-title">
          <h3 id="tally-title" className="text-text font-semibold">
            Does it tally with the farmer’s records?
          </h3>
          <TallyBadge ok={app.tally.allMatch} />
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-mute text-left text-xs">
                <th className="py-1 font-medium">Figure</th>
                <th className="py-1 font-medium">At submission</th>
                <th className="py-1 font-medium">Records now</th>
              </tr>
            </thead>
            <tbody>
              {app.tally.lines.map((line) => (
                <tr key={line.label} className={cn('border-border border-t', !line.same && 'text-ink-gold')}>
                  <td className="py-1.5">{line.label}</td>
                  <td className="py-1.5 tabular-nums">{fmt(line.label, line.atSubmission)}</td>
                  <td className="py-1.5 tabular-nums">{fmt(line.label, line.now)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-text-mute text-xs">{app.tally.note}</p>
          {app.assessment && (
            <p className="text-text-dim text-sm">
              <span className="font-semibold">Preliminary check:</span> {app.assessment.outcomeLabel}.{' '}
              {app.assessment.summary}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {app.tally.statement && (
              <Button
                variant="ghost"
                icon={Download}
                onClick={() => void download(() => svc.statement(app.id), `${app.reference}-statement.pdf`)}
              >
                Transaction statement ({app.tally.statement.periodMonths} months)
              </Button>
            )}
            <Button
              variant="ghost"
              icon={Download}
              onClick={() => void download(() => svc.pack(app.id), `${app.reference}-application.pdf`)}
            >
              Application pack
            </Button>
          </div>
        </section>

        <section className={panel} aria-labelledby="farmer-title">
          <h3 id="farmer-title" className="text-text font-semibold">
            Farmer
          </h3>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <Fact label="Name">
              <Link href={`/admin/farmers/${app.userId}`} className="text-ink-green font-semibold">
                {app.farmer.name}
              </Link>
            </Fact>
            <Fact label="Phone">{app.farmer.phone || '—'}</Fact>
            <Fact label="Farm">{app.farmer.farmName || '—'}</Fact>
            <Fact label="Location">
              {[app.farmer.constituency, app.farmer.region].filter(Boolean).join(', ') || '—'}
            </Fact>
            <Fact label="Ghana Card">{IDENTITY[app.farmer.identityLevel]}</Fact>
            <Fact label="Consent to share">
              {app.consent
                ? `Given ${formatGhanaDate(app.consent.givenAt)}${app.consent.withdrawnAt ? ` · withdrawn ${formatGhanaDate(app.consent.withdrawnAt)}` : ''}`
                : 'Not given'}
            </Fact>
            {app.sentAt && (
              <Fact label="Sent">
                {formatGhanaDate(app.sentAt)} · {app.sentVia === 'email' ? `by email to ${app.sentTo}` : app.sentTo}
              </Fact>
            )}
          </dl>
        </section>
      </div>

      <section className={panel} aria-labelledby="answers-title">
        <h3 id="answers-title" className="text-text font-semibold">
          The lender’s requirements
        </h3>
        <ul className="divide-border divide-y">
          {app.requirements.map((req) => (
            <li key={req.key} className="flex flex-wrap items-start justify-between gap-2 py-2 text-sm">
              <span className="min-w-0">
                <span className="text-text font-semibold">{req.name}</span>
                {!req.required && <span className="text-text-mute"> (optional)</span>}
                {req.checkedByAgriCtec && (
                  <span className="text-text-mute block text-xs">Checked from the farmer’s records</span>
                )}
              </span>
              <span className="text-text-dim text-right">
                {req.fieldType === 'document'
                  ? req.documents.length === 0
                    ? '—'
                    : req.documents.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => void download(() => svc.document(app.id, doc.id), doc.filename)}
                          className="text-ink-green block font-semibold hover:underline"
                        >
                          {doc.filename}
                        </button>
                      ))
                  : req.fieldType === 'none'
                    ? null
                    : req.answer ?? '—'}
              </span>
            </li>
          ))}
        </ul>
        {app.letter && (
          <>
            <h4 className="text-text pt-2 text-sm font-semibold">Application letter</h4>
            <p className="text-text-dim border-border rounded-xl border p-3 text-sm whitespace-pre-line">
              {app.letter}
            </p>
          </>
        )}
      </section>

      <section className={panel} aria-labelledby="history-title">
        <h3 id="history-title" className="text-text font-semibold">
          Timeline
        </h3>
        <ol className="space-y-3">
          {[...app.timeline].reverse().map((event) => (
            <li key={event.eventId} className="border-border border-l-2 pl-3">
              <p className="text-text text-sm font-semibold">{event.label}</p>
              <p className="text-text-mute text-xs">
                {formatGhanaDate(event.at)} · {event.by}
              </p>
              {event.note && <p className="text-text-dim mt-1 text-sm">{event.note}</p>}
              {event.hasProof && (
                <button
                  type="button"
                  onClick={() =>
                    void download(() => svc.proof(app.id, event.eventId), event.proofName ?? 'lender-confirmation')
                  }
                  className="text-ink-green mt-1 text-xs font-semibold hover:underline"
                >
                  Lender’s confirmation: {event.proofName}
                </button>
              )}
            </li>
          ))}
        </ol>
      </section>

      <NoteDialog
        open={dialog === 'changes'}
        title="Ask the farmer for changes"
        label="What should the farmer change?"
        confirm="Send to the farmer"
        required
        busy={busy}
        onClose={() => setDialog(null)}
        onSubmit={(note) => void act(() => svc.requestChanges(app.id, note), 'Sent back to the farmer')}
      />
      <NoteDialog
        open={dialog === 'approve'}
        title="Approve and send"
        label="Note for the record (optional)"
        confirm="Approve and send"
        description={
          app.tally.allMatch
            ? `The figures tally with the farmer’s records. ${app.lender.canReceive ? `It will be emailed to ${app.lender.name}` : `${app.lender.name} has no agreed email, so you will hand it over and record how`}, and the farmer is told it was sent for further review.`
            : 'Some figures no longer match the farmer’s records. Approve only if you are satisfied they still support this application.'
        }
        busy={busy}
        onClose={() => setDialog(null)}
        onSubmit={(note) => void act(() => svc.approve(app.id, note || undefined), 'Approved and sent to the lender')}
      />
      <NoteDialog
        open={dialog === 'recorded'}
        title="Record how it was handed over"
        label="How and to whom (e.g. delivered to the Tamale branch credit officer)"
        confirm="Record as sent"
        required
        busy={busy}
        onClose={() => setDialog(null)}
        onSubmit={(how) => void act(() => svc.recordSent(app.id, how), 'Recorded as sent to the lender')}
      />
      <LenderStatusDialog
        open={dialog === 'lender'}
        busy={busy}
        onClose={() => setDialog(null)}
        onSubmit={(next, note, proof) =>
          void act(() => svc.lenderStatus(app.id, next, note, proof), 'Lender’s update recorded')
        }
      />
    </div>
  );
}

function fmt(label: string, value: string | number | null) {
  if (value === null || value === undefined) return '—';
  return /entries/i.test(label) ? String(value) : money(value);
}

function TallyBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <p className="text-ink-green flex items-center gap-1.5 text-sm font-semibold">
      <CheckCircle2 size={15} aria-hidden="true" /> The figures sent match the farmer’s records.
    </p>
  ) : (
    <p className="text-ink-gold flex items-center gap-1.5 text-sm font-semibold">
      <CircleAlert size={15} aria-hidden="true" /> Some figures changed since submission.
    </p>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-text-mute text-xs">{label}</dt>
      <dd className="text-text">{children}</dd>
    </div>
  );
}

function NoteDialog({
  open,
  title,
  label,
  confirm,
  description,
  required,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  label: string;
  confirm: string;
  description?: string;
  required?: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState('');
  if (!open) return null;
  const valid = !required || note.trim().length >= 5;
  return (
    <Modal open onClose={onClose} title={title} description={description}>
      <div className="space-y-4">
        <FormField label={label} htmlFor="review-note" hint={required ? 'At least 5 characters.' : undefined}>
          <Textarea id="review-note" rows={4} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={busy} disabled={!valid} onClick={() => onSubmit(note.trim())}>
            {confirm}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function LenderStatusDialog({
  open,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (status: LenderConfirmedStatus, note: string, proof: File) => void;
}) {
  const [status, setStatus] = useState<LenderConfirmedStatus>('received_by_lender');
  const [note, setNote] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  if (!open) return null;
  return (
    <Modal
      open
      onClose={onClose}
      title="Record the lender’s update"
      description="Only what the lender confirmed. Attach its confirmation (email, letter or screenshot): the farmer sees the update as confirmed by the lender."
    >
      <div className="space-y-4">
        <FormField label="What the lender confirmed" htmlFor="lender-status">
          <Select id="lender-status" value={status} onChange={(e) => setStatus(e.target.value as LenderConfirmedStatus)}>
            {(LENDER_STATUSES as LenderConfirmedStatus[]).map((s) => (
              <option key={s} value={s}>
                {LENDER_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Note for the farmer" htmlFor="lender-note" hint="At least 5 characters.">
          <Textarea id="lender-note" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>
        <FormField label="The lender’s confirmation (PDF or image)" htmlFor="lender-proof">
          <Input
            id="lender-proof"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => setProof(e.target.files?.[0] ?? null)}
          />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={!proof || note.trim().length < 5}
            onClick={() => proof && onSubmit(status, note.trim(), proof)}
          >
            Record update
          </Button>
        </div>
      </div>
    </Modal>
  );
}
