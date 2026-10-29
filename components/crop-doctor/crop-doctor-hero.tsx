'use client';

import { formatDate } from '@/lib/format';
import { useFarmStore } from '@/store/farm-store';

export function CropDoctorHero() {
  return (
    <header>
      <h1 className="font-display text-ink-green text-2xl leading-tight font-bold sm:text-3xl">
        AI Crop Doctor
      </h1>
      <p className="text-text-dim mt-1 text-sm">Choose your crop and add a clear leaf photo.</p>
    </header>
  );
}

export function CropScanStats() {
  const diagnoses = useFarmStore((s) => s.diagnoses);
  const issues = diagnoses.filter((d) => d.severity !== 'None').length;
  const latest = diagnoses[0];
  const stats = [
    { label: 'Scans saved', value: String(diagnoses.length) },
    { label: 'Issues found', value: String(issues) },
    { label: 'Last scan', value: latest ? formatDate(latest.date) : 'None yet' },
  ];

  return (
    <dl className="border-border bg-glass grid grid-cols-1 gap-4 rounded-2xl border p-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label}>
          <dt className="text-text-mute text-xs">{stat.label}</dt>
          <dd className="text-text mt-1 text-sm font-bold">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}
