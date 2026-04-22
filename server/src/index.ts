import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { Router } from 'express';
import bcrypt from 'bcryptjs';

import authRoutes from './routes/auth';
import eventsRoutes from './routes/events';
import invitationsRoutes from './routes/invitations';
import templatesRoutes from './routes/templates';
import plansRoutes from './routes/plans';
import adminRoutes from './routes/admin';
import publicRoutes from './routes/public';
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

// Upgrade requests (user-facing)
const upgradeRouter = Router();
upgradeRouter.post('/', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { plan_id } = req.body;
  if (!plan_id) return res.status(400).json({ error: 'plan_id required' });
  const plan = await prisma.plan.findFirst({ where: { id: plan_id, isActive: true } });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  const request = await prisma.upgradeRequest.create({ data: { userId: user.id, planId: plan_id } });
  return res.status(201).json({ request });
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
  // Seed: plans
  const planDefs = [
    { id: 'basic',     name: 'Basic',     eventLimit: 5,  priceSek: 99,  description: 'Up to 5 events',   isDefault: true,  isActive: true },
    { id: 'pro',       name: 'Pro',       eventLimit: 20, priceSek: 199, description: 'Up to 20 events',  isDefault: false, isActive: true },
    { id: 'unlimited', name: 'Unlimited', eventLimit: -1, priceSek: 399, description: 'Unlimited events', isDefault: false, isActive: true },
  ];
  for (const p of planDefs) {
    await prisma.plan.upsert({ where: { id: p.id }, update: {}, create: p });
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
