import nodemailer from 'nodemailer';
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

function createTransport(config: { host: string; port: number; user: string; pass: string }) {
  return nodemailer.createTransport({
    host: config.host, port: config.port, secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });
}

export async function sendInvitationEmail(
  to: string,
  invitation: { token: string; recipientName?: string | null },
  event: { title: string; eventDate: string; location?: string | null; themeSettings?: string | null },
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

  // Replace {{var|default}} pattern (theme vars with per-template defaults)
  html = html.replace(/\{\{(\w+)\|([^}]*)\}\}/g, (_: string, key: string, defaultVal: string) => {
    if (key === 'primary_color') return themeSettings.primary_color || defaultVal;
    if (key === 'accent_color') return themeSettings.accent_color || defaultVal;
    if (key === 'tagline') return themeSettings.tagline || defaultVal;
    return defaultVal;
  });

  html = html.replace(/{{event_title}}/g, event.title);
  html = html.replace(/{{event_date}}/g, new Date(event.eventDate).toLocaleString('sv-SE'));
  html = html.replace(/{{event_location}}/g, event.location || 'TBD');
  html = html.replace(/{{rsvp_url}}/g, `${appUrl}/rsvp/${invitation.token}`);
  html = html.replace(/{{sender_name}}/g, senderName);

  const transport = createTransport(config);
  await transport.sendMail({ from: `"MyEvents" <${config.from}>`, to, subject: `You're invited to ${event.title}`, html });
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
