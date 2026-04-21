import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';

import authRoutes from './routes/auth';
import eventsRoutes from './routes/events';
import invitationsRoutes from './routes/invitations';
import templatesRoutes from './routes/templates';
import plansRoutes from './routes/plans';
import adminRoutes from './routes/admin';

const app = express();
const PORT = process.env.NODE_ENV === 'production'
  ? parseInt(process.env.PORT || '3000', 10)
  : parseInt(process.env.PORT || '3001', 10);

// Middleware
app.use(express.json());
app.use(cookieParser());

if (process.env.NODE_ENV !== 'production') {
  app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/invitations', invitationsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/admin', adminRoutes);

// Upgrade requests (standalone route for users)
import { Router } from 'express';
import { requireAuth } from './middleware/auth';
import db from './db';

const upgradeRouter = Router();

upgradeRouter.post('/', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { plan_id } = req.body;
  if (!plan_id) return res.status(400).json({ error: 'plan_id required' });
  const plan = db.prepare('SELECT id FROM plans WHERE id = ? AND is_active = 1').get(plan_id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  const result = db.prepare('INSERT INTO upgrade_requests (user_id, plan_id) VALUES (?, ?)').run(user.id, plan_id);
  const reqRow = db.prepare('SELECT * FROM upgrade_requests WHERE rowid = ?').get(result.lastInsertRowid);
  return res.status(201).json({ request: reqRow });
});

upgradeRouter.get('/mine', requireAuth, (req, res) => {
  const user = (req as any).user;
  const requests = db.prepare(`
    SELECT ur.*, p.name as plan_name, p.price_sek
    FROM upgrade_requests ur
    JOIN plans p ON ur.plan_id = p.id
    WHERE ur.user_id = ?
    ORDER BY ur.requested_at DESC
  `).all(user.id);
  return res.json({ requests });
});

app.use('/api/upgrade-requests', upgradeRouter);

// Production: serve client build
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../public')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

export default app;
