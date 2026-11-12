'use client';

import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '@/services/api';
import { momoService } from '@/services/momo.service';
import { useFarmStore } from '@/store/farm-store';
import type { MomoSummary } from '@/types/momo-summary';

type State =
  | { request: object; status: 'ready'; summary: MomoSummary; error: null }
  | { request: object; status: 'error'; summary: null; error: string };

/**
 * The server's MoMo totals (GET /me/momo/summary). Asked again whenever the farmer's MoMo
 * entries change, on focus, and every 30 seconds while visible. Old figures are never shown
 * after a record change or a failed refresh. These are saved records, not a provider balance.
 */
export function useMomoSummary() {
  const momo = useFarmStore((s) => s.momo);
  const [attempt, setAttempt] = useState(0);
  const request = useMemo(() => ({ momo, attempt }), [momo, attempt]);
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    let controller: AbortController;
    function refresh() {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      momoService.summary(current.signal).then(
        (summary) => {
          if (!current.signal.aborted) setState({ request, status: 'ready', summary, error: null });
        },
        (cause: unknown) => {
          if (current.signal.aborted) return;
          setState({
            request,
            status: 'error',
            summary: null,
            error: summaryError(cause),
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
  }, [request]);

  const current =
    state?.request === request ? state : { status: 'loading' as const, summary: null, error: null };
  return { ...current, retry: () => setAttempt((n) => n + 1) };
}

/**
 * Never a raw server message. A server without the summary yet (404/405, e.g. before the API is
 * deployed) or one that is down gets a plain sentence; the transactions list still works.
 */
export function summaryError(cause: unknown): string {
  if (cause instanceof ApiError && (cause.status === 404 || cause.status === 405))
    return 'Your MoMo totals are not available yet: the AgriCtec server is being updated. Your saved transactions are shown below.';
  if (cause instanceof ApiError && cause.status >= 500)
    return 'The AgriCtec server could not work out your MoMo totals just now. Your saved transactions are shown below.';
  return 'Could not load your MoMo totals. Check your connection. Your transactions below are still shown.';
}
