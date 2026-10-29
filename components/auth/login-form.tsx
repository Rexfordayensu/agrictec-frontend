'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, LogIn } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { loginSchema, type LoginValues } from '@/components/auth/auth-schemas';
import { AuthDivider, FormAlert } from '@/components/auth/form-alert';
import { GuestButton } from '@/components/auth/guest-button';
import { NewPasswordForm } from '@/components/auth/new-password-form';
import { PasswordInput } from '@/components/auth/password-input';
import { Button } from '@/components/ui/button';
import { FormField, fieldErrorId } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PasswordChangeRequiredError, SUSPENDED_MESSAGE } from '@/services/auth.service';
import { onboardingService } from '@/services/onboarding.service';
import { useAuthStore } from '@/store/auth-store';
import { usePlatformStore } from '@/store/platform-store';
import type { Session } from '@/types';

/** Why the app sent the farmer back here (set by DataLoader). */
export type LoginReason = 'suspended' | 'deleted';

const REASON_MESSAGES: Record<LoginReason, string> = {
  suspended: SUSPENDED_MESSAGE,
  deleted: 'This account no longer exists. Create a new account or contact support.',
};

export function LoginForm({ next, reason }: { next: string; reason?: LoginReason }) {
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const [formError, setFormError] = useState<string | null>(
    reason ? REASON_MESSAGES[reason] : null,
  );
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
    setFormError(null);
    try {
      await enter(await signIn(values.email, values.password));
    } catch (error) {
      if (error instanceof PasswordChangeRequiredError) {
        setTemporary({ email: values.email, password: values.password });
        return;
      }
      setFormError(error instanceof Error ? error.message : 'Could not sign in');
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
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-text text-2xl font-bold">Welcome back</h1>
        <p className="text-text-dim mt-1 text-sm">Sign in to your AgriCtec account.</p>
      </div>

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {formError && <FormAlert icon={AlertCircle}>{formError}</FormAlert>}

        <FormField label="Email" htmlFor="login-email" error={errors.email?.message}>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            error={Boolean(errors.email)}
            aria-describedby={errors.email ? fieldErrorId('login-email') : undefined}
            {...register('email')}
          />
        </FormField>

        <FormField label="Password" htmlFor="login-password" error={errors.password?.message}>
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            placeholder="At least 8 characters"
            error={Boolean(errors.password)}
            aria-describedby={errors.password ? fieldErrorId('login-password') : undefined}
            {...register('password')}
          />
        </FormField>

        <Button type="submit" icon={LogIn} loading={isSubmitting} className="w-full">
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      {guestMode && (
        <>
          <AuthDivider />
          <GuestButton next={next} />
        </>
      )}

      {signupOpen && (
        <p className="text-text-dim text-center text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-ink-green font-semibold hover:underline">
            Create one
          </Link>
        </p>
      )}
    </div>
  );
}
