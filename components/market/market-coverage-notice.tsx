import { Info } from 'lucide-react';

/** The publication rule, said plainly: reviewed, source-backed prices only, never invented. */
export function MarketCoverageNotice() {
  return (
    <div className="border-accent/30 bg-accent/8 text-text flex items-start gap-3 rounded-2xl border px-5 py-3.5 text-left text-sm leading-relaxed">
      <Info size={22} aria-hidden="true" className="text-icon mt-0.5 shrink-0" />
      <p>
        Only reviewed, source-backed price observations are published.
        <br />
        AI market research is not connected yet; unavailable prices are never replaced with invented
        amounts.
      </p>
    </div>
  );
}
