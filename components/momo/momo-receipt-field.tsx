'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Camera, FileText, ImagePlus, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { prepareReceipt, RECEIPT_ACCEPT } from '@/lib/momo-receipt';
import { cn } from '@/lib/utils';

/**
 * The MoMo receipt (required for a new transaction): a photo from the camera or a file, shown as a
 * preview, sent with the transaction for AgriCtec's review.
 */
export function MomoReceiptField({
  file,
  onChange,
  error,
  disabled,
  label = 'MoMo receipt',
  hint = 'A photo or screenshot of the MoMo message or receipt (JPG, PNG, WEBP or PDF, up to 5 MB). AgriCtec checks it before the transaction is verified.',
  required = true,
}: {
  file: File | null;
  onChange: (file: File | null, error?: string) => void;
  error?: string;
  disabled?: boolean;
  label?: string;
  hint?: string;
  required?: boolean;
}) {
  const id = useId();
  const pick = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file || file.type === 'application/pdf') {
      setPreview(undefined);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function choose(chosen?: File) {
    if (!chosen) return;
    setBusy(true);
    try {
      onChange(await prepareReceipt(chosen));
    } catch (cause) {
      onChange(null, cause instanceof Error ? cause.message : 'Choose the receipt again.');
    } finally {
      setBusy(false);
    }
  }

  const input = (ref: typeof pick, capture?: boolean) => (
    <input
      ref={ref}
      type="file"
      accept={capture ? 'image/*' : RECEIPT_ACCEPT}
      {...(capture ? { capture: 'environment' as const } : {})}
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      onChange={(event) => {
        void choose(event.target.files?.[0]);
        event.target.value = '';
      }}
    />
  );

  return (
    <fieldset aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}>
      <legend className="text-text text-sm font-semibold">
        {label}{' '}
        {required ? (
          <span className="text-ink-red">*</span>
        ) : (
          <span className="text-text-mute font-normal">(optional)</span>
        )}
      </legend>
      <p id={`${id}-hint`} className="text-text-dim mt-0.5 text-xs leading-relaxed">
        {hint}
      </p>
      {input(pick)}
      {input(camera, true)}

      {file ? (
        <div className="border-accent/40 bg-accent/6 mt-2 flex items-center gap-3 rounded-xl border p-2.5">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local preview of the chosen file
            <img
              src={preview}
              alt="Receipt preview"
              className="size-14 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <span className="bg-icon-bg text-icon inline-flex size-14 shrink-0 items-center justify-center rounded-lg">
              <FileText size={24} aria-hidden="true" />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="text-text block truncate text-sm font-semibold">{file.name}</span>
            <span className="text-ink-green flex items-center gap-1 text-xs">
              <ShieldCheck size={13} aria-hidden="true" />{' '}
              {required ? 'Ready to send for review' : 'Saved with the record'}
            </span>
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(null)}
            aria-label="Remove the receipt"
            className="text-text-mute hover:bg-glass-strong hover:text-text inline-flex size-10 shrink-0 items-center justify-center rounded-lg"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div
          className={cn(
            'mt-2 grid grid-cols-2 gap-2 rounded-xl border border-dashed p-2.5',
            error ? 'border-danger/60' : 'border-accent/45',
          )}
        >
          <Button
            type="button"
            variant="ghost"
            icon={Camera}
            loading={busy}
            disabled={disabled}
            onClick={() => camera.current?.click()}
            className="min-w-0 px-2"
          >
            Take photo
          </Button>
          <Button
            type="button"
            variant="ghost"
            icon={ImagePlus}
            disabled={disabled || busy}
            onClick={() => pick.current?.click()}
            className="min-w-0 px-2"
          >
            Choose file
          </Button>
        </div>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-ink-red mt-1.5 text-xs font-medium">
          {error}
        </p>
      )}
    </fieldset>
  );
}
