import { create } from 'zustand';
import { assertWritable, isReadOnly } from '@/lib/read-only';
import { generateId } from '@/lib/utils';
import { ApiError } from '@/services/api';
import { aiService } from '@/services/ai.service';
import { chatService } from '@/services/chat.service';
import type { ChatMessage, LoadOptions, StoreStatus } from '@/types';
import { useSubscriptionStore } from '@/store/subscription-store';

let loadVersion = 0;

function welcomeMessage(): ChatMessage {
  return {
    id: generateId(),
    role: 'ai',
    content:
      'Akwaaba! I’m your AgriCtec AI assistant. I can help with crop advice, pest control, weather, market prices and your farm finances. Ask me a question or choose a quick prompt below!',
    createdAt: new Date().toISOString(),
  };
}

interface ChatState {
  userId: string | null;
  messages: ChatMessage[];
  isTyping: boolean;
  status: StoreStatus;
  load: (userId: string, options?: LoadOptions) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  clear: () => Promise<void>;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  userId: null,
  messages: [],
  isTyping: false,
  status: 'idle',

  load: async (userId, { silent = false } = {}) => {
    const version = ++loadVersion;
    if (!silent) set({ userId, messages: [], isTyping: false, status: 'loading' });
    try {
      const history = await chatService.list(userId);
      if (get().userId !== userId || version !== loadVersion) return;
      const messages = history.length ? history : [welcomeMessage()];
      if (!history.length && !isReadOnly()) await chatService.save(userId, messages);
      if (get().userId !== userId || version !== loadVersion) return;
      set({ messages, status: 'ready' });
    } catch (error) {
      if (get().userId !== userId || version !== loadVersion) return;
      set({ status: 'error' });
      throw error;
    }
  },

  sendMessage: async (text) => {
    assertWritable();
    const { userId, isTyping, status } = get();
    const trimmed = text.trim().slice(0, 500);
    if (!trimmed) return;
    if (!userId) throw new Error('You need to sign in first');
    if (isTyping || status !== 'ready') return;
    if (useSubscriptionStore.getState().userId !== userId)
      throw new Error('Your plan is still loading. Please try again.');
    // The quick check before sending (the API checks the plan again and spends the credit).
    useSubscriptionStore.getState().assertFeature('aiAssistant');

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ messages: [...state.messages, userMessage], isTyping: true }));
    // An in-flight reply must never appear in another session or a reloaded history.
    const isCurrent = () => get().userId === userId && get().messages.includes(userMessage);
    const appendError = (message?: string) =>
      set((state) => ({
        messages: [
          ...state.messages,
          {
            id: generateId(),
            role: 'ai',
            content: { title: message ?? 'Sorry, something went wrong. Please try again.' },
            createdAt: new Date().toISOString(),
          },
        ],
      }));

    try {
      // The API answers from the farmer's own data and the admin's knowledge base.
      const { result: reply, creditsRemaining } = await aiService.ask(trimmed);
      useSubscriptionStore.getState().applyCredits(creditsRemaining);
      if (!isCurrent()) return;
      const aiMessage: ChatMessage = {
        id: generateId(),
        role: 'ai',
        content: reply,
        createdAt: new Date().toISOString(),
      };
      set((state) => ({ messages: [...state.messages, aiMessage] }));
      await chatService.save(userId, get().messages);
    } catch (error) {
      if (!isCurrent()) return;
      // Plan and credit problems are worth showing as they are; anything else is generic.
      appendError(error instanceof ApiError && error.status === 403 ? error.message : undefined);
      try {
        await chatService.save(userId, get().messages);
      } catch {
        // Keep the error visible even if saving is unavailable.
      }
    } finally {
      if (isCurrent()) set({ isTyping: false });
    }
  },

  clear: async () => {
    assertWritable();
    const { userId, isTyping, status } = get();
    if (!userId) throw new Error('You need to sign in first');
    if (isTyping || status !== 'ready') return;
    const version = loadVersion;
    set({ status: 'loading' });
    try {
      const messages = [welcomeMessage()];
      // Replace the persisted history atomically with just the welcome message.
      await chatService.save(userId, messages);
      if (get().userId !== userId || version !== loadVersion) return;
      set({ messages, status: 'ready' });
    } finally {
      if (get().userId === userId && version === loadVersion) set({ status: 'ready' });
    }
  },
}));
