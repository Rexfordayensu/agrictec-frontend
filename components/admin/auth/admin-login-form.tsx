'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Clock, Info, LogIn } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  adminLoginSchema,
  type AdminLoginReason,
  type AdminLoginValues,
} from '@/components/admin/auth/admin-auth-schemas';
import { ChangePasswordForm } from '@/components/admin/auth/change-password-form';
import { FormAlert } from '@/components/auth/form-alert';
import { PasswordInput } from '@/components/auth/password-input';
import { lockedUntil as lockEnd, SignInLockAlert, useSignInLock } from '@/components/auth/sign-in-lock';
import { Button } from '@/components/ui/button';
import { FormField, fieldErrorId } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { ADMIN_IDLE_MINUTES } from '@/lib/admin/admin-session';
import { useAdminAuthStore } from '@/store/admin/admin-auth-store';

const REASON_NOTICE: Record<AdminLoginReason, string> = {
  timeout: `Signed out after ${ADMIN_IDLE_MINUTES} minutes of inactivity.`,
  'signed-out': 'You have been signed out.',
};

export function AdminLoginForm({ next, reason }: { next: string; reason?: AdminLoginReason }) {
  const router = useRouter();
  const signIn = useAdminAuthStore((s) => s.signIn);
  const [formError, setFormError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  // Set when the admin must replace a temporary password before entering the console.
  const [forcedChange, setForcedChange] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const unlock = useCallback(() => {
    setLockedUntil(null);
    setFormError(null);
  }, []);
  const remaining = useSignInLock(lockedUntil, unlock);
  const locked = remaining !== null;

  function enterConsole() {
    toast.success('Welcome back');
    router.replace(next);
    router.refresh();
  }

  async function onSubmit(values: AdminLoginValues) {
    setFormError(null);
    try {
      const admin = await signIn(values.email, values.password);
      if (admin.mustChangePassword) setForcedChange(values.password);
      else enterConsole();
    } catch (error) {
      // Five wrong passwords from this address lock the email here for five minutes (423, with
      // when it ends). The lock is on the server, so it survives reloads.
      const until = lockEnd(error);
      if (until) setLockedUntil(until);
      else setFormError(error instanceof Error ? error.message : 'Could not sign in');
    }
  }

  if (forcedChange !== null) {
    return <ChangePasswordForm forced currentPassword={forcedChange} onDone={enterConsole} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-text text-2xl font-bold">AgriCtec Admin</h1>
        <p className="text-text-dim mt-1 text-sm">Sign in with your staff account.</p>
      </div>

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {reason && !formError && !locked && (
          <div
            role="status"
            className="border-info/40 bg-info/10 text-ink-blue flex items-start gap-2 rounded-xl border px-3.5 py-3 text-sm"
          >
            {reason === 'timeout' ? (
              <Clock size={18} aria-hidden="true" className="mt-px shrink-0" />
            ) : (
              <Info size={18} aria-hidden="true" className="mt-px shrink-0" />
            )}
            <span>{REASON_NOTICE[reason]}</span>
          </div>
        )}
        {locked && lockedUntil && <SignInLockAlert until={lockedUntil} remaining={remaining} />}
        {formError && !locked && <FormAlert icon={AlertCircle}>{formError}</FormAlert>}

        <fieldset disabled={locked || isSubmitting} className="space-y-4">
          <FormField label="Email" htmlFor="admin-email" error={errors.email?.message}>
            <Input
              id="admin-email"
              type="email"
              autoComplete="username"
              inputMode="email"
              placeholder="you@agrictec.app"
              error={Boolean(errors.email)}
              aria-describedby={errors.email ? fieldErrorId('admin-email') : undefined}
              {...register('email')}
            />
          </FormField>

          <FormField label="Password" htmlFor="admin-password" error={errors.password?.message}>
            <PasswordInput
              id="admin-password"
              autoComplete="current-password"
              error={Boolean(errors.password)}
              aria-describedby={errors.password ? fieldErrorId('admin-password') : undefined}
              {...register('password')}
            />
          </FormField>
        </fieldset>

        <Button
          type="submit"
          icon={LogIn}
          loading={isSubmitting}
          disabled={locked}
          className="w-full"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
