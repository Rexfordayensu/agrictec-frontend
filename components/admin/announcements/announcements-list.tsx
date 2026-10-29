'use client';

import { format, formatDistanceStrict } from 'date-fns';
import {
  CalendarClock,
  Copy,
  Globe,
  MapPin,
  Megaphone,
  Pencil,
  Sprout,
  Square,
  Trash2,
  Users,
} from 'lucide-react';
import { reachLabel } from '@/components/admin/announcements/audience-picker';
import { TYPE_META } from '@/components/admin/announcements/type-meta';
import { RowMenu, type RowMenuItem } from '@/components/admin/shared/row-menu';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  announcementState,
  audienceLabel,
  canDelete,
  canEdit,
  canEnd,
  estimateReach,
  type AnnouncementTab,
} from '@/lib/admin/announcements';
import { cn } from '@/lib/utils';
import type { Announcement, FarmerAccount } from '@/types/admin';

const AUDIENCE_ICON = { all: Globe, region: MapPin, crop: Sprout } as const;

const when = (iso: string) => format(new Date(iso), 'd MMM yyyy, HH:mm');

/** "Live since 20 Oct · ends in 3 days", "Starts 23 Oct, 09:00 · in 18 hours", "Ended 12 Oct". */
function timing(a: Announcement, now: Date): string {
  const state = announcementState(a, now);
  const end = a.endsAt ? new Date(a.endsAt) : null;
  if (state === 'scheduled') {
    const start = new Date(a.startsAt);
    return `Starts ${when(a.startsAt)} · in ${formatDistanceStrict(start, now)}${end ? ` · ends ${when(a.endsAt ?? '')}` : ''}`;
  }
  if (state === 'live')
    return `Live since ${when(a.startsAt)} · ${end ? `ends in ${formatDistanceStrict(end, now)}` : 'no end date'}`;
  if (state === 'off') return `Switched off · was set to start ${when(a.startsAt)}`;
  return `Ran ${when(a.startsAt)} – ${end ? when(end.toISOString()) : 'now'}`;
}

export type AnnouncementAction = 'end' | 'duplicate' | 'edit' | 'delete';

/**
 * One tab of announcements. Each row: type, title and message, audience with its reach,
 * timing and author; the menu offers only what the rules allow (edit before start, delete
 * when no farmer is seeing it, end while live or scheduled).
 */
export function AnnouncementsList({
  items,
  tab,
  farmers,
  now,
  onAction,
  onCreate,
}: {
  items: Announcement[];
  tab: AnnouncementTab;
  farmers: FarmerAccount[];
  now: Date;
  onAction: (action: AnnouncementAction, announcement: Announcement) => void;
  onCreate: () => void;
}) {
  if (items.length === 0) {
    const copy = {
      active: ['Nothing live right now', 'Farmers see no banners. Publish one to reach them.'],
      scheduled: ['Nothing scheduled', 'Schedule an announcement to go live later.'],
      ended: ['No past announcements', 'Ended and switched-off announcements appear here.'],
    }[tab];
    return (
      <div className="border-border bg-glass rounded-2xl border">
        <EmptyState
          icon={tab === 'scheduled' ? CalendarClock : Megaphone}
          title={copy[0]}
          description={copy[1]}
          action={
            tab !== 'ended' ? (
              <button
                type="button"
                onClick={onCreate}
                className="text-ink-purple min-h-10 text-sm font-semibold"
              >
                New announcement
              </button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <ul aria-label="Announcements" className="space-y-3">
      {items.map((a) => {
        const meta = TYPE_META[a.type];
        const TypeIcon = meta.icon;
        const AudienceIcon = AUDIENCE_ICON[a.audience.kind];
        const state = announcementState(a, now);
        const menu: RowMenuItem[] = [
          ...(canEdit(a, now)
            ? [{ label: 'Edit', icon: Pencil, onSelect: () => onAction('edit', a) }]
            : []),
          { label: 'Duplicate', icon: Copy, onSelect: () => onAction('duplicate', a) },
          ...(canEnd(a, now)
            ? [
                {
                  label: state === 'scheduled' ? 'Cancel (end now)' : 'End now',
                  icon: Square,
                  onSelect: () => onAction('end', a),
                },
              ]
            : []),
          ...(canDelete(a, now)
            ? [
                {
                  label: 'Delete',
                  icon: Trash2,
                  danger: true,
                  onSelect: () => onAction('delete', a),
                },
              ]
            : []),
        ];
        return (
          <li
            key={a.id}
            className={cn(
              'border-border bg-glass flex gap-4 rounded-2xl border p-4 sm:p-5',
              state === 'ended' || state === 'off' ? 'opacity-80' : '',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'inline-flex size-10 shrink-0 items-center justify-center rounded-xl',
                meta.tone,
              )}
            >
              <TypeIcon size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-text text-[15px] font-semibold wrap-anywhere">{a.title}</h3>
                    <Badge color={meta.color}>{meta.label}</Badge>
                    {state === 'live' && (
                      <span className="text-ink-green inline-flex items-center gap-1 text-[11px] font-bold tracking-wide uppercase">
                        <span className="bg-accent size-1.5 rounded-full" aria-hidden="true" />
                        Live
                      </span>
                    )}
                    {!a.dismissible && (
                      <span className="text-text-mute text-[11px] font-semibold">
                        Can&apos;t be dismissed
                      </span>
                    )}
                  </div>
                  <p className="text-text-dim mt-1 line-clamp-2 text-sm wrap-anywhere">
                    {a.message}
                  </p>
                </div>
                <div className="-mt-1 -mr-2 shrink-0">
                  <RowMenu label={`Actions for ${a.title}`} items={menu} />
                </div>
              </div>
              <dl className="text-text-mute mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">Audience</dt>
                  <AudienceIcon size={13} aria-hidden="true" />
                  <dd className="text-text-dim font-semibold">{audienceLabel(a.audience)}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">Estimated reach</dt>
                  <Users size={13} aria-hidden="true" />
                  <dd className="tabular-nums">{reachLabel(estimateReach(a.audience, farmers))}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">Timing</dt>
                  <CalendarClock size={13} aria-hidden="true" />
                  <dd>{timing(a, now)}</dd>
                </div>
                <div>
                  <dt className="sr-only">Created by</dt>
                  <dd>by {a.createdBy}</dd>
                </div>
              </dl>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
