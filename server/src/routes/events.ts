import { Router, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import prisma from '../db';
import { requireAuth } from '../middleware/auth';
import { checkEventLimit } from '../middleware/planLimit';
import { sendEventReminders } from '../services/reminder-scheduler';

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

  // Batch-fetch raw columns for all events
  const ids = events.map(e => e.id);
  const rawRows = ids.length
    ? await prisma.$queryRawUnsafe<{ id: string; timezone: string; event_type: string | null; enable_reminder_accepted: number | null; enable_reminder_pending: number | null; reminder_days_before: number | null; reminder_sent_at: string | null }[]>(
        `SELECT id, timezone, event_type, enable_reminder_accepted, enable_reminder_pending, reminder_days_before, reminder_sent_at FROM events WHERE id IN (${ids.map(() => '?').join(',')})`,
        ...ids
      )
    : [];
  const rawById: Record<string, typeof rawRows[0]> = Object.fromEntries(
    rawRows.map(r => [r.id, r])
  );

  const eventsWithCounts = await Promise.all(events.map(async (e) => {
    const [accepted, pending, total] = await Promise.all([
      prisma.invitation.count({ where: { eventId: e.id, status: 'accepted' } }),
      prisma.invitation.count({ where: { eventId: e.id, status: 'pending' } }),
      prisma.invitation.count({ where: { eventId: e.id } }),
    ]);
    return formatEvent(e, {
      accepted_count: accepted,
      pending_count: pending,
      invitation_count: total,
      timezone: rawById[e.id]?.timezone ?? 'Europe/Stockholm',
      event_type: rawById[e.id]?.event_type ?? 'invite_only',
      enable_reminder_accepted: readStoredFeatureFlag(rawById[e.id]?.enable_reminder_accepted, false),
      enable_reminder_pending: readStoredFeatureFlag(rawById[e.id]?.enable_reminder_pending, false),
      reminder_days_before: rawById[e.id]?.reminder_days_before ?? 0,
      reminder_sent_at: rawById[e.id]?.reminder_sent_at ?? null,
    });
  }));

  return res.json({ events: eventsWithCounts });
});

router.post('/', checkEventLimit, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { title, description, event_date, end_date, location, template_id, theme_settings, enable_qr_checkin, enable_agenda, timezone, enable_reminder_accepted, enable_reminder_pending, reminder_days_before, event_type } = req.body;
  if (!title || !event_date)
    return res.status(400).json({ error: 'Title and event_date are required' });
  const qrEnabled = parseFeatureFlag(enable_qr_checkin, true);
  const agendaEnabled = parseFeatureFlag(enable_agenda, true);
  const reminderAccepted = parseFeatureFlag(enable_reminder_accepted, false);
  const reminderPending = parseFeatureFlag(enable_reminder_pending, false);
  const reminderDays = Math.max(0, parseInt(reminder_days_before ?? '0', 10) || 0);
  const tz = timezone || 'Europe/Stockholm';
  const resolvedEventType = event_type === 'public' ? 'public' : 'invite_only';

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
    `UPDATE events SET theme_settings = ?, end_date = ?, enable_qr_checkin = ?, enable_agenda = ?, timezone = ?, enable_reminder_accepted = ?, enable_reminder_pending = ?, reminder_days_before = ?, event_type = ? WHERE id = ?`,
    theme_settings ? JSON.stringify(theme_settings) : null,
    end_date || null,
    qrEnabled ? 1 : 0,
    agendaEnabled ? 1 : 0,
    tz,
    reminderAccepted ? 1 : 0,
    reminderPending ? 1 : 0,
    reminderDays,
    resolvedEventType,
    event.id
  );

  return res.status(201).json({
    event: {
      ...formatEvent(event),
      theme_settings: theme_settings || null,
      end_date: end_date || null,
      enable_qr_checkin: qrEnabled,
      enable_agenda: agendaEnabled,
      timezone: tz,
      enable_reminder_accepted: reminderAccepted,
      enable_reminder_pending: reminderPending,
      reminder_days_before: reminderDays,
      reminder_sent_at: null,
      event_type: resolvedEventType,
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
  const rawRows = await prisma.$queryRawUnsafe<{ theme_settings: string | null; end_date: string | null; enable_qr_checkin: number | null; enable_agenda: number | null; timezone: string | null; enable_reminder_accepted: number | null; enable_reminder_pending: number | null; reminder_days_before: number | null; reminder_sent_at: string | null; event_type: string | null }[]>(
    `SELECT theme_settings, end_date, enable_qr_checkin, enable_agenda, timezone, enable_reminder_accepted, enable_reminder_pending, reminder_days_before, reminder_sent_at, event_type FROM events WHERE id = ?`, event.id
  );
  const themeSettingsRaw = rawRows[0]?.theme_settings || null;
  const end_date = rawRows[0]?.end_date || null;
  const enable_qr_checkin = readStoredFeatureFlag(rawRows[0]?.enable_qr_checkin, true);
  const enable_agenda = readStoredFeatureFlag(rawRows[0]?.enable_agenda, true);
  const timezone = rawRows[0]?.timezone || 'Europe/Stockholm';
  const enable_reminder_accepted = readStoredFeatureFlag(rawRows[0]?.enable_reminder_accepted, false);
  const enable_reminder_pending = readStoredFeatureFlag(rawRows[0]?.enable_reminder_pending, false);
  const reminder_days_before = rawRows[0]?.reminder_days_before ?? 0;
  const reminder_sent_at = rawRows[0]?.reminder_sent_at ?? null;
  const event_type = rawRows[0]?.event_type ?? 'invite_only';
  let theme_settings = null;
  try { if (themeSettingsRaw) theme_settings = JSON.parse(themeSettingsRaw); } catch { /* ignore */ }

  return res.json({
    event: { ...formatEvent(event), theme_settings, end_date, enable_qr_checkin, enable_agenda, timezone, enable_reminder_accepted, enable_reminder_pending, reminder_days_before, reminder_sent_at, event_type },
    invitations: event.invitations.map(inv => formatInvitation(inv)),
  });
});

router.put('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const existing = await prisma.event.findFirst({ where: { id: req.params.id, creatorId: userId, status: { not: 'deleted' } } });
  if (!existing) return res.status(404).json({ error: 'Event not found' });

  const { title, description, event_date, end_date, location, template_id, theme_settings, status, enable_qr_checkin, enable_agenda, timezone, enable_reminder_accepted, enable_reminder_pending, reminder_days_before, event_type } = req.body;
  const rawExisting = await prisma.$queryRawUnsafe<{ theme_settings: string | null; end_date: string | null; enable_qr_checkin: number | null; enable_agenda: number | null; timezone: string | null; enable_reminder_accepted: number | null; enable_reminder_pending: number | null; reminder_days_before: number | null; reminder_sent_at: string | null; event_type: string | null }[]>(
    `SELECT theme_settings, end_date, enable_qr_checkin, enable_agenda, timezone, enable_reminder_accepted, enable_reminder_pending, reminder_days_before, reminder_sent_at, event_type FROM events WHERE id = ?`,
    req.params.id
  );
  const existingRow = rawExisting[0] || null;
  const resolvedThemeSql = theme_settings !== undefined
    ? (theme_settings ? JSON.stringify(theme_settings) : null)
    : (existingRow?.theme_settings ?? null);
  const resolvedEndDateSql = end_date !== undefined ? (end_date || null) : (existingRow?.end_date ?? null);
  const resolvedQrEnabled = parseFeatureFlag(enable_qr_checkin, readStoredFeatureFlag(existingRow?.enable_qr_checkin, true));
  const resolvedAgendaEnabled = parseFeatureFlag(enable_agenda, readStoredFeatureFlag(existingRow?.enable_agenda, true));
  const resolvedTimezone = timezone !== undefined ? timezone : (existingRow?.timezone || 'Europe/Stockholm');
  const resolvedReminderAccepted = enable_reminder_accepted !== undefined
    ? parseFeatureFlag(enable_reminder_accepted, false)
    : readStoredFeatureFlag(existingRow?.enable_reminder_accepted, false);
  const resolvedReminderPending = enable_reminder_pending !== undefined
    ? parseFeatureFlag(enable_reminder_pending, false)
    : readStoredFeatureFlag(existingRow?.enable_reminder_pending, false);
  const resolvedReminderDays = reminder_days_before !== undefined
    ? Math.max(0, parseInt(reminder_days_before ?? '0', 10) || 0)
    : (existingRow?.reminder_days_before ?? 0);
  // Reset reminder_sent_at when reminder settings change so it will be sent again
  const reminderSettingsChanged = enable_reminder_accepted !== undefined || enable_reminder_pending !== undefined || reminder_days_before !== undefined;
  const resolvedReminderSentAt = reminderSettingsChanged ? null : (existingRow?.reminder_sent_at ?? null);
  const resolvedEventType = event_type !== undefined
    ? (event_type === 'public' ? 'public' : 'invite_only')
    : (existingRow?.event_type ?? 'invite_only');

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
    `UPDATE events SET theme_settings = ?, end_date = ?, enable_qr_checkin = ?, enable_agenda = ?, timezone = ?, enable_reminder_accepted = ?, enable_reminder_pending = ?, reminder_days_before = ?, reminder_sent_at = ?, event_type = ? WHERE id = ?`,
    resolvedThemeSql,
    resolvedEndDateSql,
    resolvedQrEnabled ? 1 : 0,
    resolvedAgendaEnabled ? 1 : 0,
    resolvedTimezone,
    resolvedReminderAccepted ? 1 : 0,
    resolvedReminderPending ? 1 : 0,
    resolvedReminderDays,
    resolvedReminderSentAt,
    resolvedEventType,
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
      timezone: resolvedTimezone,
      enable_reminder_accepted: resolvedReminderAccepted,
      enable_reminder_pending: resolvedReminderPending,
      reminder_days_before: resolvedReminderDays,
      reminder_sent_at: resolvedReminderSentAt,
      event_type: resolvedEventType,
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

router.post('/:id/send-reminders', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const event = await prisma.event.findFirst({
    where: { id: req.params.id, creatorId: userId, status: { not: 'deleted' } },
  });
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const rawRows = await prisma.$queryRawUnsafe<{ enable_reminder_accepted: number | null; enable_reminder_pending: number | null; reminder_days_before: number | null; timezone: string | null }[]>(
    `SELECT enable_reminder_accepted, enable_reminder_pending, reminder_days_before, timezone FROM events WHERE id = ?`,
    req.params.id
  );
  const raw = rawRows[0] || {};

  const { type } = req.body; // 'accepted' | 'pending' | 'both'
  const sendAccepted = type === 'accepted' || type === 'both';
  const sendPending = type === 'pending' || type === 'both';

  const eventInfo = {
    title: event.title,
    event_date: typeof event.eventDate === 'string' ? event.eventDate : (event.eventDate as Date).toISOString(),
    location: event.location || null,
    timezone: raw.timezone || 'Europe/Stockholm',
    creator_id: event.creatorId,
    enable_reminder_accepted: sendAccepted ? 1 : 0,
    enable_reminder_pending: sendPending ? 1 : 0,
  };

  const count = await sendEventReminders(req.params.id, eventInfo, 'manual');
  return res.json({ sent: count });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const existing = await prisma.event.findFirst({ where: { id: req.params.id, creatorId: userId } });
  if (!existing) return res.status(404).json({ error: 'Event not found' });
  await prisma.event.update({ where: { id: req.params.id }, data: { status: 'deleted' } });
  return res.json({ message: 'Event deleted' });
});

export default router;
