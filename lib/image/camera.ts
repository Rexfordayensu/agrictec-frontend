export async function openCropCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera preview unavailable');
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1600 },
      height: { ideal: 1200 },
    },
  });
}

/** Turn the current camera frame into the same File used by the upload/diagnosis flow. */
export async function captureCameraFrame(video: HTMLVideoElement): Promise<File> {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    throw new Error('Wait for the camera preview, then try again.');
  }
  const scale = Math.min(1, 1600 / video.videoWidth, 1600 / video.videoHeight);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not capture this photo. Try the phone camera instead.');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (image) =>
        image
          ? resolve(image)
          : reject(new Error('Could not capture this photo. Please try again.')),
      'image/jpeg',
      0.9,
    );
  });
  return new File([blob], `crop-photo-${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`, {
    type: blob.type,
  });
}

export function stopCameraStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop());
}
