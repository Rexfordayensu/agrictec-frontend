'use client';

import { useEffect, useState } from 'react';
import { backupService } from '@/services/admin/backup.service';
import { configService } from '@/services/admin/config.service';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import type { CreditConfig, FeatureFlags } from '@/types/admin';

export interface PlatformStatus {
  flags: FeatureFlags;
  creditConfig: CreditConfig;
  seededAt: string | null;
}

/** Feature flags, credit rules version and seed date. Reloads with the admin data. */
export function usePlatformStatus(): PlatformStatus | null {
  const loadedAt = useAdminDataStore((s) => s.loadedAt);
  const [status, setStatus] = useState<PlatformStatus | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      configService.getFlags(),
      configService.getCreditConfig(),
      backupService.seededAt().catch(() => null),
    ]).then(
      ([flags, creditConfig, seededAt]) => {
        if (!active) return;
        setStatus({ flags, creditConfig, seededAt });
      },
      () => {
        // The panel stays in its loading state; the console's loader reports connection errors.
      },
    );
    return () => {
      active = false;
    };
  }, [loadedAt]);

  return status;
}
