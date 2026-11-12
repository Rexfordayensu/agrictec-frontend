'use client';

import { useEffect, useMemo, useState } from 'react';
import { financialReportError } from '@/lib/financial-report-state';
import { financialService } from '@/services/financial.service';
import { useFarmStore } from '@/store/farm-store';
import type { FinancialSummary, ReportMonths } from '@/types/financial';

type State =
  | { request: object; status: 'ready'; summary: FinancialSummary }
  | { request: object; status: 'error'; summary: null; error: string };

/**
 * The server's financial summary for a period. It is fetched again when the farmer's records
 * or MoMo entries change. An earlier answer is hidden until the new request succeeds.
 */
export function useFinancialSummary(months: ReportMonths) {
  const records = useFarmStore((s) => s.records);
  const momo = useFarmStore((s) => s.momo);
  const [attempt, setAttempt] = useState(0);
  const request = useMemo(
    () => ({ months, records, momo, attempt }),
    [months, records, momo, attempt],
  );
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    let controller: AbortController;
    function refresh() {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      financialService.summary(months, current.signal).then(
        (summary) => {
          if (!current.signal.aborted) setState({ request, status: 'ready', summary });
        },
        (cause: unknown) => {
          if (current.signal.aborted) return;
          setState({
            request,
            status: 'error',
            summary: null,
            error: financialReportError(cause),
          });
        },
      );
    }
    const visibleRefresh = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    refresh();
    const timer = window.setInterval(visibleRefresh, 30_000);
    window.addEventListener('focus', visibleRefresh);
    document.addEventListener('visibilitychange', visibleRefresh);
    return () => {
      controller?.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', visibleRefresh);
      document.removeEventListener('visibilitychange', visibleRefresh);
    };
  }, [months, request]);

  const current =
    state?.request === request ? state : { status: 'loading' as const, summary: null };
  return { ...current, retry: () => setAttempt((n) => n + 1) };
}
