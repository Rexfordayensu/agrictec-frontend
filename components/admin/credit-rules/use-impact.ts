'use client';

import { useEffect, useState } from 'react';
import type { Impact } from '@/lib/admin/credit-rules';
import { configService } from '@/services/admin/config.service';
import type { CreditConfig, CreditConfigInput } from '@/types/admin';

/** Waits this long after the last edit before asking the API (typing a number edits per key). */
const SETTLE_MS = 400;

export interface ImpactState {
  /** The latest finished result (it may be for an earlier draft while `calculating`). */
  impact: Impact | null;
  /** True until the impact matches the current draft. */
  calculating: boolean;
  /** Kept for the page's progress line; the API answers in one go, so it is always null. */
  progress: { done: number; total: number } | null;
  /** Why the latest preview failed (e.g. weights that don't add up to 100). */
  error: string | null;
}

/**
 * The credit-rules impact preview, worked out by the API (POST /admin/credit-config/impact): it
 * re-scores every farmer under the live rules and the draft, so the console never downloads
 * anyone's records. A pause after each edit, and a newer draft cancels the request in flight.
 * Pass nulls until the rules have loaded.
 */
export function useImpact(live: CreditConfig | null, draft: CreditConfigInput | null): ImpactState {
  const [result, setResult] = useState<{
    draft: CreditConfigInput;
    impact: Impact | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    if (!live || !draft) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      configService.getImpact(draft, controller.signal).then(
        (impact) => setResult({ draft, impact, error: null }),
        (error: unknown) => {
          if (controller.signal.aborted) return;
          setResult((current) => ({
            draft,
            impact: current?.impact ?? null,
            error: error instanceof Error ? error.message : 'Could not preview this draft.',
          }));
        },
      );
    }, SETTLE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [live, draft]);

  return {
    impact: result?.impact ?? null,
    calculating: result?.draft !== draft,
    progress: null,
    error: result?.draft === draft ? result.error : null,
  };
}
