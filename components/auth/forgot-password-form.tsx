'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, KeyRound, Mail, MailCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormAlert } from '@/components/auth/form-alert';
import { newPasswordSchema } from '@/components/auth/new-password-form';
import { PasswordInput } from '@/components/auth/password-input';
import { Button } from '@/components/ui/button';
import { FormField, fieldErrorId } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { authService, FARMER_PASSWORD_MIN_LENGTH } from '@/services/auth.service';
import { onboardingService } from '@/services/onboarding.service';
import { useAuthStore } from '@/store/auth-store';

const emailSchema = z.object({
  email: z.string().trim().pipe(z.email('Enter a valid email address')),
});
type EmailValues = z.infer<typeof emailSchema>;

const resetSchema = newPasswordSchema.and(
  z.object({
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Enter the 6-digit code'),
  }),
);
type ResetValues = z.infer<typeof resetSchema>;

/**
 * Forgot password: the farmer's email, then the six-digit code sent to it (and by SMS to a
 * verified phone) with a new password. Every other session ends; this one starts.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState<string | null>(null);
  return email ? (
    <ResetStep email={email} onBack={() => setEmail(null)} />
  ) : (
    <EmailStep onSent={setEmail} />
  );
}

function EmailStep({ onSent }: { onSent: (email: string) => void }) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailValues>({ resolver: zodResolver(emailSchema), defaultValues: { email: '' } });

  async function onSubmit({ email }: EmailValues) {
    setFormError(null);
    try {
      toast.success(await authService.requestPasswordReset(email));
      onSent(email);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not send a code');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-text text-display font-bold">Forgot your password?</h1>
        <p className="text-text-dim mt-1 text-sm">
          Enter the email you sign in with. We&apos;ll send a 6-digit code to choose a new password.
        </p>
      </div>
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {formError && <FormAlert icon={AlertCircle}>{formError}</FormAlert>}
        <FormField label="Email" htmlFor="reset-email" error={errors.email?.message}>
          <Input
            id="reset-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            autoFocus
            placeholder="you@example.com"
            error={Boolean(errors.email)}
            aria-describedby={errors.email ? fieldErrorId('reset-email') : undefined}
            {...register('email')}
          />
        </FormField>
        <Button type="submit" icon={Mail} loading={isSubmitting} className="w-full">
          {isSubmitting ? 'Sending…' : 'Send code'}
        </Button>
      </form>
      <p className="text-text-dim text-center text-sm">
        Remembered it?{' '}
        <Link href="/login" className="text-ink-green font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function ResetStep({ email, onBack }: { email: string; onBack: () => void }) {
  const router = useRouter();
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const [formError, setFormError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { code: '', password: '', confirmPassword: '' },
  });

  async function onSubmit(values: ResetValues) {
    setFormError(null);
    try {
      const session = await resetPassword(email, values.code, values.password);
      toast.success('Password changed. Welcome back!');
      router.replace(await onboardingService.destinationAfterSignIn(session.userId, '/dashboard'));
      router.refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not change your password');
    }
  }

  async function resend() {
    setResending(true);
    try {
      toast.success(await authService.requestPasswordReset(email));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send a code');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-text text-display font-bold">Enter your code</h1>
        <p className="text-text-dim mt-1 text-sm">
          If <span className="text-text font-medium break-all">{email}</span> has an account, a
          6-digit code is on its way by email (and by SMS to a verified phone). It expires in 15
          minutes.
        </p>
      </div>
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {formError && <FormAlert icon={AlertCircle}>{formError}</FormAlert>}
        <FormField label="Code" htmlFor="reset-code" error={errors.code?.message}>
          <Input
            id="reset-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            placeholder="123456"
            error={Boolean(errors.code)}
            aria-describedby={errors.code ? fieldErrorId('reset-code') : undefined}
            {...register('code')}
          />
        </FormField>
        <FormField label="New password" htmlFor="reset-password" error={errors.password?.message}>
          <PasswordInput
            id="reset-password"
            autoComplete="new-password"
            placeholder={`${FARMER_PASSWORD_MIN_LENGTH}+ characters, a letter and a number`}
            error={Boolean(errors.password)}
            aria-describedby={errors.password ? fieldErrorId('reset-password') : undefined}
            {...register('password')}
          />
        </FormField>
        <FormField
          label="Confirm new password"
          htmlFor="reset-password-confirm"
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="reset-password-confirm"
            autoComplete="new-password"
            error={Boolean(errors.confirmPassword)}
            aria-describedby={
              errors.confirmPassword ? fieldErrorId('reset-password-confirm') : undefined
            }
            {...register('confirmPassword')}
          />
        </FormField>
        <Button type="submit" icon={KeyRound} loading={isSubmitting} className="w-full">
          {isSubmitting ? 'Saving…' : 'Change password and sign in'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          icon={MailCheck}
          loading={resending}
          onClick={() => void resend()}
          className="w-full"
        >
          Send a new code
        </Button>
        <Button type="button" variant="ghost" icon={ArrowLeft} onClick={onBack} className="w-full">
          Use a different email
        </Button>
      </form>
      <p className="text-text-mute text-center text-xs">
        No code after a few minutes? Check your spam folder, or ask AgriCtec support to reset your
        password.
      </p>
    </div>
  );
}
