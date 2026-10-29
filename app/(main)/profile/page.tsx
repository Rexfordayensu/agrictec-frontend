import { redirect } from 'next/navigation';

/** Profile is now a page inside Settings; old links land there. */
export default function ProfilePage() {
  redirect('/settings/profile');
}
