import { NPMSafeLogger } from '../utils/logger';

export interface DiscordConfig {
  webhookUrl: string;
  username?: string;
  avatarUrl?: string;
  threadId?: string;
}

export interface DiscordMessage {
  content?: string;
  embeds?: DiscordEmbed[];
  components?: DiscordComponent[];
  threadId?: string;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: DiscordField[];
  footer?: DiscordFooter;
  timestamp?: string;
  thumbnail?: DiscordThumbnail;
  image?: DiscordImage;
  author?: DiscordAuthor;
}

export interface DiscordField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordFooter {
  text: string;
  iconUrl?: string;
}

export interface DiscordThumbnail {
  url: string;
}

export interface DiscordImage {
  url: string;
}

export interface DiscordAuthor {
  name: string;
  url?: string;
  iconUrl?: string;
}

export interface DiscordComponent {
  type: number;
  components?: DiscordComponent[];
  style: number;
  label?: string;
  customId?: string;
  url?: string;
  disabled?: boolean;
}

export interface DiscordTeamMember {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  roles: string[];
}

export class DiscordIntegration {
  private config: DiscordConfig;
  private logger: NPMSafeLogger;

  constructor(config: DiscordConfig) {
    this.config = config;
    this.logger = new NPMSafeLogger();
  }

  /**
   * Send a simple text message to Discord
   */
  async sendMessage(content: string, options?: Partial<DiscordConfig>): Promise<boolean> {
    try {
      const payload = {
        content,
        username: options?.username || this.config.username,
        avatar_url: options?.avatarUrl || this.config.avatarUrl,
        thread_id: options?.threadId || this.config.threadId,
      };

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
      }

      this.logger.info('Message sent to Discord successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to send message to Discord:', error);
      return false;
    }
  }

  /**
   * Send a rich message with embeds and components
   */
  async sendRichMessage(message: DiscordMessage, options?: Partial<DiscordConfig>): Promise<boolean> {
    try {
      const payload = {
        ...message,
        username: options?.username || this.config.username,
        avatar_url: options?.avatarUrl || this.config.avatarUrl,
        thread_id: options?.threadId || this.config.threadId,
      };

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
      }

      this.logger.info('Rich message sent to Discord successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to send rich message to Discord:', error);
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
    const embed: DiscordEmbed = {
      title: `📦 Package Published: ${packageInfo.name}@${packageInfo.version}`,
      color: 0x00ff00, // Green
      fields: [
        {
          name: 'Package',
          value: packageInfo.name,
          inline: true,
        },
        {
          name: 'Version',
          value: packageInfo.version,
          inline: true,
        },
        {
          name: 'Author',
          value: packageInfo.author || 'Unknown',
          inline: true,
        },
        {
          name: 'Repository',
          value: packageInfo.repository || 'N/A',
          inline: true,
        },
      ],
      footer: {
        text: 'Published via NPMSafe 🛡️',
      },
      timestamp: new Date().toISOString(),
    };

    if (packageInfo.description) {
      embed.description = packageInfo.description;
    }

    if (packageInfo.vulnerabilities !== undefined || packageInfo.secrets !== undefined) {
      const securityFields = [];
      
      if (packageInfo.vulnerabilities !== undefined) {
        securityFields.push({
          name: 'Vulnerabilities',
          value: packageInfo.vulnerabilities === 0 ? '✅ None' : `⚠️ ${packageInfo.vulnerabilities} found`,
          inline: true,
        });
      }
      
      if (packageInfo.secrets !== undefined) {
        securityFields.push({
          name: 'Secrets',
          value: packageInfo.secrets === 0 ? '✅ None' : `🚨 ${packageInfo.secrets} found`,
          inline: true,
        });
      }

      embed.fields = [...(embed.fields || []), ...securityFields];
    }

    return this.sendRichMessage({
      content: `Package **${packageInfo.name}@${packageInfo.version}** has been published successfully!`,
      embeds: [embed],
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
    const severityColors = {
      low: 0xffff00,    // Yellow
      medium: 0xffa500,  // Orange
      high: 0xff0000,    // Red
      critical: 0x8b0000, // Dark Red
    };

    const typeEmojis = {
      vulnerability: '🔒',
      secret: '🔐',
      license: '📄',
      dependency: '📦',
    };

    const severityEmojis = {
      low: '🟡',
      medium: '🟠',
      high: '🔴',
      critical: '🚨',
    };

    const embed: DiscordEmbed = {
      title: `${severityEmojis[alert.severity]} Security Alert: ${alert.title}`,
      description: alert.description,
      color: severityColors[alert.severity],
      fields: [
        {
          name: 'Type',
          value: `${typeEmojis[alert.type]} ${alert.type}`,
          inline: true,
        },
        {
          name: 'Severity',
          value: `${severityEmojis[alert.severity]} ${alert.severity}`,
          inline: true,
        },
        ...(alert.package ? [{
          name: 'Package',
          value: alert.package,
          inline: true,
        }] : []),
      ],
      footer: {
        text: 'Alert generated by NPMSafe Security Scanner 🛡️',
      },
      timestamp: new Date().toISOString(),
    };

    if (alert.details && Object.keys(alert.details).length > 0) {
      const detailsText = Object.entries(alert.details)
        .map(([key, value]) => `• **${key}:** ${value}`)
        .join('\n');

      embed.fields = [...(embed.fields || []), {
        name: 'Details',
        value: detailsText,
        inline: false,
      }];
    }

    return this.sendRichMessage({
      content: `🚨 **Security Alert:** ${alert.title}`,
      embeds: [embed],
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
    const statusColors = {
      success: 0x00ff00,  // Green
      failure: 0xff0000,  // Red
      pending: 0xffff00,  // Yellow
    };

    const statusEmojis = {
      success: '✅',
      failure: '❌',
      pending: '⏳',
    };

    const embed: DiscordEmbed = {
      title: `${statusEmojis[status.status]} Deployment ${status.status.toUpperCase()}: ${status.package}@${status.version}`,
      color: statusColors[status.status],
      fields: [
        {
          name: 'Environment',
          value: status.environment,
          inline: true,
        },
        {
          name: 'Package',
          value: `${status.package}@${status.version}`,
          inline: true,
        },
        {
          name: 'Status',
          value: `${statusEmojis[status.status]} ${status.status}`,
          inline: true,
        },
        ...(status.duration ? [{
          name: 'Duration',
          value: `${status.duration}s`,
          inline: true,
        }] : []),
      ],
      footer: {
        text: 'Deployment monitored by NPMSafe 🚀',
      },
      timestamp: new Date().toISOString(),
    };

    if (status.errors && status.errors.length > 0) {
      const errorText = status.errors.slice(0, 3).join('\n');
      embed.fields = [...(embed.fields || []), {
        name: 'Errors',
        value: `${errorText}${status.errors.length > 3 ? '\n...' : ''}`,
        inline: false,
      }];
    }

    if (status.logs && status.logs.length > 0) {
      const logText = status.logs.slice(-3).join('\n');
      embed.fields = [...(embed.fields || []), {
        name: 'Recent Logs',
        value: logText,
        inline: false,
      }];
    }

    return this.sendRichMessage({
      content: `🚀 **Deployment ${status.status}:** ${status.package}@${status.version} to ${status.environment}`,
      embeds: [embed],
    });
  }

  /**
   * Send a message to a specific thread
   */
  async sendToThread(threadId: string, content: string): Promise<boolean> {
    return this.sendMessage(content, { threadId });
  }

  /**
   * Create a button component
   */
  createButton(label: string, customId: string, style: 'primary' | 'secondary' | 'success' | 'danger' = 'primary', disabled = false): DiscordComponent {
    const styleMap = {
      primary: 1,
      secondary: 2,
      success: 3,
      danger: 4,
    };

    return {
      type: 2, // Button component
      style: styleMap[style],
      label,
      customId,
      disabled,
    };
  }

  /**
   * Create a link button component
   */
  createLinkButton(label: string, url: string, disabled = false): DiscordComponent {
    return {
      type: 2, // Button component
      style: 5, // Link style
      label,
      url,
      disabled,
    };
  }

  /**
   * Send a message with interactive buttons
   */
  async sendInteractiveMessage(content: string, buttons: DiscordComponent[], options?: Partial<DiscordConfig>): Promise<boolean> {
    const component: DiscordComponent = {
      type: 1, // Action row
      style: 0, // Default style for action row
      components: buttons,
    };

    return this.sendRichMessage({
      content,
      components: [component],
    }, options);
  }

  /**
   * Send a scheduled message (simulated)
   */
  async scheduleMessage(content: string, scheduleTime: Date, options?: Partial<DiscordConfig>): Promise<string | null> {
    try {
      // In a real implementation, you'd use Discord's scheduled messages API
      // This is a simplified simulation
      const delay = scheduleTime.getTime() - Date.now();
      
      if (delay > 0) {
        setTimeout(async () => {
          await this.sendMessage(content, options);
        }, delay);
      } else {
        await this.sendMessage(content, options);
      }

      this.logger.info(`Message scheduled for ${scheduleTime.toISOString()}`);
      return 'scheduled_message_id';
    } catch (error) {
      this.logger.error('Failed to schedule message:', error);
      return null;
    }
  }

  /**
   * Get team members (simulated - would require Discord API token)
   */
  async getTeamMembers(): Promise<DiscordTeamMember[]> {
    // This would require a Discord API token and proper API calls
    // For now, return a simulated response
    return [
      {
        id: '123456789012345678',
        username: 'JohnDoe',
        discriminator: '1234',
        avatar: 'https://example.com/avatar1.png',
        roles: ['admin', 'developer'],
      },
      {
        id: '987654321098765432',
        username: 'JaneSmith',
        discriminator: '5678',
        avatar: 'https://example.com/avatar2.png',
        roles: ['developer'],
      },
    ];
  }

  /**
   * Send a message mentioning specific team members
   */
  async sendToMembers(memberIds: string[], content: string): Promise<boolean> {
    try {
      const mentions = memberIds.map(id => `<@${id}>`).join(' ');
      return this.sendMessage(`${mentions} ${content}`);
    } catch (error) {
      this.logger.error('Failed to send message to members:', error);
      return false;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<DiscordConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Discord configuration updated');
  }

  /**
   * Test the Discord integration
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.sendMessage('🧪 NPMSafe Discord integration test message');
      this.logger.info('Discord integration test successful');
      return result;
    } catch (error) {
      this.logger.error('Discord integration test failed:', error);
      return false;
    }
  }

  /**
   * Send a formatted code block
   */
  async sendCodeBlock(code: string, language = 'javascript', options?: Partial<DiscordConfig>): Promise<boolean> {
    const formattedCode = `\`\`\`${language}\n${code}\n\`\`\``;
    return this.sendMessage(formattedCode, options);
  }

  /**
   * Send a table as a formatted message
   */
  async sendTable(headers: string[], rows: string[][], options?: Partial<DiscordConfig>): Promise<boolean> {
    const maxWidths = headers.map((header, i) => {
      const columnValues = [header, ...rows.map(row => row[i] || '')];
      return Math.max(...columnValues.map(val => val.length));
    });

    const headerRow = headers.map((header, i) => 
      header.padEnd(maxWidths[i] || 0)
    ).join(' | ');

    const separator = headers.map((_, i) => 
      '-'.repeat(maxWidths[i] || 0)
    ).join(' | ');

    const dataRows = rows.map(row => 
      row.map((cell, i) => 
        (cell || '').padEnd(maxWidths[i] || 0)
      ).join(' | ')
    );

    const table = [headerRow, separator, ...dataRows].join('\n');
    return this.sendCodeBlock(table, 'text', options);
  }
} 