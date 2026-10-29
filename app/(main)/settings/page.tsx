import { redirect } from 'next/navigation';

/** /settings opens its first page. */
export default function SettingsPage() {
  redirect('/settings/profile');
}
