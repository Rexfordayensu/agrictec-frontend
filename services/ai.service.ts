// The AI tools, run by the API: it checks the feature flag and the plan, answers, and spends the
// credits only when the answer succeeds. Replace the server's engine (rules today, an LLM or a
// vision model later) without changing these calls.

import { imageValidationError } from '@/lib/image/compress';
import { api } from '@/services/api';
import type { AssistantReply, Crop, DiagnosisResult } from '@/types';

export interface AiAnswer<T> {
  result: T;
  /** Credits left this month after the request; null on an unlimited plan. */
  creditsRemaining: number | null;
}

export const aiService = {
  /** One assistant question (1 credit). */
  async ask(message: string): Promise<AiAnswer<AssistantReply>> {
    const { reply, creditsRemaining } = await api<{ reply: AssistantReply; creditsRemaining: number | null }>(
      '/me/assistant',
      { method: 'POST', body: { message } },
    );
    return { result: reply, creditsRemaining };
  },

  /** One crop scan (5 credits). Images up to 10 MB. */
  async diagnose(file: File, crop?: Crop): Promise<AiAnswer<DiagnosisResult>> {
    const invalid = imageValidationError(file);
    if (invalid) throw new Error(invalid);
    const form = new FormData();
    form.append('image', file, file.name);
    if (crop) form.append('crop', crop);
    return api<AiAnswer<DiagnosisResult>>('/me/crop-doctor', { method: 'POST', body: form });
  },
};
