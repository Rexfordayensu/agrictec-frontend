import type { Metadata } from 'next';
import { MomoOverview } from '@/components/momo/momo-overview';
import { MomoTransactions } from '@/components/momo/momo-transactions';

export const metadata: Metadata = { title: 'MoMo Transactions' };

/** The farmer's Mobile Money: the server's totals (GET /me/momo/summary), then every entry. */
export default function MomoPage() {
  return (
    <div className="@container space-y-4 sm:space-y-5">
      <MomoOverview />
      <MomoTransactions />
    </div>
  );
}
