'use client';
import { TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AdminTable, type AdminColumn } from '@/components/admin/shared/admin-table';
import { useAdminTable } from '@/hooks/admin/use-admin-table';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { EvidenceFile, TransactionStatus } from '@/components/transactions/transaction-tools';
import {
  categoryLabel,
  formatTransactionMoney,
  paymentLabel,
  SOURCE_LABELS,
} from '@/lib/transactions';
import { transactionsService } from '@/services/transactions.service';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import type { ReviewItem, ReviewPage, TransactionItem } from '@/types/transactions';

const columns: AdminColumn<ReviewItem>[] = [
  {
    key: 'farmer',
    header: 'Farmer',
    primary: true,
    cell: (r) => (
      <span>
        {r.farmerName}
        <span className="text-text-mute block text-xs">{r.region}</span>
      </span>
    ),
  },
  {
    key: 'entry',
    header: 'Entry',
    cell: (r) => (
      <span>
        {r.entry.description ?? r.entry.counterparty ?? 'Not provided'}
        <span className="text-text-mute block text-xs">
          {r.entry.date} / {r.entry.kind}
        </span>
      </span>
    ),
  },
  {
    key: 'amount',
    header: 'Amount',
    cell: (r) => formatTransactionMoney(r.entry.amount, r.entry.currency),
  },
  { key: 'status', header: 'Status', cell: (r) => <TransactionStatus entry={r.entry} /> },
  {
    key: 'evidence',
    header: 'Evidence',
    cell: (r) => (
      <span>
        {r.entry.evidence.length} files
        {r.warnings?.length ? (
          <span className="text-ink-gold mt-0.5 flex items-center gap-1 text-xs font-semibold">
            <TriangleAlert size={13} aria-hidden="true" /> Check: seen on another account
          </span>
        ) : null}
      </span>
    ),
  },
];

export function TransactionReview() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ReviewPage>();
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState<ReviewItem>();
  const [reason, setReason] = useState('');
  // What the reviewer confirmed on the receipt (all required before Verify).
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const sync = useAdminDataStore((s) => s.syncVersion);
  const table = useAdminTable(data?.items ?? [], {
    getRowId: (r) => `${r.entry.kind}:${r.entry.id}`,
    searchKeys: ['farmerName', 'region'],
    pageSize: 100,
  });
  useEffect(() => {
    const controller = new AbortController();
    transactionsService
      .queue(page, controller.signal)
      .then((result) => {
        setData(result);
        setError('');
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : 'Could not load queue.');
      });
    return () => controller.abort();
  }, [page, version, sync]);
  async function decide(action: 'verify' | 'reject') {
    if (!selected || !reason.trim()) return;
    setBusy(true);
    setError('');
    try {
      const confirmed = action === 'verify' ? checklist(selected.entry).map((c) => c.label) : [];
      // The confirmations go into the decision reason (the entry's history and the audit trail).
      const fullReason = confirmed.length
        ? `${reason.trim()}\nChecked on the receipt: ${confirmed.join('; ')}.`
        : reason;
      await transactionsService.decide(selected.entry.kind, selected.entry.id, action, fullReason);
      setSelected(undefined);
      setVersion((v) => v + 1);
      await useAdminDataStore.getState().refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the decision.');
    } finally {
      setBusy(false);
    }
  }
  const t = selected?.entry;
  const items = t ? checklist(t) : [];
  const allChecked = items.every((c) => checked[c.key]);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-display font-bold">Transactions review</h1>
        <p className="text-text-mute mt-1 text-sm">
          Review submitted evidence. Decisions verify the farmer&apos;s entry through AgriCtec;
          provider verification is unavailable.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-ink-red text-sm">
          {error}
        </p>
      )}
      <Card padding="none">
        <AdminTable
          table={table}
          columns={columns}
          getRowId={(r) => `${r.entry.kind}:${r.entry.id}`}
          caption="Transaction review queue"
          onRowClick={(r) => {
            setSelected(r);
            setReason('');
            setChecked({});
          }}
          loading={!data}
        />
      </Card>
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous queue page
        </Button>
        <span className="text-text-mute text-xs">
          {data?.total ?? 0} awaiting review / page {page} of {data?.pageCount ?? 1}
        </span>
        <Button
          variant="ghost"
          disabled={!data || page >= data.pageCount}
          onClick={() => setPage((p) => p + 1)}
        >
          Next queue page
        </Button>
      </div>
      <Modal
        open={Boolean(t)}
        onClose={() => {
          if (!busy) setSelected(undefined);
        }}
        title="Review transaction evidence"
        footer={
          <>
            <Button
              variant="ghost"
              loading={busy}
              disabled={!reason.trim()}
              onClick={() => void decide('reject')}
            >
              Reject
            </Button>
            <Button
              loading={busy}
              disabled={!reason.trim() || !t?.evidence.length || !allChecked}
              title={!allChecked ? 'Confirm each point on the receipt first' : undefined}
              onClick={() => void decide('verify')}
            >
              Verify
            </Button>
          </>
        }
      >
        {t && (
          <div className="space-y-4">
            <p className="text-sm font-semibold">
              {selected?.farmerName} / {selected?.region}
            </p>
            <p>{t.description ?? t.counterparty ?? 'Not provided'}</p>
            <p className="font-bold">
              {formatTransactionMoney(t.amount, t.currency)} / {t.date}
            </p>
            <TransactionStatus entry={t} />
            {selected?.warnings?.length ? (
              <div
                role="alert"
                className="border-gold/40 bg-gold/10 text-ink-gold space-y-1.5 rounded-xl border p-3 text-sm"
              >
                {selected.warnings.map((warning) => (
                  <p key={warning} className="flex gap-2">
                    <TriangleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                    {warning}
                  </p>
                ))}
              </div>
            ) : null}
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt>Source</dt>
                <dd>{SOURCE_LABELS[t.sourceType ?? 'farmer_entry']}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{categoryLabel(t.category)}</dd>
              </div>
              <div>
                <dt>Reference</dt>
                <dd className="break-all">
                  {t.reference ?? t.externalReference ?? 'Not provided'}
                </dd>
              </div>
              <div>
                <dt>Payment method</dt>
                <dd>{paymentLabel(t) ?? 'Not provided'}</dd>
              </div>
            </dl>
            {t.notes && <p className="text-sm">Note: {t.notes}</p>}
            {t.evidence.map((e) => (
              <EvidenceFile key={e.id} evidence={e} admin />
            ))}
            <details>
              <summary className="min-h-9 cursor-pointer text-sm">Status history</summary>
              <ul className="space-y-2 text-xs">
                {t.history?.map((h) => (
                  <li key={h.id}>
                    {h.toStatus} / {h.actorName} / {h.reason ?? 'Not provided'}
                  </li>
                ))}
              </ul>
            </details>
            {t.evidence.length > 0 && (
              <fieldset className="border-border space-y-2 rounded-xl border p-3">
                <legend className="px-1 text-sm font-semibold">
                  Before verifying, confirm on the receipt:
                </legend>
                {items.map((c) => (
                  <label key={c.key} className="flex min-h-9 items-start gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(checked[c.key])}
                      onChange={(e) => setChecked((s) => ({ ...s, [c.key]: e.target.checked }))}
                      className="accent-accent mt-0.5 size-4 shrink-0"
                    />
                    <span>{c.label}</span>
                  </label>
                ))}
              </fieldset>
            )}
            <label className="block space-y-2 text-sm">
              Decision reason (required)
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={1000}
              />
            </label>
            {error && (
              <p role="alert" className="text-ink-red text-sm">
                {error}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

/** What the receipt must show for the entry to be verified, from what the farmer entered. */
function checklist(t: TransactionItem): { key: string; label: string }[] {
  const items = [
    { key: 'amount', label: `the amount is ${formatTransactionMoney(t.amount, t.currency)}` },
    { key: 'date', label: `the date is ${t.date} (or within a day of it)` },
  ];
  if (t.kind === 'momo')
    items.push({
      key: 'party',
      label: `the money ${t.direction === 'out' ? 'went to' : 'came from'} ${t.counterparty ?? 'the person entered'}`,
    });
  else items.push({ key: 'party', label: `it is for: ${t.description ?? 'the entry described'}` });
  const reference = t.reference ?? t.externalReference;
  if (reference) items.push({ key: 'reference', label: `the transaction ID is ${reference}` });
  if (t.network) items.push({ key: 'network', label: `the network is ${t.network}` });
  if (t.bankName) items.push({ key: 'bank', label: `the bank is ${t.bankName}` });
  items.push({ key: 'owner', label: "the receipt belongs to this farmer's account or phone" });
  return items;
}
