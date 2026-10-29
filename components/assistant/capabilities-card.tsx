import {
  Bug,
  ChartNoAxesCombined,
  CloudSun,
  Languages,
  Lightbulb,
  Sprout,
  Wallet,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const capabilities = [
  {
    icon: Sprout,
    title: 'Crop advisory',
    description: 'Planting, nutrition and crop care.',
    tone: 'bg-accent/10 text-ink-green',
  },
  {
    icon: Bug,
    title: 'Pest & disease',
    description: 'Identify damage and take action.',
    tone: 'bg-gold/10 text-ink-gold',
  },
  {
    icon: CloudSun,
    title: 'Weather intelligence',
    description: 'Simulated conditions, practical tips.',
    tone: 'bg-info/10 text-ink-blue',
  },
  {
    icon: Wallet,
    title: 'Financial planning',
    description: 'Your profit, expenses and credit.',
    tone: 'bg-purple/10 text-ink-purple',
  },
  {
    icon: ChartNoAxesCombined,
    title: 'Market analysis',
    description: 'Indicative cocoa market prices.',
    tone: 'bg-accent/10 text-ink-green',
  },
  {
    icon: Languages,
    title: 'In your language',
    description: 'English now. Twi, Ga and Ewe soon.',
    tone: 'bg-info/10 text-ink-blue',
  },
];

export function CapabilitiesCard() {
  return (
    <Card className="rounded-3xl">
      <p className="text-text-mute text-[10px] font-semibold tracking-[0.14em] uppercase">
        A helping hand
      </p>
      <h3 className="text-text mt-2 text-base font-bold">Made for your everyday</h3>
      <ul className="divide-border mt-4 divide-y">
        {capabilities.map(({ icon: Icon, title, description, tone }) => (
          <li key={title} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <span
              className={cn(
                'inline-flex size-8 shrink-0 items-center justify-center rounded-xl',
                tone,
              )}
            >
              <Icon size={16} aria-hidden="true" />
            </span>
            <div>
              <p className="text-text text-xs font-semibold">{title}</p>
              <p className="text-text-mute mt-1 text-[11px] leading-relaxed">{description}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="border-border mt-5 flex items-start gap-2 border-t pt-4">
        <Lightbulb size={14} aria-hidden="true" className="text-ink-gold mt-0.5 shrink-0" />
        <p className="text-text-mute text-[11px] leading-relaxed">
          Replies are rule-based. Your local MoFA extension officer can help with advice specific to
          your field.
        </p>
      </div>
    </Card>
  );
}
