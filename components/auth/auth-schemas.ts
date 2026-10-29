import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email('Enter a valid email address')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signupSchema = loginSchema
  .extend({
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

/**
 * Only same-site paths are allowed as a post-login redirect ("/records", not "https://evil.com"
 * or the protocol-relative "//evil.com"), which prevents open redirects through ?next=.
 */
export function safeNextPath(value: string | string[] | undefined): string {
  const path = Array.isArray(value) ? value[0] : value;
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) {
    return DEFAULT_AFTER_LOGIN;
  }
  return path;
}

export type PasswordStrength = 'Weak' | 'Okay' | 'Strong';

/** Rates a password by its length and how many kinds of character it mixes. */
export function passwordStrength(password: string): PasswordStrength {
  const kinds = [/[a-z]/i, /\d/, /[^a-z\d]/i].filter((pattern) => pattern.test(password)).length;
  if (password.length < 8 || kinds === 1) return 'Weak';
  if (password.length >= 12 && kinds === 3) return 'Strong';
  return 'Okay';
}
