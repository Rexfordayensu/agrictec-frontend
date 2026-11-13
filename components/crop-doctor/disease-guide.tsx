'use client';

import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { SEVERITY_COLORS } from '@/components/crop-doctor/diagnosis-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CropTile } from '@/components/ui/crop-icon';
import { usePlatformStore } from '@/store/platform-store';

/** Common crop problems in Ghana (the admin's active disease library), opened on request. */
export function DiseaseGuide() {
  const catalog = usePlatformStore((s) => s.diagnoses);
  const diseases = catalog.filter((d) => d.active && d.severity !== 'None');
  const [open, setOpen] = useState(false);

  return (
    <section
      aria-labelledby="guide-title"
      className="rounded-card border-border bg-glass @container/guide border p-3 sm:p-4"
    >
      <div className="bg-accent/8 flex flex-wrap items-center gap-4 rounded-2xl px-4 py-4 sm:px-5">
        <BookOpen size={32} aria-hidden="true" className="text-ink-green shrink-0" />
        <div className="min-w-48 flex-1">
          <h2 id="guide-title" className="text-text text-xl font-bold">
            Disease Guide
          </h2>
          <p className="text-text-dim text-sm">
            Learn about common crop diseases in Ghana, their signs and how to treat them.
          </p>
        </div>
        <Button
          variant="ghost"
          icon={open ? ChevronDown : ChevronRight}
          aria-expanded={open}
          aria-controls="disease-guide-list"
          disabled={diseases.length === 0}
          onClick={() => setOpen(!open)}
          className="shrink-0"
        >
          {open ? 'Hide guide' : 'Explore guide'}
        </Button>
      </div>
      {diseases.length === 0 && (
        <p className="text-text-mute px-2 pt-3 text-sm">
          The guide is empty for now. AgriCtec adds diseases as they are reviewed.
        </p>
      )}
      {open && (
        <ul id="disease-guide-list" className="mt-3 grid grid-cols-1 gap-3 @2xl/guide:grid-cols-2">
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
      )}
    </section>
  );
}
