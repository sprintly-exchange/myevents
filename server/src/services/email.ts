import nodemailer from 'nodemailer';
import db from '../db';

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

function getSmtpConfig(): SmtpConfig | null {
  const rows = db.prepare("SELECT key, value FROM app_settings WHERE key IN ('smtp_host','smtp_port','smtp_user','smtp_pass','smtp_from')").all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value || '';
  }
  if (!settings.smtp_host || !settings.smtp_user) {
    return null;
  }
  return {
    host: settings.smtp_host,
    port: parseInt(settings.smtp_port || '587', 10),
    user: settings.smtp_user,
    pass: settings.smtp_pass,
    from: settings.smtp_from || settings.smtp_user,
  };
}

function createTransport(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

export async function sendInvitationEmail(
  to: string,
  invitation: { token: string; recipient_name?: string },
  event: { title: string; event_date: string; location?: string },
  template: { html_content: string },
  senderName: string
): Promise<void> {
  const config = getSmtpConfig();
  if (!config) {
    console.warn('SMTP not configured, skipping email send');
    return;
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const rsvpUrl = `${appUrl}/rsvp/${invitation.token}`;

  let html = template.html_content;
  html = html.replace(/{{event_title}}/g, event.title);
  html = html.replace(/{{event_date}}/g, new Date(event.event_date).toLocaleString('sv-SE'));
  html = html.replace(/{{event_location}}/g, event.location || 'TBD');
  html = html.replace(/{{rsvp_url}}/g, rsvpUrl);
  html = html.replace(/{{sender_name}}/g, senderName);

  const transport = createTransport(config);
  await transport.sendMail({
    from: `"MyEvents" <${config.from}>`,
    to,
    subject: `You're invited to ${event.title}`,
    html,
  });
}

export async function sendTestEmail(to: string): Promise<void> {
  const config = getSmtpConfig();
  if (!config) {
    throw new Error('SMTP not configured');
  }
  const transport = createTransport(config);
  await transport.sendMail({
    from: `"MyEvents" <${config.from}>`,
    to,
    subject: 'MyEvents — Test Email',
    html: `<h1>Test Email</h1><p>Your SMTP configuration is working correctly!</p>`,
  });
}
