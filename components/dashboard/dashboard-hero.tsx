'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useModalStore } from '@/store/modal-store';
import { useProfileStore } from '@/store/profile-store';
import { useFarmStore } from '@/store/farm-store';

export function DashboardHero() {
  const profile = useProfileStore((state) => state.profile);
  const hasRecords = useFarmStore((state) => state.records.length > 0);
  const openModal = useModalStore((state) => state.openModal);
  const name = profile?.name.trim().split(/\s+/)[0] || 'Farmer';
  return (
    <header className="farmer-dashboard-heading">
      <div>
        <p className="farmer-dashboard-eyebrow">{profile?.farmName || 'Your farm'}</p>
        <h2>Welcome back, {name}.</h2>
        <p>Your records, your progress, your next step.</p>
      </div>
      <Button
        icon={Plus}
        mutates
        onClick={() => openModal('record')}
        className="farmer-dashboard-primary"
      >
        {hasRecords ? 'Add record' : 'Add your first record'}
      </Button>
    </header>
  );
}
