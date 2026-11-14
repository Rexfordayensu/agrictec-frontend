import { adminPath } from '@/lib/admin-path';
import { z } from 'zod';
import { safeNextPath } from '@/components/auth/auth-schemas';
import { ADMIN_PASSWORD_RULES } from '@/lib/admin/passwords';

export const ADMIN_HOME_PATH = adminPath('/admin');

export const adminLoginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
export type AdminLoginValues = z.infer<typeof adminLoginSchema>;

/** New password: the admin policy, confirmed, and different from the current one. */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().refine((p) => ADMIN_PASSWORD_RULES.every((rule) => rule.test(p)), {
      message: 'Your new password does not meet every rule below',
    }),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: 'Choose a password different from your current one',
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

/** Only admin-console paths are allowed after sign-in (never another site or the farmer app). */
export function safeAdminNext(value: string | string[] | undefined): string {
  // The same checks as the farmer's ?next= (same site, no control characters), resolved as the
  // browser will ("/admin/../login" is not the console).
  const next = safeNextPath(value);
  const pathname = next.split(/[?#]/)[0];
  return pathname === ADMIN_HOME_PATH || pathname.startsWith(`${ADMIN_HOME_PATH}/`)
    ? next
    : ADMIN_HOME_PATH;
}

/** Why the console sent the admin back to the login page. */
export type AdminLoginReason = 'timeout' | 'signed-out';

export function parseLoginReason(
  value: string | string[] | undefined,
): AdminLoginReason | undefined {
  const reason = Array.isArray(value) ? value[0] : value;
  return reason === 'timeout' || reason === 'signed-out' ? reason : undefined;
}
