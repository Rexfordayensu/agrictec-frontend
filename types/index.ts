// ---------- Core domain types (spec Section 4) ----------

import type { AccountStatus, Role } from '@/types/admin';

export type { AccountStatus, Role } from '@/types/admin';

export type RecordType = 'income' | 'expense' | 'activity';
/** Crops with yield data (base yield, price, tips): the ones the yield predictor offers. */
export type YieldCrop =
  'Maize' | 'Cassava' | 'Rice' | 'Cocoa' | 'Yam' | 'Plantain' | 'Groundnut' | 'Tomato';
/** Every crop a farmer can grow in the app ('Other' carries a free-text name in otherCrops). */
export type Crop =
  | YieldCrop
  | 'Pepper'
  | 'Okra'
  | 'Soybean'
  | 'Sorghum'
  | 'Millet'
  | 'Cashew'
  | 'Oil Palm'
  | 'Vegetables'
  | 'Other';

export interface FarmRecord {
  id: string; // crypto.randomUUID(), never Date.now()
  userId: string;
  type: RecordType;
  description: string; // ONE field name everywhere (old code mixed desc/description)
  crop: Crop;
  amount: number; // activities may be 0
  date: string; // ISO yyyy-MM-dd
  notes?: string;
  createdAt: string;
}

export interface MomoTransaction {
  id: string;
  userId: string;
  direction: 'in' | 'out';
  counterparty: string;
  amount: number;
  reference: string;
  network?: MomoNetwork;
  date: string;
  createdAt: string;
}

export interface Diagnosis {
  id: string;
  userId: string;
  disease: string;
  severity: Severity;
  confidence: number;
  treatment: string;
  /** How to stop it coming back (from the admin's disease library). */
  prevention?: string[];
  crop?: Crop;
  imageThumb?: string;
  date: string;
}

export type FarmType = 'Smallholder' | 'Commercial' | 'Cooperative' | 'Out-grower';
export type SizeUnit = 'acres' | 'hectares';
export type GhanaCardStatus = 'not_provided' | 'pending' | 'verified' | 'rejected';

/** The Ghana Card on a profile. Never the full number: a mask and a SHA-256 fingerprint only. */
export interface GhanaCardInfo {
  status: GhanaCardStatus;
  /** e.g. GHA-******789-0 (last four digits, including the check digit). */
  masked?: string;
  /** SHA-256 of the full number, for the admin's duplicate check. */
  hash?: string;
  submittedAt?: string;
  rejectedReason?: string;
}

export interface Profile {
  userId: string;
  name: string;
  /** Compressed JPEG data URL; optional for existing profiles. */
  photoDataUrl?: string;
  email: string;
  phone: string;
  farmName: string;
  useNameAsFarmName: boolean;
  region: string;
  constituency: string;
  community?: string;
  gps?: { lat: number; lng: number };
  /** Always stored in acres; sizeUnit is how the farmer entered it (and sees it). */
  acres: number;
  sizeUnit: SizeUnit;
  primaryCrops: string[];
  /** The crop names typed under "Other". */
  otherCrops?: string;
  farmType: FarmType;
  cooperativeName?: string;
  outgrowerCompany?: string;
  ghanaCard: GhanaCardInfo;
  /** ghanaCard is true only when ghanaCard.status is 'verified'. */
  verification: { phone: boolean; location: boolean; ghanaCard: boolean };
  /** Set when the onboarding wizard is finished; the app is closed until then. */
  onboardingCompletedAt?: string;
}

/** The onboarding wizard's progress, saved on every Continue so a farmer can resume. */
export interface OnboardingDraft {
  userId: string;
  currentStep: number;
  data: Partial<Profile>;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string | AssistantReply; // AI messages store structured replies
  createdAt: string;
}

export interface CreditScoreBreakdown {
  score: number; // 300–850
  paymentHistory: number; // 0–100
  recordCompleteness: number; // 0–100
  incomeStability: number; // 0–100
  momoActivity: number; // 0–100
  verification: number; // 0–100
}

// ---------- Supporting types ----------

export type MomoNetwork = 'MTN' | 'Telecel' | 'AirtelTigo';
export type Severity = 'None' | 'Moderate' | 'High';
export type ReportType = 'income' | 'expense' | 'loan' | 'tax';
export type Language = 'en' | 'tw' | 'ga' | 'ee' | 'ha';

export type NewRecordInput = Omit<FarmRecord, 'id' | 'userId' | 'createdAt'>;
export type NewMomoInput = Omit<MomoTransaction, 'id' | 'userId' | 'createdAt'>;
export type NewDiagnosisInput = Omit<Diagnosis, 'id' | 'userId'>;
/** What a diagnosis engine returns, before it is saved to history. */
export type DiagnosisResult = Omit<Diagnosis, 'id' | 'userId' | 'date' | 'imageThumb'>;

export interface User {
  id: string;
  email: string;
  isGuest: boolean;
  role: Role;
  status: AccountStatus;
  createdAt: string;
}

export interface Session {
  userId: string;
  email: string;
  isGuest: boolean;
  /** Always 'farmer' for farmer-app sessions. A farmer session never grants admin access. */
  role: Role;
  startedAt: string;
}

export interface LoanPartner {
  id: string;
  name: string;
  rate: number; // annual %
  maxAmount: number;
  minMonths: number;
  maxMonths: number;
  minScore: number;
  color: string;
}

export interface MarketPrice {
  crop: Crop | string;
  unit: string;
  price: number;
  change: number;
  id?: string;
  status?: 'draft' | 'published';
  scope?: 'market' | 'region' | 'national';
  region?: string;
  market?: string;
  quantity?: number;
  packageWeightKg?: number;
  priceMax?: number;
  observedAt?: string;
  source?: import('./market').MarketSource;
  reviewedAt?: string;
  reviewedBy?: string;
  nationalCoverageConfirmed?: boolean;
  country?: 'GH';
  currency?: 'GHS';
}

export type WeatherCondition = 'sunny' | 'partly-cloudy' | 'showers' | 'storm';

export interface Weather {
  condition: WeatherCondition;
  temp: number;
  description: string;
  humidity: number;
  rainChance: number;
}

export interface YieldInput {
  crop: Crop;
  acres: number;
  season: 'major' | 'minor';
  fertilizer: 'both' | 'inorganic' | 'organic' | 'none';
  irrigation: 'rainfed' | 'drip' | 'sprinkler';
}

export interface YieldResult {
  low: number;
  expected: number;
  high: number;
  perAcre: number;
  revenue: number;
  pricePerTonne: number;
}

export type EligibilityIssueCode =
  'records' | 'affordability' | 'score' | 'lender-max' | 'ghana-card';

export interface EligibilityIssue {
  code: EligibilityIssueCode;
  message: string;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  /** The same reasons with a machine-readable code, so the UI can offer the right fix. */
  issues: EligibilityIssue[];
  maxAffordable: number;
}

export interface RepaymentResult {
  monthly: number;
  total: number;
  interest: number;
}

export interface ReadinessItem {
  key: string;
  label: string;
  description: string;
  done: boolean;
}

export interface AssistantReply {
  title: string;
  intro?: string;
  bullets?: string[];
  tip?: string;
}

export interface NotificationSettings {
  aiInsights: boolean;
  weatherAlerts: boolean;
  priceAlerts: boolean;
}

// ---------- Phase 3: services & stores ----------

export type StoreStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface LoadOptions {
  /** Reload in place: keep the current data on screen, with no loading state (cross-tab sync). */
  silent?: boolean;
}

export interface AppSettings {
  language: Language;
  notifications: NotificationSettings;
}

export interface MonthlySeries {
  labels: string[];
  income: number[];
  expense: number[];
}

export interface PriceTrend {
  crop: string;
  prices: number[];
}

export interface PriceTrends {
  labels: string[];
  series: PriceTrend[];
}

export interface LoanApplicationInput {
  partnerId: string;
  amount: number;
  purpose: string;
  months: number;
  monthly: number;
}

/**
 * A loan application with its status history. Since admin phase A3 there is one shape for both
 * apps: lenders/admins move it through the pipeline and the farmer sees the timeline.
 */
export type { LoanApplication, LoanStatus } from '@/types/admin';
