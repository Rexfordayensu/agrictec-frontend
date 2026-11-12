// GET /me/momo/summary (backend app/domain/momo_summary.py). Money is exact decimal text
// ("1200.50"): format it for display, never add it up in the browser. The API layer turns the
// server's nulls into undefined (services/api.ts), so "no value" arrives as undefined.

import type { DecimalText } from '@/types/financial';
import type { VerificationStatus } from '@/lib/transactions';
import type { MomoNetwork } from '@/types';

export interface MomoFlow {
  in: DecimalText;
  out: DecimalText;
  net: DecimalText;
  count: number;
  countIn: number;
  countOut: number;
}

export interface MomoSummary {
  currency: 'GHS';
  /** The day the figures run to (entries dated later are not counted). */
  asOf: string;
  allTime: MomoFlow & { moved: DecimalText; verified: number; verifiedShare: DecimalText };
  thisMonth: MomoFlow & { month: string };
  lastMonth: MomoFlow & { month: string };
  /** Percent change on last month; absent when last month had nothing to compare with. */
  changeOnLastMonth: { in?: DecimalText | null; out?: DecimalText | null };
  /** The last six months, oldest first. */
  monthly: (MomoFlow & { month: string })[];
  networks: {
    network: MomoNetwork;
    amount: DecimalText;
    count: number;
    amountShare: DecimalText;
    countShare: DecimalText;
  }[];
  untagged: { amount: DecimalText; count: number };
  /** Absent while no entry has a network. */
  mainNetwork?: { network: MomoNetwork; countShare: DecimalText } | null;
  byStatus: Record<VerificationStatus, number>;
}
