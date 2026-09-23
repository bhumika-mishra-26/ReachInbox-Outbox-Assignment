import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { AuthenticatedUser } from '../types';

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  // 1. Check Passport session (Google OAuth / Session login)
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return next();
  }

  // 2. Check Bearer JWT token in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string; email: string };
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, name: true, avatar: true, role: true },
      });

      if (user) {
        req.user = user as AuthenticatedUser;
        return next();
      }
    } catch {
      res.status(401).json({ success: false, message: 'Invalid or expired token' });
      return;
    }
  }

  res.status(401).json({ success: false, message: 'Authentication required' });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  // In development, allow admin access if configured
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  res.status(403).json({ success: false, message: 'Admin access required' });
}
