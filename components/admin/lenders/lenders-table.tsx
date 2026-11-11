'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CircleCheck, Eye, EyeOff, Landmark, Plus } from 'lucide-react';
import { PageHeader } from '@/components/admin/layout/page-header';
import { PRIMARY_CLASS } from '@/components/admin/shared/action-styles';
import {
  AdminTable,
  type AdminColumn,
  type AdminMobileCardParts,
} from '@/components/admin/shared/admin-table';
import { StatTile } from '@/components/admin/shared/stat-tile';
import { LenderFormModal } from '@/components/admin/lenders/lender-form-modal';
import {
  LicenceBadge,
  licenceLine,
  PublicationBadge,
} from '@/components/admin/lenders/lender-status';
import { useLenders } from '@/components/admin/lenders/use-lenders';
import { LenderLogo } from '@/components/shared/lender-logo';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useAdminTable } from '@/hooks/admin/use-admin-table';
import { INSTITUTION_TYPE_LABELS } from '@/lib/lenders';
import type { AdminLender } from '@/types/admin';

const lenderHref = (l: AdminLender) => `/admin/lenders/${encodeURIComponent(l.id)}`;

/**
 * The lender register. Farmers see a lender only when it is published, its licence check is
 * current (with its official source) and its listing was authorised; "Farmers see it" says so
 * for each row, and why not.
 */
export function LendersTable() {
  const router = useRouter();
  const lendersState = useLenders();
  const { lenders, status, reload } = lendersState;
  const error = lendersState.status === 'error' ? lendersState.error : null;
  const [adding, setAdding] = useState(false);

  const table = useAdminTable(lenders, {
    getRowId: (l) => l.id,
    searchKeys: [(l) => l.name, (l) => l.registeredName, (l) => l.licenceRef, (l) => l.region],
    sortAccessors: {
      name: (l) => l.name.toLowerCase(),
      licence: (l) => l.licenceStatus,
      status: (l) => l.publicationStatus,
      listed: (l) => (l.listed ? 0 : 1),
      applications: (l) => l.applications,
    },
    initialSort: { key: 'name', dir: 'asc' },
  });

  const listed = lenders.filter((l) => l.listed).length;
  const reviewDue = lenders.filter((l) => l.reviewDue).length;
  const suspended = lenders.filter((l) => l.publicationStatus === 'suspended').length;
  const waiting = lenders.filter(
    (l) => l.publicationStatus === 'draft' || l.publicationStatus === 'unpublished',
  ).length;

  const nameCell = (l: AdminLender) => (
    <span className="flex min-w-0 items-center gap-3">
      <LenderLogo name={l.name} color={l.color} logoPath={l.logoPath} size={36} />
      <span className="min-w-0">
        <span className="block truncate">{l.name}</span>
        <span className="text-text-mute block max-w-64 truncate text-xs font-normal">
          {INSTITUTION_TYPE_LABELS[l.institutionType]}
          {l.region ? ` · ${l.region}` : ''}
        </span>
      </span>
    </span>
  );

  const listedCell = (l: AdminLender) =>
    l.listed ? (
      <span className="text-ink-green inline-flex items-center gap-1.5 text-xs font-semibold">
        <Eye size={14} aria-hidden="true" /> Listed
      </span>
    ) : (
      <span className="block max-w-56">
        <span className="text-text-dim inline-flex items-center gap-1.5 text-xs font-semibold">
          <EyeOff size={14} aria-hidden="true" /> Hidden
        </span>
        <span className="text-text-mute block truncate text-xs" title={l.blockers.join(' ')}>
          {l.blockers[0]}
        </span>
      </span>
    );

  const columns: AdminColumn<AdminLender>[] = [
    { key: 'name', header: 'Lender', sortable: true, primary: true, cell: nameCell },
    {
      key: 'licence',
      header: 'Licence',
      sortable: true,
      className: 'hidden md:table-cell',
      cell: (l) => (
        <span className="block">
          <LicenceBadge lender={l} />
          <span className="text-text-mute mt-1 block text-xs whitespace-nowrap">
            {licenceLine(l)}
          </span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (l) => <PublicationBadge status={l.publicationStatus} />,
    },
    { key: 'listed', header: 'Farmers see it', sortable: true, cell: listedCell },
    {
      key: 'applications',
      header: 'Applications',
      sortable: true,
      align: 'right',
      className: 'hidden lg:table-cell',
      cell: (l) => <span className="tabular-nums">{l.applications}</span>,
    },
  ];

  function mobileCard(l: AdminLender, { opener }: AdminMobileCardParts) {
    return (
      <div className="space-y-2.5">
        <div className="flex items-start gap-3">
          <LenderLogo name={l.name} color={l.color} logoPath={l.logoPath} size={40} />
          <div className="min-w-0 flex-1">
            {opener(<span className="block truncate">{l.name}</span>)}
            <p className="text-text-mute text-xs">{INSTITUTION_TYPE_LABELS[l.institutionType]}</p>
          </div>
          <PublicationBadge status={l.publicationStatus} />
        </div>
        <div className="border-border flex items-center justify-between gap-3 border-t pt-2">
          <LicenceBadge lender={l} />
          {listedCell(l)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lenders"
        description="Real financial institutions only. A lender reaches farmers after its licence is checked against an official source, its listing is authorised and it is published."
        actions={
          <Button icon={Plus} onClick={() => setAdding(true)} className={PRIMARY_CLASS}>
            Add lender
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={Landmark}
          label="Listed to farmers"
          value={String(listed)}
          hint={`of ${lenders.length} in the register`}
          tone={listed ? 'good' : undefined}
        />
        <StatTile
          icon={CircleCheck}
          label="Not yet published"
          value={String(waiting)}
          hint="Drafts and unpublished"
        />
        <StatTile
          icon={AlertTriangle}
          label="Licence review due"
          value={String(reviewDue)}
          hint="Within 30 days of lapsing"
          tone={reviewDue ? 'danger' : undefined}
        />
        <StatTile label="Suspended" value={String(suspended)} hint="Hidden from every farmer" />
      </div>

      {status === 'error' ? (
        <div role="alert" className="border-danger/40 bg-danger/5 rounded-2xl border p-4 text-sm">
          <p className="text-ink-red font-semibold">Could not load the lenders</p>
          <p className="text-text-dim mt-1">{error}</p>
          <Button size="sm" variant="ghost" className="mt-3" onClick={reload}>
            Try again
          </Button>
        </div>
      ) : status === 'ready' && lenders.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No lenders yet"
          description="Add a bank or financial institution from its official information. It stays a draft, hidden from farmers, until you check its licence and publish it."
          action={
            <Button icon={Plus} onClick={() => setAdding(true)} className={PRIMARY_CLASS}>
              Add lender
            </Button>
          }
        />
      ) : (
        <AdminTable
          table={table}
          columns={columns}
          getRowId={(l) => l.id}
          caption="Lenders"
          rowHref={lenderHref}
          loading={status === 'loading' && lenders.length === 0}
          mobileCard={mobileCard}
        />
      )}

      <LenderFormModal
        open={adding}
        lenders={lenders}
        onClose={() => setAdding(false)}
        onSaved={(saved) => {
          setAdding(false);
          router.push(lenderHref(saved));
        }}
      />
    </div>
  );
}
