'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Loader2, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { captureCameraFrame, openCropCamera, stopCameraStream } from '@/lib/image/camera';

function cameraError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return 'Camera access was not allowed. You can allow it in your browser settings or use the phone camera below.';
    }
    if (error.name === 'NotFoundError')
      return 'No camera was found. Use the phone camera or upload a saved photo.';
    if (error.name === 'NotReadableError')
      return 'Your camera may be in use by another app. Close it and try again, or use the phone camera below.';
  }
  return 'Live camera preview is unavailable here. Use the phone camera below to take your crop photo.';
}

export function CameraCapture({
  onCapture,
  onClose,
  onNativeCamera,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
  onNativeCamera: () => void;
}) {
  return (
    <Modal open title="Take a crop photo" onClose={onClose}>
      <CameraView onCapture={onCapture} onClose={onClose} onNativeCamera={onNativeCamera} />
    </Modal>
  );
}

function CameraView({
  onCapture,
  onClose,
  onNativeCamera,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
  onNativeCamera: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const active = useRef(true);
  const captureLock = useRef(false);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | undefined;
    const video = videoRef.current;
    active.current = true;

    async function start() {
      const opened = await openCropCamera();
      if (cancelled || !active.current || !video) {
        stopCameraStream(opened);
        return;
      }
      stream = opened;
      streamRef.current = opened;
      video.srcObject = opened;
      await video.play();
    }

    void start().catch((cause: unknown) => {
      stopCameraStream(stream);
      if (streamRef.current === stream) streamRef.current = null;
      if (!cancelled) setError(cameraError(cause));
    });

    return () => {
      cancelled = true;
      active.current = false;
      stopCameraStream(stream);
      if (streamRef.current === stream) streamRef.current = null;
      if (video) {
        video.pause();
        video.srcObject = null;
      }
    };
  }, []);

  function releaseCamera() {
    active.current = false;
    stopCameraStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  }

  async function capture() {
    if (!videoRef.current || !ready || error || captureLock.current) return;
    captureLock.current = true;
    setCapturing(true);
    try {
      const file = await captureCameraFrame(videoRef.current);
      if (active.current) {
        releaseCamera();
        onCapture(file);
      }
    } catch (cause) {
      if (active.current)
        setError(
          cause instanceof Error
            ? cause.message
            : 'Could not capture this photo. Please try again.',
        );
    } finally {
      captureLock.current = false;
      if (active.current) setCapturing(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-text-dim text-sm">
        Point your rear camera at the crop. Keep the leaf in focus and use good natural light.
      </p>
      <div className="relative aspect-[4/3] max-h-[55dvh] overflow-hidden rounded-2xl bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          aria-label="Live crop camera preview"
          onLoadedData={() => setReady(true)}
          className="size-full object-contain"
        />
        {!ready && !error && (
          <div
            role="status"
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black text-center text-white"
          >
            <Loader2 size={28} className="animate-spin" aria-hidden="true" />
            <p className="px-4 text-sm">Allow camera access to open the preview…</p>
          </div>
        )}
        {ready && !error && (
          <ScanLine
            size={48}
            strokeWidth={1}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/70"
          />
        )}
        {error && (
          <div
            role="alert"
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black px-5 text-center text-white"
          >
            <CameraOff size={28} aria-hidden="true" />
            <p className="text-sm leading-relaxed">{error}</p>
          </div>
        )}
      </div>
      <Button
        icon={Camera}
        loading={capturing}
        disabled={!ready || Boolean(error)}
        onClick={() => void capture()}
        className="w-full"
      >
        Capture photo
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="ghost"
          size="sm"
          icon={Camera}
          onClick={() => {
            releaseCamera();
            onNativeCamera();
          }}
          disabled={capturing}
          className="min-w-0 px-2 whitespace-normal"
        >
          Use phone camera
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
      <p className="text-text-mute text-center text-[11px]">
        The captured photo goes straight to your crop preview and diagnosis.
      </p>
    </div>
  );
}
