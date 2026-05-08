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

function parseFeatureFlag(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
}

function readStoredFeatureFlag(value: number | null | undefined, fallback = true): boolean {
  if (value === 1) return true;
  if (value === 0) return false;
  return fallback;
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
  const { title, description, event_date, end_date, location, template_id, theme_settings, enable_qr_checkin, enable_agenda } = req.body;
  if (!title || !event_date)
    return res.status(400).json({ error: 'Title and event_date are required' });
  const qrEnabled = parseFeatureFlag(enable_qr_checkin, true);
  const agendaEnabled = parseFeatureFlag(enable_agenda, true);

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
    `UPDATE events SET theme_settings = ?, end_date = ?, enable_qr_checkin = ?, enable_agenda = ? WHERE id = ?`,
    theme_settings ? JSON.stringify(theme_settings) : null,
    end_date || null,
    qrEnabled ? 1 : 0,
    agendaEnabled ? 1 : 0,
    event.id
  );

  return res.status(201).json({
    event: {
      ...formatEvent(event),
      theme_settings: theme_settings || null,
      end_date: end_date || null,
      enable_qr_checkin: qrEnabled,
      enable_agenda: agendaEnabled,
    },
  });
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
  const rawRows = await prisma.$queryRawUnsafe<{ theme_settings: string | null; end_date: string | null; enable_qr_checkin: number | null; enable_agenda: number | null }[]>(
    `SELECT theme_settings, end_date, enable_qr_checkin, enable_agenda FROM events WHERE id = ?`, event.id
  );
  const themeSettingsRaw = rawRows[0]?.theme_settings || null;
  const end_date = rawRows[0]?.end_date || null;
  const enable_qr_checkin = readStoredFeatureFlag(rawRows[0]?.enable_qr_checkin, true);
  const enable_agenda = readStoredFeatureFlag(rawRows[0]?.enable_agenda, true);
  let theme_settings = null;
  try { if (themeSettingsRaw) theme_settings = JSON.parse(themeSettingsRaw); } catch { /* ignore */ }

  return res.json({
    event: { ...formatEvent(event), theme_settings, end_date, enable_qr_checkin, enable_agenda },
    invitations: event.invitations.map(inv => formatInvitation(inv)),
  });
});

router.put('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const existing = await prisma.event.findFirst({ where: { id: req.params.id, creatorId: userId, status: { not: 'deleted' } } });
  if (!existing) return res.status(404).json({ error: 'Event not found' });

  const { title, description, event_date, end_date, location, template_id, theme_settings, status, enable_qr_checkin, enable_agenda } = req.body;
  const rawExisting = await prisma.$queryRawUnsafe<{ theme_settings: string | null; end_date: string | null; enable_qr_checkin: number | null; enable_agenda: number | null }[]>(
    `SELECT theme_settings, end_date, enable_qr_checkin, enable_agenda FROM events WHERE id = ?`,
    req.params.id
  );
  const existingRow = rawExisting[0] || null;
  const resolvedThemeSql = theme_settings !== undefined
    ? (theme_settings ? JSON.stringify(theme_settings) : null)
    : (existingRow?.theme_settings ?? null);
  const resolvedEndDateSql = end_date !== undefined ? (end_date || null) : (existingRow?.end_date ?? null);
  const resolvedQrEnabled = parseFeatureFlag(enable_qr_checkin, readStoredFeatureFlag(existingRow?.enable_qr_checkin, true));
  const resolvedAgendaEnabled = parseFeatureFlag(enable_agenda, readStoredFeatureFlag(existingRow?.enable_agenda, true));

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
    `UPDATE events SET theme_settings = ?, end_date = ?, enable_qr_checkin = ?, enable_agenda = ? WHERE id = ?`,
    resolvedThemeSql,
    resolvedEndDateSql,
    resolvedQrEnabled ? 1 : 0,
    resolvedAgendaEnabled ? 1 : 0,
    req.params.id
  );

  let parsedResolvedTheme: any = null;
  if (resolvedThemeSql) {
    try { parsedResolvedTheme = JSON.parse(resolvedThemeSql); } catch { parsedResolvedTheme = null; }
  }
  const resolvedTheme = theme_settings !== undefined ? (theme_settings || null) : parsedResolvedTheme;
  const resolvedEndDate = resolvedEndDateSql;
  return res.json({
    event: {
      ...formatEvent(event),
      theme_settings: resolvedTheme,
      end_date: resolvedEndDate,
      enable_qr_checkin: resolvedQrEnabled,
      enable_agenda: resolvedAgendaEnabled,
    },
  });
});

router.get('/:id/checkin', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const where = user.role === 'admin'
    ? { id: req.params.id, status: { not: 'deleted' } }
    : { id: req.params.id, creatorId: user.id, status: { not: 'deleted' } };
  const event = await prisma.event.findFirst({
    where,
    select: { id: true, title: true },
  });
  if (!event) return res.status(404).json({ error: 'Event not found' });
  const rawFeature = await prisma.$queryRawUnsafe<{ enable_qr_checkin: number | null }[]>(
    `SELECT enable_qr_checkin FROM events WHERE id = ?`,
    req.params.id
  );
  if (rawFeature[0]?.enable_qr_checkin === 0)
    return res.status(403).json({ error: 'QR check-in is disabled for this event' });

  const invitations = await prisma.invitation.findMany({
    where: { eventId: req.params.id, status: { in: ['accepted', 'maybe'] } },
    orderBy: [{ checkedInAt: 'asc' }, { recipientName: 'asc' }],
  });

  return res.json({
    event: { id: event.id, title: event.title },
    guests: invitations.map(inv => ({
      id: inv.id,
      recipient_name: inv.recipientName || null,
      recipient_email: inv.recipientEmail,
      status: inv.status,
      token: inv.token,
      checked_in_at: inv.checkedInAt?.toISOString() || null,
    })),
  });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const existing = await prisma.event.findFirst({ where: { id: req.params.id, creatorId: userId } });
  if (!existing) return res.status(404).json({ error: 'Event not found' });
  await prisma.event.update({ where: { id: req.params.id }, data: { status: 'deleted' } });
  return res.json({ message: 'Event deleted' });
});

export default router;
