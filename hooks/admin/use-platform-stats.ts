'use client';

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  cropPopularity,
  farmersByRegion,
  incomeByRegion,
  kpis,
  loanFunnel,
  scoreDistribution,
  signupsByMonth,
  topFarmers,
} from '@/lib/admin/analytics';
import { useAdminDataStore } from '@/store/admin/admin-data-store';

/** Platform analytics from the cached admin data. Call the store's refresh() to load it. */
export function usePlatformStats() {
  const { farmers, applications, verifications, riskFlags, status, error } = useAdminDataStore(
    useShallow((s) => ({
      farmers: s.farmers,
      applications: s.applications,
      verifications: s.verifications,
      riskFlags: s.riskFlags,
      status: s.status,
      error: s.error,
    })),
  );

  const stats = useMemo(
    () => ({
      kpis: kpis(farmers, applications, riskFlags, verifications),
      signups: signupsByMonth(farmers, 12),
      byRegion: farmersByRegion(farmers),
      scores: scoreDistribution(farmers),
      crops: cropPopularity(farmers),
      funnel: loanFunnel(applications),
      incomeByRegion: incomeByRegion(farmers),
      topFarmers: topFarmers(farmers, 10),
    }),
    [farmers, applications, riskFlags, verifications],
  );

  return { ...stats, status, error };
}
