'use client';

import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStartTour } from '@/components/tour/use-start-tour';
import { useAuthStore } from '@/store/auth-store';

/** Replays the 6-step app tour (Settings › About). Not in an admin's read-only view. */
export function TakeTourButton({ className }: { className?: string }) {
  const startTour = useStartTour();
  const readOnlyView = useAuthStore((s) => s.impersonation !== null);
  if (readOnlyView) return null;
  return (
    <Button variant="ghost" icon={Compass} onClick={startTour} className={className}>
      Take the app tour
    </Button>
  );
}
