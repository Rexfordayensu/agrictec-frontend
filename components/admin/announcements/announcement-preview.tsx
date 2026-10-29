import { Moon, Sun } from 'lucide-react';
import { AnnouncementCard } from '@/components/dashboard/announcement-banner';
import type { Announcement } from '@/types/admin';

type PreviewContent = Pick<Announcement, 'type' | 'title' | 'message' | 'dismissible'>;

/**
 * The announcement exactly as farmers see it (the farmer banner's own card), once in each
 * theme: each panel sets data-theme, so the theme tokens inside it switch.
 */
export function AnnouncementPreview({ announcement }: { announcement: PreviewContent }) {
  const content: PreviewContent = {
    ...announcement,
    title: announcement.title.trim() || 'Your title',
    message: announcement.message.trim() || 'Your message appears here.',
  };
  return (
    <div className="space-y-3">
      {(['dark', 'light'] as const).map((theme) => (
        <figure key={theme} className="m-0">
          <figcaption className="text-text-mute mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
            {theme === 'dark' ? (
              <Moon size={12} aria-hidden="true" />
            ) : (
              <Sun size={12} aria-hidden="true" />
            )}
            {theme === 'dark' ? 'Dark theme' : 'Light theme'}
          </figcaption>
          <div
            data-theme={theme}
            className="bg-bg-1 text-text border-border rounded-2xl border p-3"
          >
            <AnnouncementCard announcement={content} readOnly />
          </div>
        </figure>
      ))}
    </div>
  );
}
