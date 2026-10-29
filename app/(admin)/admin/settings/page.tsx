import { redirect } from 'next/navigation';

/** The settings hub opens its first page. The shared layout guards all child routes. */
export default function SettingsPage() {
  redirect('/admin/settings/features');
}
