import axios from 'axios';
import { WebhookPayload } from '../types/index.js';
import logger from '../utils/logger.js';

export class WebhookManager {
  private webhooks: string[];

  constructor(webhooks: string[]) {
    this.webhooks = webhooks;
  }

  async sendEvent(event: WebhookPayload) {
    for (const url of this.webhooks) {
      try {
        await axios.post(url, event);
        logger.info(`🔔 Webhook sent to ${url}`);
      } catch (error: any) {
        logger.warn(`⚠️ Failed to send webhook to ${url}: ${error.message}`);
      }
    }
  }
} 