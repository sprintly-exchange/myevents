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
    price_sek: p.priceSek,
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
  const { name, event_limit, price_sek, description } = req.body;
  if (!name || event_limit === undefined || price_sek === undefined)
    return res.status(400).json({ error: 'name, event_limit, and price_sek required' });
  const plan = await prisma.plan.create({
    data: { name, eventLimit: Number(event_limit), priceSek: Number(price_sek), description: description || null },
  });
  return res.status(201).json({ plan: formatPlan(plan) });
});

router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  const existing = await prisma.plan.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Plan not found' });
  const { name, event_limit, price_sek, description } = req.body;
  const plan = await prisma.plan.update({
    where: { id: req.params.id },
    data: { name, eventLimit: Number(event_limit), priceSek: Number(price_sek), description },
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

router.post('/upgrade-requests', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { plan_id } = req.body;
  if (!plan_id) return res.status(400).json({ error: 'plan_id required' });
  const plan = await prisma.plan.findFirst({ where: { id: plan_id, isActive: true } });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  const request = await prisma.upgradeRequest.create({ data: { userId: user.id, planId: plan_id } });
  return res.status(201).json({ request });
});

export default router;
