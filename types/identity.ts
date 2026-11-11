// Ghana Card identity verification (backend app/services/ghana_card_verification.py).

/** none · reviewed (an AgriCtec admin reviewed the typed-in card) · nia_verified (the provider confirmed it). */
export type IdentityLevel = 'none' | 'reviewed' | 'nia_verified';

export type IdentityStatus =
  | 'not_started'
  | 'pending'
  | 'processing'
  | 'verified'
  | 'failed'
  | 'expired'
  | 'requires_review';

export interface IdentityAttempt {
  id: string;
  provider: string;
  /** A development-only simulated check: never NIA, never counts on the live platform. */
  simulated: boolean;
  status: Exclude<IdentityStatus, 'not_started'>;
  method: string | null;
  initiatedAt: string;
  verifiedAt: string | null;
  expiresAt: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  attemptCount: number;
  consentVersion: string;
}

export interface IdentityRequirement {
  feature: string;
  label: string;
  required: IdentityLevel;
  met: boolean;
}

export interface IdentityState {
  level: IdentityLevel;
  status: IdentityStatus;
  attempt: IdentityAttempt | null;
  provider: {
    name: string | null;
    available: boolean;
    /** Why it can't start: not_offered, disabled, not_configured, awaiting_documentation, production. */
    reason: string | null;
    simulated: boolean;
  };
  canStart: boolean;
  canRetry: boolean;
  attemptsLeftToday: number;
  consentVersion: string;
  requirements: IdentityRequirement[];
}

export interface IdentityStarted {
  attempt: IdentityAttempt;
  /** What to do next, as the provider states it. */
  instructions: string;
  /** Where the provider's own Ghana Card and face check happens, when it has one. */
  redirectUrl: string | null;
}

/** Development only: the outcome the simulated provider returns. */
export type SimulatedOutcome = 'verified' | 'failed' | 'requires_review' | 'processing';
