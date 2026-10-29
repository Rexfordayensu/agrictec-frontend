'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Ban, Landmark, Pencil, Percent, Plus, Power, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/admin/layout/page-header';
import { PRIMARY_CLASS, REJECT_CLASS } from '@/components/admin/shared/action-styles';
import {
  AdminTable,
  type AdminColumn,
  type AdminMobileCardParts,
} from '@/components/admin/shared/admin-table';
import { RowMenu, type RowMenuItem } from '@/components/admin/shared/row-menu';
import { StatTile } from '@/components/admin/shared/stat-tile';
import { LenderFormModal } from '@/components/admin/lenders/lender-form-modal';
import { useLenders } from '@/components/admin/lenders/use-lenders';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import { Switch } from '@/components/ui/switch';
import { useAdminTable } from '@/hooks/admin/use-admin-table';
import { deactivateBlock, deleteBlock, lenderStats } from '@/lib/admin/loan-pipeline';
import { formatCompactGHS, formatGHS } from '@/lib/format';
import { cn } from '@/lib/utils';
import { lendersService } from '@/services/admin/lenders.service';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import type { Lender } from '@/types/admin';

type Dialog =
  | { type: 'form'; lender?: Lender }
  | { type: 'deactivate'; lender: Lender }
  | { type: 'blocked'; lender: Lender; message: string; reviewLink?: string }
  | { type: 'delete'; lender: Lender }
  | null;

const pct = (rate: number | null) => (rate === null ? '—' : `${Math.round(rate * 100)}%`);

/**
 * The lenders farmers are offered (phase A10): terms, an active switch, applications and the
 * approval rate. Switching off hides a lender from farmers at once, but not while applications
 * are under review; deleting is only for lenders that never had an application.
 */
export function LendersTable() {
  const { lenders, status, reload } = useLenders();
  const applications = useAdminDataStore((s) => s.applications);
  const refreshConsole = useAdminDataStore((s) => s.refresh);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const table = useAdminTable(lenders, {
    getRowId: (l) => l.id,
    searchKeys: [(l) => l.name, (l) => l.description],
    sortAccessors: {
      name: (l) => l.name.toLowerCase(),
      rate: (l) => l.rate,
      maxAmount: (l) => l.maxAmount,
      term: (l) => l.maxMonths,
      minScore: (l) => l.minScore,
      active: (l) => (l.active ? 0 : 1),
      applications: (l) => lenderStats(applications, l.id).applications,
      approval: (l) => lenderStats(applications, l.id).approvalRate ?? -1,
    },
    initialSort: { key: 'name', dir: 'asc' },
  });

  const active = lenders.filter((l) => l.active);
  const averageRate = active.length
    ? active.reduce((sum, l) => sum + l.rate, 0) / active.length
    : null;
  // Decided = approved (whatever happened after) or rejected.
  const decided = applications.filter(
    (a) => a.status !== 'submitted' && a.status !== 'under_review',
  );
  const approvedAll = decided.filter((a) => a.status !== 'rejected').length;

  function done() {
    setDialog(null);
    reload();
    void refreshConsole();
  }

  /** The switch: activate at once; deactivate after a check and a confirmation. */
  function toggle(lender: Lender) {
    if (!lender.active) return void setActive(lender);
    const blocked = deactivateBlock(lender, applications);
    if (blocked) {
      return setDialog({
        type: 'blocked',
        lender,
        message: blocked,
        reviewLink: `/admin/loans?view=table&lender=${lender.id}&status=under_review`,
      });
    }
    setDialog({ type: 'deactivate', lender });
  }

  async function setActive(lender: Lender) {
    setBusyId(lender.id);
    try {
      await lendersService.toggleActive(lender.id);
      toast.success(
        lender.active
          ? `${lender.name} is hidden from farmers`
          : `${lender.name} is offered to farmers again`,
      );
      done();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not change the lender');
    } finally {
      setBusyId(null);
    }
  }

  function askDelete(lender: Lender) {
    const blocked = deleteBlock(lender, applications);
    if (blocked) return setDialog({ type: 'blocked', lender, message: blocked });
    setDialog({ type: 'delete', lender });
  }

  async function remove(lender: Lender) {
    setBusyId(lender.id);
    try {
      await lendersService.remove(lender.id);
      toast.success(`${lender.name} deleted`);
      done();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not delete the lender');
    } finally {
      setBusyId(null);
    }
  }

  const menu = (lender: Lender): RowMenuItem[] => [
    { label: 'Edit', icon: Pencil, onSelect: () => setDialog({ type: 'form', lender }) },
    {
      label: lender.active ? 'Deactivate' : 'Activate',
      icon: Power,
      onSelect: () => toggle(lender),
    },
    { label: 'Delete', icon: Trash2, danger: true, onSelect: () => askDelete(lender) },
  ];

  const nameCell = (lender: Lender) => (
    <span className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-white"
        style={{ backgroundColor: lender.color }}
      >
        <Landmark size={16} />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate">{lender.name}</span>
          {!lender.active && <Badge color="gold">Hidden</Badge>}
        </span>
        <span className="text-text-mute block max-w-64 truncate text-xs font-normal">
          {lender.description ?? `Since ${new Date(lender.createdAt).getFullYear()}`}
        </span>
      </span>
    </span>
  );

  const approvalCell = (lender: Lender) => {
    const { approvalRate } = lenderStats(applications, lender.id);
    return (
      <span className="block w-24">
        <span className="text-text font-semibold tabular-nums">{pct(approvalRate)}</span>
        <span aria-hidden="true" className="bg-glass-strong mt-1 block h-1 rounded-full">
          <span
            className="bg-accent block h-full rounded-full"
            style={{ width: `${Math.round((approvalRate ?? 0) * 100)}%` }}
          />
        </span>
      </span>
    );
  };

  const applicationsCell = (lender: Lender) => {
    const { applications: count, underReview } = lenderStats(applications, lender.id);
    return (
      <Link
        href={`/admin/loans?view=table&lender=${lender.id}`}
        className="text-text hover:text-ink-purple block whitespace-nowrap"
      >
        <span className="font-semibold tabular-nums">{count}</span>
        {underReview > 0 && (
          <span className="text-ink-gold block text-xs">{underReview} under review</span>
        )}
      </Link>
    );
  };

  const switchCell = (lender: Lender) => (
    <Switch
      checked={lender.active}
      disabled={busyId === lender.id}
      onChange={() => toggle(lender)}
      label={`${lender.name} offered to farmers`}
    />
  );

  const columns: AdminColumn<Lender>[] = [
    { key: 'name', header: 'Lender', sortable: true, primary: true, cell: nameCell },
    {
      key: 'rate',
      header: 'Rate',
      sortable: true,
      align: 'right',
      cell: (l) => <span className="text-text font-semibold">{l.rate}%</span>,
    },
    {
      key: 'maxAmount',
      header: 'Max amount',
      sortable: true,
      align: 'right',
      className: 'hidden lg:table-cell',
      cell: (l) => <span className="whitespace-nowrap">{formatGHS(l.maxAmount)}</span>,
    },
    {
      key: 'term',
      header: 'Term',
      sortable: true,
      className: 'hidden xl:table-cell',
      cell: (l) => (
        <span className="whitespace-nowrap">
          {l.minMonths}–{l.maxMonths} mo
        </span>
      ),
    },
    {
      key: 'minScore',
      header: 'Min score',
      sortable: true,
      align: 'right',
      className: 'hidden xl:table-cell',
      cell: (l) => l.minScore,
    },
    { key: 'active', header: 'Offered', sortable: true, cell: switchCell },
    {
      key: 'applications',
      header: 'Applications',
      sortable: true,
      className: 'hidden md:table-cell',
      cell: applicationsCell,
    },
    {
      key: 'approval',
      header: 'Approval rate',
      sortable: true,
      className: 'hidden lg:table-cell',
      cell: approvalCell,
    },
    {
      key: 'menu',
      header: '',
      className: 'w-12',
      cell: (l) => <RowMenu label={`Actions for ${l.name}`} items={menu(l)} />,
    },
  ];

  function mobileCard(lender: Lender, { opener }: AdminMobileCardParts) {
    const stats = lenderStats(applications, lender.id);
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: lender.color }}
          >
            <Landmark size={18} />
          </span>
          <div className="min-w-0 flex-1">
            {opener(<span className="block truncate">{lender.name}</span>)}
            <p className="text-text-mute text-xs">
              {lender.rate}% · up to {formatCompactGHS(lender.maxAmount)} · {lender.minMonths}–
              {lender.maxMonths} mo
            </p>
          </div>
          <RowMenu label={`Actions for ${lender.name}`} items={menu(lender)} />
        </div>
        <div className="border-border flex items-center justify-between gap-3 border-t pt-2 text-xs">
          <span className="text-text-mute">
            {stats.applications} applications · {pct(stats.approvalRate)} approved
          </span>
          {switchCell(lender)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lenders"
        description="Choose which lenders and terms farmers are offered. Changes reach farmers immediately."
        actions={
          <Button icon={Plus} onClick={() => setDialog({ type: 'form' })} className={PRIMARY_CLASS}>
            Add lender
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={Landmark}
          label="Offered to farmers"
          value={`${active.length} of ${lenders.length}`}
          hint={`${lenders.length - active.length} hidden`}
        />
        <StatTile
          icon={Percent}
          label="Average rate"
          value={averageRate === null ? '—' : `${averageRate.toFixed(1)}%`}
          hint="Across active lenders"
        />
        <StatTile
          label="Applications"
          value={String(applications.length)}
          hint={`${applications.filter((a) => a.status === 'under_review').length} under review`}
        />
        <StatTile
          label="Approval rate"
          value={pct(decided.length ? approvedAll / decided.length : null)}
          hint={`${decided.length} decided`}
        />
      </div>

      <AdminTable
        table={table}
        columns={columns}
        getRowId={(l) => l.id}
        caption="Lenders"
        onRowClick={(lender) => setDialog({ type: 'form', lender })}
        loading={status === 'loading' && lenders.length === 0}
        mobileCard={mobileCard}
      />

      <LenderFormModal
        open={dialog?.type === 'form'}
        lender={dialog?.type === 'form' ? dialog.lender : undefined}
        lenders={lenders}
        onClose={() => setDialog(null)}
        onSaved={done}
      />

      <ConfirmDialog
        open={dialog?.type === 'deactivate'}
        title={dialog?.type === 'deactivate' ? `Deactivate ${dialog.lender.name}?` : 'Deactivate'}
        message="Farmers stop seeing this lender on their loans page immediately. Its existing applications keep their history and can still be processed."
        confirmLabel="Deactivate"
        danger
        loading={busyId !== null}
        onCancel={() => setDialog(null)}
        onConfirm={() => dialog?.type === 'deactivate' && void setActive(dialog.lender)}
      />

      <ConfirmDialog
        open={dialog?.type === 'delete'}
        title={dialog?.type === 'delete' ? `Delete ${dialog.lender.name}?` : 'Delete'}
        message="This lender has no applications, so it can be removed for good. Farmers stop seeing it immediately."
        confirmLabel="Delete lender"
        danger
        loading={busyId !== null}
        onCancel={() => setDialog(null)}
        onConfirm={() => dialog?.type === 'delete' && void remove(dialog.lender)}
      />

      <Modal
        open={dialog?.type === 'blocked'}
        onClose={() => setDialog(null)}
        size="sm"
        title={
          dialog?.type === 'blocked'
            ? dialog.reviewLink
              ? `Can’t deactivate ${dialog.lender.name} yet`
              : `Can’t delete ${dialog.lender.name}`
            : ''
        }
        footer={
          dialog?.type === 'blocked' && (
            <>
              {dialog.reviewLink ? (
                <Link
                  href={dialog.reviewLink}
                  className="border-border text-text hover:bg-glass-strong inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold"
                >
                  Review them <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              ) : (
                dialog.lender.active && (
                  <Button icon={Ban} onClick={() => toggle(dialog.lender)} className={REJECT_CLASS}>
                    Deactivate instead
                  </Button>
                )
              )}
              <Button variant="ghost" onClick={() => setDialog(null)}>
                OK
              </Button>
            </>
          )
        }
      >
        <p className={cn('text-text-dim text-sm leading-relaxed')}>
          {dialog?.type === 'blocked' ? dialog.message : ''}
        </p>
      </Modal>
    </div>
  );
}
