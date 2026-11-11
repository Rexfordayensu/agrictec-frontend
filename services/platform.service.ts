// Everything the farmer app reads from the admin console's settings, in one place: credit rules,
// feature flags, plans, lenders, content and announcements (GET /platform, no sign-in needed).

import { api } from '@/services/api';
import type { CreditSummary } from '@/services/loans.service';
import type { MarketPrice } from '@/types';
import type { LoanProduct } from '@/types/products';
import type { PaymentMode } from '@/types/subscription';
import type {
  Announcement,
  AssistantKnowledgeItem,
  CreditConfig,
  CropContent,
  DiagnosisContent,
  FeatureFlags,
  Lender,
  Plan,
  VerificationRequest,
} from '@/types/admin';

export interface PlatformSnapshot {
  creditConfig: CreditConfig;
  flags: FeatureFlags;
  plans: Plan[];
  /**
   * The marketplace: published lenders whose licence check is current and whose listing was
   * authorised. Empty until an administrator publishes one (never placeholders).
   */
  lenders: Lender[];
  /** Published products of listed lenders, each at its latest published version. */
  loanProducts: LoanProduct[];
  /** Published, reviewed observations only. */
  marketPrices: MarketPrice[];
  crops: CropContent[];
  knowledge: AssistantKnowledgeItem[];
  diagnoses: DiagnosisContent[];
  /** Live announcements for every audience; the banner picks the farmer's own. */
  announcements: Announcement[];
  /** How plans are paid for. */
  payments: { mode: PaymentMode };
  /** "claude": the assistant and crop doctor use Claude; "off": the built-in rules and demo. */
  ai: { mode: 'claude' | 'off' };
}

export const platformService = {
  async getFlags(): Promise<FeatureFlags> {
    return api<FeatureFlags>('/platform/flags');
  },

  /** Every platform setting, in one call. */
  async load(): Promise<PlatformSnapshot> {
    return api<PlatformSnapshot>('/platform');
  },

  async getDismissed(_userId: string): Promise<string[]> {
    return api<string[]>('/me/announcements/dismissed');
  },

  /** Remembers a dismissal for this farmer only. */
  async dismiss(_userId: string, id: string, _liveIds: string[]): Promise<string[]> {
    return api<string[]>(`/me/announcements/${encodeURIComponent(id)}/dismiss`, { method: 'POST' });
  },

  /** Whether an admin confirmed a risk flag on this account (no details, just the state). */
  async underReview(_userId: string): Promise<boolean> {
    return (await api<CreditSummary>('/me/credit')).underReview;
  },

  async listVerifications(_userId: string): Promise<VerificationRequest[]> {
    return api<VerificationRequest[]>('/me/verifications');
  },

  /** Sends a Ghana Card for admin review. The API keeps only a mask and a fingerprint. */
  async submitGhanaCard(_userId: string, cardNumber: string): Promise<VerificationRequest> {
    return api<VerificationRequest>('/me/verifications', {
      method: 'POST',
      body: { kind: 'ghanaCard', value: cardNumber },
    });
  },

  /** Texts a six-digit code to the phone number saved on the profile (valid 10 minutes). */
  async sendPhoneCode(_userId: string): Promise<{ sentTo: string; expiresInMinutes: number }> {
    return api('/me/phone/code', { method: 'POST' });
  },

  /** The phone passes once the code texted to it comes back (the API checks it). */
  async verifyPhone(_userId: string, phone: string, code: string): Promise<VerificationRequest> {
    return api<VerificationRequest>('/me/verifications', {
      method: 'POST',
      body: { kind: 'phone', value: phone, code },
    });
  },

  /** Sends the saved farm pin ("lat, lng") for an admin's review; verified once approved. */
  async submitLocation(_userId: string, value: string): Promise<VerificationRequest> {
    return api<VerificationRequest>('/me/verifications', {
      method: 'POST',
      body: { kind: 'location', value },
    });
  },
};
