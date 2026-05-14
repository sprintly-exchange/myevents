import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAdmin } from '../middleware/auth';
import { getEffectivePlanPrices } from '../services/plan-pricing';
import { isIsoCountryCode, normalizeCountryCode } from '../services/payment-settings';

const router = Router();

function formatPlan(p: any) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    event_limit: p.eventLimit,
    guest_limit: p.guestLimit ?? -1,
    price_sek: p.priceSek,
    currency: p.currency ?? 'SEK',
    pricing_country: p.pricingCountry ?? null,
    is_active: p.isActive,
    is_default: p.isDefault,
    created_at: p.createdAt,
  };
}

router.get('/', async (req: Request, res: Response) => {
  const requestedCountry = typeof req.query.country === 'string' && isIsoCountryCode(req.query.country)
    ? req.query.country
    : 'SE';
  const plans = await getEffectivePlanPrices(requestedCountry);
  return res.json({ plans: plans.map(formatPlan) });
});

router.post('/', requireAdmin, async (req: Request, res: Response) => {
  const { name, event_limit, guest_limit, price_sek, currency, description } = req.body;
  if (!name || event_limit === undefined || price_sek === undefined)
    return res.status(400).json({ error: 'name, event_limit, and price_sek required' });
  const plan = await prisma.plan.create({
    data: {
      name,
      eventLimit: Number(event_limit),
      guestLimit: guest_limit !== undefined ? Number(guest_limit) : -1,
      priceSek: Number(price_sek),
      currency: currency || 'SEK',
      description: description || null,
    },
  });
  return res.status(201).json({ plan: formatPlan(plan) });
});

router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  const existing = await prisma.plan.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Plan not found' });
  const { name, event_limit, guest_limit, price_sek, currency, description } = req.body;
  const plan = await prisma.plan.update({
    where: { id: req.params.id },
    data: {
      name,
      eventLimit: Number(event_limit),
      guestLimit: guest_limit !== undefined ? Number(guest_limit) : existing.guestLimit,
      priceSek: Number(price_sek),
      currency: currency || existing.currency,
      description,
    },
  });
  return res.json({ plan: formatPlan(plan) });
});

router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  const existing = await prisma.plan.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Plan not found' });
  await prisma.plan.update({ where: { id: req.params.id }, data: { isActive: false } });
  return res.json({ message: 'Plan deactivated' });
});

router.post('/:id/set-default', requireAdmin, async (req: Request, res: Response) => {
  const existing = await prisma.plan.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Plan not found' });
  await prisma.plan.updateMany({ data: { isDefault: false } });
  await prisma.plan.update({ where: { id: req.params.id }, data: { isDefault: true } });
  return res.json({ message: 'Default plan updated' });
});

router.get('/:id/country-prices', requireAdmin, async (req: Request, res: Response) => {
  const plan = await prisma.plan.findUnique({ where: { id: req.params.id } });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  const prices = await prisma.planCountryPrice.findMany({
    where: { planId: req.params.id, isActive: true },
    orderBy: { countryCode: 'asc' },
  });
  return res.json({
    prices: prices.map(p => ({
      id: p.id,
      plan_id: p.planId,
      country_code: p.countryCode,
      price_sek: p.price,
      currency: p.currency,
      is_active: p.isActive,
    })),
  });
});

router.put('/:id/country-prices/:countryCode', requireAdmin, async (req: Request, res: Response) => {
  const countryCode = normalizeCountryCode(req.params.countryCode);
  if (countryCode === 'GLOBAL') return res.status(400).json({ error: 'Use base plan price for global pricing' });
  if (!isIsoCountryCode(countryCode)) return res.status(400).json({ error: 'countryCode must be a 2-letter ISO code' });
  const existing = await prisma.plan.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Plan not found' });
  const price = Number(req.body.price_sek);
  if (Number.isNaN(price)) return res.status(400).json({ error: 'price_sek must be a number' });
  const saved = await prisma.planCountryPrice.upsert({
    where: { plan_country_unique: { planId: req.params.id, countryCode } },
    update: {
      price,
      currency: req.body.currency || 'SEK',
      isActive: req.body.is_active !== undefined ? !!req.body.is_active : true,
    },
    create: {
      planId: req.params.id,
      countryCode,
      price,
      currency: req.body.currency || 'SEK',
      isActive: req.body.is_active !== undefined ? !!req.body.is_active : true,
    },
  });
  return res.json({
    price: {
      id: saved.id,
      plan_id: saved.planId,
      country_code: saved.countryCode,
      price_sek: saved.price,
      currency: saved.currency,
      is_active: saved.isActive,
    },
  });
});

router.delete('/country-prices/:priceId', requireAdmin, async (req: Request, res: Response) => {
  const existing = await prisma.planCountryPrice.findUnique({ where: { id: req.params.priceId } });
  if (!existing) return res.status(404).json({ error: 'Country price not found' });
  await prisma.planCountryPrice.update({ where: { id: req.params.priceId }, data: { isActive: false } });
  return res.json({ message: 'Country price removed' });
});


export default router;
