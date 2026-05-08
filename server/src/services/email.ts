import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import prisma from '../db';

async function getSmtpConfig() {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from'] } },
  });
  const settings: Record<string, string> = {};
  for (const row of rows) settings[row.key] = row.value || '';
  if (!settings.smtp_host || !settings.smtp_user) return null;
  return {
    host: settings.smtp_host,
    port: parseInt(settings.smtp_port || '587', 10),
    user: settings.smtp_user,
    pass: settings.smtp_pass,
    from: settings.smtp_from || settings.smtp_user,
  };
}

function formatEventDateInTz(naiveStr: string, tz: string): string {
  if (!naiveStr) return '';
  // Convert naive datetime string to a proper Date in the given timezone
  const [datePart = '', timePart = '00:00'] = naiveStr.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  if (!year || !month || !day) return naiveStr;
  const placeholder = Date.UTC(year, month - 1, day, hours || 0, minutes || 0);
  const getOffset = (date: Date) => {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
    const parts = fmt.formatToParts(date);
    const get = (t: string) => Number(parts.find(p => p.type === t)?.value ?? 0);
    return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second')) - date.getTime();
  };
  const offset = getOffset(new Date(placeholder));
  const approxUtc = placeholder - offset;
  const offset2 = getOffset(new Date(approxUtc));
  const date = new Date(placeholder - offset2);
  return date.toLocaleString('sv-SE', { timeZone: tz, dateStyle: 'long', timeStyle: 'short' });
}

function createTransport(config: { host: string; port: number; user: string; pass: string }) {
  return nodemailer.createTransport({
    host: config.host, port: config.port, secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });
}

export async function sendInvitationEmail(
  to: string,
  invitation: { token: string; recipientName?: string | null },
  event: { title: string; eventDate: string; location?: string | null; themeSettings?: string | null; timezone?: string | null },
  template: { htmlContent: string },
  senderName: string
): Promise<void> {
  const config = await getSmtpConfig();
  if (!config) { console.warn('SMTP not configured, skipping email'); return; }

  let themeSettings: { primary_color?: string; accent_color?: string; tagline?: string } = {};
  if (event.themeSettings) {
    try { themeSettings = JSON.parse(event.themeSettings); } catch {}
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  let html = template.htmlContent;
  const tz = event.timezone || 'Europe/Stockholm';

  // Replace {{var|default}} pattern (theme vars with per-template defaults)
  html = html.replace(/\{\{(\w+)\|([^}]*)\}\}/g, (_: string, key: string, defaultVal: string) => {
    if (key === 'primary_color') return themeSettings.primary_color || defaultVal;
    if (key === 'accent_color') return themeSettings.accent_color || defaultVal;
    if (key === 'tagline') return themeSettings.tagline || defaultVal;
    return defaultVal;
  });

  html = html.replace(/{{event_title}}/g, event.title);
  html = html.replace(/{{event_date}}/g, formatEventDateInTz(event.eventDate, tz));
  html = html.replace(/{{event_location}}/g, event.location || 'TBD');
  html = html.replace(/{{rsvp_url}}/g, `${appUrl}/rsvp/${invitation.token}`);
  html = html.replace(/{{sender_name}}/g, senderName);

  const transport = createTransport(config);
  await transport.sendMail({ from: `"MyEvents" <${config.from}>`, to, subject: `You're invited to ${event.title}`, html });
}

export async function sendCheckinConfirmationEmail(
  to: string,
  recipientName: string | null,
  event: { title: string; eventDate: string; location?: string | null; timezone?: string | null },
  invitationToken: string
): Promise<void> {
  const config = await getSmtpConfig();
  if (!config) { console.warn('SMTP not configured, skipping confirmation email'); return; }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const checkinUrl = `${appUrl}/checkin/${invitationToken}`;
  const qrDataUrl = await QRCode.toDataURL(checkinUrl, { width: 200, margin: 2 });

  const displayName = recipientName || to;
  const tz = event.timezone || 'Europe/Stockholm';
  const eventDateStr = formatEventDateInTz(event.eventDate, tz);

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;background:#f5f5f5;margin:0;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;text-align:center">
    <h2 style="color:#1a1a2e;margin-bottom:4px">You're confirmed! 🎉</h2>
    <p style="color:#555;margin-top:0">Hi ${displayName}, your spot at <strong>${event.title}</strong> is confirmed.</p>
    <p style="color:#555"><strong>📅</strong> ${eventDateStr}</p>
    ${event.location ? `<p style="color:#555"><strong>📍</strong> ${event.location}</p>` : ''}
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
    <p style="color:#555;font-size:14px">Present this QR code at the entrance to check in:</p>
    <img src="${qrDataUrl}" alt="Check-in QR code" style="width:180px;height:180px;border-radius:8px" />
    <p style="color:#aaa;font-size:12px;margin-top:8px">Keep this email handy on the day of the event.</p>
  </div>
</body>
</html>`;

  const transport = createTransport(config);
  await transport.sendMail({
    from: `"MyEvents" <${config.from}>`,
    to,
    subject: `You're confirmed for ${event.title} — your check-in QR`,
    html,
  });
}

export async function sendTestEmail(to: string): Promise<void> {
  const config = await getSmtpConfig();
  if (!config) throw new Error('SMTP not configured');
  const transport = createTransport(config);
  await transport.sendMail({
    from: `"MyEvents" <${config.from}>`, to, subject: 'MyEvents — Test Email',
    html: `<h1>Test Email</h1><p>Your SMTP configuration is working correctly!</p>`,
  });
}
