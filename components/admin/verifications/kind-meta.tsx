import { BadgeCheck, MapPin, Smartphone, type LucideIcon } from 'lucide-react';
import { KIND_LABEL, parseLocation } from '@/lib/admin/verification-queue';
import { formatGPS } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { VerificationKind, VerificationRequest } from '@/types/admin';

export const KIND_ICON: Record<VerificationKind, LucideIcon> = {
  ghanaCard: BadgeCheck,
  phone: Smartphone,
  location: MapPin,
};

const KIND_TONE: Record<VerificationKind, string> = {
  ghanaCard: 'bg-purple/12 text-ink-purple',
  phone: 'bg-info/12 text-ink-blue',
  location: 'bg-accent/12 text-ink-green',
};

/** A small pill: icon and the check's name. */
export function KindChip({ kind, className }: { kind: VerificationKind; className?: string }) {
  const Icon = KIND_ICON[kind];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold whitespace-nowrap',
        KIND_TONE[kind],
        className,
      )}
    >
      <Icon size={13} aria-hidden="true" />
      {KIND_LABEL[kind]}
    </span>
  );
}

/** "+233241234567" → "+233 24 123 4567". */
function formatPhone(phone: string): string {
  const match = phone.match(/^\+233(\d{2})(\d{3})(\d{4})$/);
  return match ? `+233 ${match[1]} ${match[2]} ${match[3]}` : phone;
}

/** The submitted value as reviewers read it (a Ghana Card is always masked). */
export function displayValue(request: VerificationRequest): string {
  if (request.kind === 'phone') return formatPhone(request.submittedValue);
  if (request.kind === 'location') {
    const point = parseLocation(request.submittedValue);
    return point ? formatGPS(point.lat, point.lng) : request.submittedValue;
  }
  return request.submittedValue;
}

// Shared with the loans pages.
export { APPROVE_CLASS, REJECT_CLASS } from '@/components/admin/shared/action-styles';

/** A keyboard key in a hint ("A Approve"). */
export function Kbd({ children }: { children: string }) {
  return (
    <kbd className="border-border bg-bg-2 text-text inline-flex min-w-5 items-center justify-center rounded-md border px-1.5 py-0.5 font-mono text-[11px] leading-none font-semibold">
      {children}
    </kbd>
  );
}
