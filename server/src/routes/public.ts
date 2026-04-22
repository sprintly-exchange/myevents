import { Router, Request, Response } from 'express';
import prisma from '../db';

const router = Router();

router.get('/events/:shareToken', async (req: Request, res: Response) => {
  const event = await prisma.event.findFirst({
    where: { shareToken: req.params.shareToken, status: { not: 'deleted' } },
    include: { template: { select: { name: true } } },
  });
  if (!event) return res.status(404).json({ error: 'Event not found' });

  return res.json({
    event: {
      title: event.title,
      description: event.description,
      event_date: event.eventDate,
      location: event.location,
      template_name: event.template?.name || null,
    },
  });
});

router.post('/events/:shareToken/rsvp', async (req: Request, res: Response) => {
  const { name, email, attending } = req.body;
  if (!name || !email || !attending)
    return res.status(400).json({ error: 'name, email, and attending are required' });
  if (!['yes', 'maybe', 'no'].includes(attending))
    return res.status(400).json({ error: 'attending must be yes, maybe, or no' });

  const event = await prisma.event.findFirst({
    where: { shareToken: req.params.shareToken, status: { not: 'deleted' } },
    include: { creator: { select: { id: true, paymentStatus: true, role: true } } },
  });
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const trimmedEmail = email.trim().toLowerCase();

  // If this email already has an invitation for this event, just update it
  const existing = await prisma.invitation.findFirst({
    where: { eventId: event.id, recipientEmail: trimmedEmail },
  });

  const statusMap: Record<string, string> = { yes: 'accepted', maybe: 'maybe', no: 'declined' };
  const newStatus = statusMap[attending];

  if (existing) {
    await prisma.invitation.update({
      where: { id: existing.id },
      data: { status: newStatus, recipientName: name, respondedAt: new Date() },
    });
    return res.json({ message: 'Your RSVP has been updated.' });
  }

  // New RSVP — check free tier limit for unpaid users
  const creator = event.creator;
  if (creator.paymentStatus !== 'paid' && creator.role !== 'admin') {
    const limitSetting = await prisma.appSetting.findUnique({ where: { key: 'free_tier_invite_limit' } });
    const freeLimit = parseInt(limitSetting?.value || '1', 10);
    const currentCount = await prisma.invitation.count({ where: { eventId: event.id } });
    if (currentCount >= freeLimit) {
      return res.status(402).json({
        error: 'This event has reached its free RSVP limit.',
        upgrade_required: true,
        limit: freeLimit,
        current: currentCount,
      });
    }
  }

  await prisma.invitation.create({
    data: {
      eventId: event.id,
      senderId: event.creatorId,
      recipientEmail: trimmedEmail,
      recipientName: name,
      status: newStatus,
      respondedAt: new Date(),
    },
  });

  return res.json({ message: 'Your RSVP has been received!' });
});

export default router;
