import { prisma } from '../db/prisma';
import { redis } from '../config/redis';
import { logger } from '../config/logger';

export class SlackService {
  /**
   * Notifies user's connected Slack channel when rate limit is exceeded.
   * Throttled to once per sender per hour to avoid alert fatigue.
   */
  public static async notifyRateLimitHit(
    userId: string | null | undefined,
    senderId: string,
    senderEmail: string,
    limit: number
  ): Promise<void> {
    if (!userId) return;

    try {
      const integration = await prisma.slackIntegration.findUnique({
        where: { userId },
      });

      if (!integration || !integration.connected || !integration.webhookUrl) {
        return; // User has not connected Slack; silent no-op
      }

      // De-duplicate alerts: only notify once per hour per sender
      const hourPrefix = new Date().toISOString().slice(0, 13);
      const alertKey = `slack:alerted:${userId}:${senderId}:${hourPrefix}`;
      const firstAlertThisHour = await redis.set(alertKey, '1', 'EX', 3600, 'NX');

      if (!firstAlertThisHour) {
        // Already alerted this hour for this sender
        return;
      }

      logger.info(`Sending Slack rate limit alert to user ${userId} for sender ${senderEmail}`);

      const response = await fetch(integration.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `⚠️ *ReachInbox Alert*: Hourly email send limit (${limit}/hr) reached for sender \`${senderEmail}\`. Remaining queued emails have been automatically rescheduled to the next hour window.`,
        }),
      });

      if (!response.ok) {
        if (response.status === 404 || response.status === 410) {
          logger.warn(`Slack incoming webhook expired or revoked for user ${userId}. Disconnecting.`);
          await prisma.slackIntegration.update({
            where: { userId },
            data: { connected: false },
          });
        } else {
          const errText = await response.text();
          logger.warn(`Slack webhook returned status ${response.status}: ${errText}`);
        }
      }
    } catch (error) {
      logger.error({ error }, 'Error delivering Slack rate limit notification');
    }
  }
}
