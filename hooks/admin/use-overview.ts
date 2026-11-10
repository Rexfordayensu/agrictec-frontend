'use client';

import { useEffect, useState } from 'react';
import type { DateRange } from '@/lib/admin/overview';
import { overviewService, type OverviewData } from '@/services/admin/overview.service';
import { useAdminDataStore } from '@/store/admin/admin-data-store';

/** The overview for a period, reloaded when another tab or admin changes something. */
export function useOverview(range: DateRange): {
  data: OverviewData | null;
  error: string | null;
} {
  const syncVersion = useAdminDataStore((s) => s.syncVersion);
  const [state, setState] = useState<{
    key: string;
    data: OverviewData | null;
    error: string | null;
  }>({ key: '', data: null, error: null });
  const key = `${range}:${syncVersion}`;

  useEffect(() => {
    const controller = new AbortController();
    overviewService.get(range, controller.signal).then(
      (data) => setState({ key, data, error: null }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setState((s) => ({
          key,
          data: s.data,
          error: error instanceof Error ? error.message : 'Could not load the overview.',
        }));
      },
    );
    return () => controller.abort();
  }, [range, key]);

  // While a new period loads, the previous figures stay on screen.
  return { data: state.data, error: state.key === key ? state.error : null };
}
