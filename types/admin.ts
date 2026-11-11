// ---------- Admin console types (admin spec Section 4) ----------

import type {
  AssistantReply,
  CreditScoreBreakdown,
  Crop,
  Diagnosis,
  DiagnosisResult,
  FarmRecord,
  MomoTransaction,
  Profile,
  YieldCrop,
} from '@/types';

export type AdminRole = 'analyst' | 'support' | 'admin' | 'super_admin';
export type Role = 'farmer' | AdminRole;
export type AccountStatus = 'active' | 'suspended' | 'pending_verification';

/** Admin spec Section 2. The role → permission matrix lives in `lib/admin/permissions.ts`. */
export type Permission =
  | 'overview.view'
  | 'farmers.view'
  | 'farmers.edit'
  | 'farmers.suspend'
  | 'farmers.delete'
  | 'farmers.impersonate'
  | 'transactions.review'
  | 'verifications.review'
  | 'loans.view'
  | 'loans.manage'
  | 'lenders.manage'
  | 'credit.configure'
  | 'content.manage'
  | 'announcements.send'
  | 'risk.review'
  | 'reports.export'
  | 'admins.manage'
  | 'audit.view'
  | 'settings.manage'
  | 'data.manage';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: 'active' | 'disabled';
  mustChangePassword: boolean;
  lastLoginAt?: string;
  createdAt: string;
  createdBy?: string;
}

/** The admin's view of a farmer. */
export interface FarmerAccount {
  userId: string;
  email: string;
  isGuest: boolean;
  status: AccountStatus;
  suspendedReason?: string;
  createdAt: string;
  lastActiveAt?: string;
  profile: Profile;
  stats: {
    records: number;
    momo: number;
    income: number;
    expenses: number;
    score: number;
    diagnoses: number;
  };
  /** Confirmed risk flags (phase A13): the red "Risk" tag and "Account under review". */
  riskConfirmed: number;
  /** e.g. 'cooperative-lead', 'pilot-2026' */
  tags: string[];
  adminNotes: { id: string; text: string; by: string; at: string }[];
}

export type VerificationKind = 'phone' | 'location' | 'ghanaCard';

export interface VerificationRequest {
  id: string;
  userId: string;
  kind: VerificationKind;
  /** Masked for ghanaCard. */
  submittedValue: string;
  /**
   * ghanaCard only: a SHA-256 hash of the full card number, so the same card on two accounts
   * can be detected without ever storing the number itself.
   */
  valueHash?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  /** Why it was rejected (one of REJECT_REASONS). The farmer sees it. */
  reason?: string;
  /** An optional note to the farmer with the rejection. */
  note?: string;
  /**
   * Admins only: an identity provider's answer for a Ghana Card (no card number). Advice for
   * the reviewer, never a decision.
   */
  identityCheck?: {
    provider: string;
    result: 'verified' | 'not_found' | 'unavailable' | 'unsupported' | 'error' | 'not_configured';
    /** "Exact Match", "Partial Match", "No Match"… */
    names?: string;
    checkedAt: string;
  };
}

export type LoanStatus =
  'submitted' | 'under_review' | 'approved' | 'rejected' | 'disbursed' | 'repaid' | 'defaulted';

/**
 * The admin's view of a loan application, with a status history. The farmer app's own
 * `LoanApplication` in `@/types` (status always 'submitted') is reconciled with this in A3.
 */
export interface LoanApplication {
  id: string;
  /** e.g. APP-2026-48213 */
  reference: string;
  userId: string;
  partnerId: string;
  /** The lender's name, from the API (the lender may since have been unlisted). */
  partnerName?: string;
  amount: number;
  months: number;
  purpose: string;
  rate: number;
  monthly: number;
  scoreAtApplication: number;
  status: LoanStatus;
  history: LoanHistoryEntry[];
  /** Set when the funds go out (status "disbursed"). */
  disbursement?: { date: string; reference: string };
  createdAt: string;
}

/** One step of an application's timeline. The farmer sees the note on "My Applications". */
export interface LoanHistoryEntry {
  status: LoanStatus;
  by: string;
  at: string;
  note?: string;
  /** "disbursed" only: the day the funds went out ("yyyy-MM-dd") and the transfer reference. */
  disbursedOn?: string;
  disbursementRef?: string;
}

export interface CreditConfig {
  version: number;
  /** Must sum to 100. */
  weights: {
    paymentHistory: number;
    recordCompleteness: number;
    incomeStability: number;
    momoActivity: number;
    verification: number;
  };
  targets: { recordsForFull: number; momoForFull: number; monthsWindow: number };
  /** Score thresholds, e.g. 500 / 650 / 750. */
  bands: { fair: number; good: number; excellent: number };
  /**
   * minRecords: AgriCtec's record-keeping guidance target. minScore and maxProfitMultiplier only
   * appear in older versions: the score and an AgriCtec limit no longer decide loans.
   */
  eligibility: { minRecords: number; minScore?: number; maxProfitMultiplier?: number };
  updatedAt: string;
  updatedBy: string;
  /** Why this version was published (required when publishing from the console). */
  note?: string;
  /** Set when this version copies an older one. */
  restoredFrom?: number;
}

export interface FeatureFlags {
  signupOpen: boolean;
  guestMode: boolean;
  aiAssistant: boolean;
  cropDoctor: boolean;
  yieldPredictor: boolean;
  loans: boolean;
  market: boolean;
  pdfReports: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  /** Optional: maintenance switches itself off at this time (ISO). */
  maintenanceEndsAt?: string;
}

export interface Plan {
  id: import('./subscription').PlanId;
  name: string;
  priceGHS: number;
  features: string[];
  active: boolean;
  /** Missing on older saved plans; normalized against the tier's defaults. */
  access?: import('./subscription').PlanAccess;
  /** Monthly AI credits. null means unlimited. */
  aiCredits?: number | null;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'critical';
  audience:
    { kind: 'all' } | { kind: 'region'; regions: string[] } | { kind: 'crop'; crops: Crop[] };
  startsAt: string;
  endsAt?: string;
  active: boolean;
  dismissible: boolean;
  createdBy: string;
  createdAt: string;
}

export type RiskRuleId =
  | 'duplicate_momo_ref'
  | 'amount_outlier'
  | 'burst_entries'
  | 'income_spike'
  | 'shared_phone'
  | 'shared_ghana_card'
  | 'backdated_bulk';

export interface RiskFlag {
  id: string;
  userId: string;
  rule: RiskRuleId;
  severity: 'low' | 'medium' | 'high';
  description: string;
  relatedIds: string[];
  status: 'open' | 'dismissed' | 'confirmed';
  detectedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  note?: string;
}

export interface AssistantKnowledgeItem {
  id: string;
  keywords: string[];
  reply: AssistantReply;
  active: boolean;
  priority: number;
}

export interface AuditEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: AdminRole;
  /** e.g. 'farmer.suspend', 'credit.update' */
  action: string;
  targetType:
    | 'farmer'
    | 'loan'
    | 'lender'
    | 'config'
    | 'content'
    | 'announcement'
    | 'risk'
    | 'admin'
    | 'system';
  targetId?: string;
  summary: string;
  before?: unknown;
  after?: unknown;
  createdAt: string;
}

// ---------- Phase A2: service and content types ----------

/** The signed-in admin, as returned by admin-auth.service. */
export interface AdminSession {
  admin: AdminUser;
  startedAt: string;
}

/** A lending partner the admin manages. Only active lenders are shown to farmers. */
export type InstitutionType =
  | 'universal_bank'
  | 'rural_community_bank'
  | 'savings_and_loans'
  | 'microfinance'
  | 'finance_house'
  | 'credit_union'
  | 'development_finance'
  | 'other';
export type LicenceStatus = 'unverified' | 'verified' | 'expired' | 'revoked';
export type PartnershipStatus = 'none' | 'in_discussion' | 'partner';
export type PublicationStatus = 'draft' | 'published' | 'unpublished' | 'suspended';

/**
 * A real institution, as farmers see it (GET /platform/lenders): only published lenders whose
 * licence was checked against an official source and whose listing was authorised. Unknown
 * values are missing (shown as "Not provided"), never guessed. Loan terms belong to products.
 */
export interface Lender {
  id: string;
  name: string;
  institutionType: InstitutionType;
  registeredName?: string;
  description?: string;
  color: string;
  /** Relative to the API root (e.g. /platform/lenders/x/logo?v=1). */
  logoPath?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  region?: string;
  offersAgriLoans?: boolean;
  supportedRegions: string[];
  licenceRef?: string;
  regulator?: string;
  licenceStatus: LicenceStatus;
  verificationSource?: string;
  verifiedAt?: string;
  partnershipStatus: PartnershipStatus;
  updatedAt?: string;
}

/** Everything the console manages, and why farmers can or can't see the lender. */
export interface AdminLender extends Lender {
  publicationStatus: PublicationStatus;
  listingAuthorised: boolean;
  listingNote?: string;
  verificationNote?: string;
  verifiedBy?: string;
  verificationExpiresAt?: string;
  reviewDue: boolean;
  suspensionReason?: string;
  publishedAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedBy?: string;
  /** Farmers see it right now; otherwise `blockers` says why not. */
  listed: boolean;
  blockers: string[];
  applications: number;
}

/** What an administrator types from the institution's official information. */
export interface LenderInput {
  name: string;
  institutionType: InstitutionType;
  registeredName?: string | null;
  description?: string | null;
  color: string;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  region?: string | null;
  offersAgriLoans?: boolean | null;
  supportedRegions: string[];
  licenceRef?: string | null;
  regulator?: string | null;
  partnershipStatus: PartnershipStatus;
}

export interface LenderVerificationInput {
  licenceStatus: LicenceStatus;
  source?: string;
  checkedOn: string;
  note?: string;
}

/** Crops with yield data (the crop content an admin edits). */
export type KnownCrop = YieldCrop;

/** Editable crop data. The seed defaults come from constants/crops.ts. */
export interface CropContent {
  crop: KnownCrop;
  emoji: string;
  /** Tonnes per acre under baseline conditions. */
  yieldPerAcre: number;
  /** Farm-gate price in GHS per tonne. */
  /** No longer used: yield revenue comes from published market prices only. */
  pricePerTonne?: number;
  tips: string[];
}

/** A crop doctor result the admin can edit or switch off. */
export interface DiagnosisContent extends DiagnosisResult {
  id: string;
  active: boolean;
  /**
   * The confidence a result shows, picked within this range (repeatably per photo). Without a
   * range, `confidence` is used as it is.
   */
  confidenceMin?: number;
  confidenceMax?: number;
}

/** Who last saved a content type, and when. */
export interface ContentMeta {
  by: string;
  at: string;
}

export type CreditConfigInput = Omit<CreditConfig, 'version' | 'updatedAt' | 'updatedBy'>;

export interface VerificationFilter {
  status?: VerificationRequest['status'];
  kind?: VerificationKind;
  userId?: string;
}

export interface LoanApplicationFilter {
  status?: LoanStatus;
  partnerId?: string;
  userId?: string;
}

export interface RiskFlagFilter {
  status?: RiskFlag['status'];
  severity?: RiskFlag['severity'];
  rule?: RiskRuleId;
  userId?: string;
}

export interface AuditFilter {
  actorId?: string;
  /** Exact action, or a prefix ending in '.' such as 'farmer.'. */
  action?: string;
  /** An action group (lib/admin/audit-groups.ts). */
  group?: 'farmer' | 'loan' | 'config' | 'content' | 'team' | 'system' | 'auth';
  targetType?: AuditEntry['targetType'];
  targetId?: string;
  /** Inclusive ISO date or timestamp bounds. */
  from?: string;
  to?: string;
  /** Matched against the summary, actor name and target ID. */
  search?: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/** Feature flags that switch a farmer-app feature on or off (the rest are signup/maintenance). */
export type FeatureKey =
  'aiAssistant' | 'cropDoctor' | 'yieldPredictor' | 'loans' | 'market' | 'pdfReports';

/** A farmer with their data, for the quick view and the profile page (phase A7/A8). */
export interface FarmerDetail {
  transactionStatusCounts?: Record<string, number>;
  account: FarmerAccount;
  /** Newest first. */
  records: FarmRecord[];
  momo: MomoTransaction[];
  diagnoses: Diagnosis[];
  credit: CreditScoreBreakdown;
  /** The live credit rules the score was calculated with. */
  creditConfig: CreditConfig;
}
