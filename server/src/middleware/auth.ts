import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  payment_status: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.token;
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    const user = (req as any).user as JwtPayload;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    next();
  });
}
