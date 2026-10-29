'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AppWindow,
  Ban,
  BadgeCheck,
  Download,
  Eye,
  KeyRound,
  MapPin,
  RotateCcw,
  ScanSearch,
  Smartphone,
  StickyNote,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/admin/layout/page-header';
import {
  AdminTable,
  type AdminColumn,
  type AdminMobileCardParts,
} from '@/components/admin/shared/admin-table';
import { RowMenu, type RowMenuItem } from '@/components/admin/shared/row-menu';
import { StatusBadge } from '@/components/admin/shared/status-badge';
import { InitialsAvatar } from '@/components/admin/shared/initials-avatar';
import { AddNoteDialog, ReactivateDialog } from '@/components/admin/farmers/farmer-action-dialogs';
import { ResetPasswordDialog } from '@/components/admin/farmers/detail/reset-password-dialog';
import { FarmerQuickViewModal } from '@/components/admin/farmers/farmer-quick-view-modal';
import { csvFileName, FarmersBulkActions } from '@/components/admin/farmers/farmers-bulk-actions';
import { FarmersFilters } from '@/components/admin/farmers/farmers-filters';
import { SuspendDialog } from '@/components/admin/farmers/suspend-dialog';
import { TagEditor } from '@/components/admin/farmers/tag-editor';
import { useViewAsFarmer } from '@/components/admin/farmers/use-view-as-farmer';
import { Button } from '@/components/ui/button';
import { CropIcon, cropFromName } from '@/components/ui/crop-icon';
import { useAdminTable } from '@/hooks/admin/use-admin-table';
import { useAdminRole } from '@/hooks/admin/use-can';
import { usePlatformStatus } from '@/hooks/admin/use-platform-status';
import {
  farmerAbilities,
  farmerFilterFns,
  FARMER_SEARCH_KEYS,
  FARMER_SORT,
} from '@/lib/admin/farmer-list';
import { bandTone, MAX_SCORE } from '@/lib/admin/score-tone';
import { scoreLabel } from '@/lib/calculations/credit-score';
import { downloadFile } from '@/lib/export/csv';
import { formatCompactGHS, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { farmersService } from '@/services/admin/farmers.service';
import { riskService } from '@/services/admin/risk.service';
import { RiskTag } from '@/components/admin/risk/risk-tag';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import type { FarmerAccount } from '@/types/admin';

const nameOf = (f: FarmerAccount) => f.profile.name || f.email;

function FarmerAvatar({ farmer, size = 'md' }: { farmer: FarmerAccount; size?: 'md' | 'lg' }) {
  return <InitialsAvatar name={nameOf(farmer)} size={size} />;
}

/** Name over email. */
function FarmerName({ farmer }: { farmer: FarmerAccount }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <FarmerAvatar farmer={farmer} />
      <span className="min-w-0">
        <span className="flex max-w-56 items-center gap-1.5">
          <span className="truncate">{nameOf(farmer)}</span>
          <RiskTag count={farmer.riskConfirmed} />
        </span>
        <span className="text-text-mute block max-w-48 truncate text-xs font-normal">
          {farmer.email}
        </span>
      </span>
    </span>
  );
}

/** Constituency and region over the main crop (then "+N" more; all of them in the tooltip). */
function FarmCell({ farmer }: { farmer: FarmerAccount }) {
  const crops = farmer.profile.primaryCrops;
  return (
    <span className="block min-w-0">
      <span className="text-text block whitespace-nowrap">
        {farmer.profile.constituency && (
          <span className="text-text-dim">{farmer.profile.constituency}, </span>
        )}
        {farmer.profile.region}
      </span>
      {crops.length > 0 ? (
        <span
          title={crops.join(', ')}
          className="text-text-mute mt-0.5 flex items-center gap-1 text-xs whitespace-nowrap"
        >
          <CropIcon crop={cropFromName(crops[0])} size={12} />
          {crops[0]}
          {crops.length > 1 && <span>+{crops.length - 1}</span>}
        </span>
      ) : (
        <span className="text-text-mute mt-0.5 block text-xs">No crops yet</span>
      )}
    </span>
  );
}

/** Score and band over a slim bar. */
function ScoreCell({
  farmer,
  bands,
}: {
  farmer: FarmerAccount;
  bands: Parameters<typeof scoreLabel>[1];
}) {
  const label = scoreLabel(farmer.stats.score, bands);
  const tone = bandTone(label);
  return (
    <span className="block w-28">
      <span className="flex items-baseline gap-1.5 whitespace-nowrap">
        <span className="text-text font-semibold tabular-nums">{farmer.stats.score}</span>
        <span className={cn('text-xs font-semibold', tone.text)}>{label}</span>
      </span>
      <span aria-hidden="true" className="bg-glass-strong mt-1.5 block h-1 rounded-full">
        <span
          className={cn('block h-full rounded-full', tone.bar)}
          style={{ width: `${Math.min(100, (farmer.stats.score / MAX_SCORE) * 100)}%` }}
        />
      </span>
    </span>
  );
}

/** Income over the number of records. */
function IncomeCell({ farmer }: { farmer: FarmerAccount }) {
  return (
    <span className="block whitespace-nowrap">
      <span className="text-text block font-semibold tabular-nums">
        {formatCompactGHS(farmer.stats.income)}
      </span>
      <span className="text-text-mute block text-xs">
        {farmer.stats.records} record{farmer.stats.records === 1 ? '' : 's'}
      </span>
    </span>
  );
}

type Dialog =
  | { type: 'suspend'; farmers: FarmerAccount[] }
  | { type: 'reactivate'; farmer: FarmerAccount }
  | { type: 'reset'; farmer: FarmerAccount }
  | { type: 'note'; farmer: FarmerAccount }
  | { type: 'tag'; farmers: FarmerAccount[] }
  | null;

/** Three small icons: phone, location, Ghana Card (green when verified). */
function VerifiedIcons({ farmer }: { farmer: FarmerAccount }) {
  const v = farmer.profile.verification;
  const items = [
    { label: 'Phone', icon: Smartphone, done: v.phone },
    { label: 'Location', icon: MapPin, done: v.location },
    { label: 'Ghana Card', icon: BadgeCheck, done: v.ghanaCard },
  ];
  // A card waiting for review shows gold ("Ghana Card pending review").
  const cardPending = farmer.profile.ghanaCard.status === 'pending';
  const stateOf = (label: string, done: boolean) =>
    `${label} ${done ? 'verified' : label === 'Ghana Card' && cardPending ? 'pending review' : 'not verified'}`;
  return (
    <span className="inline-flex items-center gap-1">
      {items.map(({ label, icon: Icon, done }) => (
        <span
          key={label}
          title={stateOf(label, done)}
          className={cn(
            'inline-flex size-6 items-center justify-center rounded-md',
            done
              ? 'bg-accent/15 text-ink-green'
              : label === 'Ghana Card' && cardPending
                ? 'bg-gold/15 text-ink-gold'
                : 'bg-glass-strong text-text-mute/60',
          )}
        >
          <Icon size={13} aria-label={stateOf(label, done)} />
        </span>
      ))}
    </span>
  );
}

/** The farmers list: search, filters (in the URL), sort, pagination, row and bulk actions. */
export function FarmersTable() {
  const router = useRouter();
  const role = useAdminRole();
  const abilities = farmerAbilities(role);
  const farmers = useAdminDataStore((s) => s.farmers);
  const status = useAdminDataStore((s) => s.status);
  const refresh = useAdminDataStore((s) => s.refresh);
  const viewAsFarmer = useViewAsFarmer();
  const bands = usePlatformStatus()?.creditConfig.bands;
  const [quickView, setQuickView] = useState<FarmerAccount | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [scanning, setScanning] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Guests are a shared demo account, not farmers, so the list leaves them out.
  const people = farmers.filter((f) => !f.isGuest);
  const table = useAdminTable(people, {
    getRowId: (f) => f.userId,
    searchKeys: FARMER_SEARCH_KEYS,
    filters: farmerFilterFns(bands),
    sortAccessors: FARMER_SORT,
    initialSort: { key: 'joined', dir: 'desc' },
  });

  const regions = [...new Set(people.map((f) => f.profile.region))].sort();
  const crops = [...new Set(people.flatMap((f) => f.profile.primaryCrops))].sort();
  const tags = [...new Set(people.flatMap((f) => f.tags))].sort();

  async function afterChange() {
    setDialog(null);
    setQuickView(null);
    table.clearSelection();
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
      await refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not run the scan');
    } finally {
      setScanning(false);
    }
  }

  async function exportFiltered() {
    setExporting(true);
    try {
      const ids = table.filteredRows.map((f) => f.userId);
      downloadFile(await farmersService.exportCSV(ids), csvFileName('filtered'));
      toast.success(`Exported ${ids.length} farmer${ids.length === 1 ? '' : 's'}`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not export');
    } finally {
      setExporting(false);
    }
  }

  function menuItems(farmer: FarmerAccount): RowMenuItem[] {
    return [
      {
        label: 'View details',
        icon: UserRound,
        onSelect: () => router.push(`/admin/farmers/${farmer.userId}`),
      },
      { label: 'Quick view', icon: AppWindow, onSelect: () => setQuickView(farmer) },
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
      ...(abilities.impersonate
        ? [{ label: 'View as farmer', icon: Eye, onSelect: () => void viewAsFarmer(farmer) }]
        : []),
    ];
  }

  const columns: AdminColumn<FarmerAccount>[] = [
    {
      key: 'farmer',
      header: 'Farmer',
      sortable: true,
      primary: true,
      cell: (f) => <FarmerName farmer={f} />,
    },
    // Columns appear as the screen widens; the Sort menu covers the hidden ones.
    {
      key: 'region',
      header: 'Farm',
      sortable: true,
      className: 'hidden xl:table-cell',
      cell: (f) => <FarmCell farmer={f} />,
    },
    {
      key: 'score',
      header: 'Credit score',
      sortable: true,
      cell: (f) => <ScoreCell farmer={f} bands={bands} />,
    },
    {
      key: 'income',
      header: 'Income',
      sortable: true,
      className: 'hidden xl:table-cell',
      cell: (f) => <IncomeCell farmer={f} />,
    },
    {
      key: 'verified',
      header: 'Verified',
      sortable: true,
      className: 'hidden min-[1400px]:table-cell',
      cell: (f) => <VerifiedIcons farmer={f} />,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (f) => <StatusBadge kind="account" status={f.status} />,
    },
    {
      key: 'joined',
      header: 'Joined',
      sortable: true,
      className: 'hidden min-[1440px]:table-cell',
      cell: (f) => (
        <span className="text-text-dim whitespace-nowrap">{formatDate(new Date(f.createdAt))}</span>
      ),
    },
    {
      key: 'menu',
      header: '',
      className: 'w-12',
      cell: (f) => <RowMenu label={`Actions for ${nameOf(f)}`} items={menuItems(f)} />,
    },
  ];

  /** Phones: name, status and menu on top; location; then score, income and verification. */
  function mobileCard(f: FarmerAccount, { opener, checkbox }: AdminMobileCardParts) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          {checkbox && <span className="pt-3">{checkbox}</span>}
          <FarmerAvatar farmer={f} size="lg" />
          <div className="min-w-0 flex-1">
            {opener(<span className="block truncate">{nameOf(f)}</span>)}
            <p className="text-text-mute truncate text-xs">{f.email}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <StatusBadge kind="account" status={f.status} />
              <RiskTag count={f.riskConfirmed} />
            </div>
          </div>
          <RowMenu label={`Actions for ${nameOf(f)}`} items={menuItems(f)} />
        </div>
        <div className="border-border grid grid-cols-2 gap-3 border-t pt-3 text-sm">
          <FarmCell farmer={f} />
          <ScoreCell farmer={f} bands={bands} />
          <IncomeCell farmer={f} />
          <span className="self-center">
            <VerifiedIcons farmer={f} />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="All Farmers"
        description="Search, filter and manage every farmer account."
        actions={
          <>
            {abilities.riskScan && (
              <Button
                variant="ghost"
                icon={ScanSearch}
                loading={scanning}
                onClick={() => void runScan()}
              >
                Run risk scan
              </Button>
            )}
            {abilities.export && (
              <Button
                variant="ghost"
                icon={Download}
                loading={exporting}
                disabled={table.total === 0}
                onClick={() => void exportFiltered()}
              >
                Export
                <span className="sr-only"> all filtered farmers</span>
              </Button>
            )}
          </>
        }
      />

      <FarmersFilters table={table} farmers={people} regions={regions} crops={crops} tags={tags} />

      <AdminTable
        table={table}
        columns={columns}
        getRowId={(f) => f.userId}
        caption="Farmers"
        selectable={abilities.select}
        rowLabel={nameOf}
        onRowClick={setQuickView}
        loading={status === 'loading' && people.length === 0}
        mobileCard={mobileCard}
      />

      {abilities.select && (
        <FarmersBulkActions
          selected={table.selectedRows}
          abilities={abilities}
          onClear={table.clearSelection}
          onSuspend={(list) => setDialog({ type: 'suspend', farmers: list })}
          onTag={(list) => setDialog({ type: 'tag', farmers: list })}
        />
      )}

      <FarmerQuickViewModal
        key={quickView?.userId ?? 'closed'}
        farmer={quickView}
        onClose={() => setQuickView(null)}
        canSuspend={abilities.suspend}
        onSuspend={(f) => setDialog({ type: 'suspend', farmers: [f] })}
        onReactivate={(f) => setDialog({ type: 'reactivate', farmer: f })}
      />

      <SuspendDialog
        farmers={dialog?.type === 'suspend' ? dialog.farmers : []}
        onClose={() => setDialog(null)}
        onDone={() => void afterChange()}
      />
      <TagEditor
        farmers={dialog?.type === 'tag' ? dialog.farmers : []}
        knownTags={tags}
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
