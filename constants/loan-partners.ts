import type { LoanPartner } from '@/types';

export const LOAN_PARTNERS: LoanPartner[] = [
  {
    id: 'sinapi',
    name: 'Sinapi Aba Trust',
    rate: 18,
    maxAmount: 100_000,
    minMonths: 6,
    maxMonths: 24,
    minScore: 550,
    color: '#10b981',
  },
  {
    id: 'opportunity',
    name: 'Opportunity Fund',
    rate: 22,
    maxAmount: 50_000,
    minMonths: 3,
    maxMonths: 12,
    minScore: 500,
    color: '#3b82f6',
  },
  {
    id: 'agridev',
    name: 'AgriDev Microfinance',
    rate: 15,
    maxAmount: 200_000,
    minMonths: 12,
    maxMonths: 36,
    minScore: 620,
    color: '#a855f7',
  },
  {
    id: 'rural',
    name: 'Rural Bank Consortium',
    rate: 20,
    maxAmount: 150_000,
    minMonths: 6,
    maxMonths: 24,
    minScore: 580,
    color: '#f5c451',
  },
];

export const LOAN_PURPOSES: string[] = [
  'Seeds & Fertilizer',
  'Farm Equipment',
  'Land Expansion',
  'Irrigation System',
  'Storage & Processing',
];

export const LOAN_PERIODS: number[] = [6, 12, 24, 36];
