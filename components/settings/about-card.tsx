import { Database, Flag, Info, Sparkles } from 'lucide-react';
import { BrandLogo } from '@/components/layout/brand-logo';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export function AboutCard() {
  return (
    <Card className="rounded-3xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <BrandLogo />
        <span className="text-text-mute inline-flex items-center gap-1.5 text-xs">
          <Info size={14} aria-hidden="true" />
          About AgriCtec
        </span>
      </div>
      <p className="text-text-dim mt-4 max-w-3xl text-sm leading-relaxed">
        AgriCtec turns farm records into a trusted digital financial identity, helping farmers track
        income, build credit readiness and access finance.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge color="blue">Version 3.0.0 (Next.js 16)</Badge>
        <Badge>
          <Flag size={11} aria-hidden="true" />
          Built for Ghana
        </Badge>
        <Badge color="purple">
          <Sparkles size={11} aria-hidden="true" />
          AI-Powered
        </Badge>
        <Badge color="gold">
          <Database size={11} aria-hidden="true" />
          Data stored on this device
        </Badge>
      </div>
    </Card>
  );
}
