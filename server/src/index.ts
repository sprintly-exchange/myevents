import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { TEMPLATES } from './seed-templates';

import authRoutes from './routes/auth';
import eventsRoutes from './routes/events';
import invitationsRoutes from './routes/invitations';
import templatesRoutes from './routes/templates';
import plansRoutes from './routes/plans';
import adminRoutes from './routes/admin';
import publicRoutes from './routes/public';
import contactsRoutes from './routes/contacts';
import agendaRoutes from './routes/agenda';
import guidanceRoutes from './routes/guidance';
import { requireAuth } from './middleware/auth';
import prisma from './db';
import { getPaymentSettings, getPaymentSettingsForCountry, normalizeCountryCode } from './services/payment-settings';
import { getEffectivePlanPrice } from './services/plan-pricing';
import { startReminderScheduler } from './services/reminder-scheduler';

const app = express();
const PORT = parseInt(process.env.PORT || '6080', 10);

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/invitations', invitationsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/events', agendaRoutes);
app.use('/api/events', guidanceRoutes);

// Upgrade requests (user-facing)
const upgradeRouter = Router();

upgradeRouter.post('/', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { plan_id, payment_profile_id } = req.body;
  if (!plan_id) return res.status(400).json({ error: 'plan_id required' });
  const plan = await prisma.plan.findFirst({ where: { id: plan_id, isActive: true } });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  const fullUser = await prisma.user.findUnique({ where: { id: user.id }, select: { country: true } });
  const countryCode = normalizeCountryCode(fullUser?.country || 'SE');
  const { selected, methods } = await getPaymentSettingsForCountry(countryCode);
  const selectedPayment = methods.find(method => method.id === payment_profile_id) || selected;
  const effectivePrice = await getEffectivePlanPrice(plan.id, countryCode);

  await prisma.upgradeRequest.updateMany({
    where: { userId: user.id, status: 'pending' },
    data: { status: 'cancelled' },
  });

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let paymentReference = 'MYE-';
  for (let i = 0; i < 6; i++) paymentReference += chars[Math.floor(Math.random() * chars.length)];

  const request = await prisma.upgradeRequest.create({
    data: {
      userId: user.id,
      planId: plan_id,
      paymentReference,
      countryCode,
      paymentProfileId: selectedPayment.id || null,
      paymentMethod: selectedPayment.method_name,
    },
  });
  return res.status(201).json({
    request: {
      ...request,
      plan_name: plan.name,
      plan_price: effectivePrice?.price_sek ?? plan.priceSek,
      plan_currency: effectivePrice?.currency ?? plan.currency ?? 'SEK',
      country_code: countryCode,
      payment_method: request.paymentMethod,
    },
    payment: selectedPayment,
    payment_methods: methods,
    swish: { number: selectedPayment.recipient_value, holder: selectedPayment.holder_value },
  });
});

upgradeRouter.get('/pending', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const request = await prisma.upgradeRequest.findFirst({
    where: { userId: user.id, status: 'pending' },
    include: { plan: true, paymentProfile: true },
    orderBy: { requestedAt: 'desc' },
  });
  if (!request) return res.json({ request: null, payment: null, swish: null, payment_methods: [] });
  const fullUser = await prisma.user.findUnique({ where: { id: user.id }, select: { country: true } });
  const countryCode = normalizeCountryCode(request.countryCode || fullUser?.country || 'SE');
  const { selected, methods } = await getPaymentSettingsForCountry(countryCode);
  const selectedPayment = request.paymentProfileId
    ? methods.find(method => method.id === request.paymentProfileId) || selected
    : selected;
  const effectivePrice = await getEffectivePlanPrice(request.plan.id, countryCode);
  return res.json({
    request: {
      ...request,
      plan_name: request.plan.name,
      plan_price: effectivePrice?.price_sek ?? request.plan.priceSek,
      plan_currency: effectivePrice?.currency ?? request.plan.currency ?? 'SEK',
      country_code: request.countryCode ?? countryCode,
      payment_method: request.paymentMethod ?? selectedPayment.method_name,
    },
    payment: selectedPayment,
    payment_methods: methods,
    swish: { number: selectedPayment.recipient_value, holder: selectedPayment.holder_value },
  });
});

upgradeRouter.get('/mine', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const requests = await prisma.upgradeRequest.findMany({
    where: { userId: user.id },
    include: { plan: { select: { name: true, priceSek: true, currency: true } } },
    orderBy: { requestedAt: 'desc' },
  });
  return res.json({ requests });
});
app.use('/api/upgrade-requests', upgradeRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
async function start() {
  // Apply any missing schema columns (safe for both fresh and existing DBs)
  const migrations = [
    `ALTER TABLE upgrade_requests ADD COLUMN payment_reference TEXT`,
    `ALTER TABLE events ADD COLUMN end_date TEXT`,
    `ALTER TABLE events ADD COLUMN share_token TEXT`,
    `ALTER TABLE events ADD COLUMN theme_settings TEXT`,
    `ALTER TABLE events ADD COLUMN enable_qr_checkin INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE events ADD COLUMN enable_agenda INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE plans ADD COLUMN guest_limit INTEGER NOT NULL DEFAULT -1`,
    `ALTER TABLE plans ADD COLUMN currency TEXT NOT NULL DEFAULT 'SEK'`,
    `ALTER TABLE plans ADD COLUMN description TEXT`,
    `ALTER TABLE users ADD COLUMN payment_reference TEXT`,
    `ALTER TABLE users ADD COLUMN country TEXT DEFAULT 'SE'`,
    `ALTER TABLE upgrade_requests ADD COLUMN country_code TEXT`,
    `ALTER TABLE upgrade_requests ADD COLUMN payment_profile_id TEXT`,
    `ALTER TABLE upgrade_requests ADD COLUMN payment_method TEXT`,
    `ALTER TABLE events ADD COLUMN timezone TEXT NOT NULL DEFAULT 'Europe/Stockholm'`,
    `ALTER TABLE events ADD COLUMN enable_reminder_accepted INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE events ADD COLUMN enable_reminder_pending INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE events ADD COLUMN reminder_days_before INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE events ADD COLUMN reminder_sent_at TEXT`,
  ];
  for (const sql of migrations) {
    try { await prisma.$executeRawUnsafe(sql); } catch { /* column already exists */ }
  }
  const createTableMigrations = [
    `CREATE TABLE IF NOT EXISTS payment_profiles (
      id TEXT PRIMARY KEY,
      country_code TEXT NOT NULL DEFAULT 'GLOBAL',
      method_name TEXT NOT NULL,
      recipient_label TEXT NOT NULL,
      recipient_value TEXT NOT NULL,
      holder_label TEXT NOT NULL,
      holder_value TEXT NOT NULL,
      qr_template TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      is_default INTEGER NOT NULL DEFAULT 0,
      priority INTEGER NOT NULL DEFAULT 100,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS plan_country_prices (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      country_code TEXT NOT NULL,
      price REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'SEK',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(plan_id, country_code),
      FOREIGN KEY(plan_id) REFERENCES plans(id)
    )`,
  ];
  for (const sql of createTableMigrations) {
    try { await prisma.$executeRawUnsafe(sql); } catch { /* table already exists */ }
  }

  // Seed: plans
  const planDefs = [
    { id: 'basic',     name: 'Basic',     eventLimit: 1,  priceSek: 30,  description: 'Up to 1 event',    isDefault: true,  isActive: true },
    { id: 'pro',       name: 'Pro',       eventLimit: 5,  priceSek: 99,  description: 'Up to 5 events',   isDefault: false, isActive: true },
    { id: 'unlimited', name: 'Unlimited', eventLimit: -1, priceSek: 199, description: 'Unlimited events', isDefault: false, isActive: true },
  ];
  for (const p of planDefs) {
    await prisma.plan.upsert({ where: { id: p.id }, update: { eventLimit: p.eventLimit, priceSek: p.priceSek, description: p.description }, create: p });
  }

  // Seed: admin user
  const adminExists = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!adminExists) {
    const passwordHash = bcrypt.hashSync('changeme', 10);
    await prisma.user.create({
      data: { email: 'admin', passwordHash, name: 'Admin', country: 'SE', role: 'admin', planId: 'basic', paymentStatus: 'paid', isActive: true },
    });
  }

  // Seed: default app settings
  const defaultSettings: [string, string][] = [
    ['smtp_host', ''], ['smtp_port', '587'], ['smtp_user', ''], ['smtp_pass', ''],
    ['smtp_from', ''], ['swish_number', ''], ['swish_holder_name', ''],
    ['payment_method_name', 'Swish'], ['payment_recipient_label', 'Swish number'], ['payment_recipient_value', ''],
    ['payment_holder_label', 'Recipient'], ['payment_holder_name', ''], ['payment_qr_template', ''],
    ['app_name', 'MyEvents'], ['free_tier_invite_limit', '1'],
  ];
  for (const [key, value] of defaultSettings) {
    await prisma.appSetting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  // Seed: payment profiles (country-aware)
  const profileCount = await prisma.paymentProfile.count();
  if (profileCount === 0) {
    const legacy = await getPaymentSettings();
    await prisma.paymentProfile.create({
      data: {
        countryCode: 'SE',
        methodName: legacy.method_name || 'Swish',
        recipientLabel: legacy.recipient_label || 'Swish number',
        recipientValue: legacy.recipient_value || '',
        holderLabel: legacy.holder_label || 'Recipient',
        holderValue: legacy.holder_value || '',
        qrTemplate: legacy.qr_template || '',
        isActive: true,
        isDefault: true,
        priority: 10,
      },
    });
    await prisma.paymentProfile.create({
      data: {
        countryCode: 'GLOBAL',
        methodName: 'PayPal',
        recipientLabel: 'PayPal email',
        recipientValue: '',
        holderLabel: 'Recipient',
        holderValue: 'MyEvents',
        qrTemplate: '',
        isActive: true,
        isDefault: true,
        priority: 20,
      },
    });
  }

  // Seed: templates
  for (const t of TEMPLATES) {
    const existing = await prisma.template.findFirst({ where: { name: t.name } });
    if (existing) {
      await prisma.template.update({ where: { id: existing.id }, data: { htmlContent: t.html, isSystem: true } });
    } else {
      await prisma.template.create({ data: { name: t.name, htmlContent: t.html, isSystem: true } });
    }
  }

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../public')));
    app.get('*', (_req, res) => res.sendFile(path.join(__dirname, '../public', 'index.html')));
  } else {
    const { createServer: createViteServer } = await import('vite');
    const fs = await import('fs');
    const clientRoot = path.join(__dirname, '../../client');
    const vite = await createViteServer({
      configFile: path.join(clientRoot, 'vite.config.ts'),
      root: clientRoot,
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res) => {
      try {
        let template = fs.readFileSync(path.join(clientRoot, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).send(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        res.status(500).send(e.message);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} [${process.env.NODE_ENV || 'development'}]`);
    startReminderScheduler();
  });
}

start();

export default app;
