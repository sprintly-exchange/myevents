import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { getEffectivePlanPrices } from '../services/plan-pricing';
import { normalizeCountryCode } from '../services/payment-settings';

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

router.get('/', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const user = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { country: true } }) : null;
  const plans = await getEffectivePlanPrices(user?.country || 'SE');
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

router.get('/upgrade-requests/pending', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const request = await prisma.upgradeRequest.findFirst({
    where: { userId: user.id, status: 'pending' },
    include: { plan: true },
    orderBy: { requestedAt: 'desc' },
  });
  if (!request) return res.json({ request: null, payment: null, swish: null, payment_methods: [] });
  const userRow = await prisma.user.findUnique({ where: { id: user.id }, select: { country: true } });
  const countryCode = normalizeCountryCode(userRow?.country || request.countryCode || 'SE');
  const profiles = await prisma.paymentProfile.findMany({
    where: {
      isActive: true,
      OR: [{ countryCode }, { countryCode: 'GLOBAL' }],
    },
  });
  const sortedProfiles = [...profiles].sort((a, b) => {
    const aLocal = a.countryCode === countryCode ? 0 : 1;
    const bLocal = b.countryCode === countryCode ? 0 : 1;
    if (aLocal !== bLocal) return aLocal - bLocal;
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return (a.priority ?? 100) - (b.priority ?? 100);
  });
  const selectedProfile = request.paymentProfileId
    ? sortedProfiles.find(p => p.id === request.paymentProfileId) || null
    : sortedProfiles[0] || null;
  const paymentMethods = sortedProfiles.map(p => ({
    id: p.id,
    country_code: p.countryCode,
    method_name: p.methodName,
    recipient_label: p.recipientLabel,
    recipient_value: p.recipientValue,
    holder_label: p.holderLabel,
    holder_value: p.holderValue,
    qr_template: p.qrTemplate || '',
    is_default: p.isDefault,
    priority: p.priority ?? 100,
  }));
  const payment = selectedProfile ? {
    id: selectedProfile.id,
    country_code: selectedProfile.countryCode,
    method_name: selectedProfile.methodName,
    recipient_label: selectedProfile.recipientLabel,
    recipient_value: selectedProfile.recipientValue,
    holder_label: selectedProfile.holderLabel,
    holder_value: selectedProfile.holderValue,
    qr_template: selectedProfile.qrTemplate || '',
    is_default: selectedProfile.isDefault,
    priority: selectedProfile.priority ?? 100,
  } : null;
  const countryPrice = await prisma.planCountryPrice.findUnique({
    where: { plan_country_unique: { planId: request.plan.id, countryCode } },
  });
  return res.json({
    request: {
      ...request,
      plan_name: request.plan.name,
      plan_price: countryPrice?.isActive ? countryPrice.price : request.plan.priceSek,
      plan_currency: countryPrice?.isActive ? countryPrice.currency : request.plan.currency ?? 'SEK',
      country_code: request.countryCode ?? countryCode,
      payment_method: request.paymentMethod ?? payment?.method_name ?? null,
    },
    payment,
    payment_methods: paymentMethods,
    swish: payment ? { number: payment.recipient_value, holder: payment.holder_value } : null,
  });
});

router.post('/upgrade-requests', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { plan_id, payment_profile_id } = req.body;
  if (!plan_id) return res.status(400).json({ error: 'plan_id required' });
  const plan = await prisma.plan.findFirst({ where: { id: plan_id, isActive: true } });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  const userRow = await prisma.user.findUnique({ where: { id: user.id }, select: { country: true } });
  const countryCode = normalizeCountryCode(userRow?.country || 'SE');
  const paymentProfiles = await prisma.paymentProfile.findMany({
    where: {
      isActive: true,
      OR: [{ countryCode }, { countryCode: 'GLOBAL' }],
    },
  });
  const sortedProfiles = [...paymentProfiles].sort((a, b) => {
    const aLocal = a.countryCode === countryCode ? 0 : 1;
    const bLocal = b.countryCode === countryCode ? 0 : 1;
    if (aLocal !== bLocal) return aLocal - bLocal;
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return (a.priority ?? 100) - (b.priority ?? 100);
  });
  const selectedProfile = sortedProfiles.find(p => p.id === payment_profile_id) || sortedProfiles[0] || null;
  const paymentReference = Math.random().toString(36).substring(2, 8).toUpperCase();
  const countryPrice = await prisma.planCountryPrice.findUnique({
    where: { plan_country_unique: { planId: plan_id, countryCode } },
  });
  const request = await prisma.upgradeRequest.create({
    data: {
      userId: user.id,
      planId: plan_id,
      paymentReference,
      countryCode,
      paymentProfileId: selectedProfile?.id || null,
      paymentMethod: selectedProfile?.methodName || null,
    },
  });
  const paymentMethods = sortedProfiles.map(p => ({
    id: p.id,
    country_code: p.countryCode,
    method_name: p.methodName,
    recipient_label: p.recipientLabel,
    recipient_value: p.recipientValue,
    holder_label: p.holderLabel,
    holder_value: p.holderValue,
    qr_template: p.qrTemplate || '',
    is_default: p.isDefault,
    priority: p.priority ?? 100,
  }));
  const payment = selectedProfile ? {
    id: selectedProfile.id,
    country_code: selectedProfile.countryCode,
    method_name: selectedProfile.methodName,
    recipient_label: selectedProfile.recipientLabel,
    recipient_value: selectedProfile.recipientValue,
    holder_label: selectedProfile.holderLabel,
    holder_value: selectedProfile.holderValue,
    qr_template: selectedProfile.qrTemplate || '',
    is_default: selectedProfile.isDefault,
    priority: selectedProfile.priority ?? 100,
  } : null;
  return res.status(201).json({
    request: {
      ...request,
      plan_name: plan.name,
      plan_price: countryPrice?.isActive ? countryPrice.price : plan.priceSek,
      plan_currency: countryPrice?.isActive ? countryPrice.currency : plan.currency ?? 'SEK',
      country_code: countryCode,
      payment_method: request.paymentMethod ?? payment?.method_name ?? null,
    },
    payment,
    payment_methods: paymentMethods,
    swish: payment ? { number: payment.recipient_value, holder: payment.holder_value } : null,
  });
});

export default router;
