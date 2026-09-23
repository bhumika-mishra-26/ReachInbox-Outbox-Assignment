import { Request, Response } from 'express';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { logger } from '../config/logger';
import { AuthenticatedUser } from '../types';

export class SlackController {
  /**
   * Redirect user to Slack OAuth authorization URL
   */
  public static connect(req: Request, res: Response): void {
    const user = req.user as AuthenticatedUser;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!env.SLACK_CLIENT_ID) {
      res.status(400).json({
        success: false,
        message: 'Slack OAuth is not configured. Please set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET in .env',
      });
      return;
    }

    const params = new URLSearchParams({
      client_id: env.SLACK_CLIENT_ID,
      scope: 'incoming-webhook',
      redirect_uri: env.SLACK_REDIRECT_URI,
      state: user.id, // State carries userId securely
    });

    const slackAuthUrl = `https://slack.com/oauth/v2/authorize?${params.toString()}`;
    res.redirect(slackAuthUrl);
  }

  /**
   * Handle OAuth redirect from Slack
   */
  public static async callback(req: Request, res: Response): Promise<void> {
    const { code, state, error } = req.query;

    if (error) {
      logger.error({ error }, 'Slack OAuth error from callback');
      res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error&message=${encodeURIComponent(String(error))}`);
      return;
    }

    if (!code || !state) {
      res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error&message=Missing_code_or_state`);
      return;
    }

    const userId = state as string;

    try {
      const resp = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: env.SLACK_CLIENT_ID,
          client_secret: env.SLACK_CLIENT_SECRET,
          code: code as string,
          redirect_uri: env.SLACK_REDIRECT_URI,
        }),
      });

      const data = (await resp.json()) as any;

      if (!data.ok) {
        logger.error({ data }, 'Slack OAuth token exchange failed');
        res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error&message=${encodeURIComponent(data.error || 'Token exchange failed')}`);
        return;
      }

      const webhookUrl = data.incoming_webhook?.url;
      const teamId = data.team?.id || '';
      const teamName = data.team?.name || '';
      const channel = data.incoming_webhook?.channel || '';
      const accessToken = data.access_token;

      if (!webhookUrl) {
        res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error&message=No_incoming_webhook_granted`);
        return;
      }

      await prisma.slackIntegration.upsert({
        where: { userId },
        update: {
          webhookUrl,
          accessToken,
          teamId,
          teamName,
          channel,
          connected: true,
        },
        create: {
          userId,
          webhookUrl,
          accessToken,
          teamId,
          teamName,
          channel,
          connected: true,
        },
      });

      logger.info(`Slack integration successfully connected for user ${userId} (Team: ${teamName}, Channel: ${channel})`);

      // Send initial welcome message to verify webhook
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🎉 *ReachInbox Connected!* This Slack channel will now receive real-time alerts whenever an email sender hits their hourly rate limit.`,
        }),
      }).catch((err) => logger.warn({ err }, 'Initial Slack test message failed'));

      res.redirect(`${env.FRONTEND_URL}/dashboard?slack=connected`);
    } catch (err: any) {
      logger.error({ err }, 'Error exchanging Slack OAuth token');
      res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error&message=${encodeURIComponent(err.message)}`);
    }
  }

  /**
   * Get current user's Slack integration status
   */
  public static async getStatus(req: Request, res: Response): Promise<void> {
    const user = req.user as AuthenticatedUser;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const integration = await prisma.slackIntegration.findUnique({
      where: { userId: user.id },
      select: {
        connected: true,
        teamName: true,
        channel: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      connected: !!integration?.connected,
      data: integration,
    });
  }

  /**
   * Disconnect Slack integration
   */
  public static async disconnect(req: Request, res: Response): Promise<void> {
    const user = req.user as AuthenticatedUser;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    await prisma.slackIntegration.updateMany({
      where: { userId: user.id },
      data: { connected: false },
    });

    res.json({ success: true, message: 'Slack disconnected successfully' });
  }

  /**
   * Send test alert to Slack
   */
  public static async testAlert(req: Request, res: Response): Promise<void> {
    const user = req.user as AuthenticatedUser;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const integration = await prisma.slackIntegration.findUnique({
      where: { userId: user.id },
    });

    if (!integration || !integration.connected || !integration.webhookUrl) {
      res.status(400).json({ success: false, message: 'Slack is not connected' });
      return;
    }

    const response = await fetch(integration.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🔔 *ReachInbox Test Alert*: Slack integration is working properly!`,
      }),
    });

    if (response.ok) {
      res.json({ success: true, message: 'Test message sent to Slack!' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to send test message to Slack' });
    }
  }
}
