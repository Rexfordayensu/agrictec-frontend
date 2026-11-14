'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTourStore } from '@/store/tour-store';

/** Replays the app tour from anywhere: it runs on the dashboard, where the score card is. */
export function useStartTour(): () => void {
  const router = useRouter();
  const pathname = usePathname();
  return () => {
    useTourStore.getState().request();
    if (pathname !== '/dashboard') router.push('/dashboard');
  };
}
