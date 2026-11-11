'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BackupRestoreCard } from '@/components/admin/settings/backup-restore';
import { DangerZoneCard } from '@/components/admin/settings/danger-zone';
import { DemoDataCard } from '@/components/admin/settings/demo-data';
import { ErrorAlertsCard } from '@/components/admin/settings/error-alerts';
import { FeatureFlagsCard } from '@/components/admin/settings/feature-flags';
import { MaintenanceModeCard } from '@/components/admin/settings/maintenance-mode';
import { PlansEditor } from '@/components/admin/settings/plans-editor';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { SystemSettingsSection } from '@/constants/admin-settings';
import { backupService } from '@/services/admin/backup.service';
import { configService } from '@/services/admin/config.service';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import type { FeatureFlags, Plan } from '@/types/admin';

type SettingsData = {
  flags?: FeatureFlags;
  plans?: Plan[];
  seeded?: string | null;
  demoData?: boolean;
};

/** One route renders only its selected editor; services retain their permission checks. */
export function SystemSettings({ section }: { section: SystemSettingsSection }) {
  const refreshAdmin = useAdminDataStore((s) => s.refresh);
  const syncVersion = useAdminDataStore((s) => s.syncVersion);
  const [data, setData] = useState<SettingsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    const load: Promise<SettingsData> =
      section === 'features' || section === 'maintenance'
        ? configService.getFlags().then((flags) => ({ flags }))
        : section === 'plans'
          ? configService.getPlans().then((plans) => ({ plans }))
          : section === 'demo'
            ? backupService
                .systemStatus()
                .then(({ seededAt, demoData }) => ({ seeded: seededAt, demoData }))
            : Promise.resolve({ seeded: null });
    void load
      .then((next) => {
        if (!alive) return;
        setData(next);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (alive)
          setError(cause instanceof Error ? cause.message : 'Could not load these settings.');
      });
    return () => {
      alive = false;
    };
  }, [section, version, syncVersion]);

  function reloadPage() {
    setData(null);
    setError(null);
    setVersion((v) => v + 1);
  }

  function refreshConsole() {
    void refreshAdmin().catch(() =>
      toast.error('Could not refresh the console. Please reload the page.'),
    );
  }

  function reloadAll() {
    reloadPage();
    refreshConsole();
  }

  function savedFlags(flags: FeatureFlags) {
    setData((current) => ({ ...current, flags }));
    refreshConsole();
    toast.dismiss('flags');
  }

  if (error)
    return (
      <div role="alert" className="border-danger/30 bg-danger/5 rounded-2xl border p-5">
        <p className="text-ink-red text-sm">{error}</p>
        <Button variant="ghost" onClick={reloadPage} className="mt-3">
          Try again
        </Button>
      </div>
    );
  if (!data) return <Skeleton className="h-64 rounded-2xl" />;

  switch (section) {
    case 'features':
      return data.flags ? <FeatureFlagsCard flags={data.flags} onSaved={savedFlags} /> : null;
    case 'maintenance':
      return data.flags ? (
        <MaintenanceModeCard
          key={JSON.stringify(data.flags)}
          flags={data.flags}
          onSaved={savedFlags}
        />
      ) : null;
    case 'plans':
      return data.plans ? (
        <PlansEditor
          key={JSON.stringify(data.plans)}
          plans={data.plans}
          onSaved={(plans) => setData((current) => ({ ...current, plans }))}
        />
      ) : null;
    case 'alerts':
      return <ErrorAlertsCard />;
    case 'backup':
      return <BackupRestoreCard onRestored={reloadAll} />;
    case 'demo':
      // The demo world exists only in local development, never on the live platform.
      return data.demoData ? (
        <DemoDataCard seededAt={data.seeded ?? null} onReset={reloadAll} />
      ) : (
        <p className="border-border text-text-dim rounded-2xl border p-5 text-sm">
          Demo data is not available on the live platform.
        </p>
      );
    case 'danger':
      return <DangerZoneCard onDeleted={reloadAll} />;
  }
}
