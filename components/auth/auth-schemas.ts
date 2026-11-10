import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email('Enter a valid email address')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * Why a farmer's NEW password is too weak, or null: 8+ characters with a letter and a number
 * (the API checks the same rule). Signing in with an older password is not affected.
 */
export function farmerPasswordProblem(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 200) return 'Password must be at most 200 characters';
  if (!/[a-z]/i.test(password) || !/\d/.test(password))
    return 'Password needs at least one letter and one number';
  return null;
}

/** A new farmer password, as a zod field. */
export const newFarmerPassword = z.string().superRefine((password, ctx) => {
  const problem = farmerPasswordProblem(password);
  if (problem) ctx.addIssue({ code: 'custom', message: problem });
});

export const signupSchema = loginSchema
  .extend({
    password: newFarmerPassword,
    name: z.string().trim().min(2, 'Enter your full name'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;

export const DEFAULT_AFTER_LOGIN = '/dashboard';

/** A made-up origin, only to resolve a path the way the browser will. */
const PROBE_ORIGIN = 'https://agrictec.invalid';

/**
 * Only same-site paths are allowed as a post-login redirect ("/records", not "https://evil.com",
 * "//evil.com", "/\evil.com" or "/\t/evil.com"), which prevents open redirects through ?next=.
 * Browsers drop tabs and newlines from URLs and read "\" as "/", so the path is resolved exactly
 * as the browser would and must stay on this site. API routes are never a destination.
 */
export function safeNextPath(value: string | string[] | undefined): string {
  const path = Array.isArray(value) ? value[0] : value;
  // Control characters (tab, newline…) and backslashes have no place in an app path.
  if (!path || !path.startsWith('/') || /[\u0000-\u001f\u007f\\]/.test(path)) {
    return DEFAULT_AFTER_LOGIN;
  }
  let resolved: URL;
  try {
    resolved = new URL(path, PROBE_ORIGIN);
  } catch {
    return DEFAULT_AFTER_LOGIN;
  }
  if (resolved.origin !== PROBE_ORIGIN || resolved.pathname.startsWith('/api/')) {
    return DEFAULT_AFTER_LOGIN;
  }
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

export type PasswordStrength = 'Weak' | 'Okay' | 'Strong';

/** Rates a password by its length and how many kinds of character it mixes. */
export function passwordStrength(password: string): PasswordStrength {
  const kinds = [/[a-z]/i, /\d/, /[^a-z\d]/i].filter((pattern) => pattern.test(password)).length;
  if (password.length < 8 || kinds === 1) return 'Weak';
  if (password.length >= 12 && kinds === 3) return 'Strong';
  return 'Okay';
}
