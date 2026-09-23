import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';
import { env } from '../config/env';
import { AuthenticatedUser } from '../types';

export class AuthLocalController {
  public static async register(req: Request, res: Response): Promise<void> {
    const { email, password, name } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      res.status(400).json({ success: false, message: 'User with this email already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name || normalizedEmail.split('@')[0],
        role: 'user',
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
      },
    });

    const token = jwt.sign({ id: user.id, email: user.email }, env.JWT_SECRET, {
      expiresIn: '7d',
    });

    req.login(user as AuthenticatedUser, (err) => {
      if (err) {
        // Fallback to token only
        res.status(201).json({ success: true, user, token });
        return;
      }
      res.status(201).json({ success: true, user, token });
    });
  }

  public static async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.passwordHash) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const safeUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
    };

    const token = jwt.sign({ id: user.id, email: user.email }, env.JWT_SECRET, {
      expiresIn: '7d',
    });

    req.login(safeUser, (err) => {
      if (err) {
        res.status(200).json({ success: true, user: safeUser, token });
        return;
      }
      res.status(200).json({ success: true, user: safeUser, token });
    });
  }

  public static async logout(req: Request, res: Response): Promise<void> {
    req.logout((err) => {
      if (err) {
        res.status(500).json({ success: false, message: 'Error logging out' });
        return;
      }
      if (req.session) {
        req.session.destroy(() => {
          res.clearCookie('connect.sid');
          res.json({ success: true, message: 'Logged out successfully' });
        });
      } else {
        res.json({ success: true, message: 'Logged out successfully' });
      }
    });
  }

  public static async getMe(req: Request, res: Response): Promise<void> {
    const userId = (req.user as AuthenticatedUser)?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        slackIntegration: {
          select: {
            connected: true,
            teamName: true,
            channel: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({
      success: true,
      user: {
        ...user,
        slackConnected: !!user.slackIntegration?.connected,
      },
    });
  }
}
