import type {
  FarmerDetail,
  Lender,
  LoanApplication,
  RiskFlag,
  VerificationRequest,
} from '@/types/admin';

/** Everything the profile page loaded for one farmer. Null lists = the role can't see them. */
export interface FarmerPageData {
  detail: FarmerDetail;
  applications: LoanApplication[];
  verifications: VerificationRequest[] | null;
  riskFlags: RiskFlag[] | null;
  lenders: Lender[];
}

export interface TabProps {
  data: FarmerPageData;
  /** Reload after a change (and refresh the console's cached data). */
  reload: () => Promise<void>;
}
