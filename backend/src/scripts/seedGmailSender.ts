import { prisma } from '../db/prisma';

async function seedGmailSender() {
  const email = process.argv[2];
  const appPassword = process.argv[3];

  if (!email || !appPassword) {
    console.log('Usage: npx tsx scripts/seedGmailSender.ts <your-gmail> <your-16-char-app-password>');
    process.exit(1);
  }

  const sender = await prisma.sender.create({
    data: {
      name: `Gmail (${email})`,
      email: email,
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      user: email,
      pass: appPassword.replace(/\s+/g, ''),
      hourlyLimit: 200,
      minDelayMs: 2000,
    },
  });

  console.log(`✅ Successfully added Gmail SMTP sender "${sender.email}"!`);
  await prisma.$disconnect();
}

seedGmailSender();
