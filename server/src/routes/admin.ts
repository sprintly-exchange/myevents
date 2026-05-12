import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { sendTestEmail } from '../services/email';
import { getPaymentSettings } from '../services/payment-settings';

const router = Router();

// Public endpoint — exposes only non-sensitive public settings
router.get('/public-settings', requireAuth, async (_req: Request, res: Response) => {
  const limitSetting = await prisma.appSetting.findUnique({ where: { key: 'free_tier_invite_limit' } });
  return res.json({ free_tier_invite_limit: limitSetting?.value || '1' });
});

router.get('/settings', requireAdmin, async (_req: Request, res: Response) => {
  const rows = await prisma.appSetting.findMany();
  const settings: Record<string, string> = {};
  for (const row of rows) settings[row.key] = row.value || '';
  return res.json({ settings });
});

router.post('/settings', requireAdmin, async (req: Request, res: Response) => {
  const { key, value, settings } = req.body;
  if (settings && Array.isArray(settings)) {
    for (const s of settings) {
      await prisma.appSetting.upsert({ where: { key: s.key }, update: { value: s.value }, create: { key: s.key, value: s.value } });
    }
    return res.json({ message: 'Settings updated' });
  }
  if (key) {
    await prisma.appSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
    return res.json({ message: 'Setting updated' });
  }
  return res.status(400).json({ error: 'key/value or settings array required' });
});

router.post('/settings/test-email', requireAdmin, async (req: Request, res: Response) => {
  const { to } = req.body;
  if (!to) return res.status(400).json({ error: 'to email required' });
  try {
    await sendTestEmail(to);
    return res.json({ message: 'Test email sent' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/change-password', requireAdmin, async (req: Request, res: Response) => {
  const adminUser = (req as any).user;
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password)
    return res.status(400).json({ error: 'current_password and new_password are required' });
  if (new_password.length < 6)
    return res.status(400).json({ error: 'New password must be at least 6 characters' });

  const user = await prisma.user.findUnique({ where: { id: adminUser.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!bcrypt.compareSync(current_password, user.passwordHash))
    return res.status(401).json({ error: 'Current password is incorrect' });

  const passwordHash = bcrypt.hashSync(new_password, 10);
  await prisma.user.update({ where: { id: adminUser.id }, data: { passwordHash } });
  return res.json({ message: 'Password changed successfully' });
});


router.get('/users', requireAdmin, async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    include: { plan: true },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({
    users: users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      payment_status: u.paymentStatus,
      plan_id: u.planId,
      plan_name: u.plan?.name ?? null,
      is_active: u.isActive ? 1 : 0,
      created_at: u.createdAt,
    })),
  });
});

router.patch('/users/:id', requireAdmin, async (req: Request, res: Response) => {
  const { role, is_active, payment_status, plan_id } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      ...(role !== undefined ? { role } : {}),
      ...(is_active !== undefined ? { isActive: !!is_active } : {}),
      ...(payment_status !== undefined ? { paymentStatus: payment_status } : {}),
      ...(plan_id !== undefined ? { planId: plan_id } : {}),
    },
    include: { plan: { select: { name: true } } },
  });
  return res.json({ user: updated });
});

router.get('/upgrade-requests', requireAdmin, async (_req: Request, res: Response) => {
  const requests = await prisma.upgradeRequest.findMany({
    include: { user: { select: { name: true, email: true } }, plan: { select: { name: true, priceSek: true, currency: true } } },
    orderBy: { requestedAt: 'desc' },
  });
  const mapped = requests.map(r => ({
    ...r,
    user_name: r.user.name,
    user_email: r.user.email,
    plan_name: r.plan.name,
    plan_price: r.plan.priceSek,
    plan_currency: r.plan.currency ?? 'SEK',
    payment_reference: r.paymentReference,
  }));
  return res.json({ requests: mapped });
});

router.patch('/upgrade-requests/:id', requireAdmin, async (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status))
    return res.status(400).json({ error: 'Status must be approved or rejected' });

  const request = await prisma.upgradeRequest.findUnique({ where: { id: req.params.id } });
  if (!request) return res.status(404).json({ error: 'Request not found' });

  await prisma.upgradeRequest.update({ where: { id: req.params.id }, data: { status, resolvedAt: new Date() } });
  if (status === 'approved') {
    await prisma.user.update({ where: { id: request.userId }, data: { planId: request.planId, paymentStatus: 'paid' } });
  }
  return res.json({ message: 'Request updated' });
});

router.get('/upgrade-requests/mine', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const requests = await prisma.upgradeRequest.findMany({
    where: { userId: user.id },
    include: { plan: { select: { name: true, priceSek: true, currency: true } } },
    orderBy: { requestedAt: 'desc' },
  });
  const mapped = requests.map(r => ({
    id: r.id,
    status: r.status,
    payment_reference: r.paymentReference,
    plan_name: r.plan.name,
    plan_price: r.plan.priceSek,
    plan_currency: r.plan.currency ?? 'SEK',
    requested_at: r.requestedAt,
  }));
  return res.json({ requests: mapped });
});

function generatePaymentReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'MYE-';
  for (let i = 0; i < 6; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  return ref;
}

router.post('/upgrade-requests', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { plan_id } = req.body;
  if (!plan_id) return res.status(400).json({ error: 'plan_id required' });
  const plan = await prisma.plan.findFirst({ where: { id: plan_id, isActive: true } });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  // Cancel any existing pending request for this user
  await prisma.upgradeRequest.updateMany({
    where: { userId: user.id, status: 'pending' },
    data: { status: 'cancelled' },
  });

  const paymentReference = generatePaymentReference();
  const request = await prisma.upgradeRequest.create({
    data: { userId: user.id, planId: plan_id, paymentReference },
  });

  const payment = await getPaymentSettings();

  return res.status(201).json({
    request: {
      id: request.id,
      payment_reference: paymentReference,
      plan_name: plan.name,
      plan_price: plan.priceSek,
      plan_currency: plan.currency ?? 'SEK',
    },
    payment,
    swish: { number: payment.recipient_value, holder: payment.holder_value },
  });
});

export default router;
