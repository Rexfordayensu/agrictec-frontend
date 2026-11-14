// MoMo receipts: what the server accepts (JPG, PNG, WEBP or PDF, at most 5 MB) and a resize for
// phone photos, which are often larger than that.

export const RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
export const RECEIPT_ACCEPT = RECEIPT_TYPES.join(',');
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
/** Photos above this are resized before upload (the server keeps a clear copy for review). */
const RESIZE_ABOVE = 2 * 1024 * 1024;
const MAX_SIDE = 2000;

/** Why this file can't be a receipt, or null when it can. */
export function receiptError(
  file: Pick<File, 'type' | 'size'>,
  { resizable = true } = {},
): string | null {
  if (!(RECEIPT_TYPES as readonly string[]).includes(file.type))
    return 'Use a photo (JPG, PNG or WEBP) or a PDF of the MoMo receipt.';
  if (file.size === 0) return 'This file is empty. Choose the receipt again.';
  const tooBig = file.size > MAX_RECEIPT_BYTES;
  if (tooBig && (file.type === 'application/pdf' || !resizable))
    return 'The receipt must be 5 MB or smaller.';
  return null;
}

/** A large photo is redrawn at most 2000px wide or tall as a JPEG; PDFs and small files pass as they are. */
export async function prepareReceipt(file: File): Promise<File> {
  const error = receiptError(file);
  if (error) throw new Error(error);
  if (file.type === 'application/pdf' || file.size <= RESIZE_ABOVE) return file;
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () =>
        reject(new Error('This photo could not be read. Take it again or choose another.'));
      img.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / image.naturalWidth, MAX_SIDE / image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    );
    if (!blob) throw new Error('This photo could not be prepared. Choose another.');
    const resized = new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', {
      type: 'image/jpeg',
    });
    const sizeError = receiptError(resized, { resizable: false });
    if (sizeError) throw new Error(sizeError);
    return resized;
  } finally {
    URL.revokeObjectURL(url);
  }
}
