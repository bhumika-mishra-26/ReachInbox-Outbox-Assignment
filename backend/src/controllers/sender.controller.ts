import { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { prisma } from '../db/prisma';
import { AuthenticatedUser } from '../types';

export class SenderController {
  /**
   * List all senders available to the user (or system defaults)
   */
  public static async getSenders(req: Request, res: Response): Promise<void> {
    const user = req.user as AuthenticatedUser;

    const senders = await prisma.sender.findMany({
      where: user ? { OR: [{ userId: user.id }, { userId: null }] } : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        host: true,
        port: true,
        secure: true,
        hourlyLimit: true,
        minDelayMs: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: senders });
  }

  /**
   * Add a new custom SMTP sender
   */
  public static async createSender(req: Request, res: Response): Promise<void> {
    const user = req.user as AuthenticatedUser;
    const { name, email, host, port, secure, user: smtpUser, pass, hourlyLimit, minDelayMs } = req.body;

    const sender = await prisma.sender.create({
      data: {
        name,
        email,
        host,
        port: Number(port),
        secure: Boolean(secure),
        user: smtpUser,
        pass,
        hourlyLimit: hourlyLimit ? Number(hourlyLimit) : 200,
        minDelayMs: minDelayMs ? Number(minDelayMs) : 2000,
        userId: user?.id || null,
      },
    });

    res.status(201).json({ success: true, data: sender });
  }

  /**
   * Create an instant Ethereal sender test account
   */
  public static async createEtherealSender(req: Request, res: Response): Promise<void> {
    const user = req.user as AuthenticatedUser;

    const testAccount = await nodemailer.createTestAccount();

    const sender = await prisma.sender.create({
      data: {
        name: 'Ethereal Test Sender',
        email: testAccount.user,
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        user: testAccount.user,
        pass: testAccount.pass,
        hourlyLimit: 200,
        minDelayMs: 2000,
        userId: user?.id || null,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Generated Ethereal Test Sender',
      data: sender,
    });
  }

  /**
   * Update sender rate limits or delay
   */
  public static async updateSender(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const { name, hourlyLimit, minDelayMs } = req.body;

    const updated = await prisma.sender.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(hourlyLimit !== undefined ? { hourlyLimit: Number(hourlyLimit) } : {}),
        ...(minDelayMs !== undefined ? { minDelayMs: Number(minDelayMs) } : {}),
      },
    });

    res.json({ success: true, data: updated });
  }

  /**
   * Delete a sender
   */
  public static async deleteSender(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    await prisma.sender.delete({ where: { id } });
    res.json({ success: true, message: 'Sender deleted' });
  }
}
