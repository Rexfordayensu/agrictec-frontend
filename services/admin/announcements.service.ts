// Announcements through the API (announcements.send; every change audited). The pure helpers
// below are what the farmer's dashboard banner uses on GET /platform's live announcements.

import { inAudience } from '@/lib/admin/announcements';
import { api } from '@/services/api';
import type { Profile } from '@/types';
import type { Announcement } from '@/types/admin';

export type AnnouncementInput = Omit<Announcement, 'id' | 'createdBy' | 'createdAt'>;

/** Switched on and inside its time window. */
export function isLive(a: Announcement, now = new Date()): boolean {
  const t = now.toISOString();
  return a.active && a.startsAt <= t && (!a.endsAt || a.endsAt > t);
}

/** Whether the farmer is in the announcement's audience. */
export function reaches(
  a: Announcement,
  profile: Pick<Profile, 'region' | 'primaryCrops'>,
): boolean {
  return inAudience(a.audience, profile);
}

const SEVERITY: Record<Announcement['type'], number> = {
  critical: 0,
  warning: 1,
  success: 2,
  info: 3,
};

/** Critical first, then warning, success, info; newest first within each. */
export const bySeverity = (a: Announcement, b: Announcement) =>
  SEVERITY[a.type] - SEVERITY[b.type] || b.startsAt.localeCompare(a.startsAt);

const announcement = (id: string) => `/admin/announcements/${encodeURIComponent(id)}`;

export const announcementsService = {
  /** Newest first. */
  async list(): Promise<Announcement[]> {
    return api<Announcement[]>('/admin/announcements');
  },

  /** A critical announcement to every farmer needs confirmedCritical (the form asks first). */
  async create(
    input: AnnouncementInput,
    { confirmedCritical = false }: { confirmedCritical?: boolean } = {},
  ): Promise<Announcement> {
    return api<Announcement>('/admin/announcements', {
      method: 'POST',
      body: { ...input, confirmedCritical },
    });
  },

  /** Only before it starts (afterwards: end it and duplicate). Same critical rule as create. */
  async update(
    id: string,
    patch: Partial<AnnouncementInput>,
    { confirmedCritical = false }: { confirmedCritical?: boolean } = {},
  ): Promise<Announcement> {
    return api<Announcement>(announcement(id), {
      method: 'PATCH',
      body: { ...patch, confirmedCritical },
    });
  },

  /** Takes it down now, keeping it in the list. */
  async end(id: string): Promise<Announcement> {
    return api<Announcement>(`${announcement(id)}/end`, { method: 'POST' });
  },

  /** Not while farmers are seeing it: end it first. */
  async remove(id: string): Promise<void> {
    await api(announcement(id), { method: 'DELETE' });
  },

  /** Every live announcement, most severe first, for any audience. */
  async listLive(): Promise<Announcement[]> {
    return (await api<{ announcements: Announcement[] }>('/platform')).announcements;
  },

  /** Live announcements for one farmer, most severe first. */
  async activeFor(profile: Pick<Profile, 'region' | 'primaryCrops'>): Promise<Announcement[]> {
    return (await announcementsService.listLive()).filter((a) => reaches(a, profile));
  },
};
