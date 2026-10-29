'use client';

import Image from 'next/image';
import { Stethoscope } from 'lucide-react';
import type { TabProps } from '@/components/admin/farmers/detail/types';
import { SEVERITY_COLORS } from '@/components/crop-doctor/diagnosis-card';
import { Badge } from '@/components/ui/badge';
import { CropTile, cropFromName } from '@/components/ui/crop-icon';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/format';

/** The farmer's saved crop diagnoses, with their photo thumbnails where saved. */
export function DiagnosesTab({ data }: TabProps) {
  const { diagnoses } = data.detail;
  if (diagnoses.length === 0) {
    return <EmptyState icon={Stethoscope} title="No saved diagnoses" />;
  }
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {diagnoses.map((d) => (
        <li key={d.id} className="border-border bg-glass overflow-hidden rounded-2xl border">
          <div className="bg-bg-2 relative flex h-36 items-center justify-center">
            {d.imageThumb ? (
              <Image
                src={d.imageThumb}
                fill
                sizes="(max-width: 640px) 100vw, 320px"
                alt={`${d.crop ?? 'Crop'} photo for ${d.disease}`}
                unoptimized
                className="object-cover"
              />
            ) : (
              <CropTile crop={cropFromName(d.crop ?? 'Other')} />
            )}
            <span className="absolute top-2.5 left-2.5">
              <Badge color={SEVERITY_COLORS[d.severity]}>{d.severity}</Badge>
            </span>
          </div>
          <div className="p-3.5">
            <p className="text-text text-sm font-semibold">{d.disease}</p>
            <p className="text-text-mute text-xs">
              {d.crop ?? 'Unknown crop'} · {d.confidence}% confidence ·{' '}
              {formatDate(new Date(d.date))}
            </p>
            <p className="text-text-dim mt-2 line-clamp-3 text-xs">{d.treatment}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
