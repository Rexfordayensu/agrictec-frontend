import type { Metadata } from 'next';
import { CreditRulesPage } from '@/components/admin/credit-rules/credit-rules-page';
import { RequirePermission } from '@/components/admin/layout/require-permission';

export const metadata: Metadata = { title: 'Credit Rules' };

/**
 * Credit rules: super_admin only (credit.configure). Edited as a draft with a live impact
 * preview; publishing is checked and audited again by the service.
 */
export default function CreditRules() {
  return (
    <RequirePermission permission="credit.configure">
      <CreditRulesPage />
    </RequirePermission>
  );
}
