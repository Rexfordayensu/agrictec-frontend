'use client';

import { ArrowRight, Ban, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  AdminTable,
  type AdminColumn,
  type AdminMobileCardParts,
} from '@/components/admin/shared/admin-table';
import { InitialsAvatar } from '@/components/admin/shared/initials-avatar';
import { RowMenu, type RowMenuItem } from '@/components/admin/shared/row-menu';
import { StatusBadge } from '@/components/admin/shared/status-badge';
import type { AdminTableState } from '@/hooks/admin/use-admin-table';
import { ageInDays } from '@/lib/admin/loan-pipeline';
import { DELETED_FARMER_LABEL, LOAN_STATUS_LABELS, nextStatuses } from '@/lib/admin/loan-status';
import { formatDate, formatGHS } from '@/lib/format';
import type { FarmerAccount, Lender, LoanApplication, LoanStatus } from '@/types/admin';

/** The table view: every column sorts; a row opens the application. */
export function ApplicationsTable({
  table,
  farmerOf,
  farmerDeleted,
  lenderOf,
  canManage,
  loading,
  now,
  onMove,
}: {
  table: AdminTableState<LoanApplication>;
  farmerOf: (app: LoanApplication) => FarmerAccount | undefined;
  farmerDeleted: (app: LoanApplication) => boolean;
  lenderOf: (app: LoanApplication) => Lender | undefined;
  canManage: boolean;
  loading: boolean;
  now: Date;
  onMove: (app: LoanApplication, to: LoanStatus) => void;
}) {
  const router = useRouter();
  const nameOf = (app: LoanApplication) => {
    const farmer = farmerOf(app);
    return farmer ? farmer.profile.name || farmer.email : DELETED_FARMER_LABEL;
  };

  const menu = (app: LoanApplication): RowMenuItem[] => [
    {
      label: 'Open application',
      icon: FileText,
      onSelect: () => router.push(`/admin/loans/${app.id}`),
    },
    ...(canManage
      ? nextStatuses(app.status, farmerDeleted(app)).map((to) => ({
          label: `Move to ${LOAN_STATUS_LABELS[to]}`,
          icon: to === 'rejected' || to === 'defaulted' ? Ban : ArrowRight,
          danger: to === 'rejected' || to === 'defaulted',
          onSelect: () => onMove(app, to),
        }))
      : []),
  ];

  const lenderCell = (app: LoanApplication) => {
    const lender = lenderOf(app);
    return (
      <span className="flex items-center gap-2 whitespace-nowrap">
        <span
          aria-hidden="true"
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: lender?.color ?? 'var(--text-mute)' }}
        />
        {lender?.name ?? 'Unknown lender'}
      </span>
    );
  };

  const sentCell = (app: LoanApplication) => {
    const days = ageInDays(app, now);
    return (
      <span className="block whitespace-nowrap">
        <span className="text-text block">{formatDate(new Date(app.createdAt))}</span>
        <span className="text-text-mute block text-xs">
          {days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'} ago`}
        </span>
      </span>
    );
  };

  const columns: AdminColumn<LoanApplication>[] = [
    {
      key: 'reference',
      header: 'Application',
      sortable: true,
      primary: true,
      cell: (app) => (
        <span className="block">
          <span className="block font-mono text-xs">{app.reference}</span>
          <span className="text-text-mute block text-xs font-normal">{app.purpose}</span>
        </span>
      ),
    },
    {
      key: 'farmer',
      header: 'Farmer',
      sortable: true,
      cell: (app) => (
        <span className="flex items-center gap-2.5">
          <InitialsAvatar name={nameOf(app)} size="sm" />
          <span className="min-w-0">
            <span className="text-text block max-w-40 truncate">{nameOf(app)}</span>
            <span className="text-text-mute block text-xs">
              {farmerOf(app)?.profile.region ?? '—'}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: 'lender',
      header: 'Lender',
      sortable: true,
      className: 'hidden xl:table-cell',
      cell: lenderCell,
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      align: 'right',
      cell: (app) => (
        <span className="block whitespace-nowrap">
          <span className="text-text block font-semibold">{formatGHS(app.amount)}</span>
          <span className="text-text-mute block text-xs">
            {app.months} mo · {app.rate}%
          </span>
        </span>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      sortable: true,
      align: 'right',
      className: 'hidden lg:table-cell',
      cell: (app) => <span className="text-text font-semibold">{app.scoreAtApplication}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (app) => <StatusBadge kind="loan" status={app.status} />,
    },
    {
      key: 'sent',
      header: 'Sent',
      sortable: true,
      className: 'hidden min-[1400px]:table-cell',
      cell: sentCell,
    },
    {
      key: 'menu',
      header: '',
      className: 'w-12',
      cell: (app) => <RowMenu label={`Actions for ${app.reference}`} items={menu(app)} />,
    },
  ];

  function mobileCard(app: LoanApplication, { opener }: AdminMobileCardParts) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {opener(<span className="font-mono text-xs">{app.reference}</span>)}
            <p className="text-text truncate text-sm font-semibold">{nameOf(app)}</p>
            <p className="text-text-mute text-xs">{app.purpose}</p>
          </div>
          <StatusBadge kind="loan" status={app.status} />
          <RowMenu label={`Actions for ${app.reference}`} items={menu(app)} />
        </div>
        <div className="border-border flex items-end justify-between gap-3 border-t pt-3 text-xs">
          <span>
            <span className="font-display text-text block text-lg font-bold">
              {formatGHS(app.amount)}
            </span>
            {lenderCell(app)}
          </span>
          <span className="text-text-mute text-right">
            Score <span className="text-text font-semibold">{app.scoreAtApplication}</span>
            <br />
            {formatDate(new Date(app.createdAt))}
          </span>
        </div>
      </div>
    );
  }

  return (
    <AdminTable
      table={table}
      columns={columns}
      getRowId={(app) => app.id}
      caption="Loan applications"
      rowHref={(app) => `/admin/loans/${app.id}`}
      loading={loading}
      mobileCard={mobileCard}
    />
  );
}
