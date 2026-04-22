import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { Router } from 'express';

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

async function start() {
  // Migration: add missing columns (safe — ignores errors if column already exists)
  const safeMigrations = [
    `ALTER TABLE events ADD COLUMN share_token TEXT`,
    `ALTER TABLE plans ADD COLUMN guest_limit INTEGER NOT NULL DEFAULT -1`,
    `ALTER TABLE plans ADD COLUMN currency TEXT NOT NULL DEFAULT 'SEK'`,
  ];
  for (const sql of safeMigrations) {
    try { await prisma.$executeRawUnsafe(sql); } catch { /* already exists */ }
  }
  // Backfill share_token for existing events
  await prisma.$executeRawUnsafe(`UPDATE events SET share_token = lower(hex(randomblob(16))) WHERE share_token IS NULL`);

  // Ensure default app settings exist (migration-safe upsert)
  await prisma.appSetting.upsert({
    where: { key: 'free_tier_invite_limit' },
    update: {},
    create: { key: 'free_tier_invite_limit', value: '1' },
  });

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

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
}

start();

export default app;
