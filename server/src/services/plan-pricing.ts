import prisma from '../db';
import { normalizeCountryCode } from './payment-settings';

export interface EffectivePlanPrice {
  price_sek: number;
  currency: string;
  pricing_country: string | null;
}

export interface EffectivePlanRecord {
  id: string;
  name: string;
  description: string | null;
  eventLimit: number;
  guestLimit: number;
  priceSek: number;
  currency: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  pricingCountry: string | null;
}

export async function getEffectivePlanPrices(country?: string | null): Promise<EffectivePlanRecord[]> {
  const countryCode = normalizeCountryCode(country);
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { priceSek: 'asc' },
  });

  const overrides = await prisma.planCountryPrice.findMany({
    where: { isActive: true, countryCode },
  });

  const overrideByPlan = new Map(overrides.map(o => [o.planId, o]));
  return plans.map((plan) => {
    const override = overrideByPlan.get(plan.id);
    return {
      ...plan,
      priceSek: override?.price ?? plan.priceSek,
      currency: override?.currency ?? plan.currency ?? 'SEK',
      pricingCountry: override ? countryCode : null,
    };
  });
}

export async function getEffectivePlanPrice(planId: string, country?: string | null): Promise<EffectivePlanPrice | null> {
  const plan = await prisma.plan.findFirst({
    where: { id: planId, isActive: true },
  });
  if (!plan) return null;

  const countryCode = normalizeCountryCode(country);
  const override = await prisma.planCountryPrice.findUnique({
    where: { plan_country_unique: { planId, countryCode } },
  });

  if (override && override.isActive) {
    return { price_sek: override.price, currency: override.currency || 'SEK', pricing_country: countryCode };
  }

  return { price_sek: plan.priceSek, currency: plan.currency ?? 'SEK', pricing_country: null };
}
