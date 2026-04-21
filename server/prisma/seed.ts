import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import bcrypt from 'bcryptjs';

const dbUrl = process.env.DATABASE_URL || 'file:../data/myevents.db';
const adapter = new PrismaLibSql({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

const elegantTemplate = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>{{event_title}}</title></head>
<body style="margin:0;padding:0;background:#1a1a2e;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a2e;min-height:100vh;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#16213e;border-radius:12px;overflow:hidden;border:1px solid #c9a84c;">
        <tr><td style="background:linear-gradient(135deg,#1a1a2e,#0f3460);padding:50px 40px;text-align:center;border-bottom:2px solid #c9a84c;">
          <div style="font-size:12px;letter-spacing:4px;color:#c9a84c;text-transform:uppercase;margin-bottom:16px;">You are cordially invited</div>
          <h1 style="color:#f5e6c8;font-size:36px;margin:0 0 8px;font-weight:normal;letter-spacing:2px;">{{event_title}}</h1>
          <div style="width:60px;height:2px;background:#c9a84c;margin:20px auto;"></div>
        </td></tr>
        <tr><td style="padding:40px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:16px;background:#0f3460;border-radius:8px;margin-bottom:16px;border-left:3px solid #c9a84c;">
              <div style="color:#c9a84c;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">Date &amp; Time</div>
              <div style="color:#f5e6c8;font-size:18px;">{{event_date}}</div>
            </td></tr>
            <tr><td style="height:12px;"></td></tr>
            <tr><td style="padding:16px;background:#0f3460;border-radius:8px;border-left:3px solid #c9a84c;">
              <div style="color:#c9a84c;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">Location</div>
              <div style="color:#f5e6c8;font-size:18px;">{{event_location}}</div>
            </td></tr>
            <tr><td style="height:32px;"></td></tr>
            <tr><td style="text-align:center;">
              <div style="color:#a0b0c0;margin-bottom:24px;font-size:14px;">Hosted by <span style="color:#c9a84c;">{{sender_name}}</span></div>
              <a href="{{rsvp_url}}" style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#f5d76e);color:#1a1a2e;text-decoration:none;padding:16px 48px;border-radius:4px;font-size:14px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;">RSVP Now</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#0f3460;padding:24px 40px;text-align:center;border-top:1px solid #c9a84c;">
          <p style="color:#6b7a8d;font-size:12px;margin:0;">© MyEvents — All Rights Reserved</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const partyTemplate = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>{{event_title}}</title></head>
<body style="margin:0;padding:0;background:linear-gradient(135deg,#ff6b6b,#feca57,#48dbfb,#ff9ff3);font-family:'Arial',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="min-height:100vh;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
        <tr><td style="background:linear-gradient(135deg,#ff6b6b,#ff9ff3);padding:50px 40px;text-align:center;">
          <div style="font-size:48px;margin-bottom:16px;">🎉</div>
          <h1 style="color:#fff;font-size:32px;margin:0;font-weight:800;">{{event_title}}</h1>
          <div style="font-size:24px;margin-top:16px;">🎈 🎊 🥳</div>
        </td></tr>
        <tr><td style="padding:40px;">
          <div style="background:#fff5f5;border-radius:12px;padding:20px;text-align:center;border:2px solid #ff6b6b;margin-bottom:16px;">
            <div style="font-size:24px;margin-bottom:8px;">📅</div>
            <div style="font-size:11px;color:#ff6b6b;font-weight:bold;text-transform:uppercase;margin-bottom:4px;">When</div>
            <div style="font-size:15px;color:#333;font-weight:600;">{{event_date}}</div>
          </div>
          <div style="background:#f0f9ff;border-radius:12px;padding:20px;text-align:center;border:2px solid #48dbfb;margin-bottom:24px;">
            <div style="font-size:24px;margin-bottom:8px;">📍</div>
            <div style="font-size:11px;color:#48dbfb;font-weight:bold;text-transform:uppercase;margin-bottom:4px;">Where</div>
            <div style="font-size:15px;color:#333;font-weight:600;">{{event_location}}</div>
          </div>
          <div style="text-align:center;">
            <p style="color:#666;margin:0 0 16px;">Invited by <strong style="color:#ff6b6b;">{{sender_name}}</strong> 🎁</p>
            <a href="{{rsvp_url}}" style="display:inline-block;background:linear-gradient(135deg,#ff6b6b,#feca57);color:#fff;text-decoration:none;padding:18px 48px;border-radius:50px;font-size:16px;font-weight:800;text-transform:uppercase;">🎉 RSVP Now!</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const corporateTemplate = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>{{event_title}}</title></head>
<body style="margin:0;padding:0;background:#f4f7f9;font-family:'Helvetica Neue','Arial',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f9;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <tr><td style="background:#1e40af;padding:32px 40px;text-align:left;">
          <div style="color:#93c5fd;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Event Invitation</div>
          <h1 style="color:#ffffff;font-size:28px;margin:0;font-weight:700;">{{event_title}}</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 32px;">You have been cordially invited. Please review the details below and confirm your attendance.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:32px;">
            <tr style="background:#f8fafc;">
              <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                <div style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Date &amp; Time</div>
                <div style="color:#111827;font-size:15px;font-weight:500;">{{event_date}}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 20px;">
                <div style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Location</div>
                <div style="color:#111827;font-size:15px;font-weight:500;">{{event_location}}</div>
              </td>
            </tr>
          </table>
          <p style="color:#4b5563;font-size:14px;margin:0 0 24px;">Invited by <strong style="color:#1e40af;">{{sender_name}}</strong>.</p>
          <table cellpadding="0" cellspacing="0">
            <tr><td style="border-radius:6px;background:#1e40af;">
              <a href="{{rsvp_url}}" style="display:inline-block;color:#ffffff;text-decoration:none;padding:14px 32px;font-size:14px;font-weight:600;">Confirm Attendance</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">© MyEvents | Professional Event Management</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

async function main() {
  // Plans
  const basicPlan = await prisma.plan.upsert({
    where: { id: 'basic' },
    update: {},
    create: { id: 'basic', name: 'Basic', eventLimit: 5, priceSek: 99, description: 'Up to 5 events', isDefault: true, isActive: true },
  });
  await prisma.plan.upsert({
    where: { id: 'pro' },
    update: {},
    create: { id: 'pro', name: 'Pro', eventLimit: 20, priceSek: 199, description: 'Up to 20 events', isDefault: false, isActive: true },
  });
  await prisma.plan.upsert({
    where: { id: 'unlimited' },
    update: {},
    create: { id: 'unlimited', name: 'Unlimited', eventLimit: -1, priceSek: 399, description: 'Unlimited events', isDefault: false, isActive: true },
  });

  // Admin user
  const adminExists = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!adminExists) {
    const passwordHash = bcrypt.hashSync('changeme', 10);
    await prisma.user.create({
      data: {
        email: 'admin',
        passwordHash,
        name: 'Admin',
        role: 'admin',
        planId: basicPlan.id,
        paymentStatus: 'paid',
        isActive: true,
      },
    });
  }

  // App settings
  const defaultSettings = [
    { key: 'smtp_host', value: '' },
    { key: 'smtp_port', value: '587' },
    { key: 'smtp_user', value: '' },
    { key: 'smtp_pass', value: '' },
    { key: 'smtp_from', value: '' },
    { key: 'swish_number', value: '' },
    { key: 'swish_holder_name', value: '' },
    { key: 'app_name', value: 'MyEvents' },
    { key: 'free_tier_invite_limit', value: '1' },
  ];
  for (const s of defaultSettings) {
    await prisma.appSetting.upsert({ where: { key: s.key }, update: {}, create: s });
  }

  // Templates
  const tmplCount = await prisma.template.count();
  if (tmplCount === 0) {
    await prisma.template.createMany({
      data: [
        { name: 'Elegant', htmlContent: elegantTemplate, isSystem: true },
        { name: 'Party', htmlContent: partyTemplate, isSystem: true },
        { name: 'Corporate', htmlContent: corporateTemplate, isSystem: true },
      ],
    });
  }

  console.log('Seed completed.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
