import {
  BadgeCheck,
  ClipboardList,
  IdCard,
  Rocket,
  Smartphone,
  Trophy,
  TrendingDown,
  UserRoundCheck,
  type LucideIcon,
} from 'lucide-react';
import { FALLBACK_INSIGHTS } from '@/data/mock/insights';
import { LOANS_LOCKED_HINT } from '@/lib/calculations/loan';
import { formatGHS } from '@/lib/format';
import type { FarmStats } from '@/hooks/use-farm-stats';

export interface Recommendation {
  id: string;
  icon: LucideIcon;
  title: string;
  text: string;
  /** Where the farmer can act on it. */
  cta: { label: string; href: string };
}

const MAX_RECOMMENDATIONS = 5;
const HIGH_EXPENSE_RATIO = 0.8;
/** Points between the lowest (300) and highest (850) score. */
const SCORE_RANGE = 550;

/** The entry with the largest value, e.g. { Maize: 9600, Cocoa: 8100 } → ['Maize', 9600]. */
function largest(totals: Record<string, number>): [string, number] | null {
  const entries = Object.entries(totals).filter(([, value]) => value > 0);
  if (entries.length === 0) return null;
  return entries.reduce((top, entry) => (entry[1] > top[1] ? entry : top));
}

const pct = (part: number, whole: number) => Math.round((part / whole) * 100);

/** Up to 5 data-driven suggestions, in priority order. */
export function getRecommendations(stats: FarmStats): Recommendation[] {
  const items: Recommendation[] = [];
  // The admin's rules: minimum records, the "loan ready" band and the MoMo factor's weight.
  const minRecords = stats.loanRules.minRecords;
  const loanReadyScore = stats.creditConfig.bands.good;
  const momoMaxPoints = Math.round((stats.creditConfig.weights.momoActivity / 100) * SCORE_RANGE);

  if (!stats.hasData) {
    items.push({
      id: 'start',
      cta: { label: 'Add a record', href: '/records' },
      icon: Rocket,
      title: 'Start Your Journey',
      text: 'Add your first farm record or MoMo transaction. Every entry builds your digital financial identity.',
    });
  } else if (stats.recordCount < minRecords) {
    const missing = minRecords - stats.recordCount;
    items.push({
      id: 'history',
      cta: { label: 'Add records', href: '/records' },
      icon: ClipboardList,
      title: 'Build Financial History',
      text: `Add ${missing} more record${missing === 1 ? '' : 's'} to unlock loan offers from our partners${stats.ghanaCard === 'verified' ? '' : ', and verify your Ghana Card'}.`,
    });
  }

  if (stats.expenses > 0 && stats.expenses > stats.income * HIGH_EXPENSE_RATIO) {
    const top = largest(stats.expenseByCategory);
    const ratio =
      stats.income > 0
        ? `Your expenses are ${pct(stats.expenses, stats.income)}% of your income.`
        : 'You have expenses recorded but no income yet.';
    items.push({
      id: 'expenses',
      cta: { label: 'Review expenses', href: '/records' },
      icon: TrendingDown,
      title: 'High Expense Ratio',
      text: top
        ? `${ratio} Your biggest cost is ${top[0]} (${formatGHS(top[1])}). Look for ways to reduce it.`
        : ratio,
    });
  }

  if (stats.momo.count === 0) {
    items.push({
      id: 'momo',
      cta: { label: 'Log MoMo', href: '/momo' },
      icon: Smartphone,
      title: 'Connect Mobile Money',
      text: `Log your MoMo payments. A strong MoMo history can raise your credit score by up to ${momoMaxPoints} points.`,
    });
  }

  if (!stats.profileComplete) {
    items.push({
      id: 'profile',
      cta: { label: 'Complete profile', href: '/settings/profile' },
      icon: UserRoundCheck,
      title: 'Complete Your Profile',
      text: 'Add your name, phone, farm name and acreage so lenders can verify who you are.',
    });
  }

  const topCrop = largest(stats.incomeByCrop);
  if (topCrop && stats.income > 0) {
    items.push({
      id: 'top-crop',
      cta: { label: 'Plan next season', href: '/yield-predictor' },
      icon: Trophy,
      title: 'Top Earner',
      text: `${topCrop[0]} brings in ${pct(topCrop[1], stats.income)}% of your income. Consider expanding it next season.`,
    });
  }

  const maxLoan = stats.borrowingPower;
  // Never tell a farmer without a verified Ghana Card that they can get a loan.
  if (stats.ghanaCard !== 'verified') {
    items.push({
      id: 'verify-card',
      cta: {
        label: stats.ghanaCard === 'pending' ? 'See status' : 'Verify now',
        href: '/settings/verification',
      },
      icon: IdCard,
      title: stats.ghanaCard === 'pending' ? 'Ghana Card Under Review' : 'Unlock Loans',
      text:
        stats.ghanaCard === 'pending'
          ? 'Your Ghana Card is being reviewed. Loan offers unlock once it is verified.'
          : LOANS_LOCKED_HINT,
    });
  } else if (stats.credit.score >= loanReadyScore && maxLoan > 0) {
    items.push({
      id: 'loan-ready',
      cta: { label: 'See loan offers', href: '/loans' },
      icon: BadgeCheck,
      title: 'Loan Ready',
      text: `With a score of ${stats.credit.score}, you may qualify for loans up to ${formatGHS(maxLoan)}.`,
    });
  }

  return items.slice(0, MAX_RECOMMENDATIONS);
}

/** Sentences built from the farmer's own numbers, followed by general tips. */
function insightPool(stats: FarmStats): string[] {
  const pool: string[] = [];

  if (stats.income > 0) {
    const ratio = pct(stats.expenses, stats.income);
    pool.push(
      ratio <= 60
        ? `Your expenses are ${ratio}% of your income. Great cost control!`
        : `Your expenses are ${ratio}% of your income. Cutting input costs would boost your profit.`,
    );
  }

  const topCrop = largest(stats.incomeByCrop);
  if (topCrop && stats.income > 0) {
    pool.push(
      `${topCrop[0]} is your top earner, bringing in ${pct(topCrop[1], stats.income)}% of your income.`,
    );
  }

  if (stats.recordCount > 0) {
    pool.push(
      stats.recordCount >= stats.loanRules.minRecords
        ? `You have logged ${stats.recordCount} farm records. Lenders can now see a solid history.`
        : `You have logged ${stats.recordCount} farm record${stats.recordCount === 1 ? '' : 's'}. Add ${stats.loanRules.minRecords - stats.recordCount} more to build your loan history.`,
    );
  }

  if (stats.momo.count > 0) {
    pool.push(
      `Your MoMo net balance is ${formatGHS(stats.momo.net)} across ${stats.momo.count} transactions.`,
    );
  }

  if (stats.hasData) {
    pool.push(`Your credit score is ${stats.credit.score} (${stats.creditLabel}).`);
  }

  return [...pool, ...FALLBACK_INSIGHTS];
}

/** How many insights the banner rotates through. */
export function getInsightCount(stats: FarmStats): number {
  return insightPool(stats).length;
}

/** One insight for the banner; `index` rotates through them (wraps around). */
export function getDailyInsight(stats: FarmStats, index: number): string {
  const pool = insightPool(stats);
  return pool[((index % pool.length) + pool.length) % pool.length];
}
