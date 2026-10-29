import { format } from 'date-fns';
import { isProfileComplete } from '@/lib/calculations/credit-score';
import { currentYearMonthly } from '@/lib/calculations/finance';
import { checkEligibility } from '@/lib/calculations/loan';
import { formatDate, formatGHS } from '@/lib/format';
import { GHANA_CARD_LABELS, cropNames, formatFarmSize } from '@/lib/profile';
import type { FarmStats } from '@/hooks/use-farm-stats';
import type { FarmRecord, MomoTransaction, Profile, ReportType } from '@/types';

/** One structure for both the on-screen preview and the PDF, so their numbers always match. */
export interface ReportData {
  type: ReportType;
  title: string;
  generatedAt: string; // ISO timestamp
  farmer: {
    name: string;
    farm: string;
    region: string;
    constituency: string;
    community: string;
    phone: string;
    /** The farm size in the farmer's own unit ("2 hectares"). */
    acres: string;
    crops: string;
  };
  summary: { label: string; value: string }[];
  table?: {
    title: string;
    headers: string[];
    rows: string[][];
    /** Per-column alignment; amounts are right-aligned. */
    align: ('left' | 'right')[];
    /** Optional bold last row, e.g. yearly totals. */
    totalRow?: string[];
  };
  sections?: { heading: string; body: string }[];
}

export interface ReportSource {
  records: FarmRecord[];
  momo: MomoTransaction[];
  profile: Profile | null;
  stats: FarmStats;
  now?: Date;
  /** An admin confirmed a risk flag: lender-facing reports say "Account under review". */
  underReview?: boolean;
}

export const REPORT_TITLES: Record<ReportType, string> = {
  income: 'Income Statement',
  expense: 'Expense Report',
  loan: 'Loan Readiness Report',
  tax: 'Tax Summary',
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const byDate = (a: FarmRecord, b: FarmRecord) => a.date.localeCompare(b.date);

/** Entries of a totals map, largest first, without zeros. */
function ranked(totals: Record<string, number>): [string, number][] {
  return Object.entries(totals)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);
}

function recordRows(records: FarmRecord[]): string[][] {
  return [...records]
    .sort(byDate)
    .map((r) => [formatDate(r.date), r.description, r.crop, formatGHS(r.amount)]);
}

function incomeStatement({
  records,
  stats,
}: ReportSource): Omit<ReportData, 'type' | 'title' | 'generatedAt' | 'farmer'> {
  const income = records.filter((r) => r.type === 'income');
  const crops = ranked(stats.incomeByCrop);
  const best = crops[0];
  return {
    summary: [
      { label: 'Total income', value: formatGHS(stats.income) },
      { label: 'Number of sales', value: String(income.length) },
      { label: 'Best crop', value: best ? `${best[0]} (${formatGHS(best[1])})` : 'None yet' },
      { label: 'Average sale', value: formatGHS(income.length ? stats.income / income.length : 0) },
    ],
    table: {
      title: 'Income records',
      headers: ['Date', 'Description', 'Crop', 'Amount'],
      rows: recordRows(income),
      align: ['left', 'left', 'left', 'right'],
    },
    sections: [
      {
        heading: 'Income by crop',
        body: crops.length
          ? crops
              .map(([crop, total]) => `${crop}: ${formatGHS(total)} (${pct(total, stats.income)}%)`)
              .join('\n')
          : 'No income has been recorded yet.',
      },
    ],
  };
}

function expenseReport({
  records,
  stats,
}: ReportSource): Omit<ReportData, 'type' | 'title' | 'generatedAt' | 'farmer'> {
  const expenses = records.filter((r) => r.type === 'expense');
  const largest = expenses.reduce<FarmRecord | null>(
    (top, r) => (!top || r.amount > top.amount ? r : top),
    null,
  );
  const categories = ranked(stats.expenseByCategory);
  return {
    summary: [
      { label: 'Total expenses', value: formatGHS(stats.expenses) },
      {
        label: 'Largest expense',
        value: largest ? `${largest.description} (${formatGHS(largest.amount)})` : 'None yet',
      },
      {
        label: 'Expenses as % of income',
        value: stats.income > 0 ? `${pct(stats.expenses, stats.income)}%` : 'No income recorded',
      },
      { label: 'Number of expenses', value: String(expenses.length) },
    ],
    table: {
      title: 'Expense records',
      headers: ['Date', 'Description', 'Crop', 'Amount'],
      rows: recordRows(expenses),
      align: ['left', 'left', 'left', 'right'],
    },
    sections: [
      {
        heading: 'Expenses by category',
        body: categories.length
          ? categories
              .map(
                ([name, total]) => `${name}: ${formatGHS(total)} (${pct(total, stats.expenses)}%)`,
              )
              .join('\n')
          : 'No expenses have been recorded yet.',
      },
    ],
  };
}

function loanReadiness({
  records,
  momo,
  profile,
  stats,
  underReview = false,
}: ReportSource): Omit<ReportData, 'type' | 'title' | 'generatedAt' | 'farmer'> {
  const { credit, creditLabel } = stats;
  const weights = stats.creditConfig.weights;
  const maxLoan = stats.borrowingPower;
  const farmerName = profile?.name.trim();
  // Sentence start vs mid-sentence, so a missing name never reads 'GHS 25,406, This farmer…'.
  const name = farmerName || 'This farmer';
  const nameMid = farmerName || 'this farmer';
  // amount 0: only the history and score rules apply here.
  const eligibility = checkEligibility({
    amount: 0,
    records,
    score: credit.score,
    rules: stats.loanRules,
    ghanaCard: profile?.ghanaCard.status ?? 'not_provided',
  });
  const strong = stats.profit > 0 && eligibility.eligible && !underReview;

  const assessment = underReview
    ? 'Account under review. AgriCtec is reviewing activity on this account, so no loan recommendation is given until the review is complete. The figures below are shown as recorded by the farmer.'
    : strong
      ? `${name} demonstrates strong financial management, with a net profit of ${formatGHS(stats.profit)} ` +
        `(${stats.margin}% margin) across ${records.length} farm records and ${momo.length} mobile money transactions. ` +
        `The credit score of ${credit.score} (${creditLabel}) reflects consistent record keeping. ` +
        `Based on an annualized profit of ${formatGHS(stats.annualizedProfit)}, ${nameMid} is recommended for loans up to ${formatGHS(maxLoan)}.`
      : `We recommend building more history before applying for a loan. ` +
        [
          stats.profit <= 0 ? 'The recorded figures do not yet show a profit.' : '',
          ...eligibility.reasons,
        ]
          .filter(Boolean)
          .join(' ') +
        ' Keep recording every sale, expense and MoMo payment to strengthen this profile.';

  const status = (done: boolean) => (done ? 'Verified' : 'Pending');
  return {
    summary: [
      ...(underReview ? [{ label: 'Account status', value: 'Account under review' }] : []),
      { label: 'Credit score', value: `${credit.score} (${creditLabel})` },
      { label: 'Net profit', value: formatGHS(stats.profit) },
      { label: 'Annualized profit', value: formatGHS(stats.annualizedProfit) },
      { label: 'Farm records', value: String(records.length) },
      { label: 'MoMo transactions', value: String(momo.length) },
      {
        label: 'Maximum affordable loan',
        value: underReview ? 'Withheld (account under review)' : formatGHS(maxLoan),
      },
    ],
    table: {
      title: 'Credit score factors',
      headers: ['Factor', 'Score', 'Weight'],
      rows: [
        [
          'Payment history (active months)',
          `${credit.paymentHistory}%`,
          `${weights.paymentHistory}%`,
        ],
        ['Record completeness', `${credit.recordCompleteness}%`, `${weights.recordCompleteness}%`],
        ['Income stability', `${credit.incomeStability}%`, `${weights.incomeStability}%`],
        ['MoMo activity', `${credit.momoActivity}%`, `${weights.momoActivity}%`],
        ['Verification', `${credit.verification}%`, `${weights.verification}%`],
      ],
      align: ['left', 'right', 'right'],
    },
    sections: [
      { heading: 'AI Assessment', body: assessment },
      {
        heading: 'Verification Status',
        body: [
          `Profile complete: ${isProfileComplete(profile) ? 'Yes' : 'No'}`,
          `Phone number: ${status(profile?.verification.phone ?? false)}`,
          `Farm location: ${status(profile?.verification.location ?? false)}`,
          `Ghana Card: ${GHANA_CARD_LABELS[profile?.ghanaCard.status ?? 'not_provided']}`,
        ].join('\n'),
      },
    ],
  };
}

function taxSummary({
  records,
  now = new Date(),
}: ReportSource): Omit<ReportData, 'type' | 'title' | 'generatedAt' | 'farmer'> {
  const { income, expense } = currentYearMonthly(records);
  const gross = income.reduce((a, b) => a + b, 0);
  const deductible = expense.reduce((a, b) => a + b, 0);
  return {
    summary: [
      { label: `Gross income (${now.getFullYear()})`, value: formatGHS(gross) },
      { label: 'Deductible expenses', value: formatGHS(deductible) },
      { label: 'Net income', value: formatGHS(gross - deductible) },
    ],
    table: {
      title: `Monthly totals, ${now.getFullYear()}`,
      headers: ['Month', 'Income', 'Expenses', 'Net'],
      rows: MONTHS.map((month, i) => [
        month,
        formatGHS(income[i]),
        formatGHS(expense[i]),
        formatGHS(income[i] - expense[i]),
      ]),
      align: ['left', 'right', 'right', 'right'],
      totalRow: ['Total', formatGHS(gross), formatGHS(deductible), formatGHS(gross - deductible)],
    },
    sections: [
      {
        heading: 'Important',
        body: 'This is an informational summary, not tax advice. Consult the Ghana Revenue Authority (GRA) or a tax professional.',
      },
    ],
  };
}

const BUILDERS = {
  income: incomeStatement,
  expense: expenseReport,
  loan: loanReadiness,
  tax: taxSummary,
};

export function buildReportData(type: ReportType, source: ReportSource): ReportData {
  const { profile } = source;
  const now = source.now ?? new Date();
  return {
    type,
    title: REPORT_TITLES[type],
    generatedAt: now.toISOString(),
    farmer: {
      name: profile?.name.trim() || 'Not provided',
      farm: profile?.farmName.trim() || 'Not provided',
      region: profile?.region || 'Not provided',
      constituency: profile?.constituency || 'Not provided',
      community: profile?.community || 'Not provided',
      phone: profile?.phone.trim() || 'Not provided',
      acres:
        profile && profile.acres > 0
          ? formatFarmSize(profile.acres, profile.sizeUnit)
          : 'Not provided',
      crops: profile && cropNames(profile).length ? cropNames(profile).join(', ') : 'Not provided',
    },
    ...BUILDERS[type]({ ...source, now }),
  };
}

/** "18 Oct 2026, 19:42" */
export function formatGeneratedAt(iso: string): string {
  return format(new Date(iso), 'd MMM yyyy, HH:mm');
}
