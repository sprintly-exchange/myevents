import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { sendTestEmail } from '../services/email';
import { isIsoCountryCode, normalizeCountryCode, sortProfilesForCountry } from '../services/payment-settings';

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
      country: u.country ?? null,
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
  const { role, is_active, payment_status, plan_id, country } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (country !== undefined && country !== null && String(country).trim() !== '' && !isIsoCountryCode(String(country)))
    return res.status(400).json({ error: 'country must be a 2-letter ISO code' });

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      ...(role !== undefined ? { role } : {}),
      ...(is_active !== undefined ? { isActive: !!is_active } : {}),
      ...(payment_status !== undefined ? { paymentStatus: payment_status } : {}),
      ...(plan_id !== undefined ? { planId: plan_id } : {}),
      ...(country !== undefined ? { country: country ? String(country).trim().toUpperCase() : null } : {}),
    },
    include: { plan: { select: { name: true } } },
  });
  return res.json({ user: updated });
});

router.get('/upgrade-requests', requireAdmin, async (_req: Request, res: Response) => {
  const requests = await prisma.upgradeRequest.findMany({
    include: {
      user: { select: { name: true, email: true } },
      plan: { select: { name: true, priceSek: true, currency: true } },
      paymentProfile: { select: { methodName: true, countryCode: true } },
    },
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
    country_code: r.countryCode ?? null,
    payment_method: r.paymentMethod ?? r.paymentProfile?.methodName ?? null,
    payment_method_country: r.paymentProfile?.countryCode ?? null,
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
  const { plan_id, payment_profile_id } = req.body;
  if (!plan_id) return res.status(400).json({ error: 'plan_id required' });
  const plan = await prisma.plan.findFirst({ where: { id: plan_id, isActive: true } });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
  const countryCode = normalizeCountryCode(fullUser?.country || 'SE');

  const paymentProfiles = await prisma.paymentProfile.findMany({
    where: {
      isActive: true,
      OR: [{ countryCode }, { countryCode: 'GLOBAL' }],
    },
  });
  const sortedProfiles = sortProfilesForCountry(paymentProfiles, countryCode);
  const selectedProfile = sortedProfiles.find(p => p.id === payment_profile_id) || sortedProfiles[0] || null;

  // Cancel any existing pending request for this user
  await prisma.upgradeRequest.updateMany({
    where: { userId: user.id, status: 'pending' },
    data: { status: 'cancelled' },
  });

  const paymentReference = generatePaymentReference();
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
  const selectedPayment = selectedProfile ? {
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
      id: request.id,
      payment_reference: paymentReference,
      plan_name: plan.name,
      plan_price: plan.priceSek,
      plan_currency: plan.currency ?? 'SEK',
      country_code: request.countryCode,
      payment_method: request.paymentMethod,
    },
    payment: selectedPayment,
    payment_methods: paymentMethods,
    swish: selectedPayment ? { number: selectedPayment.recipient_value, holder: selectedPayment.holder_value } : null,
  });
});

router.get('/payment-profiles', requireAdmin, async (req: Request, res: Response) => {
  const country = typeof req.query.country === 'string' ? normalizeCountryCode(req.query.country) : undefined;
  const profiles = await prisma.paymentProfile.findMany({
    where: {
      ...(country ? { countryCode: country } : {}),
    },
    orderBy: [{ countryCode: 'asc' }, { isDefault: 'desc' }, { priority: 'asc' }],
  });
  return res.json({
    profiles: profiles.map(p => ({
      id: p.id,
      country_code: p.countryCode,
      method_name: p.methodName,
      recipient_label: p.recipientLabel,
      recipient_value: p.recipientValue,
      holder_label: p.holderLabel,
      holder_value: p.holderValue,
      qr_template: p.qrTemplate || '',
      is_active: p.isActive,
      is_default: p.isDefault,
      priority: p.priority ?? 100,
    })),
  });
});

router.post('/payment-profiles', requireAdmin, async (req: Request, res: Response) => {
  const {
    id,
    country_code,
    method_name,
    recipient_label,
    recipient_value,
    holder_label,
    holder_value,
    qr_template,
    is_active,
    is_default,
    priority,
  } = req.body;

  if (!method_name) return res.status(400).json({ error: 'method_name required' });
  const normalizedCountry = normalizeCountryCode(country_code || 'GLOBAL');

  const saved = await prisma.$transaction(async (tx) => {
    if (is_default) {
      await tx.paymentProfile.updateMany({
        where: { countryCode: normalizedCountry, ...(id ? { id: { not: id } } : {}) },
        data: { isDefault: false },
      });
    }

    if (id) {
      return tx.paymentProfile.update({
        where: { id },
        data: {
          countryCode: normalizedCountry,
          methodName: method_name,
          recipientLabel: recipient_label || 'Payment details',
          recipientValue: recipient_value || '',
          holderLabel: holder_label || 'Recipient',
          holderValue: holder_value || '',
          qrTemplate: qr_template || '',
          isActive: is_active !== undefined ? !!is_active : true,
          isDefault: !!is_default,
          priority: priority !== undefined ? Number(priority) : 100,
        },
      });
    }

    return tx.paymentProfile.create({
      data: {
        countryCode: normalizedCountry,
        methodName: method_name,
        recipientLabel: recipient_label || 'Payment details',
        recipientValue: recipient_value || '',
        holderLabel: holder_label || 'Recipient',
        holderValue: holder_value || '',
        qrTemplate: qr_template || '',
        isActive: is_active !== undefined ? !!is_active : true,
        isDefault: !!is_default,
        priority: priority !== undefined ? Number(priority) : 100,
      },
    });
  });

  return res.json({
    profile: {
      id: saved.id,
      country_code: saved.countryCode,
      method_name: saved.methodName,
      recipient_label: saved.recipientLabel,
      recipient_value: saved.recipientValue,
      holder_label: saved.holderLabel,
      holder_value: saved.holderValue,
      qr_template: saved.qrTemplate || '',
      is_active: saved.isActive,
      is_default: saved.isDefault,
      priority: saved.priority ?? 100,
    },
  });
});

router.delete('/payment-profiles/:id', requireAdmin, async (req: Request, res: Response) => {
  const profile = await prisma.paymentProfile.findUnique({ where: { id: req.params.id } });
  if (!profile) return res.status(404).json({ error: 'Payment profile not found' });

  await prisma.$transaction(async (tx) => {
    await tx.upgradeRequest.updateMany({
      where: { paymentProfileId: req.params.id },
      data: { paymentProfileId: null },
    });

    await tx.paymentProfile.delete({
      where: { id: req.params.id },
    });
  });

  return res.json({ message: 'Payment profile deleted' });
});

router.patch('/payment-profiles/:id/activate', requireAdmin, async (req: Request, res: Response) => {
  const profile = await prisma.paymentProfile.findUnique({ where: { id: req.params.id } });
  if (!profile) return res.status(404).json({ error: 'Payment profile not found' });

  await prisma.paymentProfile.update({
    where: { id: req.params.id },
    data: { isActive: true },
  });

  return res.json({ message: 'Payment profile activated' });
});

router.patch('/upgrade-requests/:id/payment-method', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { payment_profile_id } = req.body;
  const request = await prisma.upgradeRequest.findUnique({ where: { id: req.params.id } });
  if (!request || request.userId !== user.id) return res.status(404).json({ error: 'Request not found' });
  if (request.status !== 'pending') return res.status(400).json({ error: 'Only pending requests can be updated' });
  const profile = await prisma.paymentProfile.findFirst({ where: { id: payment_profile_id, isActive: true } });
  if (!profile) return res.status(404).json({ error: 'Payment profile not found' });
  const updated = await prisma.upgradeRequest.update({
    where: { id: request.id },
    data: {
      paymentProfileId: profile.id,
      paymentMethod: profile.methodName,
    },
  });
  return res.json({ request: updated });
});

export default router;
