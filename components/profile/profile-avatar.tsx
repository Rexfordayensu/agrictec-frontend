'use client';

import { useState } from 'react';
import Image from 'next/image';
import { safeProfilePhoto } from '@/lib/profile-photo';
import { cn } from '@/lib/utils';

/** Decorative identity image; the person's name is supplied by the surrounding UI. */
export function ProfileAvatar({
  name,
  photoDataUrl,
  className,
}: {
  name?: string;
  photoDataUrl?: string;
  className?: string;
}) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const photo = safeProfilePhoto(photoDataUrl);
  const initials = (name?.trim() || 'Farmer')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <span
      aria-hidden="true"
      className={cn(
        'bg-accent/15 text-ink-green inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full font-bold',
        className,
      )}
    >
      {photo && photo !== failedPhoto ? (
        <Image
          src={photo}
          alt=""
          width={160}
          height={160}
          unoptimized
          className="size-full object-cover"
          onError={() => setFailedPhoto(photo)}
        />
      ) : (
        initials
      )}
    </span>
  );
}
