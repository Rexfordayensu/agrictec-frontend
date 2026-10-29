export type PlanId = 'free' | 'basic' | 'premium' | 'advanced';
export type PlanFeature = 'pdfReports' | 'aiAssistant' | 'cropDoctor' | 'yieldPredictor';
export type PlanAccess = Record<PlanFeature, boolean>;
export type MockPaymentMethod = 'mobile-money' | 'card';

/** A plan's latest payment: simulated (demo mode) or paid through Paystack. */
export interface MockPayment {
  reference: string;
  planId: PlanId;
  amountGHS: number;
  method: MockPaymentMethod;
  createdAt: string;
  status: 'simulated' | 'paid';
  /** Paystack only: "mobile_money" or "card", and the wallet or card brand. */
  channel?: string;
  brand?: string;
}

/** How plans are paid for: "paystack" (real money) or "demo" (simulated, development only). */
export type PaymentMode = 'paystack' | 'demo';

export interface Subscription {
  userId: string;
  planId: PlanId;
  mode: 'mock' | 'paystack';
  startsAt: string | null;
  expiresAt: string | null;
  payment?: MockPayment;
}

export interface CreditReservation {
  id: string;
  userId: string;
  month: string;
  cost: number;
}

export interface SubscriptionSnapshot {
  subscription: Subscription;
  creditsUsed: number;
  creditsLimit: number | null;
  creditsRemaining: number | null;
  resetsAt: string;
}
