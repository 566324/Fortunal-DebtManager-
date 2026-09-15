import { DebtManagerPlanId } from '../types';

export interface SubscriptionPlanConfig {
  id: DebtManagerPlanId;
  name: string;
  priceKes: number;
  period: string;
  maxDebts: number;
  maxDebtsLabel: string;
  aiCreditsMax: number;
  badge?: string;
  popular?: boolean;
  tagline: string;
  features: string[];
  ctaLabel: string;
}

export const DEBT_MANAGER_PLANS: SubscriptionPlanConfig[] = [
  {
    id: 'free',
    name: 'Free',
    priceKes: 0,
    period: '/ month',
    maxDebts: 20,
    maxDebtsLabel: 'Up to 20 active debts',
    aiCreditsMax: 50,
    tagline: 'Essential debt tracking for individuals and new ventures',
    features: [
      'Up to 20 active debts',
      'Customer & debt tracking',
      'Manual payment recording',
      'Basic digital receipts',
      'Basic dashboard',
    ],
    ctaLabel: 'Current Plan',
  },
  {
    id: 'starter',
    name: 'Starter',
    priceKes: 99,
    period: '/ month',
    maxDebts: 100,
    maxDebtsLabel: 'Up to 100 active debts',
    aiCreditsMax: 150,
    tagline: 'For active retail shops, kiosks, and growing sellers',
    features: [
      'Up to 100 active debts',
      'Customer & debt tracking',
      'Partial payments',
      'WhatsApp/SMS reminder tools',
      'Digital receipts',
      'Basic reports',
    ],
    ctaLabel: 'Choose Starter',
  },
  {
    id: 'pro',
    name: 'Pro',
    priceKes: 299,
    period: '/ month',
    maxDebts: 500,
    maxDebtsLabel: 'Up to 500 active debts',
    aiCreditsMax: 500,
    badge: 'MOST POPULAR',
    popular: true,
    tagline: 'High-performance recovery with AI voice, OCR, and payment plans',
    features: [
      'Up to 500 active debts',
      'Unlimited reminder preparation',
      'AI Voice entry',
      'Receipt OCR/scanning',
      'Branded receipts',
      'Advanced reports',
      'Payment plans',
    ],
    ctaLabel: 'Choose Pro',
  },
  {
    id: 'business',
    name: 'Business',
    priceKes: 799,
    period: '/ month',
    maxDebts: 100000,
    maxDebtsLabel: 'Unlimited active debts',
    aiCreditsMax: 2000,
    tagline: 'Multi-staff access, cashier roles, and enterprise audit logs',
    features: [
      'Unlimited active debts',
      'Multi-staff access',
      'Staff/cashier roles',
      'Advanced audit logs',
      'Business reporting',
      'Automated messaging architecture when the required provider integration is available',
    ],
    ctaLabel: 'Choose Business',
  },
];
