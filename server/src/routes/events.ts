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
    recipient_phone: inv.recipientPhone || null,
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
  let parsedThemeSettings = null;
  try {
    if (e.themeSettings) parsedThemeSettings = JSON.parse(e.themeSettings);
    else if (e.theme_settings && typeof e.theme_settings === 'string') parsedThemeSettings = JSON.parse(e.theme_settings);
    else if (e.theme_settings && typeof e.theme_settings === 'object') parsedThemeSettings = e.theme_settings;
  } catch { /* invalid JSON — ignore */ }

  return {
    id: e.id,
    creator_id: e.creatorId,
    title: e.title,
    description: e.description || null,
    event_date: e.eventDate,
    end_date: e.endDate || e.end_date || null,
    location: e.location || null,
    template_id: e.templateId || null,
    template_name: e.template?.name || null,
    share_token: e.shareToken || null,
    theme_settings: parsedThemeSettings,
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
  const { title, description, event_date, end_date, location, template_id, theme_settings } = req.body;
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

  // Write raw columns via raw SQL (added via ALTER TABLE)
  await prisma.$executeRawUnsafe(
    `UPDATE events SET theme_settings = ?, end_date = ? WHERE id = ?`,
    theme_settings ? JSON.stringify(theme_settings) : null,
    end_date || null,
    event.id
  );

  return res.status(201).json({ event: { ...formatEvent(event), theme_settings: theme_settings || null, end_date: end_date || null } });
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

  // Read raw columns via raw SQL since they were added via ALTER TABLE
  const rawRows = await prisma.$queryRawUnsafe<{ theme_settings: string | null; end_date: string | null }[]>(
    `SELECT theme_settings, end_date FROM events WHERE id = ?`, event.id
  );
  const themeSettingsRaw = rawRows[0]?.theme_settings || null;
  const end_date = rawRows[0]?.end_date || null;
  let theme_settings = null;
  try { if (themeSettingsRaw) theme_settings = JSON.parse(themeSettingsRaw); } catch { /* ignore */ }

  return res.json({
    event: { ...formatEvent(event), theme_settings, end_date },
    invitations: event.invitations.map(inv => formatInvitation(inv)),
  });
});

router.put('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const existing = await prisma.event.findFirst({ where: { id: req.params.id, creatorId: userId, status: { not: 'deleted' } } });
  if (!existing) return res.status(404).json({ error: 'Event not found' });

  const { title, description, event_date, end_date, location, template_id, theme_settings, status } = req.body;
  const event = await prisma.event.update({
    where: { id: req.params.id },
    data: {
      title, description, eventDate: event_date, location, templateId: template_id || null,
      ...(status ? { status } : {}),
    },
    include: { template: { select: { name: true } } },
  });

  // Update raw columns via raw SQL
  await prisma.$executeRawUnsafe(
    `UPDATE events SET theme_settings = ?, end_date = ? WHERE id = ?`,
    theme_settings !== undefined ? (theme_settings ? JSON.stringify(theme_settings) : null) : (existing as any).themeSettings || null,
    end_date !== undefined ? (end_date || null) : null,
    req.params.id
  );

  const resolvedTheme = theme_settings !== undefined ? (theme_settings || null) : null;
  const resolvedEndDate = end_date !== undefined ? (end_date || null) : null;
  return res.json({ event: { ...formatEvent(event), theme_settings: resolvedTheme, end_date: resolvedEndDate } });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const existing = await prisma.event.findFirst({ where: { id: req.params.id, creatorId: userId } });
  if (!existing) return res.status(404).json({ error: 'Event not found' });
  await prisma.event.update({ where: { id: req.params.id }, data: { status: 'deleted' } });
  return res.json({ message: 'Event deleted' });
});

export default router;
