'use client';

import { useId, useRef, useState } from 'react';
import { Camera, CloudUpload, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CameraCapture } from '@/components/crop-doctor/camera-capture';
import { imageValidationError } from '@/lib/image/compress';
import { cn } from '@/lib/utils';

/** Viewfinder corner accents around the drop zone. */
function Corners({ active }: { active: boolean }) {
  const base = cn(
    'pointer-events-none absolute size-6 transition-colors',
    active ? 'border-[#34d399]' : 'border-accent/50 group-hover:border-[#34d399]',
  );
  return (
    <span aria-hidden="true">
      <span className={`${base} top-3 left-3 rounded-tl-xl border-t-[3px] border-l-[3px]`} />
      <span className={`${base} top-3 right-3 rounded-tr-xl border-t-[3px] border-r-[3px]`} />
      <span className={`${base} bottom-3 left-3 rounded-bl-xl border-b-[3px] border-l-[3px]`} />
      <span className={`${base} right-3 bottom-3 rounded-br-xl border-r-[3px] border-b-[3px]`} />
    </span>
  );
}

export function UploadZone({
  onFile,
  disabled = false,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const hintId = useId();

  function acceptFile(file?: File) {
    if (!file || disabled) return;
    const error = imageValidationError(file);
    if (error) return toast.error(error);
    onFile(file);
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        tabIndex={-1}
        aria-label="Choose a crop image"
        disabled={disabled}
        onChange={(event) => {
          acceptFile(event.currentTarget.files?.[0]);
          event.currentTarget.value = '';
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        capture="environment"
        className="hidden"
        tabIndex={-1}
        aria-label="Take a crop photo"
        disabled={disabled}
        onChange={(event) => {
          acceptFile(event.currentTarget.files?.[0]);
          event.currentTarget.value = '';
        }}
      />
      <div className="mb-3">
        <div role="group" aria-label="Crop photo options" className="grid grid-cols-2 gap-2">
          <Button
            icon={Camera}
            disabled={disabled}
            onClick={() => setCameraOpen(true)}
            className="min-w-0 px-2 text-xs sm:px-3"
          >
            Take photo
          </Button>
          <Button
            variant="ghost"
            icon={ImagePlus}
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="min-w-0 px-2 text-xs sm:px-3"
          >
            Upload photo
          </Button>
        </div>
        <p className="text-text-mute mt-2 text-center text-[11px] leading-relaxed">
          Use your rear camera for a clear, close-up leaf photo.
        </p>
      </div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload crop image"
        aria-describedby={hintId}
        aria-disabled={disabled}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (!disabled) inputRef.current?.click();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) {
            dragDepth.current++;
            setDragging(true);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = disabled ? 'none' : 'copy';
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          acceptFile(event.dataTransfer.files[0]);
        }}
        className={cn(
          'group relative flex min-h-72 flex-col items-center justify-center overflow-hidden rounded-2xl border px-6 py-10 text-center transition-all duration-200',
          dragging
            ? 'border-accent bg-accent/15 shadow-[0_0_0_4px_var(--accent-glow)]'
            : 'border-border from-accent/10 to-purple/10 hover:border-accent/50 bg-linear-to-br via-transparent',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        )}
      >
        <Corners active={dragging} />
        <span className="relative mb-5 inline-flex size-16 items-center justify-center rounded-2xl bg-linear-to-br from-[#10b981] to-[#34d399] text-white shadow-[0_10px_30px_-8px_var(--accent-glow)] transition-transform duration-300 group-hover:scale-110">
          <CloudUpload size={30} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <p className="text-text text-base font-bold">
          {dragging ? 'Drop your crop image here' : 'Drop a leaf photo here'}
        </p>
        <p className="text-text-dim mt-1 text-sm">or click to browse your photos</p>
        <p
          id={hintId}
          className="bg-glass-strong text-text-mute mt-3 rounded-full px-3 py-1 text-xs"
        >
          PNG, JPG or WEBP up to 10MB
        </p>
      </div>
      {cameraOpen && (
        <CameraCapture
          onClose={() => setCameraOpen(false)}
          onNativeCamera={() => {
            setCameraOpen(false);
            cameraRef.current?.click();
          }}
          onCapture={(file) => {
            setCameraOpen(false);
            acceptFile(file);
          }}
        />
      )}
    </>
  );
}
