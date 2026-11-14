/** Score band → text and bar colour in the console (flat tints, no gradients). */
export const BAND_TONE: Record<string, { text: string; bar: string; pill: string }> = {
  Building: { text: 'text-ink-red', bar: 'bg-danger', pill: 'bg-danger/12 text-ink-red' },
  Fair: { text: 'text-ink-gold', bar: 'bg-gold', pill: 'bg-gold/15 text-ink-gold' },
  Good: { text: 'text-ink-green', bar: 'bg-accent', pill: 'bg-accent/15 text-ink-green' },
  Excellent: { text: 'text-ink-purple', bar: 'bg-purple', pill: 'bg-purple/12 text-ink-purple' },
};

/** The highest score a farmer can reach, for score bar widths. */
export const MAX_SCORE = 850;

export const bandTone = (label: string) => BAND_TONE[label] ?? BAND_TONE.Fair;
