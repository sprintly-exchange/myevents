import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

const formatUser = (user: any) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  country: user.country ?? null,
  role: user.role,
  payment_status: user.paymentStatus,
  plan_id: user.planId,
  plan_name: user.plan?.name ?? null,
  event_limit: user.plan?.eventLimit ?? null,
  price_sek: user.plan?.priceSek ?? null,
  plan_currency: user.plan?.currency ?? null,
  is_active: user.isActive ? 1 : 0,
  created_at: user.createdAt,
});

router.post('/register', async (req: Request, res: Response) => {
  const { name, email, password, country } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email, and password are required' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const defaultPlan = await prisma.plan.findFirst({ where: { isDefault: true, isActive: true } });
  const passwordHash = bcrypt.hashSync(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      country: typeof country === 'string' && country.trim() ? country.trim().toUpperCase() : 'SE',
      role: 'user',
      planId: defaultPlan?.id ?? null,
      paymentStatus: 'pending',
      isActive: true,
    },
    include: { plan: true },
  });
  return res.status(201).json({ user: formatUser(user) });
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  const lower = email.toLowerCase();
  const candidates = await prisma.user.findMany({
    where: { OR: [{ email }, { email: lower }] },
    include: { plan: true },
  });
  let user: typeof candidates[0] | null = candidates[0] ?? null;

  if (!user) {
    const byName = await prisma.user.findMany({ include: { plan: true } });
    user = byName.find(u => u.name.toLowerCase() === lower || u.email.toLowerCase() === lower) ?? null;
  }

  if (!user || !bcrypt.compareSync(password, user.passwordHash))
    return res.status(401).json({ error: 'Invalid email or password' });
  if (!user.isActive)
    return res.status(403).json({ error: 'Account is disabled' });

  const payload = { id: user.id, email: user.email, role: user.role, payment_status: user.paymentStatus };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.json({ user: formatUser(user) });
});

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  return res.json({ message: 'Logged out' });
});

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { plan: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ user: formatUser(user) });
});

export default router;
