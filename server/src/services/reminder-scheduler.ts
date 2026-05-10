import prisma from '../db';
import { sendReminderEmail } from './email';

async function processReminders() {
  const now = new Date();

  // Fetch events that have reminders enabled and haven't been sent yet
  const rows = await prisma.$queryRawUnsafe<{
    id: string;
    title: string;
    event_date: string;
    location: string | null;
    timezone: string | null;
    creator_id: string;
    enable_reminder_accepted: number;
    enable_reminder_pending: number;
    reminder_days_before: number;
    reminder_sent_at: string | null;
  }[]>(`
    SELECT e.id, e.title, e.eventDate AS event_date, e.location, e.creatorId AS creator_id,
           er.enable_reminder_accepted, er.enable_reminder_pending,
           er.reminder_days_before, er.reminder_sent_at, er.timezone
    FROM events e
    JOIN (
      SELECT id,
        enable_reminder_accepted, enable_reminder_pending,
        reminder_days_before, reminder_sent_at, timezone
      FROM events
      WHERE reminder_days_before > 0
        AND reminder_sent_at IS NULL
        AND status != 'deleted'
    ) er ON e.id = er.id
    WHERE e.status != 'deleted'
  `);

  for (const row of rows) {
    // Parse the naive event date string as UTC (good enough for day-level scheduling)
    const eventDate = new Date(row.event_date);
    if (isNaN(eventDate.getTime())) continue;

    // Calculate trigger time: event_date - reminder_days_before days
    const triggerTime = new Date(eventDate.getTime() - row.reminder_days_before * 24 * 60 * 60 * 1000);

    // Send if we've passed the trigger time but event hasn't happened yet
    if (now >= triggerTime && now < eventDate) {
      await sendEventReminders(row.id, row, 'scheduled');
    }
  }
}

export async function sendEventReminders(
  eventId: string,
  eventInfo: {
    title: string;
    event_date: string;
    location: string | null;
    timezone: string | null;
    creator_id: string;
    enable_reminder_accepted: number;
    enable_reminder_pending: number;
  },
  mode: 'manual' | 'scheduled'
) {
  const sender = await prisma.user.findUnique({
    where: { id: eventInfo.creator_id },
    select: { name: true },
  });
  const senderName = sender?.name || 'The organizer';

  const eventForEmail = {
    title: eventInfo.title,
    eventDate: eventInfo.event_date,
    location: eventInfo.location,
    timezone: eventInfo.timezone,
  };

  let remindersSent = 0;

  if (eventInfo.enable_reminder_accepted === 1) {
    const acceptedInvitations = await prisma.invitation.findMany({
      where: { eventId, status: 'accepted' },
    });
    for (const inv of acceptedInvitations) {
      sendReminderEmail(inv.recipientEmail, inv.recipientName || null, eventForEmail, senderName, 'accepted')
        .catch((err: Error) => console.error(`Reminder (accepted) failed for ${inv.recipientEmail}:`, err.message));
      remindersSent++;
    }
  }

  if (eventInfo.enable_reminder_pending === 1) {
    const pendingInvitations = await prisma.invitation.findMany({
      where: { eventId, status: 'pending' },
    });
    for (const inv of pendingInvitations) {
      sendReminderEmail(inv.recipientEmail, inv.recipientName || null, eventForEmail, senderName, 'pending')
        .catch((err: Error) => console.error(`Reminder (pending) failed for ${inv.recipientEmail}:`, err.message));
      remindersSent++;
    }
  }

  // Mark as sent for scheduled mode to prevent duplicates
  if (mode === 'scheduled' && remindersSent > 0) {
    await prisma.$executeRawUnsafe(
      `UPDATE events SET reminder_sent_at = ? WHERE id = ?`,
      new Date().toISOString(),
      eventId
    );
  }

  return remindersSent;
}

export function startReminderScheduler() {
  // Run once on startup (after a short delay to let the server stabilise)
  setTimeout(() => {
    processReminders().catch(err => console.error('Reminder scheduler error:', err));
  }, 60_000); // 1 minute after startup

  // Then run every hour
  setInterval(() => {
    processReminders().catch(err => console.error('Reminder scheduler error:', err));
  }, 60 * 60 * 1000);

  console.log('Reminder scheduler started (runs every hour)');
}
