// Loan applications (backend app/services/loan_applications.py): prepared by the farmer,
// reviewed by AgriCtec, sent to the lender; lender progress only with the lender's proof.

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'changes_requested'
  | 'approved_for_sending'
  | 'sent_to_lender'
  | 'received_by_lender'
  | 'under_lender_review'
  | 'documents_requested'
  | 'approved_by_lender'
  | 'rejected_by_lender'
  | 'withdrawn';

export interface ApplicationSummary {
  id: string;
  reference: string;
  status: ApplicationStatus;
  statusLabel: string;
  lenderName: string | null;
  productName: string | null;
  amount: string;
  months: number;
  submittedAt: string | null;
  updatedAt: string;
  createdAt: string;
  /** Admin lists only. */
  farmer?: string;
}

export interface ApplicationRequirement {
  key: string;
  name: string;
  description: string | null;
  category: string | null;
  required: boolean;
  fieldType: 'none' | 'yes_no' | 'text' | 'number' | 'amount' | 'date' | 'select' | 'document';
  options: string[];
  min: string | null;
  max: string | null;
  allowedFormats: string[];
  maxSizeMb: number | null;
  verification: string | null;
  visible: boolean;
  answer: string | null;
  documents: {
    id: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
    uploadedAt: string;
  }[];
  checkedByAgriCtec: boolean;
}

export interface ApplicationEvent {
  status: ApplicationStatus;
  label: string;
  by: string;
  actorType: 'farmer' | 'admin' | 'system';
  lenderConfirmed: boolean;
  note: string | null;
  at: string;
  eventId: number;
  hasProof: boolean;
  proofName: string | null;
}

export interface LoanApplicationDetail {
  id: string;
  reference: string;
  status: ApplicationStatus;
  statusLabel: string;
  lender: { id: string; name: string | null; canReceive: boolean };
  product: {
    id: string | null;
    name: string | null;
    version: number;
    terms: Record<string, unknown> | null;
  };
  amount: string;
  months: number;
  purpose: string;
  letter: string | null;
  requirements: ApplicationRequirement[];
  missing: string[];
  assessment: {
    outcome: string;
    outcomeLabel: string;
    summary: string;
    period: { months: number; from: string; to: string; source: string } | null;
    figures: Record<string, string | number | null> | null;
    createdAt: string | null;
  } | null;
  statementReportId: string | null;
  consent: {
    purpose: string;
    dataItems: string[];
    noticeVersion: string;
    givenAt: string;
    withdrawnAt: string | null;
  } | null;
  timeline: ApplicationEvent[];
  reviewNote: string | null;
  submittedAt: string | null;
  sentAt: string | null;
  sentVia: 'email' | 'recorded' | null;
  canEdit: boolean;
  canSubmit: boolean;
  canWithdraw: boolean;
  createdAt: string;
  updatedAt: string;
}

/** What the console sees: the farmer, and whether the figures still tally. */
export interface AdminApplicationDetail extends LoanApplicationDetail {
  userId: string;
  sentTo: string | null;
  farmer: {
    name: string;
    phone: string;
    farmName: string;
    region: string;
    constituency: string;
    identityLevel: 'none' | 'reviewed' | 'nia_verified';
  };
  tally: {
    lines: { label: string; atSubmission: string | number | null; now: string | number; same: boolean }[];
    allMatch: boolean;
    statement: { id: string; periodMonths: number; from: string; to: string } | null;
    note: string;
  };
}

/** What a console action returns: the application, without the farmer and tally blocks. */
export interface AdminActionResult extends LoanApplicationDetail {
  userId: string;
  sentTo: string | null;
  sendResult?: 'sent' | 'manual' | 'failed';
  sendError?: string;
}

export interface ConsentNotice {
  version: string;
  dataItems: string[];
}

export type LenderConfirmedStatus =
  | 'received_by_lender'
  | 'under_lender_review'
  | 'documents_requested'
  | 'approved_by_lender'
  | 'rejected_by_lender';
