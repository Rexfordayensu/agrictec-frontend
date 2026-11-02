// Error alerts on this device (settings.manage): the API pushes a notification when a request or
// a background job fails. The browser's push subscription is sent to the API; public/sw.js shows
// the notifications.

import { api } from '@/services/api';

export interface AlertsStatus {
  /** The key this browser subscribes with (VAPID, base64url). */
  publicKey: string;
  /** How many of your devices get alerts. */
  devices: number;
}

export const alertsService = {
  async status(): Promise<AlertsStatus> {
    return api<AlertsStatus>('/admin/alerts/push');
  },

  async subscribe(subscription: PushSubscriptionJSON): Promise<AlertsStatus> {
    return api<AlertsStatus>('/admin/alerts/push/subscribe', {
      method: 'POST',
      body: { endpoint: subscription.endpoint, keys: subscription.keys },
    });
  },

  async unsubscribe(endpoint: string): Promise<AlertsStatus> {
    return api<AlertsStatus>('/admin/alerts/push/unsubscribe', {
      method: 'POST',
      body: { endpoint },
    });
  },

  async sendTest(): Promise<{ sent: number; failed: number }> {
    return api<{ sent: number; failed: number }>('/admin/alerts/push/test', { method: 'POST' });
  },
};
