import type { FinancialSummary, ReportMonths } from '@/types/financial';

export type DashboardRange = ReportMonths;

const UTC_MONTH: Intl.DateTimeFormatOptions = { month: 'short', timeZone: 'UTC' };
const UTC_MONTH_YEAR: Intl.DateTimeFormatOptions = {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
};
const at = (isoDate: string) => new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);

/**
 * The server's financial summary (GET /me/financial-summary, exact decimals) in the shape the
 * dashboard tiles and chart display. Nothing is added up here: every total is the server's.
 * Strings become numbers only to be drawn and formatted.
 */
export function fromFinancialSummary(summary: FinancialSummary) {
  const { farm, momo, counts, period } = summary;
  const income = Number(farm.income.total);
  const expenses = Number(farm.expenses.total);
  const profit = Number(farm.net);
  return {
    income,
    expenses,
    profit,
    margin: income > 0 ? Math.round((profit / income) * 1000) / 10 : null,
    verifiedShare: {
      income: Number(farm.income.verifiedShare),
      expenses: Number(farm.expenses.verifiedShare),
      entries: Number(summary.verifiedShare.byCount),
    },
    recordCount: counts.farmRecords,
    financialRecordCount: counts.financialRecords,
    momoCount: counts.momo,
    momoNet: Number(momo.net),
    periodLabel: `${at(period.from).toLocaleDateString('en-GH', UTC_MONTH_YEAR)} – ${at(
      period.to,
    ).toLocaleDateString('en-GH', UTC_MONTH_YEAR)}`,
    start: period.from,
    end: period.to,
    dataAsOf: summary.dataAsOf,
    insufficient: summary.insufficient,
    monthsWithRecords: summary.monthsWithRecords,
    months: period.months,
    series: {
      labels: summary.monthly.map((m) =>
        at(`${m.month}-01`).toLocaleDateString('en-GH', UTC_MONTH),
      ),
      income: summary.monthly.map((m) => Number(m.income)),
      expense: summary.monthly.map((m) => Number(m.expenses)),
    },
  };
}

export type DashboardSummary = ReturnType<typeof fromFinancialSummary>;
