'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_AFTER_LOGIN } from '@/components/auth/auth-schemas';
import { Button } from '@/components/ui/button';
import { onboardingService } from '@/services/onboarding.service';
import { useAuthStore } from '@/store/auth-store';

export function GuestButton({ next = DEFAULT_AFTER_LOGIN }: { next?: string }) {
  const router = useRouter();
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      // Reuses the one guest account on this device, so demo data never disappears.
      const session = await continueAsGuest();
      // Guests go through onboarding too (with a "Fill with demo details" shortcut).
      router.replace(await onboardingService.destinationAfterSignIn(session.userId, next));
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
      <p className="text-text-mute mt-2 text-xs">Guest data is saved on this device only.</p>
    </div>
  );
}
