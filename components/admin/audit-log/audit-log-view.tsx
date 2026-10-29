'use client';

import { useEffect, useState } from 'react';
import { FileJson, FileSpreadsheet, History, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { AuditDetailModal } from '@/components/admin/audit-log/audit-detail-modal';
import {
  AuditFilters,
  EMPTY_FILTER,
  type AuditFilterState,
} from '@/components/admin/audit-log/audit-filters';
import { AuditTable } from '@/components/admin/audit-log/audit-table';
import { PageHeader } from '@/components/admin/layout/page-header';
import { Pagination } from '@/components/admin/shared/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/use-debounce';
import { downloadFile } from '@/lib/export/csv';
import { auditService } from '@/services/admin/audit.service';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import type { AuditEntry, AuditFilter, Paged } from '@/types/admin';

const toFilter = (state: AuditFilterState): AuditFilter => ({
  ...(state.search.trim() && { search: state.search.trim() }),
  ...(state.actorId && { actorId: state.actorId }),
  ...(state.group && { group: state.group }),
  ...(state.targetType && { targetType: state.targetType }),
  ...(state.from && { from: state.from }),
  ...(state.to && { to: state.to }),
});

const exportButton =
  'border-border text-text hover:bg-glass-strong inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3.5 text-sm font-semibold transition-colors disabled:opacity-50';

/**
 * The audit log (phase A14): every admin action, newest first, with filters, details (before →
 * after) and exports of the filtered range (each export is itself logged). Permanent: nothing
 * here, or in the service, can edit or delete an entry.
 */
export function AuditLogView() {
  const [state, setState] = useState<AuditFilterState>(EMPTY_FILTER);
  const search = useDebounce(state.search, 300);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<AuditEntry> | null>(null);
  const [actors, setActors] = useState<
    { id: string; name: string; role: AuditEntry['actorRole'] }[]
  >([]);
  const [open, setOpen] = useState<AuditEntry | null>(null);
  const [exporting, setExporting] = useState<'json' | 'csv' | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [version, setVersion] = useState(0);
  const syncVersion = useAdminDataStore((s) => s.syncVersion);
  const filter = toFilter({ ...state, search });
  const filterKey = JSON.stringify(filter);

  useEffect(() => {
    let active = true;
    Promise.all([
      auditService.list(JSON.parse(filterKey) as AuditFilter, page),
      auditService.actors(),
    ]).then(
      ([result, people]) => {
        if (!active) return;
        setData(result);
        setActors(people);
        setNow(new Date());
      },
      (cause: unknown) =>
        active && toast.error(cause instanceof Error ? cause.message : 'Could not load the log'),
    );
    return () => {
      active = false;
    };
  }, [filterKey, page, version, syncVersion]);

  function changeFilter(next: AuditFilterState) {
    setState(next);
    setPage(1);
  }

  async function exportLog(format: 'json' | 'csv') {
    setExporting(format);
    try {
      const { filename, content } = await auditService.exportFiltered(filter, format);
      downloadFile(content, filename, format === 'json' ? 'application/json' : undefined);
      toast.success(`${filename} downloaded`, {
        description: 'The export is recorded in the log.',
      });
      setVersion((v) => v + 1);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not export');
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit log"
        description="Every action in the console: who did what, to what, and when."
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              disabled={exporting !== null || !data?.total}
              onClick={() => void exportLog('csv')}
              className={exportButton}
            >
              <FileSpreadsheet size={16} aria-hidden="true" />
              {exporting === 'csv' ? 'Exporting…' : 'CSV'}
            </button>
            <button
              type="button"
              disabled={exporting !== null || !data?.total}
              onClick={() => void exportLog('json')}
              className={exportButton}
            >
              <FileJson size={16} aria-hidden="true" />
              {exporting === 'json' ? 'Exporting…' : 'JSON'}
            </button>
          </div>
        }
      />

      <p
        role="note"
        className="border-purple/30 bg-purple/8 text-text flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm"
      >
        <span className="bg-purple/15 text-ink-purple inline-flex size-8 shrink-0 items-center justify-center rounded-lg">
          <Lock size={15} aria-hidden="true" />
        </span>
        <span>
          <span className="font-semibold">The audit log is permanent and cannot be changed.</span>{' '}
          <span className="text-text-dim">
            Exports cover the filtered range and are logged too.
          </span>
        </span>
      </p>

      <AuditFilters value={state} onChange={changeFilter} actors={actors} />

      <p className="text-text-dim text-xs font-semibold" aria-live="polite">
        {data
          ? `${data.total.toLocaleString()} entr${data.total === 1 ? 'y' : 'ies'} · newest first`
          : 'Loading…'}
      </p>

      {!data ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : data.total === 0 ? (
        <div className="border-border bg-glass rounded-2xl border">
          <EmptyState
            icon={History}
            title="No entries"
            description="Nothing matches these filters."
          />
        </div>
      ) : (
        <>
          <AuditTable entries={data.items} now={now} onOpen={setOpen} />
          <Pagination
            page={data.page}
            pageCount={data.pageCount}
            total={data.total}
            pageSize={data.pageSize}
            onPage={(next) => {
              setPage(next);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </>
      )}

      <AuditDetailModal entry={open} onClose={() => setOpen(null)} />
    </div>
  );
}
