import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAuth } from '../middleware/auth';
import { sendInvitationEmail } from '../services/email';

const router = Router();

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;

  const { event_id, emails, template_id } = req.body;
  if (!event_id || !Array.isArray(emails) || emails.length === 0)
    return res.status(400).json({ error: 'event_id and emails array required' });

  if (user.payment_status !== 'paid' && user.role !== 'admin') {
    const limitSetting = await prisma.appSetting.findUnique({ where: { key: 'free_tier_invite_limit' } });
    const freeLimit = parseInt(limitSetting?.value || '1', 10);
    const currentCount = await prisma.invitation.count({ where: { eventId: event_id } });
    if (currentCount >= freeLimit) {
      return res.status(402).json({
        error: `Free tier limit reached. You can invite up to ${freeLimit} guest${freeLimit !== 1 ? 's' : ''} per event.`,
        upgrade_required: true,
        limit: freeLimit,
        current: currentCount,
      });
    }
  }

  const event = await prisma.event.findFirst({ where: { id: event_id, creatorId: user.id, status: { not: 'deleted' } } });
  if (!event) return res.status(404).json({ error: 'Event not found' });

  let template = template_id
    ? await prisma.template.findUnique({ where: { id: template_id } })
    : await prisma.template.findFirst();

  const sender = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true } });
  const senderName = sender?.name || 'Someone';

  const created: any[] = [];
  for (const email of emails) {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) continue;
    const existing = await prisma.invitation.findFirst({ where: { eventId: event_id, recipientEmail: trimmed } });
    if (existing) continue;

    const inv = await prisma.invitation.create({ data: { eventId: event_id, senderId: user.id, recipientEmail: trimmed } });
    created.push(inv);

    if (template) {
      sendInvitationEmail(trimmed, inv, event, template, senderName).catch((err: Error) => console.error('Email send failed:', err.message));
    }
  }
  return res.status(201).json({ invitations: created, count: created.length });
});

router.get('/incoming', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const invitations = await prisma.invitation.findMany({
    where: { recipientEmail: user.email, event: { status: { not: 'deleted' } } },
    include: { event: { include: { creator: { select: { name: true } } } } },
    orderBy: { sentAt: 'desc' },
  });
  return res.json({ invitations });
});

router.get('/event/:event_id', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const event = await prisma.event.findFirst({ where: { id: req.params.event_id, creatorId: user.id } });
  if (!event) return res.status(404).json({ error: 'Event not found' });
  const invitations = await prisma.invitation.findMany({ where: { eventId: req.params.event_id }, orderBy: { sentAt: 'desc' } });
  return res.json({ invitations });
});

router.patch('/:id/respond', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { status } = req.body;
  if (!['accepted', 'rejected'].includes(status))
    return res.status(400).json({ error: 'Status must be accepted or rejected' });

  const invitation = await prisma.invitation.findFirst({ where: { id: req.params.id, recipientEmail: user.email } });
  if (!invitation) return res.status(404).json({ error: 'Invitation not found' });

  const updated = await prisma.invitation.update({
    where: { id: req.params.id },
    data: { status, respondedAt: new Date() },
  });
  return res.json({ invitation: updated });
});

router.get('/rsvp/:token', async (req: Request, res: Response) => {
  const invitation = await prisma.invitation.findUnique({
    where: { token: req.params.token },
    include: { event: { include: { creator: { select: { name: true } } } } },
  });
  if (!invitation) return res.status(404).json({ error: 'Invitation not found' });
  return res.json({ invitation });
});

router.post('/rsvp/:token', async (req: Request, res: Response) => {
  const { name, status } = req.body;
  if (!['accepted', 'rejected'].includes(status))
    return res.status(400).json({ error: 'Status must be accepted or rejected' });

  const invitation = await prisma.invitation.findUnique({ where: { token: req.params.token } });
  if (!invitation) return res.status(404).json({ error: 'Invitation not found' });

  const updated = await prisma.invitation.update({
    where: { token: req.params.token },
    data: { status, ...(name ? { recipientName: name } : {}), respondedAt: new Date() },
  });
  return res.json({ invitation: updated });
});

export default router;
