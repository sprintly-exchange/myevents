import { Request, Response, NextFunction } from 'express';
import prisma from '../db';

export async function checkEventLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = (req as any).user;
  if (!user) { res.status(401).json({ error: 'Not authenticated' }); return; }

  const userRow = await prisma.user.findUnique({ where: { id: user.id }, include: { plan: true } });
  if (!userRow) { res.status(404).json({ error: 'User not found' }); return; }

  const eventLimit = userRow.plan?.eventLimit ?? 5;
  if (eventLimit === -1) { next(); return; }

  const eventCount = await prisma.event.count({ where: { creatorId: user.id, status: { not: 'deleted' } } });
  if (eventCount >= eventLimit) {
    const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { priceSek: 'asc' } });
    res.status(403).json({ error: 'Event limit reached', currentPlan: userRow.plan?.name, eventLimit, eventCount, availablePlans: plans });
    return;
  }
  next();
}
