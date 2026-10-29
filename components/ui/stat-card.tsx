import type { ReactNode } from 'react';
import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type StatColor = 'green' | 'blue' | 'purple' | 'gold';

export interface StatCardProps {
  icon: LucideIcon;
  color: StatColor;
  label: string;
  value: ReactNode;
  change?: { text: string; trend: 'up' | 'down' };
  className?: string;
}

const tiles: Record<StatColor, string> = {
  green: 'from-[#10b981] to-[#34d399] shadow-accent/40',
  blue: 'from-[#2563eb] to-[#60a5fa] shadow-info/40',
  purple: 'from-[#9333ea] to-[#c084fc] shadow-purple/40',
  gold: 'from-[#d97706] to-[#f5c451] shadow-gold/40',
};

export function StatCard({ icon: Icon, color, label, value, change, className }: StatCardProps) {
  const TrendIcon = change?.trend === 'down' ? TrendingDown : TrendingUp;
  return (
    <Card
      className={cn('transition-transform duration-200 hover:-translate-y-1', className)}
      padding="md"
    >
      <div
        className={cn(
          'mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-lg',
          tiles[color],
        )}
      >
        <Icon size={20} aria-hidden="true" />
      </div>
      <p className="text-text-mute text-[11px] font-semibold tracking-wider uppercase">{label}</p>
      <p className="text-text mt-1 text-[26px] leading-tight font-extrabold break-words">{value}</p>
      {change && (
        <p
          className={cn(
            'mt-2 flex items-center gap-1 text-xs font-medium',
            change.trend === 'up' ? 'text-ink-green' : 'text-ink-red',
          )}
        >
          <TrendIcon size={14} aria-hidden="true" />
          {change.text}
        </p>
      )}
    </Card>
  );
}
