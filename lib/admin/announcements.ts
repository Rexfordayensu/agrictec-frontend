// Announcements (phase A12): life cycle, tabs, audience reach and labels. Pure, so the list, the
// form, the service and the tests agree on what "scheduled" or "~23 farmers" means.

import type { Profile } from '@/types';
import type { Announcement, FarmerAccount } from '@/types/admin';

export type AnnouncementState = 'live' | 'scheduled' | 'ended' | 'off';
export type AnnouncementAudience = Announcement['audience'];

/** Where an announcement is in its life: switched off, not started, live or over. */
export function announcementState(a: Announcement, now = new Date()): AnnouncementState {
  const time = now.toISOString();
  if (!a.active) return a.endsAt && a.endsAt <= time ? 'ended' : 'off';
  if (a.startsAt > time) return 'scheduled';
  if (a.endsAt && a.endsAt <= time) return 'ended';
  return 'live';
}

/** The list's tabs. "Ended" also holds announcements that were switched off. */
export const ANNOUNCEMENT_TABS = ['active', 'scheduled', 'ended'] as const;
export type AnnouncementTab = (typeof ANNOUNCEMENT_TABS)[number];

export const tabOf = (state: AnnouncementState): AnnouncementTab =>
  state === 'live' ? 'active' : state === 'scheduled' ? 'scheduled' : 'ended';

/** Edit only before it starts (afterwards farmers have seen it: end it and duplicate instead). */
export const canEdit = (a: Announcement, now = new Date()) =>
  announcementState(a, now) === 'scheduled';

/** Delete only what no farmer is seeing: scheduled or ended (or switched off). */
export const canDelete = (a: Announcement, now = new Date()) =>
  announcementState(a, now) !== 'live';

/** End now: only while it is live or still to come. */
export const canEnd = (a: Announcement, now = new Date()) => {
  const state = announcementState(a, now);
  return state === 'live' || state === 'scheduled';
};

/** Whether a farmer is in the audience. */
export function inAudience(
  audience: AnnouncementAudience,
  profile: Pick<Profile, 'region' | 'primaryCrops'>,
): boolean {
  switch (audience.kind) {
    case 'all':
      return true;
    case 'region':
      return audience.regions.includes(profile.region);
    case 'crop':
      return audience.crops.some((crop) => profile.primaryCrops.includes(crop));
  }
}

/** How many registered farmers the audience reaches today ("~23 farmers"). */
export const estimateReach = (audience: AnnouncementAudience, farmers: FarmerAccount[]) =>
  farmers.filter((f) => !f.isGuest && inAudience(audience, f.profile)).length;

/** "Everyone", "Northern, Ashanti", "Maize growers". */
export function audienceLabel(audience: AnnouncementAudience): string {
  switch (audience.kind) {
    case 'all':
      return 'Everyone';
    case 'region':
      return audience.regions.length > 2
        ? `${audience.regions.slice(0, 2).join(', ')} +${audience.regions.length - 2}`
        : audience.regions.join(', ');
    case 'crop':
      return `${
        audience.crops.length > 2
          ? `${audience.crops.slice(0, 2).join(', ')} +${audience.crops.length - 2}`
          : audience.crops.join(', ')
      } growers`;
  }
}

/** Critical, to everyone: the one combination that asks for an extra confirmation. */
export const needsCriticalConfirm = (a: Pick<Announcement, 'type' | 'audience'>) =>
  a.type === 'critical' && a.audience.kind === 'all';

export const TITLE_MAX = 80;
export const MESSAGE_MAX = 300;

// ---------- datetime-local <-> ISO ----------

const pad = (n: number) => String(n).padStart(2, '0');

/** An ISO time as the value of an <input type="datetime-local"> (local time, minutes). */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A datetime-local value back to ISO (empty → undefined). */
export function fromLocalInput(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}
