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

async function getSwishSettings() {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: ['swish_number', 'swish_holder_name'] } },
  });
  return {
    number: rows.find(r => r.key === 'swish_number')?.value || '',
    holder: rows.find(r => r.key === 'swish_holder_name')?.value || '',
  };
}

upgradeRouter.post('/', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { plan_id } = req.body;
  if (!plan_id) return res.status(400).json({ error: 'plan_id required' });
  const plan = await prisma.plan.findFirst({ where: { id: plan_id, isActive: true } });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  const paymentReference = Math.random().toString(36).substring(2, 8).toUpperCase();
  const request = await prisma.upgradeRequest.create({ data: { userId: user.id, planId: plan_id, paymentReference } });
  const swish = await getSwishSettings();
  return res.status(201).json({ request: { ...request, plan_name: plan.name, plan_price: plan.priceSek }, swish });
});

upgradeRouter.get('/pending', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const request = await prisma.upgradeRequest.findFirst({
    where: { userId: user.id, status: 'pending' },
    include: { plan: true },
    orderBy: { requestedAt: 'desc' },
  });
  if (!request) return res.json({ request: null, swish: null });
  const swish = await getSwishSettings();
  return res.json({ request: { ...request, plan_name: request.plan.name, plan_price: request.plan.priceSek }, swish });
});

upgradeRouter.get('/mine', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const requests = await prisma.upgradeRequest.findMany({
    where: { userId: user.id },
    include: { plan: { select: { name: true, priceSek: true } } },
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
    `ALTER TABLE plans ADD COLUMN guest_limit INTEGER NOT NULL DEFAULT -1`,
    `ALTER TABLE plans ADD COLUMN currency TEXT NOT NULL DEFAULT 'SEK'`,
    `ALTER TABLE plans ADD COLUMN description TEXT`,
    `ALTER TABLE users ADD COLUMN payment_reference TEXT`,
  ];
  for (const sql of migrations) {
    try { await prisma.$executeRawUnsafe(sql); } catch { /* column already exists */ }
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
      data: { email: 'admin', passwordHash, name: 'Admin', role: 'admin', planId: 'basic', paymentStatus: 'paid', isActive: true },
    });
  }

  // Seed: default app settings
  const defaultSettings: [string, string][] = [
    ['smtp_host', ''], ['smtp_port', '587'], ['smtp_user', ''], ['smtp_pass', ''],
    ['smtp_from', ''], ['swish_number', ''], ['swish_holder_name', ''],
    ['app_name', 'MyEvents'], ['free_tier_invite_limit', '1'],
  ];
  for (const [key, value] of defaultSettings) {
    await prisma.appSetting.upsert({ where: { key }, update: {}, create: { key, value } });
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
  });
}

start();

export default app;
