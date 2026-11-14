'use client';

import { adminPath } from '@/lib/admin-path';

import { useCallback, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Ban,
  ChevronDown,
  Download,
  Eye,
  KeyRound,
  PanelRight,
  RotateCcw,
  ShieldCheck,
  StickyNote,
  Tags,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { AddNoteDialog, ReactivateDialog } from '@/components/admin/farmers/farmer-action-dialogs';
import { ResetPasswordDialog } from '@/components/admin/farmers/detail/reset-password-dialog';
import { FarmerPanel } from '@/components/admin/farmers/directory/farmer-panel';
import { FarmerSummaryCards } from '@/components/admin/farmers/directory/farmer-summary-cards';
import { FarmerTable } from '@/components/admin/farmers/directory/farmer-table';
import { FarmerToolbar, StatusTabs } from '@/components/admin/farmers/directory/farmer-toolbar';
import { csvFileName, FarmersBulkActions } from '@/components/admin/farmers/farmers-bulk-actions';
import { SuspendDialog } from '@/components/admin/farmers/suspend-dialog';
import { TagEditor } from '@/components/admin/farmers/tag-editor';
import { useViewAsFarmer } from '@/components/admin/farmers/use-view-as-farmer';
import { RowMenu, type RowMenuItem } from '@/components/admin/shared/row-menu';
import { useServerTable } from '@/hooks/admin/use-server-table';
import { useAdminRole } from '@/hooks/admin/use-can';
import { usePlatformStatus } from '@/hooks/admin/use-platform-status';
import { farmerAbilities, FARMER_FILTERS } from '@/lib/admin/farmer-list';
import { downloadFile } from '@/lib/export/csv';
import { replaceQuery } from '@/lib/url-state';
import { cn } from '@/lib/utils';
import { farmersService, type FarmerPage } from '@/services/admin/farmers.service';
import { riskService } from '@/services/admin/risk.service';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import type { FarmerAccount } from '@/types/admin';

type Dialog =
  | { type: 'suspend'; farmers: FarmerAccount[] }
  | { type: 'reactivate'; farmer: FarmerAccount }
  | { type: 'reset'; farmer: FarmerAccount }
  | { type: 'note'; farmer: FarmerAccount }
  | { type: 'tag'; farmers: FarmerAccount[] }
  | null;

/**
 * All Farmers: the totals, the directory (search, filters, sort and pages done by the API) and
 * the selected farmer's panel. Everything comes from the database and reloads by itself when the
 * console hears a change (Server-Sent Events): a sign-up, a suspension, a verification, a record.
 * The open farmer is in the URL (?farmer=), so a refresh or a shared link reopens it.
 */
export function FarmersTable() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const role = useAdminRole();
  const abilities = farmerAbilities(role);
  const refresh = useAdminDataStore((s) => s.refresh);
  const syncVersion = useAdminDataStore((s) => s.syncVersion);
  // Reloads the list and the panel after a change made here.
  const [edits, setEdits] = useState(0);
  const viewAsFarmer = useViewAsFarmer();
  const bands = usePlatformStatus()?.creditConfig.bands;
  const [dialog, setDialog] = useState<Dialog>(null);
  const [scanning, setScanning] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { table, data, loading, error, request } = useServerTable<FarmerAccount, FarmerPage>({
    getRowId: (f) => f.userId,
    filterNames: FARMER_FILTERS,
    fetchPage: (query, signal) => farmersService.page(query, signal),
    initialSort: { key: 'joined', dir: 'desc' },
    pageSize: 20,
    reloadKey: `${syncVersion}:${edits}`,
  });

  const openId = params.get('farmer');
  const setOpenId = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(window.location.search);
      if (id) next.set('farmer', id);
      else next.delete('farmer');
      replaceQuery(pathname, next);
    },
    [pathname],
  );
  const closePanel = useCallback(() => setOpenId(null), [setOpenId]);

  async function afterChange() {
    setDialog(null);
    table.clearSelection();
    setEdits((n) => n + 1);
    await refresh();
  }

  async function runScan() {
    setScanning(true);
    try {
      const found = await riskService.runScan();
      toast.success(
        found.length
          ? `${found.length} new risk flag${found.length === 1 ? '' : 's'} found`
          : 'No new risks found',
      );
      setEdits((n) => n + 1);
      await refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not run the scan');
    } finally {
      setScanning(false);
    }
  }

  async function exportFarmers(ids: string[] | 'filtered') {
    setExporting(true);
    try {
      let list = ids;
      if (list === 'filtered') {
        // Every farmer matching the search and filters, not just this page.
        const { page: _page, pageSize: _size, ...filters } = request;
        void [_page, _size];
        list = (await farmersService.page({ ...filters, ids: '1', pageSize: '1' })).ids ?? [];
      }
      downloadFile(
        await farmersService.exportCSV(list),
        csvFileName(ids === 'filtered' ? 'filtered' : 'selected'),
      );
      toast.success(`Exported ${list.length} farmer${list.length === 1 ? '' : 's'}`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not export');
    } finally {
      setExporting(false);
    }
  }

  function menuItems(farmer: FarmerAccount, inPanel = false): RowMenuItem[] {
    return [
      ...(inPanel
        ? []
        : [
            { label: 'Open details', icon: PanelRight, onSelect: () => setOpenId(farmer.userId) },
            {
              label: 'View full profile',
              icon: UserRound,
              onSelect: () => router.push(adminPath(`/admin/farmers/${farmer.userId}`)),
            },
          ]),
      ...(abilities.suspend
        ? [
            farmer.status === 'suspended'
              ? {
                  label: 'Reactivate',
                  icon: RotateCcw,
                  onSelect: () => setDialog({ type: 'reactivate', farmer }),
                }
              : {
                  label: 'Suspend',
                  icon: Ban,
                  danger: true,
                  onSelect: () => setDialog({ type: 'suspend', farmers: [farmer] }),
                },
          ]
        : []),
      ...(abilities.resetPassword
        ? [
            {
              label: 'Reset password',
              icon: KeyRound,
              onSelect: () => setDialog({ type: 'reset', farmer }),
            },
          ]
        : []),
      ...(abilities.addNote
        ? [
            {
              label: 'Add note',
              icon: StickyNote,
              onSelect: () => setDialog({ type: 'note', farmer }),
            },
          ]
        : []),
      ...(abilities.tag && inPanel
        ? [
            {
              label: 'Edit tags',
              icon: Tags,
              onSelect: () => setDialog({ type: 'tag', farmers: [farmer] }),
            },
          ]
        : []),
      ...(abilities.impersonate
        ? [{ label: 'View as farmer', icon: Eye, onSelect: () => void viewAsFarmer(farmer) }]
        : []),
    ];
  }

  const exportItems: RowMenuItem[] = [
    {
      label: `All filtered (${table.total.toLocaleString()})`,
      icon: Download,
      onSelect: () => void exportFarmers('filtered'),
    },
    ...(table.selectedRows.length > 0
      ? [
          {
            label: `Selected (${table.selectedRows.length})`,
            icon: Download,
            onSelect: () => void exportFarmers(table.selectedRows.map((f) => f.userId)),
          },
        ]
      : []),
  ];

  const filters = table.filters;
  const hasFilters = Boolean(table.query) || Object.values(filters).some(Boolean);
  const openRow = openId ? table.pageRows.find((f) => f.userId === openId) : undefined;

  return (
    <div
      className={cn(
        openId && '2xl:grid 2xl:grid-cols-[minmax(0,1fr)_28rem] 2xl:items-start 2xl:gap-4',
      )}
    >
      <div className="min-w-0 space-y-5">
        {/* Title and actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-text text-display leading-tight font-bold">
              All Farmers
            </h1>
            <p className="text-text-dim mt-1 text-sm">
              Manage farmer accounts and identity verification.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
            {abilities.riskScan && (
              <button
                type="button"
                onClick={() => void runScan()}
                disabled={scanning}
                aria-busy={scanning}
                className="border-purple/60 text-ink-purple hover:bg-purple/8 bg-bg-2 inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors disabled:opacity-60"
              >
                <ShieldCheck
                  size={17}
                  aria-hidden="true"
                  className={cn(scanning && 'animate-pulse')}
                />
                {scanning ? 'Scanning…' : 'Run risk scan'}
              </button>
            )}
            {abilities.export && (table.total === 0 || exporting) && (
              <button
                type="button"
                disabled
                className="border-border text-text bg-bg-2 inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold opacity-50"
              >
                <Download size={17} aria-hidden="true" />
                {exporting ? 'Exporting…' : 'Export'}
                <ChevronDown size={16} aria-hidden="true" />
              </button>
            )}
            {abilities.export && table.total > 0 && !exporting && (
              <RowMenu
                label="Export farmers"
                items={exportItems}
                button={
                  <>
                    <Download size={17} aria-hidden="true" />
                    Export
                    <ChevronDown size={16} aria-hidden="true" />
                  </>
                }
                buttonClassName="border-border text-text hover:border-purple/40 bg-bg-2 inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors"
              />
            )}
          </div>
        </div>

        <FarmerSummaryCards
          summary={data?.summary}
          active={{ status: filters.status ?? '', verification: filters.verification ?? '' }}
          onFilter={(filter) => {
            const changes: Record<string, string | null> = { status: null, verification: null };
            if (filter) changes[filter.name] = filter.value;
            const next = new URLSearchParams(window.location.search);
            for (const [key, value] of Object.entries(changes)) {
              if (value) next.set(key, value);
              else next.delete(key);
            }
            next.delete('page');
            replaceQuery(pathname, next);
          }}
        />

        <section
          aria-label="Farmers directory"
          className="border-border bg-bg-2 overflow-hidden rounded-2xl border"
        >
          <StatusTabs table={table} counts={data?.summary} />
          <FarmerToolbar
            table={table}
            regions={data?.facets.regions ?? []}
            crops={data?.facets.crops ?? []}
            tags={data?.facets.tags ?? []}
          />
          {error && (
            <p role="alert" className="text-ink-red px-4 pb-3 text-sm font-semibold">
              {error}
            </p>
          )}
          <FarmerTable
            table={table}
            bands={bands}
            pendingChecks={data?.pendingChecks ?? {}}
            selectedId={openId}
            onOpen={(f) => setOpenId(f.userId)}
            menuItems={(f) => menuItems(f)}
            selectable={abilities.select}
            loading={loading && !data}
            hasFilters={hasFilters}
          />
        </section>

        {abilities.select && (
          <FarmersBulkActions
            selected={table.selectedRows}
            abilities={abilities}
            onClear={table.clearSelection}
            onSuspend={(list) => setDialog({ type: 'suspend', farmers: list })}
            onTag={(list) => setDialog({ type: 'tag', farmers: list })}
          />
        )}
      </div>

      {openId && (
        <FarmerPanel
          key={openId}
          farmerId={openId}
          row={openRow}
          pending={openRow ? data?.pendingChecks?.[openRow.userId] : undefined}
          onClose={closePanel}
          menuItems={(f) => menuItems(f, true)}
          version={edits}
        />
      )}

      <SuspendDialog
        farmers={dialog?.type === 'suspend' ? dialog.farmers : []}
        onClose={() => setDialog(null)}
        onDone={() => void afterChange()}
      />
      <TagEditor
        farmers={dialog?.type === 'tag' ? dialog.farmers : []}
        knownTags={data?.facets.tags ?? []}
        onClose={() => setDialog(null)}
        onDone={() => void afterChange()}
      />
      <ReactivateDialog
        farmer={dialog?.type === 'reactivate' ? dialog.farmer : null}
        onClose={() => setDialog(null)}
        onDone={() => void afterChange()}
      />
      <ResetPasswordDialog
        farmer={dialog?.type === 'reset' ? dialog.farmer : null}
        onClose={() => setDialog(null)}
      />
      <AddNoteDialog
        farmer={dialog?.type === 'note' ? dialog.farmer : null}
        onClose={() => setDialog(null)}
        onDone={() => void afterChange()}
      />
    </div>
  );
}
