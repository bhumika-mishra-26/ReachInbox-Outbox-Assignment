import { prisma } from '../db/prisma';
import dotenv from 'dotenv';
dotenv.config();

async function seedGmailSender() {
  const email = process.argv[2] || process.env.GMAIL_USER || process.env.SMTP_USER;
  const appPassword = process.argv[3] || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

  if (!email || !appPassword) {
    console.log('Usage: npx tsx src/scripts/seedGmailSender.ts <your-gmail> <your-16-char-app-password>');
    process.exit(1);
  }

  // Check if sender already exists
  const existing = await prisma.sender.findFirst({ where: { email } });
  if (existing) {
    console.log(`✅ Gmail sender "${email}" already exists in database with ID: ${existing.id}`);
    await prisma.$disconnect();
    return;
  }

  const sender = await prisma.sender.create({
    data: {
      name: `Gmail (${email})`,
      email: email,
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      user: email,
      pass: appPassword.replace(/\s+/g, ''),
      hourlyLimit: 200,
      minDelayMs: 2000,
    },
  });

  console.log(`✅ Successfully added Gmail SMTP sender "${sender.email}" with ID: ${sender.id}`);
  await prisma.$disconnect();
}

seedGmailSender();