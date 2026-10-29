'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Radar } from 'lucide-react';
import { toast } from 'sonner';
import { PRIMARY_CLASS } from '@/components/admin/shared/action-styles';
import { Button } from '@/components/ui/button';
import { RISK_RULES } from '@/lib/admin/risk-rules';
import { riskService, type ScanProgress } from '@/services/admin/risk.service';
import type { RiskFlag } from '@/types/admin';

/** What each phase says, and the share of the bar it fills (reading 0–40%, rules 40–95%). */
const PHASES: Record<
  ScanProgress['phase'],
  { label: (p: ScanProgress) => string; from: number; to: number }
> = {
  reading: {
    label: (p) => `Reading records and MoMo transactions (${p.done} of ${p.total} farmers)…`,
    from: 0,
    to: 40,
  },
  checking: {
    label: (p) => `Checking rule ${p.done} of ${RISK_RULES.length} across accounts…`,
    from: 40,
    to: 95,
  },
  comparing: { label: () => 'Comparing with flags already found…', from: 95, to: 100 },
};

const percentOf = (p: ScanProgress) => {
  const { from, to } = PHASES[p.phase];
  return Math.round(from + (to - from) * (p.total ? p.done / p.total : 1));
};

/**
 * "Run scan now": runs every rule over every farmer (audited) with real progress, then says how
 * many new flags it found. The scan works in slices, so the page stays responsive while it runs.
 * Findings already flagged (in any status) are never added again.
 */
export function ScanButton({ onDone }: { onDone: (found: RiskFlag[]) => void }) {
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function scan() {
    setResult(null);
    setProgress({ phase: 'reading', done: 0, total: 0 });
    try {
      const found = await riskService.runScan((next) => {
        if (mounted.current) setProgress(next);
      });
      if (!mounted.current) return;
      const message =
        found.length === 0
          ? 'Scan complete: no new flags'
          : `Scan complete: ${found.length} new flag${found.length === 1 ? '' : 's'}`;
      setResult(message);
      toast.success(message);
      onDone(found);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'The scan could not run');
    } finally {
      if (mounted.current) setProgress(null);
    }
  }

  const running = progress !== null;
  const percent = progress ? percentOf(progress) : 0;

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <Button icon={Radar} loading={running} onClick={() => void scan()} className={PRIMARY_CLASS}>
        {running ? 'Scanning…' : 'Run scan now'}
      </Button>
      <div aria-live="polite" className="min-h-5 text-xs sm:text-right">
        {progress ? (
          <span className="flex flex-col gap-1.5 sm:items-end">
            <span className="text-text-dim">{PHASES[progress.phase].label(progress)}</span>
            <span
              role="progressbar"
              aria-label="Scan progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="bg-glass-strong block h-1 w-full overflow-hidden rounded-full sm:w-56"
            >
              <span
                className="bg-purple block h-full rounded-full transition-[width] duration-300"
                style={{ width: `${percent}%` }}
              />
            </span>
          </span>
        ) : (
          result && (
            <span className="text-ink-green inline-flex items-center gap-1.5 font-semibold">
              <CheckCircle2 size={14} aria-hidden="true" />
              {result}
            </span>
          )
        )}
      </div>
    </div>
  );
}
