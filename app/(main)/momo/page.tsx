import type { Metadata } from 'next';
import { MomoContacts } from '@/components/momo/momo-contacts';
import { MomoFlowChart } from '@/components/momo/momo-flow-chart';
import { MomoHero } from '@/components/momo/momo-hero';
import { MomoView } from '@/components/momo/momo-view';

export const metadata: Metadata = { title: 'MoMo Transactions' };

export default function MomoPage() {
  return (
    <div className="@container space-y-6">
      <MomoHero />
      <MomoView />
      <div className="grid grid-cols-1 gap-6 @4xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <MomoFlowChart />
        <MomoContacts />
      </div>
    </div>
  );
}
