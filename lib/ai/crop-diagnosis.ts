// Replace the body of diagnoseCrop with a call to a real plant-disease vision API later;
// keep the same input/output types so the upload and result components do not change.
import { DEFAULT_DIAGNOSES } from '@/lib/admin/defaults';
import { imageValidationError } from '@/lib/image/compress';
import { delay } from '@/services/storage';
import type { Crop, DiagnosisResult } from '@/types';
import type { DiagnosisContent } from '@/types/admin';

/**
 * The fields a diagnosis result carries (the catalogue also has an id, an active flag and an
 * optional confidence range). With a range, the confidence is picked within it from the photo's
 * hash, so the same photo always gets the same number.
 */
const toResult = (
  {
    disease,
    severity,
    confidence,
    confidenceMin,
    confidenceMax,
    treatment,
    prevention,
    crop,
  }: DiagnosisContent,
  hash: number,
): DiagnosisResult => ({
  disease,
  severity,
  confidence:
    confidenceMin !== undefined && confidenceMax !== undefined
      ? confidenceMin + ((hash >>> 8) % (confidenceMax - confidenceMin + 1))
      : confidence,
  treatment,
  ...(prevention && prevention.length > 0 && { prevention: [...prevention] }),
  ...(crop && { crop }),
});

/**
 * `catalog` is the admin's crop-diagnosis content; only active entries are used.
 * The defaults are the original mock diagnoses, in the same order.
 */
export async function diagnoseCrop(
  file: File,
  crop?: Crop,
  catalog: DiagnosisContent[] = DEFAULT_DIAGNOSES,
): Promise<DiagnosisResult> {
  const validationError = imageValidationError(file);
  if (validationError) throw new Error(validationError);
  await delay(1500);

  const active = catalog.filter((diagnosis) => diagnosis.active);
  if (active.length === 0) throw new Error('The crop doctor is not available right now.');

  // This is a repeatable demonstration, not image recognition. Metadata seeds the pick.
  let hash = 2166136261;
  for (const character of `${file.name}:${file.size}`) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  }
  const forCrop = crop
    ? active.filter((diagnosis) => diagnosis.crop === crop || !diagnosis.crop)
    : active;
  const candidates = forCrop.length ? forCrop : active;
  const diagnosis = toResult(candidates[hash % candidates.length], hash);
  return { ...diagnosis, crop: crop ?? diagnosis.crop };
}
