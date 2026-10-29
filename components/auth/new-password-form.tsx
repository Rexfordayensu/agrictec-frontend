'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, KeyRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormAlert } from '@/components/auth/form-alert';
import { PasswordInput } from '@/components/auth/password-input';
import { Button } from '@/components/ui/button';
import { FormField, fieldErrorId } from '@/components/ui/form-field';
import { FARMER_PASSWORD_MIN_LENGTH } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth-store';
import type { Session } from '@/types';

const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(
        FARMER_PASSWORD_MIN_LENGTH,
        `Password must be at least ${FARMER_PASSWORD_MIN_LENGTH} characters`,
      ),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type NewPasswordValues = z.infer<typeof newPasswordSchema>;

/**
 * Shown on the sign-in page after a temporary password from support: the farmer chooses their
 * own password, and only then is signed in. Support never learns the new one.
 */
export function NewPasswordForm({
  email,
  temporary,
  onSignedIn,
  onBack,
}: {
  email: string;
  temporary: string;
  onSignedIn: (session: Session) => void;
  onBack: () => void;
}) {
  const replaceTemporaryPassword = useAuthStore((s) => s.replaceTemporaryPassword);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  async function onSubmit(values: NewPasswordValues) {
    setFormError(null);
    try {
      onSignedIn(await replaceTemporaryPassword(email, temporary, values.password));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save your password');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-text text-2xl font-bold">Choose a new password</h1>
        <p className="text-text-dim mt-1 text-sm">
          You signed in with a temporary password from AgriCtec support. Choose your own to
          continue; the temporary one stops working.
        </p>
      </div>

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {formError && <FormAlert icon={AlertCircle}>{formError}</FormAlert>}

        <FormField label="New password" htmlFor="new-password" error={errors.password?.message}>
          <PasswordInput
            id="new-password"
            autoComplete="new-password"
            autoFocus
            placeholder={`At least ${FARMER_PASSWORD_MIN_LENGTH} characters`}
            error={Boolean(errors.password)}
            aria-describedby={errors.password ? fieldErrorId('new-password') : undefined}
            {...register('password')}
          />
        </FormField>

        <FormField
          label="Confirm new password"
          htmlFor="new-password-confirm"
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="new-password-confirm"
            autoComplete="new-password"
            error={Boolean(errors.confirmPassword)}
            aria-describedby={
              errors.confirmPassword ? fieldErrorId('new-password-confirm') : undefined
            }
            {...register('confirmPassword')}
          />
        </FormField>

        <Button type="submit" icon={KeyRound} loading={isSubmitting} className="w-full">
          {isSubmitting ? 'Saving…' : 'Save password and continue'}
        </Button>
        <Button type="button" variant="ghost" icon={ArrowLeft} onClick={onBack} className="w-full">
          Back to sign in
        </Button>
      </form>
    </div>
  );
}
