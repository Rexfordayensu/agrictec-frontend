'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserX } from 'lucide-react';
import { ReactivateDialog } from '@/components/admin/farmers/farmer-action-dialogs';
import { SuspendDialog } from '@/components/admin/farmers/suspend-dialog';
import { useViewAsFarmer } from '@/components/admin/farmers/use-view-as-farmer';
import { ActivityTab } from '@/components/admin/farmers/detail/activity-tab';
import { CreditTab } from '@/components/admin/farmers/detail/credit-tab';
import { DeleteFarmerDialog } from '@/components/admin/farmers/detail/delete-farmer-dialog';
import { DiagnosesTab } from '@/components/admin/farmers/detail/diagnoses-tab';
import { FarmerHeader } from '@/components/admin/farmers/detail/farmer-header';
import { LoansTab } from '@/components/admin/farmers/detail/loans-tab';
import { MomoTab } from '@/components/admin/farmers/detail/momo-tab';
import { NotesTab } from '@/components/admin/farmers/detail/notes-tab';
import { OverviewTab } from '@/components/admin/farmers/detail/overview-tab';
import { RecordsTab } from '@/components/admin/farmers/detail/records-tab';
import { ResetPasswordDialog } from '@/components/admin/farmers/detail/reset-password-dialog';
import type { FarmerPageData } from '@/components/admin/farmers/detail/types';
import { VerificationTab } from '@/components/admin/farmers/detail/verification-tab';
import AdminLoading from '@/app/(admin)/admin/loading';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs, type TabItem } from '@/components/ui/tabs';
import { useAdminRole, useCan } from '@/hooks/admin/use-can';
import { farmerAbilities } from '@/lib/admin/farmer-list';
import { can } from '@/lib/admin/permissions';
import { farmersService } from '@/services/admin/farmers.service';
import { lendersService } from '@/services/admin/lenders.service';
import { loanApplicationsService } from '@/services/admin/loan-applications.service';
import { riskService } from '@/services/admin/risk.service';
import { verificationsService } from '@/services/admin/verifications.service';
import type { AdminRole } from '@/types/admin';
import { useAdminDataStore } from '@/store/admin/admin-data-store';

type TabKey =
  | 'overview'
  | 'records'
  | 'momo'
  | 'credit'
  | 'loans'
  | 'verification'
  | 'diagnoses'
  | 'notes'
  | 'activity';

type Dialog = 'suspend' | 'reactivate' | 'reset' | 'delete' | null;

type LoadState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: FarmerPageData };

/** Loads the farmer and what the role may see (lists it can't see stay null). */
async function fetchFarmerPage(id: string, role: AdminRole | undefined): Promise<LoadState> {
  try {
    const [detail, applications, verifications, riskFlags, lenders] = await Promise.all([
      farmersService.getDetail(id),
      loanApplicationsService.list({ userId: id }),
      can(role, 'verifications.review') ? verificationsService.list({ userId: id }) : null,
      can(role, 'risk.review') ? riskService.list({ userId: id }) : null,
      lendersService.list({ includeInactive: true }),
    ]);
    return { status: 'ready', data: { detail, applications, verifications, riskFlags, lenders } };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Could not load the farmer';
    return message === 'Farmer not found.' ? { status: 'missing' } : { status: 'error', message };
  }
}

/** One farmer's full profile with every admin action (phase A8). */
export function FarmerDetail({ id }: { id: string }) {
  const router = useRouter();
  const role = useAdminRole();
  const abilities = farmerAbilities(role);
  const canDelete = useCan('farmers.delete');
  const canAudit = useCan('audit.view');
  const viewAsFarmer = useViewAsFarmer();
  const refreshConsole = useAdminDataStore((s) => s.refresh);
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [tab, setTab] = useState<TabKey>('overview');
  const [dialog, setDialog] = useState<Dialog>(null);
  // Bumped after every change so the Activity tab reloads too.
  const [version, setVersion] = useState(0);
  const syncVersion = useAdminDataStore((s) => s.syncVersion);

  useEffect(() => {
    let active = true;
    fetchFarmerPage(id, role).then((next) => active && setState(next));
    return () => {
      active = false;
    };
  }, [id, role, version, syncVersion]);

  /** After a change: reload this page (and the Activity tab) and the console's cached data. */
  async function reload() {
    setVersion((v) => v + 1);
    await refreshConsole();
  }

  if (state.status === 'loading') return <AdminLoading />;

  if (state.status === 'missing' || state.status === 'error') {
    return (
      <Card className="mx-auto mt-6 max-w-lg">
        <EmptyState
          icon={UserX}
          title={state.status === 'missing' ? 'Farmer not found' : 'Could not load this farmer'}
          description={
            state.status === 'missing'
              ? 'This farmer may have been deleted, or the link is wrong.'
              : state.message
          }
          action={
            <Link
              href="/admin/farmers"
              className="text-ink-purple inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
            >
              <ArrowLeft size={16} aria-hidden="true" /> Back to all farmers
            </Link>
          }
        />
      </Card>
    );
  }

  const { data } = state;
  const farmer = data.detail.account;
  const tabs: TabItem<TabKey>[] = [
    { value: 'overview', label: 'Overview' },
    { value: 'records', label: 'Records', count: farmer.stats.records },
    { value: 'momo', label: 'MoMo', count: farmer.stats.momo },
    { value: 'credit', label: 'Credit' },
    { value: 'loans', label: 'Loans', count: data.applications.length },
    { value: 'verification', label: 'Verification' },
    { value: 'diagnoses', label: 'Diagnoses', count: farmer.stats.diagnoses },
    { value: 'notes', label: 'Notes', count: farmer.adminNotes.length },
    ...(canAudit ? [{ value: 'activity' as const, label: 'Activity' }] : []),
  ];
  const tabProps = { data, reload };
  const close = () => setDialog(null);
  const afterChange = async () => {
    close();
    await reload();
  };

  return (
    <div>
      <FarmerHeader
        farmer={farmer}
        abilities={abilities}
        canDelete={canDelete}
        actions={{
          onViewAs: () => void viewAsFarmer(farmer),
          onSuspend: () => setDialog('suspend'),
          onReactivate: () => setDialog('reactivate'),
          onResetPassword: () => setDialog('reset'),
          onDelete: () => setDialog('delete'),
        }}
      />

      <Tabs
        tabs={tabs}
        value={tab}
        onChange={setTab}
        label="Farmer sections"
        idPrefix="farmer"
        className="mb-6"
      />
      <div role="tabpanel" id={`farmer-panel-${tab}`} aria-labelledby={`farmer-tab-${tab}`}>
        {tab === 'overview' && <OverviewTab {...tabProps} />}
        {tab === 'records' && <RecordsTab {...tabProps} />}
        {tab === 'momo' && <MomoTab {...tabProps} />}
        {tab === 'credit' && <CreditTab {...tabProps} />}
        {tab === 'loans' && <LoansTab {...tabProps} />}
        {tab === 'verification' && <VerificationTab {...tabProps} />}
        {tab === 'diagnoses' && <DiagnosesTab {...tabProps} />}
        {tab === 'notes' && <NotesTab {...tabProps} />}
        {tab === 'activity' && canAudit && <ActivityTab farmerId={id} version={version} />}
      </div>

      <SuspendDialog
        farmers={dialog === 'suspend' ? [farmer] : []}
        onClose={close}
        onDone={() => void afterChange()}
      />
      <ReactivateDialog
        farmer={dialog === 'reactivate' ? farmer : null}
        onClose={close}
        onDone={() => void afterChange()}
      />
      <ResetPasswordDialog farmer={dialog === 'reset' ? farmer : null} onClose={close} />
      {canDelete && (
        <DeleteFarmerDialog
          farmer={farmer}
          open={dialog === 'delete'}
          counts={{
            records: farmer.stats.records,
            momo: farmer.stats.momo,
            applications: data.applications.length,
            diagnoses: farmer.stats.diagnoses,
            verifications: data.verifications?.length ?? 0,
            notes: farmer.adminNotes.length,
          }}
          onClose={close}
          onDeleted={() => {
            close();
            void refreshConsole();
            router.replace('/admin/farmers');
          }}
        />
      )}
    </div>
  );
}
