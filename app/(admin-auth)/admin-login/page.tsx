import type { Metadata } from 'next';
import { parseLoginReason, safeAdminNext } from '@/components/admin/auth/admin-auth-schemas';
import { AdminLoginForm } from '@/components/admin/auth/admin-login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function AdminLoginPage({ searchParams }: PageProps<'/admin-login'>) {
  const { next, reason } = await searchParams;
  return <AdminLoginForm next={safeAdminNext(next)} reason={parseLoginReason(reason)} />;
}
