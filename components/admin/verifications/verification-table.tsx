'use client';

import { useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { differenceInCalendarDays, formatDistanceStrict, subDays } from 'date-fns';
import { ArrowRight, CheckCheck, Clock, Inbox, PlayCircle, Search } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/admin/layout/page-header';
import {
  AdminTable,
  type AdminColumn,
  type AdminMobileCardParts,
} from '@/components/admin/shared/admin-table';
import { PRIMARY_CLASS } from '@/components/admin/shared/action-styles';
import { BulkActionBar } from '@/components/admin/shared/bulk-action-bar';
import { InitialsAvatar } from '@/components/admin/shared/initials-avatar';
import { StatTile } from '@/components/admin/shared/stat-tile';
import { StatusBadge } from '@/components/admin/shared/status-badge';
import { APPROVE_CLASS, displayValue, KindChip } from '@/components/admin/verifications/kind-meta';
import { ReviewModal } from '@/components/admin/verifications/review-modal';
import { KindFilter, VerificationTabs } from '@/components/admin/verifications/verification-tabs';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { useAdminTable } from '@/hooks/admin/use-admin-table';
import { useCan } from '@/hooks/admin/use-can';
import { usePlatformStatus } from '@/hooks/admin/use-platform-status';
import {
  canBulkApprove,
  isOverdue,
  KIND_LABEL,
  parseQueueTab,
  queueCounts,
  queueSortValue,
  type QueueTab,
} from '@/lib/admin/verification-queue';
import { replaceQuery } from '@/lib/url-state';
import { cn } from '@/lib/utils';
import { verificationsService } from '@/services/admin/verifications.service';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import type { FarmerAccount, VerificationKind, VerificationRequest } from '@/types/admin';

const nameOf = (f: FarmerAccount | undefined) => (f ? f.profile.name || f.email : 'Unknown farmer');

const KIND_FILTERS: VerificationKind[] = ['ghanaCard', 'phone', 'location'];
const isKind = (value: string): value is VerificationKind =>
  (KIND_FILTERS as string[]).includes(value);

/**
 * The verifications queue (phase A9): pending checks oldest first, reviewed in a centred modal
 * with keyboard shortcuts; phone and location checks can be approved in bulk.
 */
export function VerificationTable() {
  const pathname = usePathname();
  const params = useSearchParams();
  const canReview = useCan('verifications.review');
  const all = useAdminDataStore((s) => s.verifications);
  const farmers = useAdminDataStore((s) => s.farmers);
  const status = useAdminDataStore((s) => s.status);
  const refresh = useAdminDataStore((s) => s.refresh);
  const bands = usePlatformStatus()?.creditConfig.bands;
  const [now] = useState(() => new Date());
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  const tab = parseQueueTab(params.get('status'));
  const farmerById = new Map(farmers.map((f) => [f.userId, f]));
  const farmerOf = (v: VerificationRequest) => farmerById.get(v.userId);

  const table = useAdminTable(tab === 'all' ? all : all.filter((v) => v.status === tab), {
    getRowId: (v) => v.id,
    searchKeys: [(v) => nameOf(farmerOf(v)), (v) => farmerOf(v)?.email, (v) => v.submittedValue],
    filters: { kind: (v, value) => v.kind === value },
    sortAccessors: {
      queue: queueSortValue,
      farmer: (v) => nameOf(farmerOf(v)).toLowerCase(),
      kind: (v) => KIND_LABEL[v.kind],
      value: (v) => v.submittedValue,
      submitted: (v) => v.submittedAt,
      status: (v) => v.status,
      reviewer: (v) => v.reviewedBy,
    },
    // Pending oldest first (so nothing waits forever), then the latest decisions.
    initialSort: { key: 'queue', dir: 'asc' },
    canSelect: (v) => canReview && canBulkApprove(v),
  });

  const kindValue = table.filters.kind ?? '';
  const kind = isKind(kindValue) ? kindValue : '';
  const counts = queueCounts(kind ? all.filter((v) => v.kind === kind) : all);
  const pending = all.filter((v) => v.status === 'pending');
  const oldestDays = pending.length
    ? Math.max(...pending.map((v) => differenceInCalendarDays(now, new Date(v.submittedAt))))
    : 0;
  const overdueCount = pending.filter((v) => isOverdue(v, now)).length;
  const weekAgo = subDays(now, 7);
  const reviewedThisWeek = all.filter(
    (v) => v.status !== 'pending' && v.reviewedAt && new Date(v.reviewedAt) >= weekAgo,
  );
  const approvedThisWeek = reviewedThisWeek.filter((v) => v.status === 'approved').length;

  function setTab(next: QueueTab) {
    const search = new URLSearchParams(params.toString());
    if (next === 'pending') search.delete('status');
    else search.set('status', next);
    search.delete('page');
    search.delete('sort');
    search.delete('dir');
    const query = search.toString();
    table.clearSelection();
    replaceQuery(pathname, query);
  }

  /** "Start reviewing": the oldest pending request in the current view. */
  const firstPending = table.filteredRows.find((v) => v.status === 'pending');

  async function approveSelected() {
    const ids = table.selectedRows.map((v) => v.id);
    setApproving(true);
    try {
      const done = await verificationsService.approveMany(ids);
      toast.success(`Approved ${done.length} check${done.length === 1 ? '' : 's'}`);
      table.clearSelection();
      await refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not approve');
    } finally {
      setApproving(false);
    }
  }

  const submittedCell = (v: VerificationRequest) => {
    const overdue = isOverdue(v, now);
    return (
      <span
        title={new Date(v.submittedAt).toLocaleString()}
        className={cn(
          'inline-flex items-center gap-1.5 whitespace-nowrap',
          overdue ? 'text-ink-red font-semibold' : 'text-text-dim',
        )}
      >
        {overdue && <Clock size={13} aria-hidden="true" />}
        {formatDistanceStrict(new Date(v.submittedAt), now, { addSuffix: true })}
        {overdue && <span className="sr-only"> (overdue)</span>}
      </span>
    );
  };

  const reviewButton = (v: VerificationRequest) => (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => setReviewId(v.id)}
      aria-label={`${v.status === 'pending' && canReview ? 'Review' : 'View'} ${KIND_LABEL[v.kind]} for ${nameOf(farmerOf(v))}`}
      className="gap-1"
    >
      {v.status === 'pending' && canReview ? 'Review' : 'View'}
      <ArrowRight size={14} aria-hidden="true" />
    </Button>
  );

  const columns: AdminColumn<VerificationRequest>[] = [
    {
      key: 'farmer',
      header: 'Farmer',
      sortable: true,
      primary: true,
      cell: (v) => {
        const farmer = farmerOf(v);
        return (
          <span className="flex min-w-0 items-center gap-3">
            <InitialsAvatar name={nameOf(farmer)} />
            <span className="min-w-0">
              <span className="block max-w-48 truncate">{nameOf(farmer)}</span>
              <span className="text-text-mute block text-xs font-normal">
                {farmer?.profile.region ?? '—'}
              </span>
            </span>
          </span>
        );
      },
    },
    { key: 'kind', header: 'Check', sortable: true, cell: (v) => <KindChip kind={v.kind} /> },
    {
      key: 'value',
      header: 'Submitted value',
      sortable: true,
      className: 'hidden xl:table-cell',
      cell: (v) => (
        <span className="text-text font-mono text-xs whitespace-nowrap">{displayValue(v)}</span>
      ),
    },
    { key: 'submitted', header: 'Submitted', sortable: true, cell: submittedCell },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      className: 'hidden xl:table-cell',
      cell: (v) => <StatusBadge kind="verification" status={v.status} />,
    },
    {
      key: 'reviewer',
      header: 'Reviewer',
      sortable: true,
      className: 'hidden min-[1400px]:table-cell',
      cell: (v) => <span className="whitespace-nowrap">{v.reviewedBy ?? '—'}</span>,
    },
    { key: 'action', header: '', className: 'w-24 text-right', cell: reviewButton },
  ];

  function mobileCard(v: VerificationRequest, { opener, checkbox }: AdminMobileCardParts) {
    const farmer = farmerOf(v);
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          {checkbox && <span className="pt-3">{checkbox}</span>}
          <InitialsAvatar name={nameOf(farmer)} size="lg" />
          <div className="min-w-0 flex-1">
            {opener(<span className="block truncate">{nameOf(farmer)}</span>)}
            <p className="text-text-mute text-xs">{farmer?.profile.region ?? '—'}</p>
          </div>
          <StatusBadge kind="verification" status={v.status} />
        </div>
        <div className="border-border flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-3 text-sm">
          <KindChip kind={v.kind} />
          <span className="text-text font-mono text-xs">{displayValue(v)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs">
          {submittedCell(v)}
          {reviewButton(v)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Verifications"
        description="Verified identities make farmers' records trustworthy to lenders. Oldest requests come first."
        actions={
          canReview &&
          firstPending && (
            <Button
              icon={PlayCircle}
              onClick={() => setReviewId(firstPending.id)}
              className={PRIMARY_CLASS}
            >
              Start reviewing
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Waiting"
          value={String(pending.length)}
          hint={`${pending.filter((v) => v.kind === 'ghanaCard').length} Ghana Cards`}
        />
        <StatTile
          label="Oldest request"
          value={pending.length ? `${oldestDays} ${oldestDays === 1 ? 'day' : 'days'}` : '—'}
          hint="Target: under 3 days"
          tone={oldestDays >= 3 ? 'danger' : undefined}
        />
        <StatTile
          label="Over 3 days"
          value={String(overdueCount)}
          hint={overdueCount ? 'Review these first' : 'Nothing overdue'}
          tone={overdueCount ? 'danger' : 'good'}
        />
        <StatTile
          label="Reviewed this week"
          value={String(reviewedThisWeek.length)}
          hint={`${approvedThisWeek} approved · ${reviewedThisWeek.length - approvedThisWeek} rejected`}
        />
      </div>

      <div className="space-y-4">
        <VerificationTabs tab={tab} counts={counts} onTab={setTab} />

        <div
          role="search"
          aria-label="Find requests"
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <div className="relative min-w-0 flex-1">
            <Search
              size={16}
              aria-hidden="true"
              className="text-text-mute pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
            />
            <Input
              type="search"
              aria-label="Search by farmer, email or submitted value"
              placeholder="Search farmer, email or value"
              value={table.query}
              onChange={(e) => table.setQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <KindFilter value={kind} onChange={(next) => table.setFilter('kind', next || null)} />
        </div>

        <p className="text-text-dim text-xs font-semibold" aria-live="polite">
          {table.total} {table.total === 1 ? 'request' : 'requests'}
          {tab === 'pending' && table.total > 0 && ' · oldest first'}
        </p>

        <AdminTable
          table={table}
          columns={columns}
          getRowId={(v) => v.id}
          caption="Verification requests"
          selectable={canReview && tab !== 'approved' && tab !== 'rejected'}
          rowLabel={(v) => `${KIND_LABEL[v.kind]} for ${nameOf(farmerOf(v))}`}
          onRowClick={(v) => setReviewId(v.id)}
          loading={status === 'loading' && all.length === 0}
          mobileCard={mobileCard}
          unselectableHint="Only pending phone and location checks can be approved together. Ghana Cards are reviewed one by one."
          empty={
            <EmptyState
              icon={tab === 'pending' ? CheckCheck : Inbox}
              title={tab === 'pending' ? 'All caught up' : 'Nothing here'}
              description={
                tab === 'pending'
                  ? 'No verification is waiting for review.'
                  : 'Try another tab, kind or search.'
              }
            />
          }
        />
      </div>

      {canReview && (
        <BulkActionBar count={table.selectedRows.length} onClear={table.clearSelection}>
          <Button
            size="sm"
            icon={CheckCheck}
            loading={approving}
            onClick={() => void approveSelected()}
            className={APPROVE_CLASS}
          >
            Approve {table.selectedRows.length}
          </Button>
        </BulkActionBar>
      )}

      <ReviewModal
        requestId={reviewId}
        queue={table.filteredRows}
        all={all}
        farmers={farmers}
        bands={bands}
        canReview={canReview}
        now={now}
        onNavigate={setReviewId}
        onClose={() => setReviewId(null)}
        onReviewed={() => void refresh()}
      />
    </div>
  );
}
