'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Save, UserRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { contactSchema, type ContactValues } from '@/components/profile/profile-schema';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { FormField, fieldErrorId } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useT } from '@/lib/i18n';
import { normalizePhone } from '@/lib/profile';
import { useProfileStore } from '@/store/profile-store';

export function PersonalInfoForm() {
  const profile = useProfileStore((state) => state.profile);
  const save = useProfileStore((state) => state.save);
  const t = useT();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: profile?.name ?? '',
      phone: profile?.phone ?? '',
      email: profile?.email ?? '',
    },
  });
  async function submit(values: ContactValues) {
    const current = useProfileStore.getState().profile;
    const changedVerifiedPhone =
      current?.verification.phone && normalizePhone(current.phone) !== normalizePhone(values.phone);
    try {
      const saved = await save({ ...values, phone: normalizePhone(values.phone) });
      reset({ name: saved.name, phone: saved.phone, email: saved.email });
      toast.success('Profile updated');
      if (changedVerifiedPhone)
        toast.warning('Your phone number changed. Please verify your new number.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update your profile');
    }
  }
  return (
    <Card id="personal-info" className="h-full scroll-mt-24 rounded-3xl">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <UserRound size={18} aria-hidden="true" className="text-ink-green" />
            Personal information
          </CardTitle>
          <CardSub>Your name and contact details</CardSub>
        </div>
      </CardHeader>
      <form noValidate onSubmit={handleSubmit(submit)} className="space-y-4">
        <FormField label="Full name" htmlFor="profile-name" error={errors.name?.message}>
          <Input
            id="profile-name"
            autoComplete="name"
            maxLength={160}
            error={Boolean(errors.name)}
            aria-describedby={errors.name ? fieldErrorId('profile-name') : undefined}
            {...register('name')}
          />
        </FormField>
        <FormField label="Phone number" htmlFor="profile-phone" error={errors.phone?.message}>
          <Input
            id="profile-phone"
            type="tel"
            autoComplete="tel"
            placeholder="0244123456"
            error={Boolean(errors.phone)}
            aria-describedby={errors.phone ? fieldErrorId('profile-phone') : undefined}
            {...register('phone')}
          />
        </FormField>
        <FormField label="Email" htmlFor="profile-email" error={errors.email?.message}>
          <Input
            id="profile-email"
            type="email"
            autoComplete="email"
            error={Boolean(errors.email)}
            aria-describedby={errors.email ? fieldErrorId('profile-email') : undefined}
            {...register('email')}
          />
        </FormField>
        <Button
          mutates
          type="submit"
          icon={Save}
          disabled={!isDirty}
          loading={isSubmitting}
          className="w-full"
        >
          {t('common.save')}
        </Button>
      </form>
    </Card>
  );
}
