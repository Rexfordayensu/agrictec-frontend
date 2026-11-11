// Loan products (app/schemas/products.py). Money and rates are exact decimals sent as text
// ("5000.00"): format them for display, never add them up as floats. Anything the lender did
// not state is missing, shown as "Not provided".

export type Category = 'identity' | 'agricultural' | 'financial' | 'other';
export type FieldType =
  'none' | 'yes_no' | 'text' | 'number' | 'amount' | 'date' | 'select' | 'document';
export type Verification =
  'self_declared' | 'document_review' | 'agrictec_verified' | 'lender_verifies';
export type Metric =
  | 'ghana_card_verified'
  | 'phone_verified'
  | 'location_verified'
  | 'profile_complete'
  | 'cooperative_member'
  | 'farm_size_acres'
  | 'farm_region'
  | 'primary_crop'
  | 'farm_type'
  | 'months_of_records'
  | 'record_count'
  | 'income_12m'
  | 'net_12m';
export type CheckOp = 'is_true' | 'gte' | 'lte' | 'in';
export type DocumentFormat = 'pdf' | 'jpg' | 'png' | 'webp';
export type RatePeriod = 'year' | 'month';
export type RateMethod = 'reducing_balance' | 'flat' | 'other';
export type RepaymentFrequency =
  'weekly' | 'monthly' | 'quarterly' | 'end_of_season' | 'lump_sum' | 'other';
export type ProductStatus = 'draft' | 'published' | 'unpublished';

/** A decimal as text, e.g. "28.5" or "5000.00". */
export type DecimalText = string;

export interface Fee {
  name: string;
  kind: 'fixed' | 'percent';
  value: DecimalText;
  note?: string | null;
}

export interface ProductTerms {
  purpose?: string | null;
  description?: string | null;
  minAmount?: DecimalText | null;
  maxAmount?: DecimalText | null;
  interestRate?: DecimalText | null;
  ratePeriod?: RatePeriod | null;
  rateMethod?: RateMethod | null;
  rateNote?: string | null;
  fees: Fee[];
  minMonths?: number | null;
  maxMonths?: number | null;
  repaymentFrequency?: RepaymentFrequency | null;
  collateral?: string | null;
  guarantor?: string | null;
  /** Missing: not provided. A list: only these regions. */
  supportedRegions?: string[] | null;
}

export interface RequirementCheck {
  metric: Metric;
  op: CheckOp;
  value?: DecimalText | number | string[] | boolean | null;
}

export interface Requirement {
  key: string;
  name: string;
  description?: string | null;
  category: Category;
  required: boolean;
  fieldType: FieldType;
  min?: DecimalText | null;
  max?: DecimalText | null;
  options: string[];
  allowedFormats: DocumentFormat[];
  maxSizeMb?: number | null;
  check?: RequirementCheck | null;
  visibleIf?: { key: string; equals: string } | null;
  verification: Verification;
  source?: string | null;
}

export interface ProductContent {
  name: string;
  terms: ProductTerms;
  requirements: Requirement[];
  source?: string | null;
  /** yyyy-MM-dd */
  sourceCheckedOn?: string | null;
}

export interface ProductVersion extends ProductContent {
  version: number;
  publishedAt: string;
  publishedBy: string;
  note: string;
}

/** A published product as farmers see it (its latest published version). */
export interface LoanProduct extends ProductVersion {
  id: string;
  lender: {
    id: string;
    name: string;
    color: string;
    logoPath?: string;
    partnershipStatus: string;
  };
}

export interface AdminProduct {
  id: string;
  lenderId: string;
  status: ProductStatus;
  published?: ProductVersion;
  draft: ProductContent;
  draftChanged: boolean;
  /** What must be fixed before the draft can be published. */
  problems: string[];
  listed: boolean;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}
