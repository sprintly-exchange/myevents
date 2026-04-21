import { Request, Response, NextFunction } from 'express';
import db from '../db';

export function checkEventLimit(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const userRow = db.prepare(`
    SELECT u.id, u.plan_id, p.event_limit, p.name as plan_name
    FROM users u
    LEFT JOIN plans p ON u.plan_id = p.id
    WHERE u.id = ?
  `).get(user.id) as { id: string; plan_id: string; event_limit: number; plan_name: string } | undefined;

  if (!userRow) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const eventLimit = userRow.event_limit;
  if (eventLimit === -1) {
    // Unlimited
    next();
    return;
  }

  const eventCount = (db.prepare(
    "SELECT COUNT(*) as count FROM events WHERE creator_id = ? AND status != 'deleted'"
  ).get(user.id) as { count: number }).count;

  if (eventCount >= eventLimit) {
    const plans = db.prepare("SELECT * FROM plans WHERE is_active = 1 ORDER BY price_sek ASC").all();
    res.status(403).json({
      error: 'Event limit reached',
      currentPlan: userRow.plan_name,
      eventLimit,
      eventCount,
      availablePlans: plans,
    });
    return;
  }

  next();
}
