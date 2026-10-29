import { Calculator, Landmark, ReceiptText, TrendingUp, type LucideIcon } from 'lucide-react';
import type { ReportType } from '@/types';

export interface ReportMeta {
  icon: LucideIcon;
  description: string;
  /** Who the report is for, shown as a small chip. */
  audience: string;
  /** Icon tile colours. */
  tone: string;
  /** Soft background behind the paper thumbnail. */
  wash: string;
  /** Header band colour on the paper thumbnail (a real document colour, theme-independent). */
  paper: string;
  /** Card hover border colour. */
  hoverBorder: string;
}

export const REPORT_ORDER: ReportType[] = ['loan', 'income', 'expense', 'tax'];

export const REPORT_META: Record<ReportType, ReportMeta> = {
  income: {
    icon: TrendingUp,
    description: 'Every sale, your best crop and income by crop.',
    audience: 'Buyers & lenders',
    tone: 'bg-linear-to-br from-[#10b981] to-[#34d399] text-white shadow-accent/40',
    wash: 'from-accent/20 to-accent/5',
    paper: '#10b981',
    hoverBorder: 'hover:border-accent/50',
  },
  expense: {
    icon: ReceiptText,
    description: 'All farm costs, grouped by category.',
    audience: 'Planning',
    tone: 'bg-linear-to-br from-[#2563eb] to-[#60a5fa] text-white shadow-info/40',
    wash: 'from-info/20 to-info/5',
    paper: '#3b82f6',
    hoverBorder: 'hover:border-info/50',
  },
  loan: {
    icon: Landmark,
    description: 'Credit score, factors and an AI assessment for lenders.',
    audience: 'Banks & MFIs',
    tone: 'bg-linear-to-br from-[#9333ea] to-[#c084fc] text-white shadow-purple/40',
    wash: 'from-purple/20 to-purple/5',
    paper: '#a855f7',
    hoverBorder: 'hover:border-purple/50',
  },
  tax: {
    icon: Calculator,
    description: 'This year’s gross income, deductible costs and monthly totals.',
    audience: 'GRA filing',
    tone: 'bg-linear-to-br from-[#d97706] to-[#f5c451] text-white shadow-gold/40',
    wash: 'from-gold/20 to-gold/5',
    paper: '#f59e0b',
    hoverBorder: 'hover:border-gold/50',
  },
};
