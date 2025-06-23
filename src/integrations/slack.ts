import { NPMSafeLogger } from '../utils/logger';

export interface SlackConfig {
  webhookUrl: string;
  channel?: string;
  username?: string;
  iconEmoji?: string;
  iconUrl?: string;
  threadTs?: string;
}

export interface SlackMessage {
  text: string;
  blocks?: any[];
  attachments?: any[];
  threadTs?: string;
}

export interface SlackTeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'guest';
}

export class SlackIntegration {
  private config: SlackConfig;
  private logger: NPMSafeLogger;

  constructor(config: SlackConfig) {
    this.config = config;
    this.logger = new NPMSafeLogger();
  }

  /**
   * Send a simple text message to Slack
   */
  async sendMessage(message: string, options?: Partial<SlackConfig>): Promise<boolean> {
    try {
      const payload = {
        text: message,
        channel: options?.channel || this.config.channel,
        username: options?.username || this.config.username,
        icon_emoji: options?.iconEmoji || this.config.iconEmoji,
        icon_url: options?.iconUrl || this.config.iconUrl,
        thread_ts: options?.threadTs || this.config.threadTs,
      };

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
      }

      this.logger.info('Message sent to Slack successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to send message to Slack:', error);
      return false;
    }
  }

  /**
   * Send a rich message with blocks and attachments
   */
  async sendRichMessage(message: SlackMessage, options?: Partial<SlackConfig>): Promise<boolean> {
    try {
      const payload = {
        ...message,
        channel: options?.channel || this.config.channel,
        username: options?.username || this.config.username,
        icon_emoji: options?.iconEmoji || this.config.iconEmoji,
        icon_url: options?.iconUrl || this.config.iconUrl,
        thread_ts: options?.threadTs || this.config.threadTs,
      };

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
      }

      this.logger.info('Rich message sent to Slack successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to send rich message to Slack:', error);
      return false;
    }
  }

  /**
   * Send a publish notification with package details
   */
  async sendPublishNotification(packageInfo: {
    name: string;
    version: string;
    description?: string;
    author?: string;
    repository?: string;
    vulnerabilities?: number;
    secrets?: number;
  }): Promise<boolean> {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `📦 Package Published: ${packageInfo.name}@${packageInfo.version}`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Package:*\n${packageInfo.name}`,
          },
          {
            type: 'mrkdwn',
            text: `*Version:*\n${packageInfo.version}`,
          },
          {
            type: 'mrkdwn',
            text: `*Author:*\n${packageInfo.author || 'Unknown'}`,
          },
          {
            type: 'mrkdwn',
            text: `*Repository:*\n${packageInfo.repository || 'N/A'}`,
          },
        ],
      },
    ];

    if (packageInfo.description) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Description:*\n${packageInfo.description}`,
        },
      });
    }

    if (packageInfo.vulnerabilities !== undefined || packageInfo.secrets !== undefined) {
      const securityFields = [];
      
      if (packageInfo.vulnerabilities !== undefined) {
        securityFields.push({
          type: 'mrkdwn',
          text: `*Vulnerabilities:*\n${packageInfo.vulnerabilities === 0 ? '✅ None' : `⚠️ ${packageInfo.vulnerabilities} found`}`,
        });
      }
      
      if (packageInfo.secrets !== undefined) {
        securityFields.push({
          type: 'mrkdwn',
          text: `*Secrets:*\n${packageInfo.secrets === 0 ? '✅ None' : `🚨 ${packageInfo.secrets} found`}`,
        });
      }

      blocks.push({
        type: 'section',
        fields: securityFields,
      });
    }

    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: 'Published via NPMSafe 🛡️',
        },
      ],
    } as any);

    return this.sendRichMessage({
      text: `Package ${packageInfo.name}@${packageInfo.version} has been published successfully!`,
      blocks,
    });
  }

  /**
   * Send a security alert notification
   */
  async sendSecurityAlert(alert: {
    type: 'vulnerability' | 'secret' | 'license' | 'dependency';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    package?: string;
    details?: Record<string, any>;
  }): Promise<boolean> {
    const severityEmoji = {
      low: '🟡',
      medium: '🟠',
      high: '🔴',
      critical: '🚨',
    };

    const typeEmoji = {
      vulnerability: '🔒',
      secret: '🔐',
      license: '📄',
      dependency: '📦',
    };

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${severityEmoji[alert.severity]} Security Alert: ${alert.title}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: alert.description,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Type:*\n${typeEmoji[alert.type]} ${alert.type}`,
          },
          {
            type: 'mrkdwn',
            text: `*Severity:*\n${severityEmoji[alert.severity]} ${alert.severity}`,
          },
          ...(alert.package ? [{
            type: 'mrkdwn',
            text: `*Package:*\n${alert.package}`,
          }] : []),
        ],
      },
    ];

    if (alert.details && Object.keys(alert.details).length > 0) {
      const detailsText = Object.entries(alert.details)
        .map(([key, value]) => `• *${key}:* ${value}`)
        .join('\n');

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Details:*\n${detailsText}`,
        },
      });
    }

    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: 'Alert generated by NPMSafe Security Scanner 🛡️',
        },
      ],
    } as any);

    return this.sendRichMessage({
      text: `Security Alert: ${alert.title}`,
      blocks,
    });
  }

  /**
   * Send a deployment status notification
   */
  async sendDeploymentStatus(status: {
    environment: string;
    status: 'success' | 'failure' | 'pending';
    package: string;
    version: string;
    duration?: number;
    logs?: string[];
    errors?: string[];
  }): Promise<boolean> {
    const statusEmoji = {
      success: '✅',
      failure: '❌',
      pending: '⏳',
    };

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${statusEmoji[status.status]} Deployment ${status.status.toUpperCase()}: ${status.package}@${status.version}`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Environment:*\n${status.environment}`,
          },
          {
            type: 'mrkdwn',
            text: `*Package:*\n${status.package}@${status.version}`,
          },
          {
            type: 'mrkdwn',
            text: `*Status:*\n${statusEmoji[status.status]} ${status.status}`,
          },
          ...(status.duration ? [{
            type: 'mrkdwn',
            text: `*Duration:*\n${status.duration}s`,
          }] : []),
        ],
      },
    ];

    if (status.errors && status.errors.length > 0) {
      const errorText = status.errors.slice(0, 3).join('\n');
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Errors:*\n${errorText}${status.errors.length > 3 ? '\n...' : ''}`,
        },
      });
    }

    if (status.logs && status.logs.length > 0) {
      const logText = status.logs.slice(-3).join('\n');
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Recent Logs:*\n${logText}`,
        },
      });
    }

    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: 'Deployment monitored by NPMSafe 🚀',
        },
      ],
    } as any);

    return this.sendRichMessage({
      text: `Deployment ${status.status}: ${status.package}@${status.version} to ${status.environment}`,
      blocks,
    });
  }

  /**
   * Create a thread and send a message to it
   */
  async createThread(parentMessage: string, threadMessage: string): Promise<string | null> {
    try {
      const parentResponse = await this.sendMessage(parentMessage);
      if (!parentResponse) return null;

      // Note: In a real implementation, you'd need to capture the ts from the parent message
      // This is a simplified version
      const threadResponse = await this.sendMessage(threadMessage, {
        threadTs: 'parent_ts_here', // This would be the actual ts from the parent message
      });

      return threadResponse ? 'thread_ts_here' : null;
    } catch (error) {
      this.logger.error('Failed to create thread:', error);
      return null;
    }
  }

  /**
   * Send a message to an existing thread
   */
  async sendToThread(threadTs: string, message: string): Promise<boolean> {
    return this.sendMessage(message, { threadTs });
  }

  /**
   * Send a scheduled message (simulated)
   */
  async scheduleMessage(message: string, scheduleTime: Date, options?: Partial<SlackConfig>): Promise<string | null> {
    try {
      // In a real implementation, you'd use Slack's scheduled messages API
      // This is a simplified simulation
      const delay = scheduleTime.getTime() - Date.now();
      
      if (delay > 0) {
        setTimeout(async () => {
          await this.sendMessage(message, options);
        }, delay);
      } else {
        await this.sendMessage(message, options);
      }

      this.logger.info(`Message scheduled for ${scheduleTime.toISOString()}`);
      return 'scheduled_message_id';
    } catch (error) {
      this.logger.error('Failed to schedule message:', error);
      return null;
    }
  }

  /**
   * Get team members (simulated - would require Slack API token)
   */
  async getTeamMembers(): Promise<SlackTeamMember[]> {
    // This would require a Slack API token and proper API calls
    // For now, return a simulated response
    return [
      {
        id: 'U1234567890',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
      },
      {
        id: 'U0987654321',
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'member',
      },
    ];
  }

  /**
   * Send a message to specific team members
   */
  async sendToMembers(memberIds: string[], message: string): Promise<boolean> {
    try {
      // In a real implementation, you'd use Slack's chat.postMessage API
      // This is a simplified version that sends to the main channel
      return this.sendMessage(`@${memberIds.join(' @')} ${message}`);
    } catch (error) {
      this.logger.error('Failed to send message to members:', error);
      return false;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SlackConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Slack configuration updated');
  }

  /**
   * Test the Slack integration
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.sendMessage('🧪 NPMSafe Slack integration test message');
      this.logger.info('Slack integration test successful');
      return result;
    } catch (error) {
      this.logger.error('Slack integration test failed:', error);
      return false;
    }
  }
} 