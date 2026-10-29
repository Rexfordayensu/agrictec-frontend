import type { Metadata } from 'next';
import { FarmDetailsForm } from '@/components/profile/farm-details-form';
import { PersonalInfoForm } from '@/components/profile/personal-info-form';
import { ProfilePhotoCard } from '@/components/profile/profile-photo-card';
import { AccountHero } from '@/components/settings/account-hero';
import { SettingsSection } from '@/components/settings/settings-section';

export const metadata: Metadata = { title: 'Profile' };

export default function ProfileSettingsPage() {
  return (
    <div className="space-y-6">
      <AccountHero />
      <SettingsSection href="/settings/profile">
        <div className="space-y-5">
          <ProfilePhotoCard />
          <div className="grid grid-cols-1 items-start gap-5 @3xl:grid-cols-2">
            <PersonalInfoForm />
            <FarmDetailsForm />
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
