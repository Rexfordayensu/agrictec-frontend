'use client';

import { useId, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Columns3, Download, Rows3, Search, SlidersHorizontal, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/admin/layout/page-header';
import { MultiSelect } from '@/components/admin/shared/multi-select';
import { useLenders } from '@/components/admin/lenders/use-lenders';
import { ApplicationsBoard } from '@/components/admin/loans/applications-board';
import { ApplicationsTable } from '@/components/admin/loans/applications-table';
import { LoanStats } from '@/components/admin/loans/loan-stats';
import {
  StatusChangeDialog,
  type StatusChange,
} from '@/components/admin/loans/status-change-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useAdminTable } from '@/hooks/admin/use-admin-table';
import { useCan } from '@/hooks/admin/use-can';
import { loanFilterFns, regionOfFarmer, type LoanFilterName } from '@/lib/admin/loan-pipeline';
import { DELETED_FARMER_LABEL, LOAN_STATUSES, LOAN_STATUS_LABELS } from '@/lib/admin/loan-status';
import { downloadFile } from '@/lib/export/csv';
import { formatGHS } from '@/lib/format';
import { replaceQuery } from '@/lib/url-state';
import { cn } from '@/lib/utils';
import { loanApplicationsService } from '@/services/admin/loan-applications.service';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import type { LoanApplication } from '@/types/admin';

type View = 'board' | 'table';

/** Filters behind the Filters button (search and lender stay in the toolbar). */
const PANEL_FILTERS: LoanFilterName[] = ['status', 'region', 'min', 'max', 'from', 'to'];

const FILTER_LABELS: Record<LoanFilterName, string> = {
  status: 'Status',
  lender: 'Lender',
  min: 'From',
  max: 'Up to',
  from: 'Sent from',
  to: 'Sent to',
  region: 'Region',
};

/**
 * The lending pipeline (phase A10): stats, a Board (kanban) or Table view with the same
 * filters (all in the URL, so a view can be shared), CSV export and status changes.
 */
export function LoanApplications() {
  const id = useId();
  const pathname = usePathname();
  const params = useSearchParams();
  const canManage = useCan('loans.manage');
  const canExport = useCan('reports.export');
  const applications = useAdminDataStore((s) => s.applications);
  const farmers = useAdminDataStore((s) => s.farmers);
  const status = useAdminDataStore((s) => s.status);
  const refresh = useAdminDataStore((s) => s.refresh);
  const { lenders } = useLenders();
  const [now] = useState(() => new Date());
  const [change, setChange] = useState<StatusChange | null>(null);
  const [exporting, setExporting] = useState(false);

  const farmerById = new Map(farmers.map((f) => [f.userId, f]));
  const lenderById = new Map(lenders.map((l) => [l.id, l]));
  const farmerOf = (app: LoanApplication) => farmerById.get(app.userId);
  const lenderOf = (app: LoanApplication) => lenderById.get(app.partnerId);
  const nameOf = (app: LoanApplication) => {
    const farmer = farmerOf(app);
    return farmer ? farmer.profile.name || farmer.email : DELETED_FARMER_LABEL;
  };
  /** The farmer list holds every account, so a missing farmer was deleted. */
  const farmerDeleted = (app: LoanApplication) => !farmerById.has(app.userId);

  const table = useAdminTable(applications, {
    getRowId: (app) => app.id,
    searchKeys: [
      (app) => app.reference,
      (app) => nameOf(app),
      (app) => lenderOf(app)?.name,
      (app) => app.purpose,
    ],
    filters: loanFilterFns(regionOfFarmer(farmers)),
    sortAccessors: {
      reference: (app) => app.reference,
      farmer: (app) => nameOf(app).toLowerCase(),
      lender: (app) => lenderOf(app)?.name ?? '',
      amount: (app) => app.amount,
      score: (app) => app.scoreAtApplication,
      status: (app) => LOAN_STATUSES.indexOf(app.status),
      sent: (app) => app.createdAt,
    },
    initialSort: { key: 'sent', dir: 'desc' },
  });

  // A link with ?status= (e.g. from the overview's funnel) opens the table; otherwise the board.
  const viewParam = params.get('view');
  const view: View =
    viewParam === 'table' || (viewParam !== 'board' && params.has('status')) ? 'table' : 'board';
  function setView(next: View) {
    const search = new URLSearchParams(params.toString());
    search.set('view', next);
    replaceQuery(pathname, search);
  }

  const value = (name: LoanFilterName) => table.filters[name] ?? '';
  const set = (name: LoanFilterName, next: string) => table.setFilter(name, next || null);
  const panelCount = PANEL_FILTERS.filter((name) => value(name)).length;
  const [panelOpen, setPanelOpen] = useState(panelCount > 0);
  const chips = (Object.keys(FILTER_LABELS) as LoanFilterName[]).filter((name) => value(name));
  const regions = [...new Set(farmers.map((f) => f.profile.region))].sort();

  const chipText = (name: LoanFilterName) => {
    const v = value(name);
    if (name === 'status')
      return v
        .split(',')
        .map((s) => LOAN_STATUS_LABELS[s as keyof typeof LOAN_STATUS_LABELS] ?? s)
        .join(', ');
    if (name === 'lender') return lenderById.get(v)?.name ?? v;
    if (name === 'min' || name === 'max') return formatGHS(Number(v));
    return v;
  };

  async function exportCsv() {
    setExporting(true);
    try {
      const ids = table.filteredRows.map((app) => app.id);
      const csv = await loanApplicationsService.exportCSV(ids);
      downloadFile(csv, `agrictec-loan-applications-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success(`Exported ${ids.length} application${ids.length === 1 ? '' : 's'}`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not export');
    } finally {
      setExporting(false);
    }
  }

  const changingApp = change?.app;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Loan applications"
        description="Move applications through review, approval and repayment. Every change is audited and appears on the farmer's timeline."
        actions={
          <>
            <div
              role="group"
              aria-label="View"
              className="border-border bg-bg-2 inline-grid grid-cols-2 gap-1 rounded-xl border p-1"
            >
              {(
                [
                  ['board', 'Board', Columns3],
                  ['table', 'Table', Rows3],
                ] as const
              ).map(([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={view === key}
                  onClick={() => setView(key)}
                  className={cn(
                    'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors',
                    view === key ? 'bg-purple/15 text-text' : 'text-text-mute hover:text-text',
                  )}
                >
                  <Icon
                    size={14}
                    aria-hidden="true"
                    className={view === key ? 'text-ink-purple' : ''}
                  />
                  {label}
                </button>
              ))}
            </div>
            {canExport && (
              <Button
                variant="ghost"
                icon={Download}
                loading={exporting}
                disabled={table.total === 0}
                onClick={() => void exportCsv()}
              >
                Export CSV
              </Button>
            )}
          </>
        }
      />

      <LoanStats applications={applications} />

      <div role="search" aria-label="Find applications" className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              size={16}
              aria-hidden="true"
              className="text-text-mute pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
            />
            <Input
              type="search"
              aria-label="Search by reference, farmer, lender or purpose"
              placeholder="Search reference, farmer, lender or purpose"
              value={table.query}
              onChange={(e) => table.setQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <label className="min-w-0 flex-1 sm:w-52 sm:flex-none">
              <span className="sr-only">Lender</span>
              <Select value={value('lender')} onChange={(e) => set('lender', e.target.value)}>
                <option value="">All lenders</option>
                {lenders.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                    {l.active ? '' : ' (inactive)'}
                  </option>
                ))}
              </Select>
            </label>
            <button
              type="button"
              aria-expanded={panelOpen}
              aria-controls={`${id}-panel`}
              onClick={() => setPanelOpen((open) => !open)}
              className={cn(
                'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors',
                panelOpen || panelCount
                  ? 'border-purple/50 bg-purple/10 text-text'
                  : 'border-border bg-bg-2 text-text-dim hover:text-text',
              )}
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              Filters
              {panelCount > 0 && (
                <span className="bg-purple inline-flex size-5 items-center justify-center rounded-full text-[11px] text-white">
                  {panelCount}
                  <span className="sr-only"> active</span>
                </span>
              )}
            </button>
          </div>
        </div>

        {panelOpen && (
          <div
            id={`${id}-panel`}
            className="animate-fade-in border-border bg-glass grid grid-cols-1 gap-4 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div className="space-y-1.5">
              <p aria-hidden="true" className="text-text-mute text-xs font-semibold">
                Status
              </p>
              <MultiSelect
                label="Status"
                options={LOAN_STATUSES.map((s) => ({ value: s, label: LOAN_STATUS_LABELS[s] }))}
                value={value('status') ? value('status').split(',') : []}
                onChange={(next) => set('status', next.join(','))}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={`${id}-region`}
                className="text-text-mute block text-xs font-semibold"
              >
                Region
              </label>
              <Select
                id={`${id}-region`}
                value={value('region')}
                onChange={(e) => set('region', e.target.value)}
              >
                <option value="">All regions</option>
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </div>
            <fieldset className="space-y-1.5">
              <legend className="text-text-mute mb-1.5 text-xs font-semibold">Amount (GHS)</legend>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  aria-label="Minimum amount"
                  placeholder="Min"
                  value={value('min')}
                  onChange={(e) => set('min', e.target.value)}
                />
                <span className="text-text-mute text-xs">to</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  aria-label="Maximum amount"
                  placeholder="Max"
                  value={value('max')}
                  onChange={(e) => set('max', e.target.value)}
                />
              </div>
            </fieldset>
            <div className="space-y-1.5">
              <label htmlFor={`${id}-from`} className="text-text-mute block text-xs font-semibold">
                Sent from
              </label>
              <Input
                id={`${id}-from`}
                type="date"
                value={value('from')}
                max={value('to') || undefined}
                onChange={(e) => set('from', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`${id}-to`} className="text-text-mute block text-xs font-semibold">
                Sent to
              </label>
              <Input
                id={`${id}-to`}
                type="date"
                value={value('to')}
                min={value('from') || undefined}
                onChange={(e) => set('to', e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <p className="text-text-dim font-semibold" aria-live="polite">
            {table.total} application{table.total === 1 ? '' : 's'}
          </p>
          {chips.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => table.setFilter(name, null)}
              aria-label={`Remove filter ${FILTER_LABELS[name]}: ${chipText(name)}`}
              className="border-border bg-glass text-text-dim hover:text-text hover:border-purple/50 inline-flex min-h-7 items-center gap-1.5 rounded-lg border px-2.5 transition-colors"
            >
              <span className="text-text-mute">{FILTER_LABELS[name]}:</span>
              <span className="text-text font-semibold">{chipText(name)}</span>
              <X size={12} aria-hidden="true" />
            </button>
          ))}
          {(chips.length > 0 || table.query) && (
            <button
              type="button"
              onClick={table.clearFilters}
              className="text-ink-purple min-h-7 px-1 font-semibold hover:underline"
            >
              Clear all
            </button>
          )}
          {view === 'board' && canManage && (
            <p className="text-text-mute ml-auto hidden text-xs md:block">
              Drag a card to another column, or use its ⋮ menu.
            </p>
          )}
        </div>
      </div>

      {view === 'board' ? (
        <ApplicationsBoard
          applications={table.filteredRows}
          farmerName={nameOf}
          farmerDeleted={farmerDeleted}
          lenderOf={lenderOf}
          canManage={canManage}
          now={now}
          onMove={(app, to) => setChange({ app, to })}
        />
      ) : (
        <ApplicationsTable
          table={table}
          farmerOf={farmerOf}
          farmerDeleted={farmerDeleted}
          lenderOf={lenderOf}
          canManage={canManage}
          loading={status === 'loading' && applications.length === 0}
          now={now}
          onMove={(app, to) => setChange({ app, to })}
        />
      )}

      <StatusChangeDialog
        change={change}
        farmerName={changingApp ? nameOf(changingApp) : ''}
        lenderName={changingApp ? (lenderOf(changingApp)?.name ?? 'the lender') : ''}
        onClose={() => setChange(null)}
        onDone={() => {
          setChange(null);
          void refresh();
        }}
      />
    </div>
  );
}
