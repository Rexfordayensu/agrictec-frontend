'use client';

import { useReadOnly } from '@/lib/read-only';
import { useState } from 'react';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '@/store/settings-store';
import type { NotificationSettings as Preferences } from '@/types';

const options: { key: keyof Preferences; title: string; description: string }[] = [
  {
    key: 'aiInsights',
    title: 'AI Insights',
    description: 'Rotate farming and finance tips on your dashboard.',
  },
  {
    key: 'weatherAlerts',
    title: 'Weather Alerts',
    description: 'Keep weather alerts enabled for future live updates.',
  },
  {
    key: 'priceAlerts',
    title: 'Market Price Alerts',
    description: 'Keep crop-price alerts enabled for future live updates.',
  },
];
export function NotificationSettings() {
  const notifications = useSettingsStore((state) => state.notifications);
  const status = useSettingsStore((state) => state.status);
  const [saving, setSaving] = useState(false);
  const readOnly = useReadOnly();
  return (
    <Card className="h-full rounded-3xl">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bell size={18} aria-hidden="true" className="text-ink-gold" />
            Notifications
          </CardTitle>
          <CardSub>Choose what matters to you</CardSub>
        </div>
      </CardHeader>
      <div className="divide-border divide-y">
        {options.map((item) => (
          <div
            key={item.key}
            className="flex items-start justify-between gap-3 py-4 first:pt-0 last:pb-0"
          >
            <div>
              <p className="text-text text-sm font-semibold">{item.title}</p>
              <p className="text-text-mute mt-1 text-xs leading-relaxed">{item.description}</p>
            </div>
            <Switch
              checked={notifications[item.key]}
              label={item.title}
              disabled={saving || status !== 'ready' || readOnly}
              onChange={async () => {
                setSaving(true);
                try {
                  await useSettingsStore.getState().toggleNotification(item.key);
                } catch {
                  toast.error('Could not save your notification preference');
                } finally {
                  setSaving(false);
                }
              }}
              className="shrink-0"
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
