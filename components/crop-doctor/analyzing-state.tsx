'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, ScanLine, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  'Checking photo quality',
  'Detecting leaf patterns',
  'Matching the disease library',
  'Preparing a treatment plan',
];

/** Step-by-step progress while the (simulated) analysis runs. */
export function AnalyzingState() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 380);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-80 flex-col items-center justify-center px-4 py-8"
    >
      <span className="animate-pulse-soft border-purple/20 bg-purple/10 text-ink-purple mb-5 inline-flex size-16 items-center justify-center rounded-2xl border motion-reduce:animate-none">
        <ScanLine size={32} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <p className="font-display text-text text-xl font-bold">Analyzing your crop…</p>
      <p className="text-text-mute mt-1 text-xs">This takes a few seconds</p>

      <ol className="mt-6 w-full max-w-xs space-y-2.5">
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={label} className="flex items-center gap-3 text-sm">
              <span
                className={cn(
                  'inline-flex size-6 shrink-0 items-center justify-center rounded-full border',
                  done && 'border-transparent bg-[#10b981] text-[#022c22]',
                  active && 'border-purple/50 bg-purple/15 text-ink-purple',
                  !done && !active && 'border-border text-text-mute',
                )}
                aria-hidden="true"
              >
                {done ? (
                  <Check size={13} strokeWidth={3} />
                ) : active ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <span className="size-1.5 rounded-full bg-current" />
                )}
              </span>
              <span className={cn(done || active ? 'text-text' : 'text-text-mute')}>{label}</span>
            </li>
          );
        })}
      </ol>

      <span className="text-ink-purple mt-6 inline-flex items-center gap-1.5 text-[11px]">
        <Sparkles size={13} aria-hidden="true" />
        Simulated analysis
      </span>
    </div>
  );
}
