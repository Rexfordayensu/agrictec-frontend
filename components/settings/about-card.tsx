'use client';

import { Database, Flag, Info, Sparkles } from 'lucide-react';
import { BrandLogo } from '@/components/layout/brand-logo';
import { LegalLinks } from '@/components/legal/legal-document';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { usePlatformStore } from '@/store/platform-store';

export function AboutCard() {
  // Only claimed while Claude actually powers the assistant and the crop doctor.
  const aiOn = usePlatformStore((s) => s.ai.mode === 'claude');
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
        <Badge>
          <Flag size={11} aria-hidden="true" />
          Built for Ghana
        </Badge>
        {aiOn && (
          <Badge color="purple">
            <Sparkles size={11} aria-hidden="true" />
            AI assistant &amp; crop doctor
          </Badge>
        )}
        <Badge color="gold">
          <Database size={11} aria-hidden="true" />
          Data saved to your account
        </Badge>
      </div>
      <LegalLinks className="mt-4 justify-start" />
    </Card>
  );
}
