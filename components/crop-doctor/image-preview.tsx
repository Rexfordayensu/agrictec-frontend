'use client';

import { useEffect, useRef } from 'react';
import { FileImage, ScanLine, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import styles from '@/components/crop-doctor/image-preview.module.css';
import { cn } from '@/lib/utils';

export function ImagePreview({
  file,
  analyzing,
  disabled,
  onRemove,
  onError,
}: {
  file: File;
  analyzing: boolean;
  disabled: boolean;
  onRemove: () => void;
  onError: () => void;
}) {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    const url = URL.createObjectURL(file);
    image.src = url;
    return () => {
      image.removeAttribute('src');
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const corner = cn(
    'pointer-events-none absolute size-6 transition-colors',
    analyzing ? 'border-[#34d399]' : 'border-white/70',
  );

  return (
    <div>
      <div
        className="border-border relative flex h-72 items-center justify-center overflow-hidden rounded-2xl border bg-black/80"
        aria-busy={analyzing}
      >
        {/* A local blob preview needs native image loading, not the Next.js optimizer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          alt="Uploaded crop for diagnosis"
          onError={onError}
          className="size-full object-contain"
        />
        <span aria-hidden="true">
          <span className={`${corner} top-3 left-3 rounded-tl-xl border-t-[3px] border-l-[3px]`} />
          <span className={`${corner} top-3 right-3 rounded-tr-xl border-t-[3px] border-r-[3px]`} />
          <span
            className={`${corner} bottom-3 left-3 rounded-bl-xl border-b-[3px] border-l-[3px]`}
          />
          <span
            className={`${corner} right-3 bottom-3 rounded-br-xl border-r-[3px] border-b-[3px]`}
          />
        </span>
        {analyzing && (
          <>
            <div aria-hidden="true" className={styles.scanLine} />
            <span className="absolute top-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-[#34d399] backdrop-blur">
              <ScanLine size={13} aria-hidden="true" /> Scanning
            </span>
          </>
        )}
      </div>
      <div className="border-border bg-glass mt-3 flex items-center gap-2 rounded-xl border px-3 py-2">
        <FileImage size={16} aria-hidden="true" className="text-ink-green shrink-0" />
        <p className="text-text-dim min-w-0 flex-1 truncate text-xs" title={file.name}>
          {file.name}
        </p>
        <span className="text-text-mute hidden text-[11px] sm:inline">
          {(file.size / 1024 / 1024).toFixed(1)} MB
        </span>
        <Button size="sm" variant="ghost" icon={X} onClick={onRemove} disabled={disabled}>
          Remove
        </Button>
      </div>
    </div>
  );
}
