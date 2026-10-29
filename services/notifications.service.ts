// The farmer's inbox: what happened to their account (a Ghana Card decision, a loan's next step,
// a suspension, a password reset). The API also sends these by SMS and email when configured.

import { api } from '@/services/api';

export interface AppNotification {
  id: string;
  kind: 'verification' | 'loan' | 'account' | string;
  title: string;
  body: string;
  /** Where in the app it leads. */
  href?: string;
  createdAt: string;
  read: boolean;
}

export interface Inbox {
  unread: number;
  items: AppNotification[];
}

export const notificationsService = {
  /** The latest 50, newest first, and how many are unread. */
  async inbox(): Promise<Inbox> {
    return api<Inbox>('/me/notifications');
  },

  /** Marks these (or, with no IDs, every notice) as read. */
  async markRead(ids?: string[]): Promise<void> {
    await api('/me/notifications/read', { method: 'POST', body: { ids } });
  },
};
