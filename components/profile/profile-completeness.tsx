'use client';

import { ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { profileCompleteness } from '@/lib/profile';
import { useProfileStore } from '@/store/profile-store';

export function ProfileCompleteness() {
  const profile = useProfileStore((state) => state.profile);
  const complete = profileCompleteness(profile);
  return (
    <Card className="rounded-3xl">
      <div className="flex items-center gap-3">
        <span className="bg-accent/10 text-ink-green inline-flex size-11 shrink-0 items-center justify-center rounded-2xl">
          <ShieldCheck size={22} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-text text-base font-bold">Profile {complete}% complete</h2>
          <p className="text-text-mute mt-1 text-xs">
            Completing your profile can raise your credit score by up to 55 points
          </p>
        </div>
      </div>
      <Progress value={complete} label="Profile completeness" className="mt-4" />
    </Card>
  );
}
