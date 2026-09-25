import nodemailer from 'nodemailer';
import { prisma } from '../db/prisma';
import { logger } from '../config/logger';

async function seedEtherealSender() {
  logger.info('Generating new Ethereal Email test account...');

  try {
    const testAccount = await nodemailer.createTestAccount();

    logger.info(`Generated Ethereal Credentials:
    User: ${testAccount.user}
    Pass: ${testAccount.pass}
    SMTP Host: ${testAccount.smtp.host}
    SMTP Port: ${testAccount.smtp.port}
    Web URL: https://ethereal.email/messages
    `);

    // Check if an ethereal sender already exists
    const existingSender = await prisma.sender.findFirst({
      where: { email: testAccount.user },
    });

    if (existingSender) {
      logger.info(`Sender already exists in database with ID: ${existingSender.id}`);
      return;
    }

    const sender = await prisma.sender.create({
      data: {
        name: 'ReachInbox Outreach (Ethereal)',
        email: testAccount.user,
        host: testAccount.smtp.host,
        port: testAccount.smtp.port || 587,
        secure: testAccount.smtp.secure || false,
        user: testAccount.user,
        pass: testAccount.pass,
        hourlyLimit: 200,
        minDelayMs: 2000,
      },
    });

    logger.info(`Successfully seeded Ethereal Sender with ID: ${sender.id}`);
  } catch (error) {
    logger.error({ error }, 'Failed to seed Ethereal sender');
  } finally {
    await prisma.$disconnect();
  }
}

seedEtherealSender();
