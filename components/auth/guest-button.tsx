'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_AFTER_LOGIN } from '@/components/auth/auth-schemas';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';

export function GuestButton({ next = DEFAULT_AFTER_LOGIN }: { next?: string }) {
  const router = useRouter();
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      // The demo has no account: nothing is sent to AgriCtec or stored (lib/demo.ts).
      await continueAsGuest();
      router.replace(next);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start guest mode');
      setLoading(false);
    }
  }

  return (
    <div className="text-center">
      <Button
        variant="ghost"
        icon={UserRound}
        loading={loading}
        onClick={handleClick}
        className="w-full"
      >
        Continue as guest (demo)
      </Button>
      <p className="text-text-mute mt-2 text-xs">
        Try AgriCtec for one day. What you enter stays on this phone and is never sent to us.
      </p>
    </div>
  );
}
