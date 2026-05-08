import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAuth } from '../middleware/auth';
import { sendInvitationEmail, sendCheckinConfirmationEmail } from '../services/email';

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
  } else if (user.payment_status === 'paid' && user.role !== 'admin') {
    // Enforce plan guest limit for paid users
    const userRecord = await prisma.user.findUnique({ where: { id: user.id }, select: { planId: true } });
    if (userRecord?.planId) {
      const plan = await prisma.plan.findUnique({ where: { id: userRecord.planId } });
      const guestLimit = (plan as any)?.guestLimit ?? -1;
      if (guestLimit !== -1) {
        const currentCount = await prisma.invitation.count({ where: { eventId: event_id } });
        if (currentCount >= guestLimit) {
          return res.status(402).json({
            error: `Your plan allows up to ${guestLimit} guests per event.`,
            upgrade_required: true,
            limit: guestLimit,
            current: currentCount,
          });
        }
      }
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

router.get('/outgoing', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const invitations = await prisma.invitation.findMany({
    where: { senderId: user.id, event: { status: { not: 'deleted' } } },
    include: { event: true },
    orderBy: { sentAt: 'desc' },
  });
  return res.json({
    invitations: invitations.map(inv => ({
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
    })),
  });
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

router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { recipient_name, recipient_email, recipient_phone } = req.body;

  const invitation = await prisma.invitation.findUnique({
    where: { id: req.params.id },
    include: { event: { select: { creatorId: true } } },
  });
  if (!invitation) return res.status(404).json({ error: 'Invitation not found' });
  if (invitation.event?.creatorId !== user.id && user.role !== 'admin')
    return res.status(403).json({ error: 'Not authorized' });

  const data: any = {};
  if (recipient_name !== undefined) data.recipientName = recipient_name || null;
  if (recipient_phone !== undefined) data.recipientPhone = recipient_phone || null;
  if (recipient_email !== undefined) {
    const trimmed = recipient_email.trim().toLowerCase();
    if (!trimmed.includes('@')) return res.status(400).json({ error: 'Invalid email' });
    data.recipientEmail = trimmed;
  }

  const updated = await prisma.invitation.update({ where: { id: req.params.id }, data });
  return res.json({
    invitation: {
      id: updated.id,
      recipient_email: updated.recipientEmail,
      recipient_name: updated.recipientName || null,
      recipient_phone: (updated as any).recipientPhone || null,
      status: updated.status,
      token: updated.token,
      sent_at: updated.sentAt,
    },
  });
});

router.patch('/:id/cancel', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;

  const invitation = await prisma.invitation.findUnique({
    where: { id: req.params.id },
    include: { event: { select: { creatorId: true } } },
  });
  if (!invitation) return res.status(404).json({ error: 'Invitation not found' });
  if (invitation.event?.creatorId !== user.id && user.role !== 'admin')
    return res.status(403).json({ error: 'Not authorized' });
  if (invitation.status !== 'pending')
    return res.status(400).json({ error: 'Only pending invitations can be cancelled' });

  const updated = await prisma.invitation.update({
    where: { id: req.params.id },
    data: { status: 'cancelled' },
  });
  return res.json({ invitation: updated });
});

router.patch('/:id/resend', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;

  const invitation = await prisma.invitation.findUnique({
    where: { id: req.params.id },
    include: {
      event: { include: { creator: { select: { name: true } } } },
    },
  });
  if (!invitation) return res.status(404).json({ error: 'Invitation not found' });
  if (invitation.event?.creatorId !== user.id && user.role !== 'admin')
    return res.status(403).json({ error: 'Not authorized' });
  if (invitation.status !== 'cancelled')
    return res.status(400).json({ error: 'Only cancelled invitations can be resent' });

  const updated = await prisma.invitation.update({
    where: { id: req.params.id },
    data: { status: 'pending' },
  });

  if (invitation.event) {
    let template = await prisma.template.findFirst();
    const senderName = invitation.event.creator?.name || 'Someone';
    if (template) {
      sendInvitationEmail(
        invitation.recipientEmail,
        { token: invitation.token, recipientName: invitation.recipientName },
        invitation.event,
        template,
        senderName
      ).catch((err: Error) => console.error('Resend email failed:', err.message));
    }
  }

  return res.json({ invitation: updated });
});

router.post('/checkin/:token', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const invitation = await prisma.invitation.findUnique({
    where: { token: req.params.token },
    include: { event: { select: { creatorId: true, title: true } } },
  });
  if (!invitation) return res.status(404).json({ error: 'Invitation not found' });
  if (invitation.event?.creatorId !== userId && (req as any).user.role !== 'admin')
    return res.status(403).json({ error: 'Not authorized' });

  if (invitation.event) {
    const rows = await prisma.$queryRawUnsafe<{ enable_qr_checkin: number | null }[]>(
      `SELECT enable_qr_checkin FROM events WHERE id = ?`,
      invitation.eventId
    );
    if (rows[0]?.enable_qr_checkin === 0) {
      return res.status(403).json({ error: 'QR check-in is disabled for this event' });
    }
  }

  if (!['accepted', 'maybe'].includes(invitation.status))
    return res.status(400).json({ error: 'Guest has not RSVPed for this event' });

  if (invitation.checkedInAt) {
    return res.json({
      already_checked_in: true,
      invitation: {
        id: invitation.id,
        recipient_name: invitation.recipientName || null,
        recipient_email: invitation.recipientEmail,
        status: invitation.status,
        checked_in_at: invitation.checkedInAt.toISOString(),
        event_title: invitation.event?.title || null,
      },
    });
  }

  const updated = await prisma.invitation.update({
    where: { id: invitation.id },
    data: { checkedInAt: new Date() },
  });
  return res.json({
    already_checked_in: false,
    invitation: {
      id: updated.id,
      recipient_name: updated.recipientName || null,
      recipient_email: updated.recipientEmail,
      status: updated.status,
      checked_in_at: updated.checkedInAt?.toISOString() || null,
      event_title: invitation.event?.title || null,
    },
  });
});

router.get('/rsvp/:token', async (req: Request, res: Response) => {
  const invitation = await prisma.invitation.findUnique({
    where: { token: req.params.token },
    include: { event: { include: { creator: { select: { name: true } } } } },
  });
  if (!invitation) return res.status(404).json({ error: 'Invitation not found' });
  return res.json({
    invitation: {
      id: invitation.id,
      status: invitation.status,
      recipient_name: invitation.recipientName || null,
      event_title: invitation.event?.title || null,
      event_date: invitation.event?.eventDate || null,
      location: invitation.event?.location || null,
      sender_name: invitation.event?.creator?.name || null,
      event_share_token: (invitation.event as any)?.shareToken || null,
    },
  });
});

router.post('/rsvp/:token', async (req: Request, res: Response) => {
  const { name, status } = req.body;
  if (!['accepted', 'maybe', 'rejected'].includes(status))
    return res.status(400).json({ error: 'Status must be accepted, maybe, or rejected' });

  const invitation = await prisma.invitation.findUnique({
    where: { token: req.params.token },
    include: { event: true },
  });
  if (!invitation) return res.status(404).json({ error: 'Invitation not found' });

  const updated = await prisma.invitation.update({
    where: { token: req.params.token },
    data: { status, ...(name ? { recipientName: name } : {}), respondedAt: new Date() },
  });

  // Send QR confirmation email when accepted
  if (status === 'accepted' && invitation.event) {
    const rows = await prisma.$queryRawUnsafe<{ enable_qr_checkin: number | null }[]>(
      `SELECT enable_qr_checkin FROM events WHERE id = ?`,
      invitation.eventId
    );
    if (rows[0]?.enable_qr_checkin !== 0) {
      sendCheckinConfirmationEmail(
        invitation.recipientEmail,
        name || invitation.recipientName || null,
        invitation.event,
        invitation.token
      ).catch((err: Error) => console.error('Confirmation email failed:', err.message));
    }
  }

  return res.json({ invitation: updated });
});

export default router;
