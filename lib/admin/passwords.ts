/** A one-time password such as "Temp-48213", shown once to the admin who created it. */
export function makeTempPassword(): string {
  const [value] = crypto.getRandomValues(new Uint32Array(1));
  return `Temp-${10000 + (value % 90000)}`;
}

export const ADMIN_PASSWORD_MIN_LENGTH = 10;

/** The admin password policy. The change-password form shows these as a live checklist. */
export const ADMIN_PASSWORD_RULES = [
  {
    test: (p: string) => p.length >= ADMIN_PASSWORD_MIN_LENGTH,
    label: `At least ${ADMIN_PASSWORD_MIN_LENGTH} characters`,
  },
  { test: (p: string) => /[A-Z]/.test(p), label: 'An uppercase letter' },
  { test: (p: string) => /[a-z]/.test(p), label: 'A lowercase letter' },
  { test: (p: string) => /\d/.test(p), label: 'A number' },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: 'A symbol' },
] as const;

/** The first rule the password breaks, or null when it is strong enough. */
export function passwordProblem(password: string): string | null {
  const failed = ADMIN_PASSWORD_RULES.find((rule) => !rule.test(password));
  return failed ? `Password needs: ${failed.label.toLowerCase()}.` : null;
}
