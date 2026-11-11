'use client';

import { useReadOnly } from '@/lib/read-only';
import { useState } from 'react';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '@/store/settings-store';
import type { NotificationSettings as Preferences } from '@/types';

interface Option {
  key: keyof Preferences;
  title: string;
  description: string;
  /** Not built yet: shown switched off and disabled, so nobody waits for alerts that never come. */
  comingSoon?: boolean;
}

const options: Option[] = [
  {
    key: 'aiInsights',
    title: 'Dashboard tips',
    description: 'Show farming and money tips, based on your records, on your dashboard.',
  },
  {
    key: 'weatherAlerts',
    title: 'Weather alerts',
    description:
      'Heavy rain or a thunderstorm in the next 3 days, or a dry week in the growing season, from the forecast at your farm’s map pin (or your region). Checked at 6am and 4pm.',
  },
  {
    key: 'priceAlerts',
    title: 'Market price alerts',
    description:
      'When a reviewed price for a crop you grow moves 10% or more (local prices only for your region).',
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
              <p className="text-text flex flex-wrap items-center gap-2 text-sm font-semibold">
                {item.title}
                {item.comingSoon && <Badge color="gold">Coming soon</Badge>}
              </p>
              <p className="text-text-mute mt-1 text-xs leading-relaxed">{item.description}</p>
            </div>
            <Switch
              checked={item.comingSoon ? false : notifications[item.key]}
              label={item.comingSoon ? `${item.title} (coming soon)` : item.title}
              disabled={item.comingSoon || saving || status !== 'ready' || readOnly}
              onChange={async () => {
                if (item.comingSoon) return;
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
      <p className="text-text-mute border-border mt-4 border-t pt-4 text-xs leading-relaxed">
        Alerts appear under the bell, and by SMS to your saved phone number when SMS is available.
      </p>
    </Card>
  );
}
