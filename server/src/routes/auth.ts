import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

router.post('/register', async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email, and password are required' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const defaultPlan = await prisma.plan.findFirst({ where: { isDefault: true, isActive: true } });
  const passwordHash = bcrypt.hashSync(password, 10);

  const user = await prisma.user.create({
    data: { email, passwordHash, name, role: 'user', planId: defaultPlan?.id ?? null, paymentStatus: 'pending', isActive: true },
    select: { id: true, email: true, name: true, role: true, paymentStatus: true, planId: true },
  });
  return res.status(201).json({ user });
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  const user = await prisma.user.findUnique({
    where: { email },
    include: { plan: true },
  });

  if (!user || !bcrypt.compareSync(password, user.passwordHash))
    return res.status(401).json({ error: 'Invalid email or password' });
  if (!user.isActive)
    return res.status(403).json({ error: 'Account is disabled' });

  if (user.paymentStatus === 'pending' && user.role === 'user') {
    const [swishNumber, swishHolder] = await Promise.all([
      prisma.appSetting.findUnique({ where: { key: 'swish_number' } }),
      prisma.appSetting.findUnique({ where: { key: 'swish_holder_name' } }),
    ]);
    return res.status(402).json({
      status: 'pending_payment',
      swishNumber: swishNumber?.value || '',
      swishHolder: swishHolder?.value || '',
      price: user.plan?.priceSek,
      planName: user.plan?.name,
    });
  }

  const payload = { id: user.id, email: user.email, role: user.role, payment_status: user.paymentStatus };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  const { passwordHash: _, ...safeUser } = user;
  return res.json({ user: safeUser });
});

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  return res.json({ message: 'Logged out' });
});

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, paymentStatus: true, planId: true, isActive: true, createdAt: true, plan: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ user });
});

export default router;
