import type { Metadata } from 'next';
import { ProfileOverview } from '@/components/settings/profile-overview';

export const metadata: Metadata = { title: 'Profile' };

/** The farmer's profile: banner, completeness, identity checks, personal and farm details. */
export default function ProfileSettingsPage() {
  return <ProfileOverview />;
}
