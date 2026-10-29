'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, KeyRound } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import {
  changePasswordSchema,
  type ChangePasswordValues,
} from '@/components/admin/auth/admin-auth-schemas';
import { PasswordChecklist } from '@/components/admin/auth/password-checklist';
import { FormAlert } from '@/components/auth/form-alert';
import { PasswordInput } from '@/components/auth/password-input';
import { Button } from '@/components/ui/button';
import { FormField, fieldErrorId } from '@/components/ui/form-field';
import { useAdminAuthStore } from '@/store/admin/admin-auth-store';
import type { AdminUser } from '@/types/admin';

export interface ChangePasswordFormProps {
  /**
   * Set right after sign-in (the forced change), so the admin isn't asked to retype it.
   * Without it, the form asks for the current password.
   */
  currentPassword?: string;
  /** True for the first-login change of a temporary or demo password. */
  forced?: boolean;
  /** Inside a dialog that already shows a title. */
  hideHeading?: boolean;
  onDone: (admin: AdminUser) => void;
  onCancel?: () => void;
}

export function ChangePasswordForm({
  currentPassword,
  forced = false,
  hideHeading = false,
  onDone,
  onCancel,
}: ChangePasswordFormProps) {
  const changePassword = useAdminAuthStore((s) => s.changePassword);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: currentPassword ?? '', newPassword: '', confirmPassword: '' },
  });
  const [newPassword, typedCurrent] = useWatch({
    control,
    name: ['newPassword', 'currentPassword'],
  });

  async function onSubmit(values: ChangePasswordValues) {
    setFormError(null);
    try {
      const admin = await changePassword(values.currentPassword, values.newPassword);
      toast.success('Password changed');
      onDone(admin);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not change your password');
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {!hideHeading && (
        <div>
          <h1 className="font-display text-text text-2xl font-bold">
            {forced ? 'Set a new password' : 'Change password'}
          </h1>
          <p className="text-text-dim mt-1 text-sm">
            {forced
              ? 'Your password was temporary. Choose your own before entering the console.'
              : 'Use a strong password you don’t use anywhere else.'}
          </p>
        </div>
      )}

      {formError && <FormAlert icon={AlertCircle}>{formError}</FormAlert>}

      {currentPassword === undefined && (
        <FormField
          label="Current password"
          htmlFor="admin-current-password"
          error={errors.currentPassword?.message}
        >
          <PasswordInput
            id="admin-current-password"
            autoComplete="current-password"
            error={Boolean(errors.currentPassword)}
            aria-describedby={
              errors.currentPassword ? fieldErrorId('admin-current-password') : undefined
            }
            {...register('currentPassword')}
          />
        </FormField>
      )}

      <FormField
        label="New password"
        htmlFor="admin-new-password"
        error={errors.newPassword?.message}
      >
        <PasswordInput
          id="admin-new-password"
          autoComplete="new-password"
          error={Boolean(errors.newPassword)}
          aria-describedby={
            errors.newPassword
              ? `${fieldErrorId('admin-new-password')} admin-password-rules`
              : 'admin-password-rules'
          }
          {...register('newPassword')}
        />
      </FormField>
      <PasswordChecklist
        id="admin-password-rules"
        password={newPassword}
        currentPassword={typedCurrent || undefined}
      />

      <FormField
        label="Confirm new password"
        htmlFor="admin-confirm-password"
        error={errors.confirmPassword?.message}
      >
        <PasswordInput
          id="admin-confirm-password"
          autoComplete="new-password"
          error={Boolean(errors.confirmPassword)}
          aria-describedby={
            errors.confirmPassword ? fieldErrorId('admin-confirm-password') : undefined
          }
          {...register('confirmPassword')}
        />
      </FormField>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          icon={KeyRound}
          loading={isSubmitting}
          className={onCancel ? '' : 'w-full'}
        >
          {isSubmitting ? 'Saving…' : forced ? 'Save and continue' : 'Change password'}
        </Button>
      </div>
    </form>
  );
}
