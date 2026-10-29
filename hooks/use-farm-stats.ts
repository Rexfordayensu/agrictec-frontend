import {
  calculateCreditScore,
  isProfileComplete,
  scoreLabel,
} from '@/lib/calculations/credit-score';
import {
  activeCropCount,
  activeCropList,
  annualizedNetProfit,
  currentYearNetByMonth,
  expenseByCategory,
  financialHealth,
  incomeByCrop,
  momoMonthlySeries,
  momoTotals,
  monthlySeries,
  netProfit,
  percentChange,
  profitMargin,
  totalExpenses,
  totalIncome,
  ytdIncome,
} from '@/lib/calculations/finance';
import { borrowingLimit } from '@/lib/calculations/loan';
import { buildReadiness } from '@/lib/calculations/readiness';
import { useFarmStore } from '@/store/farm-store';
import { usePlatformStore } from '@/store/platform-store';
import { useProfileStore } from '@/store/profile-store';

/**
 * Every derived number the pages need, computed from the stores.
 * Nothing here is stored, and the React Compiler memoizes it, so there is no useMemo.
 */
export function useFarmStats() {
  const records = useFarmStore((s) => s.records);
  const momo = useFarmStore((s) => s.momo);
  const profile = useProfileStore((s) => s.profile);
  // The admin's credit rules (weights, targets, bands, loan eligibility).
  const creditConfig = usePlatformStore((s) => s.creditConfig);
  const cardUnderReview = usePlatformStore((s) =>
    s.verifications.some((v) => v.kind === 'ghanaCard' && v.status === 'pending'),
  );
  const loanRules = creditConfig.eligibility;
  const minRecords = loanRules.minRecords;

  const credit = calculateCreditScore(records, momo, profile, creditConfig);
  const momoSummary = momoTotals(momo);
  const profileComplete = isProfileComplete(profile);
  const monthly6 = monthlySeries(records, 6);
  const momo6 = momoMonthlySeries(momo, 6);
  const momoNet6 = momo6.income.map((inflow, i) => inflow - momo6.expense[i]);

  /** This month vs last month, from the last two points of a 6-month series. */
  const monthOverMonth = (series: number[]) => percentChange(series[5] ?? 0, series[4] ?? 0);

  const readiness = buildReadiness({ records, momo, profile, minRecords, cardUnderReview });

  return {
    income: totalIncome(records),
    expenses: totalExpenses(records),
    profit: netProfit(records),
    margin: profitMargin(records),
    ytdIncome: ytdIncome(records),
    activeCrops: activeCropCount(records),
    activeCropList: activeCropList(records),
    acres: profile?.acres ?? 0,
    monthly6,
    monthly12: monthlySeries(records, 12),
    currentYearNet: currentYearNetByMonth(records),
    incomeByCrop: incomeByCrop(records),
    expenseByCategory: expenseByCategory(records),
    momo: { ...momoSummary, monthly6: momo6, netSeries6: momoNet6 },
    /** % change this month vs last month; null when last month was 0. */
    trends: {
      income: monthOverMonth(monthly6.income),
      expenses: monthOverMonth(monthly6.expense),
      momoNet: monthOverMonth(momoNet6),
    },
    credit,
    creditLabel: scoreLabel(credit.score, creditConfig.bands),
    creditConfig,
    /** Minimum records, minimum score and the profit multiple lenders allow. */
    loanRules,
    health: financialHealth(records),
    annualizedProfit: annualizedNetProfit(records),
    /** The most the farmer can borrow under the admin's rules. */
    borrowingPower: borrowingLimit(annualizedNetProfit(records), loanRules),
    readiness,
    recordCount: records.length,
    /** Loans unlock only with a verified Ghana Card. */
    ghanaCard: profile?.ghanaCard.status ?? 'not_provided',
    profileComplete,
    hasData: records.length > 0 || momo.length > 0,
  };
}

export type FarmStats = ReturnType<typeof useFarmStats>;
