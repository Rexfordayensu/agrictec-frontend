import { Info } from 'lucide-react';

export function DemoDataNotice() {
  return (
    <div className="border-info/20 bg-info/5 text-text-dim flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-xs leading-relaxed">
      <Info size={16} aria-hidden="true" className="text-ink-blue mt-0.5 shrink-0" />
      <p>
        <span className="text-text font-semibold">Ghana market coverage.</span> Only reviewed,
        source-backed price observations are published. AI market research is not connected yet;
        unavailable prices are never replaced with invented amounts.
      </p>
    </div>
  );
}
