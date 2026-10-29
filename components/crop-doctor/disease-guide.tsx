'use client';

import { BookOpen, ChevronDown } from 'lucide-react';
import { SEVERITY_COLORS } from '@/components/crop-doctor/diagnosis-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { CropTile } from '@/components/ui/crop-icon';
import { usePlatformStore } from '@/store/platform-store';

/** Common crop problems in Ghana, with their treatments, as expandable cards. */
export function DiseaseGuide() {
  // The admin's active diagnoses (defaults: the original guide).
  const catalog = usePlatformStore((s) => s.diagnoses);
  const diseases = catalog.filter((d) => d.active && d.severity !== 'None');

  return (
    <Card className="@container rounded-3xl">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <BookOpen size={17} aria-hidden="true" className="text-ink-gold" />
            Disease Guide
          </CardTitle>
          <CardSub>Common crop problems in Ghana and how to treat them</CardSub>
        </div>
      </CardHeader>
      <ul className="grid grid-cols-1 gap-3 @2xl:grid-cols-2">
        {diseases.map((d) => (
          <li key={d.id}>
            <details className="group border-border bg-glass open:border-accent/40 rounded-2xl border">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 p-3.5 [&::-webkit-details-marker]:hidden">
                <CropTile crop={d.crop ?? 'Other'} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="text-text block text-sm font-semibold">{d.disease}</span>
                  <span className="text-text-mute block text-xs">{d.crop}</span>
                </span>
                <Badge color={SEVERITY_COLORS[d.severity]}>{d.severity}</Badge>
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className="text-text-mute shrink-0 transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="border-border text-text-dim border-t px-3.5 py-3 text-sm leading-relaxed">
                {d.treatment}
              </p>
            </details>
          </li>
        ))}
      </ul>
    </Card>
  );
}
