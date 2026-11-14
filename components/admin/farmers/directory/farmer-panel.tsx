'use client';

import { adminPath } from '@/lib/admin-path';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ExternalLink, Settings, SquareX, UserX, X } from 'lucide-react';
import { AccountPill, checksOf, nameOf } from '@/components/admin/farmers/directory/farmer-cells';
import {
  ActivityPanel,
  OverviewPanel,
  RecordsPanel,
  VerificationsPanel,
} from '@/components/admin/farmers/directory/panel-tabs';
import { buildTimeline } from '@/components/admin/farmers/directory/panel-timeline';
import { InitialsAvatar } from '@/components/admin/shared/initials-avatar';
import { RowMenu, type RowMenuItem } from '@/components/admin/shared/row-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useCan } from '@/hooks/admin/use-can';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useMounted } from '@/hooks/use-mounted';
import { cn } from '@/lib/utils';
import { auditService } from '@/services/admin/audit.service';
import { farmersService } from '@/services/admin/farmers.service';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import type {
  AuditEntry,
  FarmerAccount,
  FarmerDetail,
  VerificationKind,
  VerificationRequest,
} from '@/types/admin';

type Tab = 'overview' | 'records' | 'verifications' | 'activity';

const TABS: { value: Tab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'records', label: 'Records' },
  { value: 'verifications', label: 'Verifications' },
  { value: 'activity', label: 'Activity' },
];

interface Loaded {
  detail: FarmerDetail | null;
  requests: VerificationRequest[] | null;
  audit: AuditEntry[] | null;
  missing: boolean;
  error: string | null;
}

/**
 * One farmer's panel beside the list (a sheet over it on smaller screens). Mount it with
 * key={farmerId}: everything it loaded belongs to that farmer only, so switching farmers never
 * shows the previous one's details. It reloads when the console hears a change (live events) or
 * after an action here.
 */
export function FarmerPanel({
  farmerId,
  row,
  pending,
  onClose,
  menuItems,
  version,
}: {
  farmerId: string;
  /** The farmer's row on the page on screen (fresh after every reload), if they are on it. */
  row: FarmerAccount | undefined;
  pending: VerificationKind[] | undefined;
  onClose: () => void;
  menuItems: (farmer: FarmerAccount) => RowMenuItem[];
  /** Bumped by the page after an action (suspend, note…), to reload. */
  version: number;
}) {
  const mounted = useMounted();
  const inline = useMediaQuery('(min-width: 96rem)');
  const canAudit = useCan('audit.view');
  const canReviewChecks = useCan('verifications.review');
  const canReviewEntries = useCan('transactions.review');
  const syncVersion = useAdminDataStore((s) => s.syncVersion);
  const [tab, setTab] = useState<Tab>('overview');
  const [edits, setEdits] = useState(0);
  const [loaded, setLoaded] = useState<Loaded>({
    detail: null,
    requests: null,
    audit: null,
    missing: false,
    error: null,
  });
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [mounted]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const other = document.querySelector(
        '[role="dialog"]:not([data-farmer-panel]), [role="menu"]',
      );
      if (event.key === 'Escape' && !other) {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    Promise.all([
      farmersService.getDetail(farmerId),
      farmersService.verifications(farmerId).catch(() => null),
      canAudit
        ? auditService
            .list({ targetId: farmerId }, 1, 50)
            .then((r) => r.items)
            .catch(() => null)
        : Promise.resolve(null),
    ]).then(
      ([detail, requests, audit]) =>
        active && setLoaded({ detail, requests, audit, missing: false, error: null }),
      (cause: unknown) => {
        if (!active) return;
        const message = cause instanceof Error ? cause.message : 'Could not load this farmer';
        setLoaded((current) => ({
          ...current,
          missing: message === 'Farmer not found.',
          error: message,
        }));
      },
    );
    return () => {
      active = false;
    };
  }, [farmerId, canAudit, syncVersion, version, edits]);

  const farmer = loaded.detail?.account ?? row;
  // Waiting checks: from the list's page, or from the requests this panel loaded.
  const waiting =
    loaded.requests?.filter((r) => r.status === 'pending').map((r) => r.kind) ?? pending ?? [];
  const checks = farmer ? checksOf(farmer, waiting) : [];
  const timeline =
    farmer && loaded.detail
      ? buildTimeline(farmer, loaded.requests, canAudit ? loaded.audit : null)
      : null;
  const menu = farmer ? menuItems(farmer) : [];

  const panel = (
    <>
      {/* Below 1536px the panel is a sheet over the list. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="animate-fade-in fixed inset-0 z-40 bg-black/40 2xl:hidden"
      />
      <aside
        data-farmer-panel
        role={inline ? undefined : 'dialog'}
        aria-modal={inline ? undefined : true}
        aria-label={farmer ? `${nameOf(farmer)}: details` : 'Farmer details'}
        className={cn(
          'bg-bg-2 border-border fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l sm:w-[28rem]',
          'animate-fade-in 2xl:sticky 2xl:inset-auto 2xl:top-[calc(var(--spacing-header)+1.75rem)] 2xl:z-auto 2xl:h-[calc(100dvh-var(--spacing-header)-2.5rem)] 2xl:w-auto 2xl:rounded-2xl 2xl:border 2xl:shadow-sm',
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-4 pt-4 pb-2 sm:px-5 sm:pt-5">
          {farmer ? (
            <InitialsAvatar name={nameOf(farmer)} size="lg" className="size-12" />
          ) : (
            <Skeleton className="size-12 rounded-full" />
          )}
          <div className="min-w-0 flex-1">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-text truncate text-lg font-bold outline-none"
            >
              {farmer ? nameOf(farmer) : <Skeleton className="h-5 w-40" />}
            </h2>
            {farmer && <p className="text-text-dim truncate text-sm">{farmer.email}</p>}
          </div>
          {farmer && <AccountPill status={farmer.status} className="mt-1.5" />}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close farmer details"
            className="text-text hover:bg-glass-strong -mt-1 -mr-1 inline-flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {farmer?.status === 'suspended' && farmer.suspendedReason && (
          <p className="border-danger/30 bg-danger/8 text-ink-red mx-4 mb-1 rounded-lg border px-3 py-1.5 text-xs sm:mx-5">
            Suspended: {farmer.suspendedReason}
          </p>
        )}

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Farmer sections"
          className="border-border flex border-b px-2 sm:px-3"
        >
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              id={`panel-tab-${t.value}`}
              aria-selected={tab === t.value}
              aria-controls="farmer-panel-body"
              onClick={() => setTab(t.value)}
              className={cn(
                '-mb-px min-h-12 flex-1 border-b-2 px-1 text-sm font-semibold transition-colors',
                tab === t.value
                  ? 'border-purple text-ink-purple'
                  : 'text-text hover:text-ink-purple border-transparent',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div
          id="farmer-panel-body"
          role="tabpanel"
          aria-labelledby={`panel-tab-${tab}`}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5"
        >
          {loaded.missing ? (
            <EmptyState
              icon={UserX}
              title="Farmer not found"
              description="This account may have been deleted."
            />
          ) : !farmer ? (
            loaded.error ? (
              <p role="alert" className="text-ink-red text-sm">
                {loaded.error}
              </p>
            ) : (
              <div className="space-y-3" role="status" aria-label="Loading farmer">
                <Skeleton className="h-36 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            )
          ) : (
            <>
              {loaded.error && (
                <p role="alert" className="text-ink-red mb-3 text-xs">
                  Could not refresh: {loaded.error}
                </p>
              )}
              {tab === 'overview' && (
                <OverviewPanel
                  farmer={farmer}
                  detail={loaded.detail}
                  checks={checks}
                  timeline={timeline}
                  onViewActivity={() => setTab('activity')}
                />
              )}
              {tab === 'records' && (
                <RecordsPanel farmer={farmer} detail={loaded.detail} canReview={canReviewEntries} />
              )}
              {tab === 'verifications' && (
                <VerificationsPanel
                  farmer={farmer}
                  checks={checks}
                  requests={loaded.requests}
                  canReview={canReviewChecks}
                  onChanged={() => setEdits((n) => n + 1)}
                />
              )}
              {tab === 'activity' && <ActivityPanel timeline={timeline} canAudit={canAudit} />}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-border sm:[&>*]:text-small flex flex-wrap items-center gap-2 border-t px-4 py-3 sm:flex-nowrap sm:px-5">
          <Link
            href={adminPath(`/admin/farmers/${farmerId}`)}
            className="border-border text-text hover:border-purple/40 inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold whitespace-nowrap transition-colors"
          >
            <ExternalLink size={16} aria-hidden="true" />
            View full profile
          </Link>
          {menu.length > 0 && (
            <RowMenu
              label={farmer ? `Manage ${nameOf(farmer)}` : 'Manage account'}
              items={menu}
              button={
                <>
                  <Settings size={16} aria-hidden="true" />
                  Manage account
                </>
              }
              buttonClassName="border-purple/50 text-ink-purple hover:bg-purple/8 inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold whitespace-nowrap transition-colors"
            />
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#7c3aed] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#6d28d9]"
          >
            <SquareX size={16} aria-hidden="true" />
            Close
          </button>
        </div>
      </aside>
    </>
  );
  if (!mounted) return null;
  // Wide screens: beside the list. Otherwise a sheet over everything, outside the page's
  // animated container (a transformed parent would trap a fixed element).
  return inline ? panel : createPortal(panel, document.body);
}
