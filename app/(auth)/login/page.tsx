import type { Metadata } from 'next';
import { safeNextPath } from '@/components/auth/auth-schemas';
import { LoginForm, type LoginReason } from '@/components/auth/login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { next, reason } = await searchParams;
  const known: LoginReason | undefined =
    reason === 'suspended' || reason === 'deleted' ? reason : undefined;
  return <LoginForm next={safeNextPath(next)} reason={known} />;
}
