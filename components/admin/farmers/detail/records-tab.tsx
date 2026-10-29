'use client';

import { useState } from 'react';
import { ClipboardList, Download } from 'lucide-react';
import { toast } from 'sonner';
import type { TabProps } from '@/components/admin/farmers/detail/types';
import { Badge, type BadgeColor } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { useCan } from '@/hooks/admin/use-can';
import { downloadFile } from '@/lib/export/csv';
import { formatDate, formatGHS } from '@/lib/format';
import { farmersService } from '@/services/admin/farmers.service';
import type { FarmRecord } from '@/types';

const TYPE_COLOR: Record<FarmRecord['type'], BadgeColor> = {
  income: 'green',
  expense: 'red',
  activity: 'blue',
};

const columns: DataTableColumn<FarmRecord>[] = [
  { key: 'date', header: 'Date', sortable: true, render: (r) => formatDate(r.date) },
  {
    key: 'type',
    header: 'Type',
    sortable: true,
    render: (r) => <Badge color={TYPE_COLOR[r.type]}>{r.type}</Badge>,
  },
  {
    key: 'description',
    header: 'Description',
    sortable: true,
    render: (r) => (
      <span>
        <span className="text-text">{r.description}</span>
        {r.notes && <span className="text-text-mute block text-xs">{r.notes}</span>}
      </span>
    ),
  },
  { key: 'crop', header: 'Crop', sortable: true },
  {
    key: 'amount',
    header: 'Amount',
    sortable: true,
    align: 'right',
    render: (r) => (r.type === 'activity' ? '—' : formatGHS(r.amount)),
  },
];

/** The farmer's records, read-only (admins never edit a farmer's records), with CSV export. */
export function RecordsTab({ data }: TabProps) {
  const canExport = useCan('reports.export');
  const [exporting, setExporting] = useState(false);
  const { account, records } = data.detail;

  async function exportCsv() {
    setExporting(true);
    try {
      const csv = await farmersService.exportRecordsCSV(account.userId);
      downloadFile(
        csv,
        `agrictec-records-${account.userId}-${new Date().toISOString().slice(0, 10)}.csv`,
      );
      toast.success(`Exported ${records.length} records`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not export');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-text-dim text-sm">
          {records.length} record{records.length === 1 ? '' : 's'} · read-only
        </p>
        {canExport && (
          <Button
            size="sm"
            variant="ghost"
            icon={Download}
            loading={exporting}
            disabled={records.length === 0}
            onClick={() => void exportCsv()}
          >
            Export CSV
          </Button>
        )}
      </div>
      <DataTable
        columns={columns}
        rows={records}
        getRowId={(r) => r.id}
        caption="Farm records"
        defaultSort={{ key: 'date', direction: 'desc' }}
        empty={<EmptyState icon={ClipboardList} title="No records yet" />}
      />
    </div>
  );
}
