'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { loginSchema, type LoginValues } from '@/components/auth/auth-schemas';
import { AuthDivider, FormAlert } from '@/components/auth/form-alert';
import { GuestButton } from '@/components/auth/guest-button';
import { NewPasswordForm } from '@/components/auth/new-password-form';
import { PasswordInput } from '@/components/auth/password-input';
import { lockedUntil as lockEnd, SignInLockAlert, useSignInLock } from '@/components/auth/sign-in-lock';
import { Button } from '@/components/ui/button';
import { FormField, fieldErrorId } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PasswordChangeRequiredError, SUSPENDED_MESSAGE } from '@/services/auth.service';
import { onboardingService } from '@/services/onboarding.service';
import { useAuthStore } from '@/store/auth-store';
import { usePlatformStore } from '@/store/platform-store';
import type { Session } from '@/types';
import './login.css';

/** Why the app sent the farmer back here (set by DataLoader). */
export type LoginReason = 'suspended' | 'deleted' | 'expired';

const REASON_MESSAGES: Record<LoginReason, string> = {
  suspended: SUSPENDED_MESSAGE,
  deleted: 'This account no longer exists. Create a new account or contact support.',
  expired: 'You were signed out after a week without using AgriCtec. Sign in again to continue.',
};

export function LoginForm({ next, reason }: { next: string; reason?: LoginReason }) {
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const [formError, setFormError] = useState<string | null>(
    reason ? REASON_MESSAGES[reason] : null,
  );
  // Five wrong passwords lock this email here for five minutes: when the lock ends.
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const unlock = useCallback(() => {
    setLockedUntil(null);
    setFormError(null);
  }, []);
  const remaining = useSignInLock(lockedUntil, unlock);
  const locked = remaining !== null;
  // Signed in with a temporary password from support: choose a new one first.
  const [temporary, setTemporary] = useState<{ email: string; password: string } | null>(null);
  // The admin can close sign-ups and guest mode.
  const { signupOpen, guestMode } = usePlatformStore((s) => s.flags);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginValues) {
    if (locked) return;
    setFormError(null);
    try {
      await enter(await signIn(values.email, values.password));
    } catch (error) {
      if (error instanceof PasswordChangeRequiredError) {
        setTemporary({ email: values.email, password: values.password });
        return;
      }
      const until = lockEnd(error);
      if (until) setLockedUntil(until);
      else setFormError(error instanceof Error ? error.message : 'Could not sign in');
    }
  }

  async function enter(session: Session, message = 'Welcome back!') {
    toast.success(message);
    // Farm setup unfinished → onboarding (it resumes on the step where they stopped).
    router.replace(await onboardingService.destinationAfterSignIn(session.userId, next));
    router.refresh();
  }

  if (temporary) {
    return (
      <NewPasswordForm
        email={temporary.email}
        temporary={temporary.password}
        onSignedIn={(session) => void enter(session, 'Password saved. Welcome back!')}
        onBack={() => setTemporary(null)}
      />
    );
  }

  return (
    <div className={'agric-login-formContent'}>
      <div className={'agric-login-heading'}>
        <h1 className="font-display text-text text-2xl font-bold">Welcome back</h1>
        <p className="text-text-dim mt-1 text-sm">Sign in to your AgriCtec account.</p>
      </div>

      <form noValidate onSubmit={handleSubmit(onSubmit)} className={'agric-login-form'}>
        {locked && lockedUntil ? (
          <SignInLockAlert until={lockedUntil} remaining={remaining} />
        ) : (
          formError && <FormAlert icon={AlertCircle}>{formError}</FormAlert>
        )}

        <FormField label="Email" htmlFor="login-email" error={errors.email?.message}>
          <div className={'agric-login-inputWrap'}>
            <Mail className={'agric-login-fieldIcon'} size={23} aria-hidden="true" />
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="agrictec@example.com"
              error={Boolean(errors.email)}
              aria-describedby={errors.email ? fieldErrorId('login-email') : undefined}
              {...register('email')}
            />
          </div>
        </FormField>

        <FormField label="Password" htmlFor="login-password" error={errors.password?.message}>
          <div className={'agric-login-inputWrap'}>
            <LockKeyhole className={'agric-login-fieldIcon'} size={23} aria-hidden="true" />
            <PasswordInput
              id="login-password"
              autoComplete="current-password"
              placeholder="At least 8 characters"
              error={Boolean(errors.password)}
              aria-describedby={errors.password ? fieldErrorId('login-password') : undefined}
              {...register('password')}
            />
          </div>
        </FormField>
        <p className={'agric-login-forgot'}>
          <Link href="/forgot-password" className="text-ink-green font-semibold hover:underline">
            Forgot password?
          </Link>
        </p>

        <Button
          type="submit"
          icon={ArrowRight}
          loading={isSubmitting}
          disabled={locked}
          className={'agric-login-submit'}
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      {guestMode && (
        <>
          <div className={'agric-login-divider'}>
            <AuthDivider />
          </div>
          <div className={'agric-login-guest'}>
            <GuestButton next={next} />
          </div>
        </>
      )}

      {signupOpen && (
        <p className={'agric-login-signup'}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-ink-green font-semibold hover:underline">
            Create one
          </Link>
        </p>
      )}
    </div>
  );
}
