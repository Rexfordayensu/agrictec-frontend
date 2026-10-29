'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { Button, type ButtonProps } from '@/components/ui/button';
import { useAdminAuthStore } from '@/store/admin/admin-auth-store';

/**
 * Ends the admin session only (audit: admin.logout) and returns to the admin login.
 * A farmer signed in on the same browser stays signed in.
 */
export function AdminSignOutButton(props: Omit<ButtonProps, 'onClick' | 'loading'>) {
  const router = useRouter();
  const signOut = useAdminAuthStore((s) => s.signOut);
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      await signOut('manual');
      router.replace('/admin-login?reason=signed-out');
    } catch {
      toast.error('Could not sign out. Please try again.');
      setBusy(false);
    }
  }

  return (
    <Button
      variant="ghost"
      icon={LogOut}
      loading={busy}
      onClick={() => void handleClick()}
      {...props}
    >
      {props.children ?? 'Sign out'}
    </Button>
  );
}
