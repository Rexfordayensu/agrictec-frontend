'use client';

import { useId, useRef, useState } from 'react';
import { Camera, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CameraCapture } from '@/components/crop-doctor/camera-capture';
import { imageValidationError } from '@/lib/image/compress';
import { cn } from '@/lib/utils';

/**
 * The dashed photo area: drop a file anywhere on it, click (or Enter on) the prompt to browse,
 * or use Take photo (live rear camera, falling back to the phone's camera app) / Upload photo.
 */
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

  const browse = () => {
    if (!disabled) inputRef.current?.click();
  };

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
      <div
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
          'flex flex-col items-center rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-colors sm:px-6',
          dragging
            ? 'border-accent bg-accent/15 shadow-[0_0_0_4px_var(--accent-glow)]'
            : 'border-accent/45 bg-accent/5',
          disabled && 'opacity-60',
        )}
      >
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Upload crop image"
          aria-describedby={hintId}
          aria-disabled={disabled}
          onClick={browse}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              browse();
            }
          }}
          className={cn(
            'group focus-visible:outline-accent flex flex-col items-center rounded-2xl px-3 py-1 focus-visible:outline-2',
            disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          )}
        >
          <span className="bg-icon-bg text-icon inline-flex size-16 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105">
            <Camera size={30} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <p className="text-text mt-4 text-lg font-bold">
            {dragging ? 'Drop your leaf photo here' : 'Take or upload a leaf photo'}
          </p>
          <p className="text-text-dim mt-1 text-sm">Drop a file here, or choose an option below.</p>
        </div>
        <div
          role="group"
          aria-label="Crop photo options"
          className="mt-5 grid w-full max-w-sm grid-cols-2 gap-3"
        >
          <Button
            icon={Camera}
            disabled={disabled}
            onClick={() => setCameraOpen(true)}
            className="min-w-0 px-3"
          >
            Take photo
          </Button>
          <Button
            variant="ghost"
            icon={ImagePlus}
            disabled={disabled}
            onClick={browse}
            className="min-w-0 px-3"
          >
            Upload photo
          </Button>
        </div>
        <p id={hintId} className="text-text-mute mt-4 text-xs">
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
