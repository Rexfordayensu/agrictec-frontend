import { api } from '@/services/api';
import type { ChatMessage } from '@/types';

export const chatService = {
  async list(_userId: string): Promise<ChatMessage[]> {
    return api<ChatMessage[]>('/me/chat');
  },

  /** Replaces the saved conversation (the API keeps the most recent 200 messages). */
  async save(_userId: string, messages: ChatMessage[]): Promise<void> {
    await api('/me/chat', { method: 'PUT', body: messages });
  },

  async clear(_userId: string): Promise<void> {
    await api('/me/chat', { method: 'DELETE' });
  },
};
