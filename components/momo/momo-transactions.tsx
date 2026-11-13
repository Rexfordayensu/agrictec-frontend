'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DEFAULT_MOMO_FILTERS,
  filterMomo,
  MOMO_PERIOD_LABELS,
  type DirectionFilter,
  type MomoPeriod,
  type NetworkFilter,
} from '@/components/momo/momo-filters';
import { MOMO_NETWORKS } from '@/components/momo/momo-schema';
import { NetworkLogo } from '@/components/momo/network-logo';
import { dashPanel } from '@/components/dashboard/dashboard-ui';
import { TransactionReviewModal } from '@/components/transactions/transaction-tools';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useDebounce } from '@/hooks/use-debounce';
import { downloadFile, toCSV } from '@/lib/export/csv';
import { financialReportError } from '@/lib/financial-report-state';
import { formatDate, parseISODate, todayISO } from '@/lib/format';
import { saveBlob } from '@/lib/loans/application-status';
import { readOnlyProps, READ_ONLY_CLASS, useReadOnly } from '@/lib/read-only';
import {
  categoryLabel,
  SOURCE_LABELS,
  STATUS_COLORS,
  TRANSACTION_STATUSES,
  type VerificationStatus,
} from '@/lib/transactions';
import { cn } from '@/lib/utils';
import { momoService } from '@/services/momo.service';
import { useFarmStore } from '@/store/farm-store';
import { useModalStore } from '@/store/modal-store';
import type { MomoTransaction } from '@/types';

type Tab = DirectionFilter | 'verified';
type StatusFilter = 'all' | VerificationStatus;

const PAGE_SIZE = 10;
const money = (n: number) =>
  n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const control =
  'border-border bg-glass text-text h-10 min-w-0 rounded-xl border px-3 text-sm focus:border-accent focus:outline-none';
/** Name, reference, network, or the amount as typed ("100", "100.00", "1,070.50"). */
function matches(t: MomoTransaction, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const amount = q.replace(/,/g, '').replace(/^ghs\s*/, '');
  if (/^\d+(\.\d{1,2})?$/.test(amount) && Number(amount) === t.amount) return true;
  return [t.counterparty, t.reference ?? '', t.network ?? ''].some((f) =>
    f.toLowerCase().includes(q),
  );
}

const describe = (t: MomoTransaction) =>
  `${t.category ? categoryLabel(t.category) : 'Mobile Money'} / ${SOURCE_LABELS[t.sourceType ?? 'farmer_entry']}`;

/**
 * Every MoMo entry the farmer saved (GET /me/momo), with tabs, filters, sorting and pages.
 * Filtering only chooses which saved entries to show; every total on the page is the server's.
 */
export function MomoTransactions() {
  const momo = useFarmStore((s) => s.momo);
  const farmStatus = useFarmStore((s) => s.status);
  const userId = useFarmStore((s) => s.userId);
  const loadFarm = useFarmStore((s) => s.load);
  const openModal = useModalStore((s) => s.openModal);
  const [tab, setTab] = useState<Tab>('all');
  const [period, setPeriod] = useState<MomoPeriod>('all');
  const [network, setNetwork] = useState<NetworkFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const query = useDebounce(search, 200);
  const [newestFirst, setNewestFirst] = useState(true);
  const [page, setPage] = useState(1);
  const [statementBusy, setStatementBusy] = useState(false);

  // Network, period, search and status apply to every tab; each tab then narrows further.
  const base = useMemo(
    () =>
      filterMomo(momo, { ...DEFAULT_MOMO_FILTERS, network, period, query: '' })
        .filter((t) => matches(t, query))
        .filter((t) => status === 'all' || (t.verificationStatus ?? 'self_reported') === status),
    [momo, network, period, query, status],
  );
  const counts = {
    all: base.length,
    in: base.filter((t) => t.direction === 'in').length,
    out: base.filter((t) => t.direction === 'out').length,
    verified: base.filter((t) => t.verificationStatus === 'verified').length,
  };
  const rows = base
    .filter((t) =>
      tab === 'all'
        ? true
        : tab === 'verified'
          ? t.verificationStatus === 'verified'
          : t.direction === tab,
    )
    .sort((a, b) => {
      const order = a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
      return newestFirst ? -order : order;
    });
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const shown = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const filtered =
    tab !== 'all' ||
    period !== 'all' ||
    network !== 'all' ||
    status !== 'all' ||
    search.trim() !== '';

  // Any change of what is shown starts again on page 1.
  const reset =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(1);
    };

  function clearFilters() {
    setTab('all');
    setPeriod('all');
    setNetwork('all');
    setStatus('all');
    setSearch('');
    setPage(1);
  }

  function exportCsv() {
    if (rows.length === 0) {
      toast.info('There are no transactions to export with these filters.');
      return;
    }
    const csv = toCSV(rows, [
      { header: 'Date', value: (t) => t.date },
      { header: 'Type', value: (t) => (t.direction === 'in' ? 'Received' : 'Sent') },
      { header: 'Counterparty', value: (t) => t.counterparty },
      { header: 'Category', value: (t) => (t.category ? categoryLabel(t.category) : '') },
      { header: 'Network', value: (t) => t.network ?? '' },
      { header: 'Reference', value: (t) => t.reference ?? 'Not provided' },
      { header: 'Amount (GHS)', value: (t) => (t.direction === 'in' ? t.amount : -t.amount) },
      {
        header: 'Verification',
        value: (t) => TRANSACTION_STATUSES[t.verificationStatus ?? 'self_reported'],
      },
    ]);
    downloadFile(csv, `AgriCtec_MoMo_${todayISO()}.csv`);
    toast.success(`Exported ${rows.length} transaction${rows.length === 1 ? '' : 's'}`);
  }

  async function statement() {
    if (statementBusy || rows.length === 0) return;
    setStatementBusy(true);
    try {
      const blob = await momoService.statement({
        period,
        network: network === 'all' ? undefined : network,
        direction: tab === 'in' || tab === 'out' ? tab : undefined,
        status: tab === 'verified' ? 'verified' : status === 'all' ? undefined : status,
        query,
        newest_first: newestFirst,
      });
      saveBlob(blob, `AgriCtec_MoMo_Statement_${todayISO()}.pdf`);
    } catch (cause) {
      toast.error(financialReportError(cause, 'pdf'));
    } finally {
      setStatementBusy(false);
    }
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: 'all', label: 'All Transactions' },
    { value: 'in', label: 'Money In' },
    { value: 'out', label: 'Money Out' },
    { value: 'verified', label: 'Verification' },
  ];

  if (farmStatus === 'error')
    return (
      <section role="alert" className={dashPanel}>
        <h2 className="text-text font-semibold">Your transactions could not be refreshed</h2>
        <p className="text-text-mute mt-2 text-sm">
          We have hidden the earlier list so it is not mistaken for current data.
        </p>
        <Button
          className="mt-3"
          variant="ghost"
          onClick={() => {
            if (userId) void loadFarm(userId).catch(() => {});
          }}
        >
          Try again
        </Button>
      </section>
    );

  return (
    <div className="momo-transaction-section space-y-4">
      <div
        role="tablist"
        aria-label="Show transactions"
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      >
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => reset(setTab)(t.value)}
            className={cn(
              'min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors',
              tab === t.value
                ? 'border-transparent bg-[#08784f] text-white'
                : 'border-border bg-glass text-text-dim hover:text-text',
            )}
          >
            {t.label} ({counts[t.value]})
          </button>
        ))}
      </div>

      <section
        aria-labelledby="momo-table-title"
        className={cn(dashPanel, '@container p-0 sm:p-0')}
      >
        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 @3xl:flex-row @3xl:items-start @3xl:justify-between">
            <div>
              <h2 id="momo-table-title" className="text-text text-lg font-bold">
                Transactions
              </h2>
              <p className="text-text-mute text-xs">Every Mobile Money payment in and out.</p>
            </div>
            <div className="grid grid-cols-1 gap-2 @md:grid-cols-2 @2xl:flex @2xl:flex-wrap">
              <Button variant="ghost" icon={Download} onClick={exportCsv}>
                Export CSV
              </Button>
              <Button
                variant="ghost"
                icon={FileText}
                loading={statementBusy}
                disabled={rows.length === 0}
                onClick={() => void statement()}
              >
                Download Statement (PDF)
              </Button>
              <Button
                mutates
                icon={Plus}
                onClick={() => openModal('momo')}
                className="@md:col-span-2 @2xl:col-span-1"
              >
                New Transaction
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 @3xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.6fr)]">
            <label className="relative">
              <span className="sr-only">Period</span>
              <CalendarDays
                size={15}
                aria-hidden="true"
                className="text-text-mute pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
              />
              <select
                value={period}
                onChange={(e) => reset(setPeriod)(e.target.value as MomoPeriod)}
                className={cn(control, 'w-full pl-9')}
              >
                {(Object.keys(MOMO_PERIOD_LABELS) as MomoPeriod[]).map((p) => (
                  <option key={p} value={p}>
                    {MOMO_PERIOD_LABELS[p]}
                  </option>
                ))}
              </select>
            </label>
            <select
              aria-label="Network"
              value={network}
              onChange={(e) => reset(setNetwork)(e.target.value as NetworkFilter)}
              className={control}
            >
              <option value="all">All Networks</option>
              {MOMO_NETWORKS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <select
              aria-label="Type"
              value={tab === 'verified' ? 'all' : tab}
              onChange={(e) => reset(setTab)(e.target.value as DirectionFilter)}
              className={control}
            >
              <option value="all">All Types</option>
              <option value="in">Money In</option>
              <option value="out">Money Out</option>
            </select>
            <select
              aria-label="Verification status"
              value={status}
              onChange={(e) => reset(setStatus)(e.target.value as StatusFilter)}
              className={control}
            >
              <option value="all">Verification Status</option>
              {(Object.keys(TRANSACTION_STATUSES) as VerificationStatus[]).map((s) => (
                <option key={s} value={s}>
                  {TRANSACTION_STATUSES[s]}
                </option>
              ))}
            </select>
            <label className="relative col-span-2 @3xl:col-span-1">
              <span className="sr-only">Search MoMo transactions</span>
              <Search
                size={15}
                aria-hidden="true"
                className="text-text-mute pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => reset(setSearch)(e.target.value)}
                placeholder="Search by name, reference or amount..."
                maxLength={120}
                className={cn(control, 'w-full pl-9 [&::-webkit-search-cancel-button]:hidden')}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => reset(setSearch)('')}
                  aria-label="Clear search"
                  className="text-text-mute hover:text-text absolute top-1/2 right-1 inline-flex size-8 -translate-y-1/2 items-center justify-center"
                >
                  <X size={15} aria-hidden="true" />
                </button>
              )}
            </label>
          </div>
        </div>

        {momo.length === 0 ? (
          <Empty
            icon={Smartphone}
            text="No MoMo transactions yet. Log the payments you send and receive for the farm."
            action={
              <Button mutates icon={Plus} onClick={() => openModal('momo')}>
                Add your first transaction
              </Button>
            }
          />
        ) : rows.length === 0 ? (
          <Empty
            icon={Search}
            text="No transactions match these filters."
            action={
              <Button variant="ghost" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto @3xl:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-glass-strong text-text-dim text-left text-xs">
                    <th className="px-5 py-3 font-semibold">
                      <button
                        type="button"
                        onClick={() => setNewestFirst((v) => !v)}
                        className="hover:text-text inline-flex items-center gap-1"
                        aria-label={`Date, ${newestFirst ? 'newest' : 'oldest'} first. Change order`}
                      >
                        Date
                        {newestFirst ? (
                          <ArrowDown size={13} aria-hidden="true" />
                        ) : (
                          <ArrowUp size={13} aria-hidden="true" />
                        )}
                      </button>
                    </th>
                    <th className="px-2 py-3 font-semibold">Description</th>
                    <th className="px-2 py-3 font-semibold">Network</th>
                    <th className="px-2 py-3 font-semibold">Type</th>
                    <th className="px-2 py-3 text-right font-semibold whitespace-nowrap">
                      Amount (GHS)
                    </th>
                    <th className="px-4 py-3 font-semibold">Verification</th>
                    <th className="px-2 py-3 font-semibold">Reference</th>
                    <th className="w-12 px-3 py-3 text-right">
                      <MoreHorizontal size={18} aria-hidden="true" className="ml-auto" />
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {shown.map((t) => (
                    <tr key={t.id} className="hover:bg-glass">
                      <td className="text-text-dim px-5 py-3.5 whitespace-nowrap">
                        {formatDate(parseISODate(t.date))}
                      </td>
                      <td className="max-w-60 px-2 py-3.5">
                        <span className="text-text block truncate font-semibold">
                          {t.counterparty}
                        </span>
                        <span className="text-text-mute block truncate text-xs">{describe(t)}</span>
                      </td>
                      <td className="px-2 py-3.5 whitespace-nowrap">
                        {t.network ? (
                          <span className="text-text inline-flex items-center gap-2">
                            <NetworkLogo network={t.network} size={20} />
                            {t.network}
                          </span>
                        ) : (
                          <span className="text-text-mute">—</span>
                        )}
                      </td>
                      <td className="px-2 py-3.5">
                        <Badge color={t.direction === 'in' ? 'green' : 'red'}>
                          {t.direction === 'in' ? 'Received' : 'Sent'}
                        </Badge>
                      </td>
                      <td className="text-text px-2 py-3.5 text-right font-semibold tabular-nums">
                        {money(t.amount)}
                      </td>
                      <td className="px-4 py-3.5">
                        <Status t={t} />
                      </td>
                      <td className="text-text-dim max-w-32 truncate px-2 py-3.5 text-xs">
                        {t.reference || '-'}
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <RowMenu t={t} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-border divide-y @3xl:hidden">
              {shown.map((t) => (
                <li key={t.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-text truncate text-sm font-semibold">{t.counterparty}</p>
                    <p className="text-text-mute truncate text-xs">
                      {formatDate(parseISODate(t.date))}
                      {t.network ? ` · ${t.network}` : ''} ·{' '}
                      {t.direction === 'in' ? 'Received' : 'Sent'}
                    </p>
                    <p className="text-text-mute truncate text-xs">{describe(t)}</p>
                    <span className="mt-1.5 inline-block">
                      <Status t={t} />
                    </span>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 pt-0.5 text-sm font-bold tabular-nums',
                      t.direction === 'in' ? 'text-ink-green' : 'text-ink-red',
                    )}
                  >
                    {t.direction === 'in' ? '+' : '−'}
                    {money(t.amount)}
                  </span>
                  <RowMenu t={t} />
                </li>
              ))}
            </ul>

            <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 sm:px-5">
              <p className="text-text-dim text-sm" aria-live="polite">
                Showing{' '}
                <strong className="text-text font-semibold">
                  {shown.length === 1
                    ? (current - 1) * PAGE_SIZE + 1
                    : `${(current - 1) * PAGE_SIZE + 1}–${(current - 1) * PAGE_SIZE + shown.length}`}
                </strong>{' '}
                of {rows.length} transaction{rows.length === 1 ? '' : 's'}
                {filtered && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-ink-green ml-3 font-semibold hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </p>
              <nav aria-label="Pages" className="flex items-center gap-1.5">
                <PageButton
                  label="Previous page"
                  disabled={current === 1}
                  onClick={() => setPage(current - 1)}
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                </PageButton>
                <span className="inline-flex size-9 items-center justify-center rounded-lg bg-[#08784f] text-sm font-bold text-white">
                  {current}
                </span>
                {pages > 1 && <span className="text-text-mute text-xs">of {pages}</span>}
                <PageButton
                  label="Next page"
                  disabled={current === pages}
                  onClick={() => setPage(current + 1)}
                >
                  <ChevronRight size={16} aria-hidden="true" />
                </PageButton>
              </nav>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Status({ t }: { t: MomoTransaction }) {
  const s = t.verificationStatus ?? 'self_reported';
  return (
    <Badge color={STATUS_COLORS[s]}>
      {s === 'verified' ? 'Verified' : TRANSACTION_STATUSES[s]}
    </Badge>
  );
}

function PageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="border-border text-text-dim hover:text-text inline-flex size-9 items-center justify-center rounded-lg border disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Empty({
  icon: Icon,
  text,
  action,
}: {
  icon: typeof Search;
  text: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 pt-4 pb-10 text-center">
      <span className="bg-glass-strong text-text-mute inline-flex size-12 items-center justify-center rounded-2xl">
        <Icon size={22} aria-hidden="true" />
      </span>
      <p className="text-text-dim max-w-sm text-sm">{text}</p>
      {action}
    </div>
  );
}

/** Edit, evidence & review, delete. Verified entries are locked (as before): review only. */
function RowMenu({ t }: { t: MomoTransaction }) {
  const openModal = useModalStore((s) => s.openModal);
  const deleteMomo = useFarmStore((s) => s.deleteMomo);
  const readOnly = useReadOnly();
  const locked = readOnly || t.verificationStatus === 'verified';
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  async function remove() {
    setBusy(true);
    try {
      await deleteMomo(t.id);
      toast.success('Transaction deleted');
      setConfirm(false);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not delete the transaction');
    } finally {
      setBusy(false);
    }
  }

  const item =
    'text-text hover:bg-glass-strong flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm';
  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-label={`Actions for ${t.counterparty}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="text-text-dim hover:bg-glass-strong hover:text-text inline-flex size-9 items-center justify-center rounded-lg"
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          className="border-border bg-bg-2 absolute right-0 z-20 mt-1 w-52 rounded-xl border p-1 shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            {...readOnlyProps(locked)}
            onClick={
              locked
                ? undefined
                : () => {
                    setOpen(false);
                    openModal('momo', t.id);
                  }
            }
            className={cn(item, locked && READ_ONLY_CLASS)}
          >
            <Pencil size={15} aria-hidden="true" /> Edit
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setReview(true);
            }}
            className={item}
          >
            <ShieldCheck size={15} aria-hidden="true" /> Evidence & review
            {t.evidenceCount ? ` (${t.evidenceCount})` : ''}
          </button>
          <button
            type="button"
            role="menuitem"
            {...readOnlyProps(locked)}
            onClick={
              locked
                ? undefined
                : () => {
                    setOpen(false);
                    setConfirm(true);
                  }
            }
            className={cn(item, 'text-ink-red', locked && READ_ONLY_CLASS)}
          >
            <Trash2 size={15} aria-hidden="true" /> Delete
          </button>
          {t.verificationStatus === 'verified' && (
            <p className="text-text-mute px-3 pt-1 pb-2 text-xs">Verified entries are locked.</p>
          )}
        </div>
      )}
      <TransactionReviewModal
        kind="momo"
        id={t.id}
        open={review}
        onClose={() => setReview(false)}
      />
      <ConfirmDialog
        open={confirm}
        title="Delete this transaction?"
        message={`${t.direction === 'in' ? 'Received from' : 'Sent to'} ${t.counterparty}, GHS ${money(t.amount)} on ${formatDate(parseISODate(t.date))}. This can’t be undone.`}
        confirmLabel="Delete"
        danger
        loading={busy}
        onCancel={() => setConfirm(false)}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
