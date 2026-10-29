import { Crown, Headset, ScanEye, ShieldCheck, type LucideIcon } from 'lucide-react';
import { ROLE_LABELS } from '@/lib/admin/permissions';
import { cn } from '@/lib/utils';
import type { AdminRole } from '@/types/admin';

const ROLE_STYLE: Record<AdminRole, { icon: LucideIcon; tone: string }> = {
  super_admin: { icon: Crown, tone: 'bg-gold/15 text-ink-gold ring-gold/40' },
  admin: { icon: ShieldCheck, tone: 'bg-purple/15 text-ink-purple ring-purple/40' },
  support: { icon: Headset, tone: 'bg-info/15 text-ink-blue ring-info/40' },
  analyst: { icon: ScanEye, tone: 'bg-glass-strong text-text-dim ring-border' },
};

/** Super Admin gold with a crown, Admin purple, Support blue, Analyst grey. */
export function RoleBadge({ role, className }: { role: AdminRole; className?: string }) {
  const { icon: Icon, tone } = ROLE_STYLE[role];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ring-1',
        tone,
        className,
      )}
    >
      <Icon size={12} aria-hidden="true" />
      {ROLE_LABELS[role]}
    </span>
  );
}
