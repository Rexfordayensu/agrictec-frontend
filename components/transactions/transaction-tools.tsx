'use client';

import { useEffect, useId, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  categoryLabel,
  paymentLabel,
  SOURCE_LABELS,
  STATUS_COLORS,
  TRANSACTION_STATUSES,
} from '@/lib/transactions';
import { useReadOnly } from '@/lib/read-only';
import { DemoNote, useDemo } from '@/components/shared/demo-note';
import { transactionsService } from '@/services/transactions.service';
import { api } from '@/services/api';
import { useFarmStore } from '@/store/farm-store';
import type { Evidence, TransactionItem, TransactionMetadata } from '@/types/transactions';

const message = (error: unknown) => (error instanceof Error ? error.message : 'Please try again.');

export function TransactionStatus({ entry }: { entry: TransactionMetadata }) {
  const status = entry.verificationStatus ?? 'self_reported';
  const last = entry.history?.at(-1);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Badge color={STATUS_COLORS[status]}>{TRANSACTION_STATUSES[status]}</Badge>
      {status === 'rejected' && last?.reason && (
        <span className="text-ink-red text-xs">{last.reason}</span>
      )}
    </span>
  );
}

export function EvidenceFile({ evidence, admin = false }: { evidence: Evidence; admin?: boolean }) {
  const [preview, setPreview] = useState<string>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  async function open(download: boolean) {
    setBusy(true);
    setError('');
    try {
      const blob = await transactionsService.file(evidence.id, admin);
      const url = URL.createObjectURL(blob);
      if (!download) setPreview(url);
      else {
        const a = document.createElement('a');
        a.href = url;
        a.download = evidence.filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="border-border space-y-2 rounded-xl border p-3">
      <p className="text-sm font-semibold break-words">{evidence.filename}</p>
      <p className="text-text-mute text-xs">
        {evidence.kind} / {(evidence.sizeBytes / 1024).toFixed(1)} KB
      </p>
      <div className="flex flex-wrap gap-2">
        {evidence.contentType.startsWith('image/') && (
          <Button size="sm" variant="ghost" loading={busy} onClick={() => void open(false)}>
            View image
          </Button>
        )}
        <Button size="sm" variant="ghost" loading={busy} onClick={() => void open(true)}>
          Download {evidence.contentType === 'application/pdf' ? 'PDF' : 'file'}
        </Button>
      </div>
      {/* Authenticated in-memory preview; the original is never a public URL. */}
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element -- Authenticated blob preview.
        <img
          src={preview}
          alt={`Evidence: ${evidence.filename}`}
          className="max-h-96 max-w-full rounded-lg object-contain"
        />
      )}
      {error && (
        <p role="alert" className="text-ink-red text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

export function TransactionTools({
  kind,
  id,
  entry,
}: {
  kind: 'farm' | 'momo';
  id: string;
  entry: TransactionMetadata;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <TransactionStatus entry={entry} />
        <button
          type="button"
          className="text-ink-green min-h-9 text-xs font-semibold hover:underline"
          onClick={() => setOpen(true)}
        >
          Evidence & review{entry.evidenceCount ? ` (${entry.evidenceCount})` : ''}
        </button>
      </div>
      <p className="text-text-mute text-xs">
        {categoryLabel(entry.category)} / {SOURCE_LABELS[entry.sourceType ?? 'farmer_entry']}
      </p>
      {entry.verificationStatus === 'verified' && (
        <p className="text-text-mute text-xs">
          Verified entries are locked. You can add a note or dispute the entry.
        </p>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Transaction evidence & history">
        {open && <TransactionDetail kind={kind} id={id} />}
      </Modal>
    </div>
  );
}

/** The same evidence & history dialog, opened from elsewhere (e.g. a table row's menu). */
export function TransactionReviewModal({
  kind,
  id,
  open,
  onClose,
}: {
  kind: 'farm' | 'momo';
  id: string;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Transaction evidence & history">
      {open && <TransactionDetail kind={kind} id={id} />}
    </Modal>
  );
}

function TransactionDetail({ kind, id }: { kind: 'farm' | 'momo'; id: string }) {
  // The guest demo's entries are only on the screen: no receipts are kept and nobody reviews them.
  if (useDemo())
    return (
      <DemoNote title="Evidence & review">
        With an account, you attach receipts here and AgriCtec reviews them so lenders can trust
        your records. The guest demo keeps no receipts.
      </DemoNote>
    );
  return <AccountTransactionDetail kind={kind} id={id} />;
}

function AccountTransactionDetail({ kind, id }: { kind: 'farm' | 'momo'; id: string }) {
  const [item, setItem] = useState<TransactionItem>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number>();
  const [evidenceKind, setEvidenceKind] = useState<Evidence['kind']>('receipt');
  const [disputing, setDisputing] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState<string>();
  const readOnly = useReadOnly();
  const fieldId = useId();
  const liveVersion = useFarmStore((state) => {
    const row =
      kind === 'farm'
        ? state.records.find((r) => r.id === id)
        : state.momo.find((r) => r.id === id);
    return `${row?.verificationStatus ?? ''}:${row?.updatedAt ?? ''}:${row?.evidenceCount ?? 0}`;
  });
  useEffect(() => {
    const controller = new AbortController();
    transactionsService
      .get(kind, id, controller.signal)
      .then((value) => {
        setItem(value);
        setNote((current) => current ?? value.notes ?? '');
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(message(err));
      });
    return () => controller.abort();
  }, [kind, id, liveVersion]);
  async function refreshFarm() {
    const state = useFarmStore.getState();
    if (state.userId) await state.load(state.userId, { silent: true });
  }
  async function action(task: () => Promise<unknown>) {
    if (readOnly) return;
    setBusy(true);
    setError('');
    try {
      await task();
      setItem(await transactionsService.get(kind, id));
      await refreshFarm();
      setDisputing(false);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
      setProgress(undefined);
    }
  }
  const status = item?.verificationStatus ?? 'self_reported';
  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="text-ink-red text-sm">
          {error}
        </p>
      )}
      {!item ? (
        <p aria-live="polite">Loading transaction...</p>
      ) : (
        <>
          <TransactionStatus entry={item} />
          <p className="text-sm">
            {item.description ?? item.counterparty ?? 'Not provided'} / {item.date}
          </p>
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-text-mute">Source</dt>
              <dd>{SOURCE_LABELS[item.sourceType ?? 'farmer_entry']}</dd>
            </div>
            <div>
              <dt className="text-text-mute">Category</dt>
              <dd>{categoryLabel(item.category)}</dd>
            </div>
            <div>
              <dt className="text-text-mute">Reference</dt>
              <dd className="break-all">
                {item.reference ?? item.externalReference ?? 'Not provided'}
              </dd>
            </div>
            <div>
              <dt className="text-text-mute">Payment method</dt>
              <dd>{paymentLabel(item) ?? 'Not provided'}</dd>
            </div>
          </dl>
          <p className="text-text-mute text-xs">
            A receipt or statement supports your entry. It does not verify it. Provider verification
            is unavailable.
          </p>
          {item.evidence.map((e) => (
            <div key={e.id}>
              <EvidenceFile evidence={e} />
              {!['verified', 'verification_pending'].includes(status) && (
                <Button
                  mutates
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void action(() => transactionsService.removeEvidence(e.id))}
                >
                  Remove evidence
                </Button>
              )}
            </div>
          ))}
          {item.evidence.length < 5 && status !== 'verified' && (
            <div className="space-y-2">
              <label htmlFor={`${fieldId}-kind`} className="block text-xs font-semibold">
                Evidence kind
              </label>
              <Select
                id={`${fieldId}-kind`}
                value={evidenceKind}
                onChange={(e) => setEvidenceKind(e.target.value as Evidence['kind'])}
                disabled={readOnly || busy}
              >
                <option value="receipt">Receipt</option>
                <option value="statement">Statement</option>
                <option value="other">Other</option>
              </Select>
              <label htmlFor={`${fieldId}-upload`} className="block text-xs font-semibold">
                Add evidence (PDF, JPEG, PNG or WebP, up to 5 MB)
              </label>
              <Input
                id={`${fieldId}-upload`}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                disabled={readOnly || busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) {
                    setError('Choose a file no larger than 5 MB.');
                    return;
                  }
                  void action(() =>
                    transactionsService.upload(kind, id, file, evidenceKind, setProgress),
                  );
                }}
              />
              {progress !== undefined && (
                <div aria-live="polite">
                  <progress value={progress} max={100} className="w-full" />
                  {progress === 100 ? 'Processing evidence...' : `Uploading ${progress}%`}
                </div>
              )}
            </div>
          )}
          {kind === 'momo' && ['self_reported', 'rejected'].includes(status) && (
            <p className="bg-icon-bg text-icon rounded-xl px-3 py-2 text-xs leading-relaxed font-medium">
              {status === 'rejected'
                ? 'Add a clearer MoMo receipt (or correct the details) and it goes back to AgriCtec for review.'
                : 'Add the MoMo receipt and it goes to AgriCtec for review automatically.'}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {kind === 'farm' &&
              ['self_reported', 'evidence_submitted', 'rejected'].includes(status) && (
                <Button
                  mutates
                  loading={busy}
                  disabled={!item.evidence.length}
                  onClick={() => void action(() => transactionsService.requestReview(kind, id))}
                >
                  Request review
                </Button>
              )}
            {['rejected', 'verified'].includes(status) && (
              <Button mutates variant="ghost" disabled={busy} onClick={() => setDisputing(true)}>
                Dispute
              </Button>
            )}
          </div>
          <label className="block space-y-2 text-xs font-semibold">
            Note
            <Textarea
              value={note ?? ''}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              disabled={readOnly || busy}
            />
          </label>
          <Button
            mutates
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() =>
              void action(() =>
                api(`/me/${kind === 'farm' ? 'records' : 'momo'}/${id}`, {
                  method: 'PATCH',
                  body: { notes: note || null },
                }),
              )
            }
          >
            Save note
          </Button>
          <details>
            <summary className="min-h-9 cursor-pointer text-sm font-semibold">
              Status history ({item.history?.length ?? 0})
            </summary>
            <ol className="space-y-3">
              {item.history?.map((h) => (
                <li key={h.id} className="border-border border-l-2 pl-3 text-xs">
                  <p>
                    {TRANSACTION_STATUSES[h.toStatus]} / {h.actorName}
                  </p>
                  <p className="text-text-mute">{new Date(h.at).toLocaleString()}</p>
                  {h.reason && <p>{h.reason}</p>}
                </li>
              ))}
            </ol>
          </details>
        </>
      )}
      <Modal
        open={disputing}
        onClose={() => setDisputing(false)}
        title="Dispute this decision"
        footer={
          <Button
            mutates
            disabled={!reason.trim()}
            loading={busy}
            onClick={() => void action(() => transactionsService.dispute(kind, id, reason))}
          >
            Submit dispute
          </Button>
        }
      >
        <label className="block space-y-2 text-sm">
          Reason (required)
          <Textarea value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} />
        </label>
      </Modal>
    </div>
  );
}
