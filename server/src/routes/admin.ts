import { Router, Request, Response } from 'express';
import db from '../db';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { sendTestEmail } from '../services/email';

const router = Router();

// Settings
router.get('/settings', requireAdmin, (req: Request, res: Response) => {
  const rows = db.prepare('SELECT key, value FROM app_settings').all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value || '';
  }
  return res.json({ settings });
});

router.post('/settings', requireAdmin, (req: Request, res: Response) => {
  const { key, value, settings } = req.body;
  if (settings && Array.isArray(settings)) {
    const upsert = db.prepare("INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))");
    for (const s of settings) {
      upsert.run(s.key, s.value);
    }
    return res.json({ message: 'Settings updated' });
  }
  if (key) {
    db.prepare("INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))").run(key, value);
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

// Users
router.get('/users', requireAdmin, (req: Request, res: Response) => {
  const users = db.prepare(`
    SELECT u.id, u.email, u.name, u.role, u.payment_status, u.is_active, u.created_at, u.plan_id,
           p.name as plan_name
    FROM users u
    LEFT JOIN plans p ON u.plan_id = p.id
    ORDER BY u.created_at DESC
  `).all();
  return res.json({ users });
});

router.patch('/users/:id', requireAdmin, (req: Request, res: Response) => {
  const { role, is_active, payment_status, plan_id } = req.body;
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (role !== undefined) db.prepare('UPDATE users SET role=? WHERE id=?').run(role, req.params.id);
  if (is_active !== undefined) db.prepare('UPDATE users SET is_active=? WHERE id=?').run(is_active ? 1 : 0, req.params.id);
  if (payment_status !== undefined) db.prepare('UPDATE users SET payment_status=? WHERE id=?').run(payment_status, req.params.id);
  if (plan_id !== undefined) db.prepare('UPDATE users SET plan_id=? WHERE id=?').run(plan_id, req.params.id);

  const updated = db.prepare(`
    SELECT u.id, u.email, u.name, u.role, u.payment_status, u.is_active, u.created_at, u.plan_id,
           p.name as plan_name
    FROM users u LEFT JOIN plans p ON u.plan_id = p.id WHERE u.id = ?
  `).get(req.params.id);
  return res.json({ user: updated });
});

// Upgrade requests for admin
router.get('/upgrade-requests', requireAdmin, (req: Request, res: Response) => {
  const requests = db.prepare(`
    SELECT ur.*, u.name as user_name, u.email as user_email, p.name as plan_name
    FROM upgrade_requests ur
    JOIN users u ON ur.user_id = u.id
    JOIN plans p ON ur.plan_id = p.id
    ORDER BY ur.requested_at DESC
  `).all();
  return res.json({ requests });
});

router.patch('/upgrade-requests/:id', requireAdmin, (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be approved or rejected' });
  }
  const request = db.prepare('SELECT * FROM upgrade_requests WHERE id = ?').get(req.params.id) as any;
  if (!request) return res.status(404).json({ error: 'Request not found' });

  db.prepare("UPDATE upgrade_requests SET status=?, resolved_at=datetime('now') WHERE id=?").run(status, req.params.id);

  if (status === 'approved') {
    db.prepare('UPDATE users SET plan_id=?, payment_status=? WHERE id=?').run(request.plan_id, 'paid', request.user_id);
  }

  return res.json({ message: 'Request updated' });
});

// Upgrade requests for users
router.get('/upgrade-requests/mine', requireAuth, (req: Request, res: Response) => {
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

router.post('/upgrade-requests', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { plan_id } = req.body;
  if (!plan_id) return res.status(400).json({ error: 'plan_id required' });
  const plan = db.prepare('SELECT id FROM plans WHERE id = ? AND is_active = 1').get(plan_id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  const result = db.prepare('INSERT INTO upgrade_requests (user_id, plan_id) VALUES (?, ?)').run(user.id, plan_id);
  const reqRow = db.prepare('SELECT * FROM upgrade_requests WHERE rowid = ?').get(result.lastInsertRowid);
  return res.status(201).json({ request: reqRow });
});

export default router;
