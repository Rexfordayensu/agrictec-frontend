import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { BadgeColor } from '@/components/ui/badge';
import type { Announcement } from '@/types/admin';

export type AnnouncementType = Announcement['type'];

/** How each announcement type looks in the console (the farmer banner has the same icons). */
export const TYPE_META: Record<
  AnnouncementType,
  { label: string; hint: string; icon: LucideIcon; color: BadgeColor; tone: string }
> = {
  info: {
    label: 'Info',
    hint: 'News and reminders',
    icon: Info,
    color: 'blue',
    tone: 'bg-info/12 text-ink-blue',
  },
  success: {
    label: 'Success',
    hint: 'Good news',
    icon: CircleCheck,
    color: 'green',
    tone: 'bg-accent/12 text-ink-green',
  },
  warning: {
    label: 'Warning',
    hint: 'Weather, pests, prices',
    icon: TriangleAlert,
    color: 'gold',
    tone: 'bg-gold/12 text-ink-gold',
  },
  critical: {
    label: 'Critical',
    hint: 'Urgent: act now',
    icon: CircleAlert,
    color: 'red',
    tone: 'bg-danger/12 text-ink-red',
  },
};

export const ANNOUNCEMENT_TYPES = Object.keys(TYPE_META) as AnnouncementType[];
