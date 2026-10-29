import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AiBannerProps {
  icon: LucideIcon;
  title: string;
  subtitle: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function AiBanner({ icon: Icon, title, subtitle, action, className }: AiBannerProps) {
  return (
    <section
      className={cn(
        'rounded-card border-purple/30 from-purple/20 via-info/15 to-accent/15 relative overflow-hidden border bg-linear-to-br p-5 sm:p-6',
        className,
      )}
    >
      {/* Soft radial glow behind the content */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.35),transparent_70%)]"
      />
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="animate-pulse-soft shadow-purple/40 inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-[#9333ea] via-[#3b82f6] to-[#10b981] text-white shadow-lg">
          <Icon size={22} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-text text-base font-bold">{title}</h2>
          <p className="text-text-dim mt-1 text-sm">{subtitle}</p>
        </div>
        {action && <div className="relative z-10 shrink-0">{action}</div>}
      </div>
    </section>
  );
}
