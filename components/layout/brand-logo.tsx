import { AgriCtecMark, AgriCtecWordmark } from '@/components/layout/agrictec-mark';
import { cn } from '@/lib/utils';

/** The Growth Leaf mark + "AgriCtec" wordmark, shared by the sidebar and the auth pages. */
export function BrandLogo({ subtitle, className }: { subtitle?: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <AgriCtecMark size={46} className="-my-1 shrink-0" />
      <div className="min-w-0 text-left">
        <p className="font-display text-xl leading-tight font-semibold tracking-tight">
          <AgriCtecWordmark />
        </p>
        {subtitle && (
          <p className="text-text-mute text-[10px] tracking-[2px] uppercase">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
