import { prisma } from '../db/prisma';
import { logger } from '../config/logger';

async function fixExistingEtherealData() {
  logger.info('Updating existing Ethereal senders and sent emails in database...');

  try {
    // 1. Update all Ethereal Senders to Port 465 with SSL
    const senderResult = await prisma.sender.updateMany({
      where: {
        host: { contains: 'ethereal' },
      },
      data: {
        port: 465,
        secure: true,
      },
    });

    logger.info(`✅ Updated ${senderResult.count} Ethereal senders to Port 465 SSL.`);

    // 2. Clean up past demo preview URLs that lead to 404s
    const emailResult = await prisma.email.updateMany({
      where: {
        previewUrl: { contains: 'demo' },
      },
      data: {
        previewUrl: 'https://ethereal.email/messages',
      },
    });

    logger.info(`✅ Cleaned up ${emailResult.count} sent email preview URLs in database.`);
  } catch (error) {
    logger.error({ error }, 'Failed to fix database Ethereal data');
  } finally {
    await prisma.$disconnect();
  }
}

fixExistingEtherealData();
