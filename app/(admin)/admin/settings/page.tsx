import { adminPath } from '@/lib/admin-path';
import { redirect } from 'next/navigation';

/** The settings hub opens its first page. The shared layout guards all child routes. */
export default function SettingsPage() {
  redirect(adminPath('/admin/settings/features'));
}
