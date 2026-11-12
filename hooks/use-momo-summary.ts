'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '@/services/api';
import { momoService } from '@/services/momo.service';
import { useFarmStore } from '@/store/farm-store';
import type { MomoSummary } from '@/types/momo-summary';

type State =
  | { status: 'loading'; summary: MomoSummary | null; error: null }
  | { status: 'ready'; summary: MomoSummary; error: null }
  | { status: 'error'; summary: MomoSummary | null; error: string };

/**
 * The server's MoMo totals (GET /me/momo/summary). Asked again whenever the farmer's MoMo
 * entries change (added, edited, deleted or reviewed); the last answer stays on screen meanwhile.
 */
export function useMomoSummary() {
  const momo = useFarmStore((s) => s.momo);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ status: 'loading', summary: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    momoService.summary(controller.signal).then(
      (summary) => {
        if (!controller.signal.aborted) setState({ status: 'ready', summary, error: null });
      },
      (cause: unknown) => {
        if (controller.signal.aborted) return;
        setState((prev) => ({
          status: 'error',
          summary: prev.summary,
          error: summaryError(cause),
        }));
      },
    );
    return () => controller.abort();
  }, [momo, attempt]);

  return { ...state, retry: () => setAttempt((n) => n + 1) };
}

/**
 * Never a raw server message. A server without the summary yet (404/405, e.g. before the API is
 * deployed) or one that is down gets a plain sentence; the transactions list still works.
 */
export function summaryError(cause: unknown): string {
  if (cause instanceof ApiError && (cause.status === 404 || cause.status === 405))
    return 'Your MoMo totals are not available yet: the AgriCtec server is being updated. Your transactions below are up to date.';
  if (cause instanceof ApiError && cause.status >= 500)
    return 'The AgriCtec server could not work out your MoMo totals just now. Your transactions below are up to date.';
  return 'Could not load your MoMo totals. Check your connection. Your transactions below are still shown.';
}
