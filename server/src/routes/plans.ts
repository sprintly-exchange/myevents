import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAdmin, requireAuth } from '../middleware/auth';

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
    is_active: p.isActive,
    is_default: p.isDefault,
    created_at: p.createdAt,
  };
}

router.get('/', async (_req: Request, res: Response) => {
  const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { priceSek: 'asc' } });
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

async function getSwishSettings() {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: ['swish_number', 'swish_holder_name'] } },
  });
  return {
    number: rows.find(r => r.key === 'swish_number')?.value || '',
    holder: rows.find(r => r.key === 'swish_holder_name')?.value || '',
  };
}

router.get('/upgrade-requests/pending', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const request = await prisma.upgradeRequest.findFirst({
    where: { userId: user.id, status: 'pending' },
    include: { plan: true },
    orderBy: { requestedAt: 'desc' },
  });
  if (!request) return res.json({ request: null, swish: null });
  const swish = await getSwishSettings();
  return res.json({
    request: { ...request, plan_name: request.plan.name, plan_price: request.plan.priceSek },
    swish,
  });
});

router.post('/upgrade-requests', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { plan_id } = req.body;
  if (!plan_id) return res.status(400).json({ error: 'plan_id required' });
  const plan = await prisma.plan.findFirst({ where: { id: plan_id, isActive: true } });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  const paymentReference = Math.random().toString(36).substring(2, 8).toUpperCase();
  const request = await prisma.upgradeRequest.create({
    data: { userId: user.id, planId: plan_id, paymentReference },
  });
  const swish = await getSwishSettings();
  return res.status(201).json({
    request: { ...request, plan_name: plan.name, plan_price: plan.priceSek },
    swish,
  });
});

export default router;
