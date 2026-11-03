import { AgriCtecMark, AgriCtecWordmark } from '@/components/layout/agrictec-mark';
import { cn } from '@/lib/utils';

/** The console's brand: the Growth Leaf, "AgriCtec" and a purple "Console" tag. */
export function AdminBrand({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <AgriCtecMark size={46} className="-my-1 shrink-0" />
      <div className="flex min-w-0 items-center gap-2">
        <p className="font-display text-xl leading-tight font-semibold tracking-tight">
          <AgriCtecWordmark />
        </p>
        <span className="bg-purple/15 text-ink-purple rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
          Console
        </span>
      </div>
    </div>
  );
}
