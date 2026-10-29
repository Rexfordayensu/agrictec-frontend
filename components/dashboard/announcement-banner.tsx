'use client';

import { readOnlyProps, READ_ONLY_CLASS, useReadOnly } from '@/lib/read-only';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { bySeverity, isLive, reaches } from '@/services/admin/announcements.service';
import { usePlatformStore } from '@/store/platform-store';
import { useProfileStore } from '@/store/profile-store';
import type { Announcement } from '@/types/admin';

const TYPE_STYLE: Record<Announcement['type'], { icon: LucideIcon; tone: string; label: string }> =
  {
    info: { icon: Info, tone: 'border-info/40 bg-info/10 text-ink-blue', label: 'Information' },
    success: {
      icon: CircleCheck,
      tone: 'border-accent/40 bg-accent/10 text-ink-green',
      label: 'Good news',
    },
    warning: {
      icon: TriangleAlert,
      tone: 'border-gold/40 bg-gold/10 text-ink-gold',
      label: 'Warning',
    },
    critical: {
      icon: CircleAlert,
      tone: 'border-danger/50 bg-danger/10 text-ink-red',
      label: 'Important',
    },
  };

/**
 * Live announcements for this farmer's region and crops, stacked with critical ones first.
 * Dismissals are remembered per farmer; non-dismissible announcements stay until they end.
 */
export function AnnouncementBanner({ className }: { className?: string }) {
  const announcements = usePlatformStore((s) => s.announcements);
  const dismissed = usePlatformStore((s) => s.dismissed);
  const dismiss = usePlatformStore((s) => s.dismissAnnouncement);
  const profile = useProfileStore((s) => s.profile);
  const readOnly = useReadOnly();

  const now = new Date();
  const visible = announcements
    .filter(
      (a) =>
        isLive(a, now) &&
        !dismissed.includes(a.id) &&
        reaches(a, {
          region: profile?.region ?? '',
          primaryCrops: profile?.primaryCrops ?? [],
        }),
    )
    .sort(bySeverity);

  if (visible.length === 0) return null;

  return (
    <section aria-label="Announcements" className={cn('space-y-3', className)}>
      {visible.map((announcement) => (
        <AnnouncementCard
          key={announcement.id}
          announcement={announcement}
          readOnly={readOnly}
          onDismiss={() =>
            dismiss(announcement.id).catch(() =>
              toast.error('Could not save that. It may show again next time.'),
            )
          }
        />
      ))}
    </section>
  );
}

/**
 * One announcement as farmers see it. Also used by the admin's live preview, so both always
 * match. Without `onDismiss`, the close button is shown but does nothing (preview).
 */
export function AnnouncementCard({
  announcement,
  onDismiss,
  readOnly = false,
}: {
  announcement: Pick<Announcement, 'type' | 'title' | 'message' | 'dismissible'>;
  onDismiss?: () => void;
  readOnly?: boolean;
}) {
  const style = TYPE_STYLE[announcement.type];
  const Icon = style.icon;
  return (
    <div
      role={announcement.type === 'critical' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-2xl border px-4 py-3', style.tone)}
    >
      <Icon size={20} aria-hidden="true" className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold wrap-anywhere">
          <span className="sr-only">{style.label}: </span>
          {announcement.title}
        </p>
        <p className="text-text mt-0.5 text-sm wrap-anywhere whitespace-pre-line">
          {announcement.message}
        </p>
      </div>
      {announcement.dismissible && (
        <button
          type="button"
          {...readOnlyProps(readOnly)}
          onClick={readOnly ? undefined : onDismiss}
          aria-label={`Dismiss announcement: ${announcement.title}`}
          className={cn(
            'hover:bg-glass-strong -mt-1 -mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors',
            readOnly && READ_ONLY_CLASS,
          )}
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
