import {
  CalendarClock,
  Copy,
  IdCard,
  Layers,
  Smartphone,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { SEVERITY_LABELS } from '@/lib/admin/risk-rules';
import { cn } from '@/lib/utils';
import type { RiskFlag, RiskRuleId } from '@/types/admin';

/** One icon per rule, so a list of flags scans by kind at a glance. */
export const RULE_ICONS: Record<RiskRuleId, LucideIcon> = {
  duplicate_momo_ref: Copy,
  amount_outlier: TrendingUp,
  burst_entries: Layers,
  income_spike: TrendingUp,
  shared_phone: Smartphone,
  shared_ghana_card: IdCard,
  backdated_bulk: CalendarClock,
};

const DOT: Record<RiskFlag['severity'], string> = {
  high: 'bg-danger shadow-[0_0_0_3px_rgba(239,68,68,0.2)]',
  medium: 'bg-gold shadow-[0_0_0_3px_rgba(245,196,81,0.2)]',
  low: 'bg-info shadow-[0_0_0_3px_rgba(59,130,246,0.2)]',
};

const TEXT: Record<RiskFlag['severity'], string> = {
  high: 'text-ink-red',
  medium: 'text-ink-gold',
  low: 'text-ink-blue',
};

/** A coloured dot with the severity as text (visible, or for screen readers only). */
export function SeverityDot({
  severity,
  showLabel = false,
  className,
}: {
  severity: RiskFlag['severity'];
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span aria-hidden="true" className={cn('size-2.5 shrink-0 rounded-full', DOT[severity])} />
      <span className={showLabel ? cn('text-xs font-semibold', TEXT[severity]) : 'sr-only'}>
        {SEVERITY_LABELS[severity]}
      </span>
    </span>
  );
}
