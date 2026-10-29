'use client';

import { ShieldAlert, Smartphone } from 'lucide-react';
import type { TabProps } from '@/components/admin/farmers/detail/types';
import { NetworkLogo } from '@/components/momo/network-logo';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { RISK_RULE_LABELS } from '@/lib/admin/risk-rules';
import { formatDate, formatGHS } from '@/lib/format';
import type { MomoTransaction } from '@/types';

/** The farmer's MoMo transactions, read-only. Rows that appear in a risk flag are highlighted. */
export function MomoTab({ data }: TabProps) {
  const { momo } = data.detail;
  // Transaction id → the rule that flagged it.
  const flagged = new Map<string, string>();
  for (const flag of data.riskFlags ?? []) {
    for (const id of flag.relatedIds) flagged.set(id, RISK_RULE_LABELS[flag.rule]);
  }

  const columns: DataTableColumn<MomoTransaction>[] = [
    { key: 'date', header: 'Date', sortable: true, render: (t) => formatDate(t.date) },
    {
      key: 'direction',
      header: 'Direction',
      sortable: true,
      render: (t) => (
        <Badge color={t.direction === 'in' ? 'green' : 'red'}>
          {t.direction === 'in' ? 'Received' : 'Sent'}
        </Badge>
      ),
    },
    { key: 'counterparty', header: 'Counterparty', sortable: true },
    {
      key: 'reference',
      header: 'Reference',
      sortable: true,
      render: (t) => (
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-xs">{t.reference}</span>
          {flagged.has(t.id) && (
            <Badge color="red">
              <ShieldAlert size={11} aria-hidden="true" />
              {flagged.get(t.id)}
            </Badge>
          )}
        </span>
      ),
    },
    {
      key: 'network',
      header: 'Network',
      sortable: true,
      render: (t) =>
        t.network ? (
          <span className="inline-flex items-center gap-2">
            <NetworkLogo network={t.network} size={20} />
            {t.network}
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      align: 'right',
      render: (t) => `${t.direction === 'in' ? '+' : '−'}${formatGHS(t.amount)}`,
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-text-dim text-sm">
        {momo.length} transaction{momo.length === 1 ? '' : 's'} · read-only
        {flagged.size > 0 && <span className="text-ink-red"> · {flagged.size} in risk flags</span>}
      </p>
      <DataTable
        columns={columns}
        rows={momo}
        getRowId={(t) => t.id}
        caption="MoMo transactions"
        defaultSort={{ key: 'date', direction: 'desc' }}
        rowClassName={(t) => (flagged.has(t.id) ? 'bg-danger/10 hover:bg-danger/15' : undefined)}
        empty={<EmptyState icon={Smartphone} title="No MoMo transactions yet" />}
      />
    </div>
  );
}
