import { IncomingWebhook } from '@slack/webhook';
import axios from 'axios';
import { config } from '../../config/env.config';
import { Email } from '../../types/email.types';
import { log } from '../../utils/logger';

/**
 * Simple Notification Service - MVP Version
 * Sends Slack and webhook notifications
 */
export class NotificationService {
  private slackWebhook?: IncomingWebhook;
  private externalWebhookUrl?: string;

  constructor() {
    if (config.SLACK_WEBHOOK_URL) {
      this.slackWebhook = new IncomingWebhook(config.SLACK_WEBHOOK_URL);
      log.info('✅ Slack notifications enabled');
    }

    this.externalWebhookUrl = config.EXTERNAL_WEBHOOK_URL;
    if (this.externalWebhookUrl) {
      log.info('✅ External webhook configured');
    }
  }

  /**
   * Notify about interested lead
   */
  async notifyInterestedLead(email: Email): Promise<void> {
    log.info(`📢 Notifying about interested lead: ${email.from.address}`);

    const promises: Promise<void>[] = [];

    if (this.slackWebhook) {
      promises.push(this.sendSlack(email));
    }

    if (this.externalWebhookUrl) {
      promises.push(this.sendWebhook(email));
    }

    try {
      await Promise.all(promises);
      log.notification('Interested lead', true);
    } catch (error) {
      log.error('Notification failed', error);
      log.notification('Interested lead', false);
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlack(email: Email): Promise<void> {
    if (!this.slackWebhook) return;

    await this.slackWebhook.send({
      text: `🎯 *New Interested Lead!*\n\nFrom: ${email.from.address}\nSubject: ${email.subject}\n\n${email.body.substring(0, 200)}...`
    });

    log.debug('Slack sent');
  }

  /**
   * Send external webhook
   */
  private async sendWebhook(email: Email): Promise<void> {
    if (!this.externalWebhookUrl) return;

    await axios.post(this.externalWebhookUrl, {
      event: 'interested_lead',
      email: {
        from: email.from.address,
        subject: email.subject,
        body: email.body.substring(0, 500),
        date: email.date
      }
    }, { timeout: 5000 });

    log.debug('Webhook sent');
  }
}