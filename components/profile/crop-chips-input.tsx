'use client';

import { CROPS } from '@/constants/crops';
import { CropIcon } from '@/components/ui/crop-icon';
import { cn } from '@/lib/utils';
import type { Crop } from '@/types';

export function CropChipsInput({
  value,
  onChange,
  disabled = false,
}: {
  value: string[];
  onChange: (crops: Crop[]) => void;
  disabled?: boolean;
}) {
  return (
    <div role="group" aria-label="Primary crops, choose up to 5" className="flex flex-wrap gap-2">
      {CROPS.map((crop) => {
        const selected = value.includes(crop);
        return (
          <button
            key={crop}
            type="button"
            aria-pressed={selected}
            disabled={disabled || (!selected && value.length >= 5)}
            onClick={() =>
              onChange(
                (selected ? value.filter((entry) => entry !== crop) : [...value, crop]) as Crop[],
              )
            }
            className={cn(
              'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45',
              selected
                ? 'border-accent/40 bg-accent/15 text-ink-green'
                : 'glass text-text-dim hover:border-accent/30',
            )}
          >
            <CropIcon crop={crop} size={14} />
            {crop}
          </button>
        );
      })}
    </div>
  );
}
