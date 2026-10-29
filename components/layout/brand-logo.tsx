import { Sprout } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Emerald seedling tile + "AgriCtec" wordmark, shared by the sidebar and the auth pages. */
export function BrandLogo({ subtitle, className }: { subtitle?: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-[#10b981] to-[#34d399] text-white shadow-[0_8px_24px_-6px_var(--accent-glow)]">
        <Sprout size={22} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-gradient-brand font-display text-xl leading-tight font-bold">AgriCtec</p>
        {subtitle && (
          <p className="text-text-mute text-[10px] tracking-[2px] uppercase">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
