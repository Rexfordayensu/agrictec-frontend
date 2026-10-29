export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const CROP_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export function imageValidationError(file: Pick<File, 'type' | 'size'>): string | null {
  if (!CROP_IMAGE_TYPES.some((type) => type === file.type)) {
    return 'Please upload an image file (PNG, JPG or WEBP)';
  }
  if (file.size > MAX_IMAGE_BYTES) return 'Image is too large. Maximum size is 10MB.';
  return null;
}

/** Only the small JPEG thumbnail is persisted; the original photo stays in memory. */
export async function compressImage(file: File, maxWidth = 200, quality = 0.7): Promise<string> {
  const validationError = imageValidationError(file);
  if (validationError) throw new Error(validationError);
  if (
    !Number.isFinite(maxWidth) ||
    maxWidth < 1 ||
    !Number.isFinite(quality) ||
    quality <= 0 ||
    quality > 1
  ) {
    throw new Error('Invalid thumbnail dimensions or quality.');
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () =>
        reject(new Error('This image could not be read. Please try another photo.'));
      img.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight)
      throw new Error('This image has no readable dimensions.');
    // Bound both dimensions to keep even very tall photos small, preserving the aspect ratio.
    const scale = Math.min(1, maxWidth / image.naturalWidth, maxWidth / image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser could not create a thumbnail.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const thumbnail = canvas.toDataURL('image/jpeg', quality);
    if (!thumbnail.startsWith('data:image/jpeg;'))
      throw new Error('Could not create a JPEG thumbnail.');
    return thumbnail;
  } finally {
    URL.revokeObjectURL(url);
  }
}
