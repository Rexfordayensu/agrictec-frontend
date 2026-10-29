'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, UserPlus } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import {
  passwordStrength,
  signupSchema,
  type PasswordStrength,
  type SignupValues,
} from '@/components/auth/auth-schemas';
import { AuthDivider, FormAlert } from '@/components/auth/form-alert';
import { GuestButton } from '@/components/auth/guest-button';
import { PasswordInput } from '@/components/auth/password-input';
import { Button } from '@/components/ui/button';
import { FormField, fieldErrorId, fieldHintId } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { usePlatformStore } from '@/store/platform-store';
import { useProfileStore } from '@/store/profile-store';

const STRENGTH_STYLE: Record<PasswordStrength, { bar: string; text: string; width: string }> = {
  Weak: { bar: 'bg-danger', text: 'text-ink-red', width: 'w-1/3' },
  Okay: { bar: 'bg-warning', text: 'text-ink-gold', width: 'w-2/3' },
  Strong: { bar: 'bg-accent', text: 'text-ink-green', width: 'w-full' },
};

export function SignupForm() {
  const router = useRouter();
  const signUp = useAuthStore((s) => s.signUp);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const password = useWatch({ control, name: 'password' });
  const strength = password ? passwordStrength(password) : null;
  // The admin can close sign-ups and guest mode (auth.service enforces both too).
  const { signupOpen, guestMode } = usePlatformStore((s) => s.flags);

  async function onSubmit(values: SignupValues) {
    setFormError(null);
    try {
      const session = await signUp(values.email, values.password);
      // Start the farmer's profile with the details they just entered.
      const profileStore = useProfileStore.getState();
      await profileStore.load(session.userId);
      await profileStore.save({ name: values.name, email: session.email });
      toast.success('Account created');
      // Next: the farm setup. The app opens once it is finished.
      router.replace('/onboarding');
      router.refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not create your account');
    }
  }

  const describedBy = (id: string, hasError: boolean, hint?: string) =>
    hasError ? fieldErrorId(id) : hint;

  if (!signupOpen) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="font-display text-text text-2xl font-bold">Sign-ups are closed</h1>
        <p className="text-text-dim text-sm">
          New accounts can&apos;t be created right now. Please check back soon.
        </p>
        <p className="text-text-dim text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-ink-green font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-text text-2xl font-bold">Create your account</h1>
        <p className="text-text-dim mt-1 text-sm">
          Start building your digital financial identity.
        </p>
      </div>

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {formError && <FormAlert icon={AlertCircle}>{formError}</FormAlert>}

        <FormField label="Full name" htmlFor="signup-name" error={errors.name?.message}>
          <Input
            id="signup-name"
            autoComplete="name"
            placeholder="e.g. Ama Owusu"
            error={Boolean(errors.name)}
            aria-describedby={describedBy('signup-name', Boolean(errors.name))}
            {...register('name')}
          />
        </FormField>

        <FormField label="Email" htmlFor="signup-email" error={errors.email?.message}>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            error={Boolean(errors.email)}
            aria-describedby={describedBy('signup-email', Boolean(errors.email))}
            {...register('email')}
          />
        </FormField>

        <FormField label="Password" htmlFor="signup-password" error={errors.password?.message}>
          <PasswordInput
            id="signup-password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            error={Boolean(errors.password)}
            aria-describedby={describedBy(
              'signup-password',
              Boolean(errors.password),
              strength ? fieldHintId('signup-password-strength') : undefined,
            )}
            {...register('password')}
          />
          {strength && (
            <div id={fieldHintId('signup-password-strength')} aria-live="polite" className="mt-1">
              <div className="bg-glass-strong h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    STRENGTH_STYLE[strength].bar,
                    STRENGTH_STYLE[strength].width,
                  )}
                />
              </div>
              <p className={cn('mt-1 text-xs font-medium', STRENGTH_STYLE[strength].text)}>
                Password strength: {strength}
                {strength !== 'Strong' && (
                  <span className="text-text-mute font-normal">
                    {' '}
                    · use 12+ characters with letters, numbers and symbols
                  </span>
                )}
              </p>
            </div>
          )}
        </FormField>

        <FormField
          label="Confirm password"
          htmlFor="signup-confirm"
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="signup-confirm"
            autoComplete="new-password"
            placeholder="Type your password again"
            error={Boolean(errors.confirmPassword)}
            aria-describedby={describedBy('signup-confirm', Boolean(errors.confirmPassword))}
            {...register('confirmPassword')}
          />
        </FormField>

        <Button type="submit" icon={UserPlus} loading={isSubmitting} className="w-full">
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      {guestMode && (
        <>
          <AuthDivider />
          <GuestButton />
        </>
      )}

      <p className="text-text-dim text-center text-sm">
        Already have an account?{' '}
        <Link href="/login" className="text-ink-green font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
