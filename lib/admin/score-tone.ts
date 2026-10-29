/** Score band → text and bar colour in the console (flat tints, no gradients). */
export const BAND_TONE: Record<string, { text: string; bar: string }> = {
  Building: { text: 'text-ink-red', bar: 'bg-danger' },
  Fair: { text: 'text-ink-gold', bar: 'bg-gold' },
  Good: { text: 'text-ink-green', bar: 'bg-accent' },
  Excellent: { text: 'text-ink-purple', bar: 'bg-purple' },
};

/** The highest score a farmer can reach, for score bar widths. */
export const MAX_SCORE = 850;

export const bandTone = (label: string) => BAND_TONE[label] ?? BAND_TONE.Fair;
