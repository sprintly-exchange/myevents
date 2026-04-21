import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAuth } from '../middleware/auth';
import { checkEventLimit } from '../middleware/planLimit';

const router = Router();
router.use(requireAuth);
router.use((req: Request, res: Response, next: any) => {
  const user = (req as any).user;
  if (user.payment_status !== 'paid' && user.role !== 'admin')
    return res.status(402).json({ error: 'Payment required', status: 'pending_payment' });
  return next();
});

router.get('/', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const events = await prisma.event.findMany({
    where: { creatorId: userId, status: { not: 'deleted' } },
    include: {
      template: { select: { name: true } },
      _count: { select: { invitations: true } },
    },
    orderBy: { eventDate: 'desc' },
  });

  const eventsWithCounts = await Promise.all(events.map(async (e) => {
    const [accepted, pending] = await Promise.all([
      prisma.invitation.count({ where: { eventId: e.id, status: 'accepted' } }),
      prisma.invitation.count({ where: { eventId: e.id, status: 'pending' } }),
    ]);
    return { ...e, acceptedCount: accepted, pendingCount: pending };
  }));

  return res.json({ events: eventsWithCounts });
});

router.post('/', checkEventLimit, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { title, description, event_date, location, template_id } = req.body;
  if (!title || !event_date)
    return res.status(400).json({ error: 'Title and event_date are required' });

  const event = await prisma.event.create({
    data: { creatorId: userId, title, description: description || null, eventDate: event_date, location: location || null, templateId: template_id || null },
  });
  return res.status(201).json({ event });
});

router.get('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const event = await prisma.event.findFirst({
    where: { id: req.params.id, creatorId: userId, status: { not: 'deleted' } },
    include: { template: true, invitations: { orderBy: { sentAt: 'desc' } } },
  });
  if (!event) return res.status(404).json({ error: 'Event not found' });
  return res.json({ event, invitations: event.invitations });
});

router.put('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const existing = await prisma.event.findFirst({ where: { id: req.params.id, creatorId: userId, status: { not: 'deleted' } } });
  if (!existing) return res.status(404).json({ error: 'Event not found' });

  const { title, description, event_date, location, template_id, status } = req.body;
  const event = await prisma.event.update({
    where: { id: req.params.id },
    data: { title, description, eventDate: event_date, location, templateId: template_id || null, ...(status ? { status } : {}) },
  });
  return res.json({ event });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const existing = await prisma.event.findFirst({ where: { id: req.params.id, creatorId: userId } });
  if (!existing) return res.status(404).json({ error: 'Event not found' });
  await prisma.event.update({ where: { id: req.params.id }, data: { status: 'deleted' } });
  return res.json({ message: 'Event deleted' });
});

export default router;
