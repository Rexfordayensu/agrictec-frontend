import { ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The red "Risk" tag: the farmer has confirmed risk flags (phase A13). Shown in the farmers
 * list and on the farmer's page; their lender-facing reports say "Account under review".
 */
export function RiskTag({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  const label = `${count} confirmed risk flag${count === 1 ? '' : 's'}`;
  return (
    <span
      title={label}
      className={cn(
        'border-danger/40 bg-danger/15 text-ink-red inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase',
        className,
      )}
    >
      <ShieldAlert size={11} aria-hidden="true" />
      Risk
      <span className="sr-only">: {label}</span>
    </span>
  );
}
