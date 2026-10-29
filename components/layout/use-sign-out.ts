'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { exitImpersonation } from '@/lib/admin/impersonation';
import { signOutAndReset, useAuthStore } from '@/store';

/** Signs out, clears every store and returns to /login. Shared by the sidebar and mobile menu. */
export function useSignOut() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    if (useAuthStore.getState().impersonation) return exitImpersonation();
    setSigningOut(true);
    try {
      await signOutAndReset();
      toast.success('Signed out');
      router.replace('/login');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not sign out');
      setSigningOut(false);
    }
  }

  return { signOut, signingOut };
}
