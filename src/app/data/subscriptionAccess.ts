export type SubscriptionPlan = 'free' | 'professional' | 'enterprise';
export type AccessLevel = 'full' | 'preview' | 'locked';

export interface SubscriptionDefinition {
  id: SubscriptionPlan;
  label: string;
  testUsername: string;
  description: string;
}

export const subscriptionPlans: SubscriptionDefinition[] = [
  {
    id: 'free',
    label: 'Free',
    testUsername: 'free-demo',
    description: 'Public discovery user with current-period macro indicators and limited previews.',
  },
  {
    id: 'professional',
    label: 'Professional',
    testUsername: 'professional-demo',
    description: 'Analyst user with full official histories, downloads and standard advanced intelligence.',
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    testUsername: 'enterprise-demo',
    description: 'Institutional user with all products, premium capital-markets intelligence and API-ready access.',
  },
];

export const subscriptionRank: Record<SubscriptionPlan, number> = {
  free: 0,
  professional: 1,
  enterprise: 2,
};

export const officialIndicatorAccess: Record<string, Record<SubscriptionPlan, AccessLevel>> = {
  'gdp-growth': { free: 'full', professional: 'full', enterprise: 'full' },
  'inflation-rate': { free: 'full', professional: 'full', enterprise: 'full' },
  'exchange-rate': { free: 'full', professional: 'full', enterprise: 'full' },
  population: { free: 'full', professional: 'full', enterprise: 'full' },
  'banking-assets': { free: 'preview', professional: 'full', enterprise: 'full' },
  'public-debt-gdp': { free: 'preview', professional: 'full', enterprise: 'full' },
};

export const advancedProductAccess: Record<string, Record<SubscriptionPlan, AccessLevel>> = {
  'advanced-gdp-diversification': { free: 'preview', professional: 'full', enterprise: 'full' },
  'advanced-oil-gas': { free: 'preview', professional: 'full', enterprise: 'full' },
  'advanced-fiscal-execution': { free: 'preview', professional: 'full', enterprise: 'full' },
  'advanced-sovereign-yield': { free: 'locked', professional: 'preview', enterprise: 'full' },
};

export const sourceDatasetAccess: Record<string, Record<SubscriptionPlan, AccessLevel>> = {
  INE_IPCN_TO_BRONZE: { free: 'preview', professional: 'full', enterprise: 'full' },
  BNA_EXCHANGE_REFERENCE_MONTHLY: { free: 'preview', professional: 'full', enterprise: 'full' },
  INE_GDP_QUARTERLY_YOY: { free: 'preview', professional: 'full', enterprise: 'full' },
  INE_RGPH_POPULATION: { free: 'preview', professional: 'full', enterprise: 'full' },
  BNA_OSD_BANKING_ASSETS: { free: 'locked', professional: 'full', enterprise: 'full' },
  UGD_PUBLIC_DEBT_GDP: { free: 'locked', professional: 'full', enterprise: 'full' },
  ANPG_OIL_GAS_MONTHLY: { free: 'locked', professional: 'full', enterprise: 'full' },
  MINFIN_FISCAL_EXECUTION_QUARTERLY: { free: 'locked', professional: 'full', enterprise: 'full' },
  INE_GDP_OIL_NON_OIL_QUARTERLY: { free: 'locked', professional: 'full', enterprise: 'full' },
  BODIVA_SOVEREIGN_YIELD_CURVE: { free: 'locked', professional: 'preview', enterprise: 'full' },
};

export function planLabel(plan: SubscriptionPlan) {
  return subscriptionPlans.find((item) => item.id === plan)?.label ?? 'Free';
}

export function normalizePlan(value: string | null | undefined): SubscriptionPlan {
  return value === 'professional' || value === 'enterprise' ? value : 'free';
}

export function accessLabel(access: AccessLevel) {
  if (access === 'full') return 'Included';
  if (access === 'preview') return 'Preview';
  return 'Upgrade';
}

export function minimumPlanForFullAccess(accessMap: Record<SubscriptionPlan, AccessLevel>) {
  return subscriptionPlans.find((plan) => accessMap[plan.id] === 'full')?.label ?? 'Enterprise';
}
