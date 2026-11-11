'use client';

import { useEffect, useState } from 'react';
import { financialService } from '@/services/financial.service';
import { useFarmStore } from '@/store/farm-store';
import type { FinancialSummary, ReportMonths } from '@/types/financial';

type State =
  | { status: 'loading'; summary: FinancialSummary | null }
  | { status: 'ready'; summary: FinancialSummary }
  | { status: 'error'; summary: FinancialSummary | null; error: string };

/**
 * The server's financial summary for a period. It is fetched again when the farmer's records
 * or MoMo entries change (the last answer stays on screen meanwhile), and never worked out here.
 */
export function useFinancialSummary(months: ReportMonths) {
  const records = useFarmStore((s) => s.records);
  const momo = useFarmStore((s) => s.momo);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ status: 'loading', summary: null });

  useEffect(() => {
    const controller = new AbortController();
    financialService.summary(months, controller.signal).then(
      (summary) => setState({ status: 'ready', summary }),
      (cause: unknown) => {
        if (controller.signal.aborted) return;
        setState((current) => ({
          status: 'error',
          summary: current.summary,
          error: cause instanceof Error ? cause.message : 'Could not load your figures.',
        }));
      },
    );
    return () => controller.abort();
  }, [months, records, momo, attempt]);

  return { ...state, retry: () => setAttempt((n) => n + 1) };
}
