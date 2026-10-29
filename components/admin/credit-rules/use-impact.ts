'use client';

import { useEffect, useState } from 'react';
import {
  configValues,
  impactInChunks,
  type Impact,
  type ScoringInput,
} from '@/lib/admin/credit-rules';
import { isAbortError } from '@/lib/chunked';
import type { CreditConfig, CreditConfigInput } from '@/types/admin';

/** Waits this long after the last edit before re-scoring (typing a number edits on every key). */
const SETTLE_MS = 150;

export interface ImpactState {
  /** The latest finished result (it may be for an earlier draft while `calculating`). */
  impact: Impact | null;
  /** True until the impact matches the current draft. */
  calculating: boolean;
  /** Farmers re-scored so far in the current run. */
  progress: { done: number; total: number } | null;
}

/**
 * The credit-rules impact preview, worked out off the main path: a pause after each edit, then
 * every farmer re-scored a few at a time (lib/chunked), so typing stays smooth. A newer draft
 * cancels the run in progress. Pass nulls until the rules have loaded.
 */
export function useImpact(
  inputs: ScoringInput[] | null,
  live: CreditConfig | null,
  draft: CreditConfigInput | null,
): ImpactState {
  const [result, setResult] = useState<{ draft: CreditConfigInput; impact: Impact } | null>(null);
  const [progress, setProgress] = useState<ImpactState['progress']>(null);

  useEffect(() => {
    if (!inputs || !live || !draft) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      impactInChunks(inputs, configValues(live), draft, {
        signal: controller.signal,
        onProgress: (done, total) => setProgress({ done, total }),
      }).then(
        (impact) => {
          setResult({ draft, impact });
          setProgress(null);
        },
        (error: unknown) => {
          if (!isAbortError(error)) setProgress(null);
        },
      );
    }, SETTLE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [inputs, live, draft]);

  return {
    impact: result?.impact ?? null,
    calculating: result?.draft !== draft,
    progress,
  };
}
