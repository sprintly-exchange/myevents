import { Router, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import prisma from '../db';
import { requireAuth } from '../middleware/auth';
import { checkEventLimit } from '../middleware/planLimit';

const router = Router();
router.use(requireAuth);

function formatInvitation(inv: any) {
  return {
    id: inv.id,
    event_id: inv.eventId,
    sender_id: inv.senderId,
    recipient_email: inv.recipientEmail,
    recipient_name: inv.recipientName || null,
    status: inv.status,
    token: inv.token,
    sent_at: inv.sentAt,
    responded_at: inv.respondedAt || null,
    event_title: inv.event?.title || null,
    event_date: inv.event?.eventDate || null,
    location: inv.event?.location || null,
    sender_name: inv.sender?.name || null,
  };
}

function formatEvent(e: any, extra: Record<string, any> = {}) {
  return {
    id: e.id,
    creator_id: e.creatorId,
    title: e.title,
    description: e.description || null,
    event_date: e.eventDate,
    location: e.location || null,
    template_id: e.templateId || null,
    template_name: e.template?.name || null,
    share_token: e.shareToken || null,
    status: e.status,
    created_at: e.createdAt,
    ...extra,
  };
}

router.get('/', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const events = await prisma.event.findMany({
    where: { creatorId: userId, status: { not: 'deleted' } },
    include: { template: { select: { name: true } } },
    orderBy: { eventDate: 'desc' },
  });

  const eventsWithCounts = await Promise.all(events.map(async (e) => {
    const [accepted, pending, total] = await Promise.all([
      prisma.invitation.count({ where: { eventId: e.id, status: 'accepted' } }),
      prisma.invitation.count({ where: { eventId: e.id, status: 'pending' } }),
      prisma.invitation.count({ where: { eventId: e.id } }),
    ]);
    return formatEvent(e, { accepted_count: accepted, pending_count: pending, invitation_count: total });
  }));

  return res.json({ events: eventsWithCounts });
});

router.post('/', checkEventLimit, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { title, description, event_date, location, template_id } = req.body;
  if (!title || !event_date)
    return res.status(400).json({ error: 'Title and event_date are required' });

  const event = await prisma.event.create({
    data: {
      creatorId: userId, title, description: description || null, eventDate: event_date,
      location: location || null, templateId: template_id || null,
      shareToken: randomBytes(12).toString('hex'),
    },
    include: { template: { select: { name: true } } },
  });
  return res.status(201).json({ event: formatEvent(event) });
});

router.get('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const event = await prisma.event.findFirst({
    where: { id: req.params.id, creatorId: userId, status: { not: 'deleted' } },
    include: {
      template: true,
      invitations: { orderBy: { sentAt: 'desc' }, include: { sender: { select: { name: true } } } },
    },
  });
  if (!event) return res.status(404).json({ error: 'Event not found' });
  return res.json({
    event: formatEvent(event),
    invitations: event.invitations.map(inv => formatInvitation(inv)),
  });
});

router.put('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const existing = await prisma.event.findFirst({ where: { id: req.params.id, creatorId: userId, status: { not: 'deleted' } } });
  if (!existing) return res.status(404).json({ error: 'Event not found' });

  const { title, description, event_date, location, template_id, status } = req.body;
  const event = await prisma.event.update({
    where: { id: req.params.id },
    data: { title, description, eventDate: event_date, location, templateId: template_id || null, ...(status ? { status } : {}) },
    include: { template: { select: { name: true } } },
  });
  return res.json({ event: formatEvent(event) });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const existing = await prisma.event.findFirst({ where: { id: req.params.id, creatorId: userId } });
  if (!existing) return res.status(404).json({ error: 'Event not found' });
  await prisma.event.update({ where: { id: req.params.id }, data: { status: 'deleted' } });
  return res.json({ message: 'Event deleted' });
});

export default router;
