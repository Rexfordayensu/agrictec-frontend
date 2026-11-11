// Ghana Card identity verification (/identity-verification). The server alone decides whether a
// farmer is verified: nothing here sends or stores a "verified" value.

import { api } from '@/services/api';
import type {
  IdentityAttempt,
  IdentityStarted,
  IdentityState,
  SimulatedOutcome,
} from '@/types/identity';

const BASE = '/identity-verification';

export const identityService = {
  async status(): Promise<IdentityState> {
    return api<IdentityState>(`${BASE}/status`);
  },

  async history(): Promise<IdentityAttempt[]> {
    return api<IdentityAttempt[]>(`${BASE}/history`);
  },

  /** After the farmer accepts the privacy notice (its version is sent with the consent). */
  async start(consentVersion: string, simulate?: SimulatedOutcome): Promise<IdentityStarted> {
    return api<IdentityStarted>(`${BASE}/start`, {
      method: 'POST',
      body: { consent: true, consentVersion, ...(simulate && { simulate }) },
    });
  },

  async retry(consentVersion: string, simulate?: SimulatedOutcome): Promise<IdentityStarted> {
    return api<IdentityStarted>(`${BASE}/retry`, {
      method: 'POST',
      body: { consent: true, consentVersion, ...(simulate && { simulate }) },
    });
  },
};
