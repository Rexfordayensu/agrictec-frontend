import { api } from '@/services/api';
import type { ChatMessage } from '@/types';

// The assistant conversation. Only the API writes it (POST /me/assistant saves each question and
// answer): Claude reads it back as earlier turns, so the browser must never plant messages.
export const chatService = {
  async list(_userId: string): Promise<ChatMessage[]> {
    return api<ChatMessage[]>('/me/chat');
  },

  async clear(_userId: string): Promise<void> {
    await api('/me/chat', { method: 'DELETE' });
  },
};
