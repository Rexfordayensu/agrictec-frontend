'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { TransactionTools } from '@/components/transactions/transaction-tools';
import {
  ALL_CATEGORIES,
  categoryLabel,
  formatTransactionMoney,
  SOURCE_LABELS,
  TRANSACTION_STATUSES,
} from '@/lib/transactions';
import { transactionsService } from '@/services/transactions.service';
import { useFarmStore } from '@/store/farm-store';
import type { TransactionPage, TransactionSummary } from '@/types/transactions';

export function TransactionsView() {
  const [filters, setFilters] = useState({
    kind: '',
    type: '',
    category: '',
    verification_status: '',
    source_type: '',
    date_from: '',
    date_to: '',
  });
  const [months, setMonths] = useState(3);
  const [allHistory, setAllHistory] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TransactionPage>();
  const [summary, setSummary] = useState<TransactionSummary>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const records = useFarmStore((s) => s.records);
  const momo = useFarmStore((s) => s.momo);
  useEffect(() => {
    const controller = new AbortController();
    const start = new Date();
    start.setDate(1);
    start.setMonth(start.getMonth() - (months - 1));
    const from = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;
    Promise.all([
      transactionsService.list(
        { ...filters, date_from: filters.date_from || (allHistory ? undefined : from), page },
        controller.signal,
      ),
      transactionsService.summary(months, controller.signal),
    ])
      .then(([rows, totals]) => {
        setData(rows);
        setSummary(totals);
        setError('');
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : 'Could not load transactions.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters, months, allHistory, page, records, momo]);
  function change(key: keyof typeof filters, value: string) {
    setLoading(true);
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }
  return (
    <div className="space-y-4">
      <p className="text-text-dim text-sm">
        Your farm, financing and MoMo history, with the source and evidence behind each entry.
      </p>
      <label className="block max-w-xs text-xs font-semibold">
        Reporting period
        <Select
          value={months}
          onChange={(e) => {
            setLoading(true);
            setMonths(Number(e.target.value));
            setPage(1);
          }}
        >
          {[3, 6, 12].map((n) => (
            <option key={n} value={n}>
              Last {n} months
            </option>
          ))}
        </Select>
      </label>
      {summary && (
        <Card>
          <p className="text-text-mute mb-3 text-xs">
            All entries in {summary.period.from} / {summary.period.to}. Filters below apply to the
            list.
          </p>
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              ['Farm income', summary.income],
              ['Farm expenses', summary.expenses],
              ['Farm net', summary.net],
              ['MoMo in', summary.momoIn],
              ['MoMo out', summary.momoOut],
              ['Financing in', summary.financingIn],
              ['Financing out', summary.financingOut],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-text-mute text-xs">{label}</dt>
                <dd className="text-sm font-bold tabular-nums">
                  {formatTransactionMoney(value, summary.currency)}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-text-dim mt-4 text-xs">
            Verified: {summary.verifiedShareByCount}% by count / {summary.verifiedShareByAmount}% by
            amount. Financing and MoMo are reported separately from farm profit.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
            {Object.entries(summary.countsByStatus).map(([key, count]) => (
              <span key={key}>
                {TRANSACTION_STATUSES[key as keyof typeof TRANSACTION_STATUSES]}: {count}
              </span>
            ))}
          </div>
        </Card>
      )}
      <Card className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <label className="text-xs">
            History period
            <Select
              value={allHistory ? 'all' : 'reporting'}
              onChange={(event) => {
                setAllHistory(event.target.value === 'all');
                setPage(1);
                setLoading(true);
              }}
            >
              <option value="reporting">Selected reporting period</option>
              <option value="all">Entire history</option>
            </Select>
          </label>
          <label className="text-xs">
            Kind
            <Select value={filters.kind} onChange={(e) => change('kind', e.target.value)}>
              <option value="">All kinds</option>
              <option value="farm">Farm & financing</option>
              <option value="momo">MoMo</option>
            </Select>
          </label>
          <label className="text-xs">
            Type
            <Select value={filters.type} onChange={(e) => change('type', e.target.value)}>
              <option value="">All types</option>
              {['income', 'expense', 'activity', 'financing', 'in', 'out'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </label>
          <label className="text-xs">
            Category
            <Select value={filters.category} onChange={(e) => change('category', e.target.value)}>
              <option value="">All categories</option>
              <option value="uncategorised">Uncategorised</option>
              {ALL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-xs">
            Status
            <Select
              value={filters.verification_status}
              onChange={(e) => change('verification_status', e.target.value)}
            >
              <option value="">All statuses</option>
              {Object.entries(TRANSACTION_STATUSES).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-xs">
            Source
            <Select
              value={filters.source_type}
              onChange={(e) => change('source_type', e.target.value)}
            >
              <option value="">All sources</option>
              {Object.entries(SOURCE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-xs">
            From
            <Input
              type="date"
              value={filters.date_from}
              onChange={(e) => change('date_from', e.target.value)}
            />
          </label>
          <label className="text-xs">
            To
            <Input
              type="date"
              value={filters.date_to}
              onChange={(e) => change('date_to', e.target.value)}
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="text-ink-red text-sm">
            {error}
          </p>
        )}
        {loading && (
          <p role="status" className="text-sm">
            Loading transactions...
          </p>
        )}
        {!loading && data?.items.length === 0 && (
          <p className="text-text-mute py-6 text-center text-sm">
            No transactions in this period with these filters.
          </p>
        )}
        <ul className="divide-border divide-y">
          {data?.items.map((t) => (
            <li key={`${t.kind}:${t.id}`} className="py-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    {t.description ?? t.counterparty ?? 'Not provided'}
                  </p>
                  <p className="text-text-mute text-xs">
                    {t.date} / {t.kind === 'momo' ? 'MoMo' : t.type}{' '}
                    {t.direction ? `/ ${t.direction}` : ''}
                  </p>
                </div>
                <p className="text-sm font-bold tabular-nums">
                  {formatTransactionMoney(t.amount, t.currency)}
                </p>
              </div>
              {t.referenceDuplicate && (
                <p className="text-ink-red text-xs">
                  Existing duplicate reference: review the original entries.
                </p>
              )}
              <TransactionTools kind={t.kind} id={t.id} entry={t} />
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="ghost"
            disabled={page <= 1 || loading}
            onClick={() => {
              setLoading(true);
              setPage((p) => p - 1);
            }}
          >
            Previous
          </Button>
          <span className="text-text-mute text-xs">
            Page {data?.page ?? page} of {data?.pageCount ?? 1} / {data?.total ?? 0} entries
          </span>
          <Button
            variant="ghost"
            disabled={!data || page >= data.pageCount || loading}
            onClick={() => {
              setLoading(true);
              setPage((p) => p + 1);
            }}
          >
            Next
          </Button>
        </div>
      </Card>
    </div>
  );
}
