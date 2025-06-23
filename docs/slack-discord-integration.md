# Slack & Discord Integration

NPMSafe provides comprehensive integrations with Slack and Discord for real-time notifications, security alerts, and team collaboration during the npm publishing process.

## Table of Contents

- [Slack Integration](#slack-integration)
- [Discord Integration](#discord-integration)
- [Setup & Configuration](#setup--configuration)
- [CLI Commands](#cli-commands)
- [API Usage](#api-usage)
- [Examples](#examples)
- [Best Practices](#best-practices)

## Slack Integration

### Features

- **Real-time notifications** for package publishes
- **Security alerts** with severity levels and detailed information
- **Deployment status** updates with logs and error tracking
- **Thread support** for detailed discussions
- **Scheduled messages** for reminders and reports
- **Team member management** and targeted notifications
- **Rich message formatting** with blocks and attachments

### Message Types

#### 1. Publish Notifications
Rich notifications sent when packages are published, including:
- Package name and version
- Author and repository information
- Security scan results (vulnerabilities, secrets)
- Timestamp and metadata

#### 2. Security Alerts
Detailed security alerts with:
- Alert type (secret, vulnerability, license, dependency)
- Severity levels (low, medium, high, critical)
- File locations and line numbers
- Recommendations and remediation steps

#### 3. Deployment Status
Real-time deployment updates with:
- Environment information
- Success/failure status
- Duration and performance metrics
- Recent logs and error details

## Discord Integration

### Features

- **Rich embeds** with color-coded severity levels
- **Interactive buttons** for approval workflows
- **Code block formatting** for logs and configuration
- **Table formatting** for structured data
- **Thread support** for detailed discussions
- **Mention support** for team members
- **Avatar and username customization**

### Message Types

#### 1. Rich Embeds
Discord's native embed system for:
- Color-coded security levels
- Structured field layouts
- Thumbnails and images
- Timestamps and footers

#### 2. Interactive Components
Buttons and action rows for:
- Deployment approvals
- Security review workflows
- Quick actions and links
- Status updates

#### 3. Formatted Content
Special formatting for:
- Code blocks with syntax highlighting
- Tables for scan results
- Structured logs and reports

## Setup & Configuration

### Environment Variables

```bash
# Slack Configuration
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
export SLACK_CHANNEL="#npmsafe-alerts"

# Discord Configuration
export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK"
export DISCORD_USERNAME="NPMSafe Bot"
```

### Configuration File

```json
{
  "integrations": {
    "slack": {
      "webhookUrl": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
      "channel": "#npmsafe-alerts",
      "username": "NPMSafe Bot",
      "iconEmoji": ":shield:"
    },
    "discord": {
      "webhookUrl": "https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK",
      "username": "NPMSafe Bot",
      "avatarUrl": "https://example.com/npmsafe-avatar.png"
    }
  }
}
```

## CLI Commands

### Slack Commands

```bash
# Test Slack connection
npmsafe slack --test --webhook "YOUR_WEBHOOK_URL"

# Send a simple message
npmsafe slack --message "Hello from NPMSafe!" --webhook "YOUR_WEBHOOK_URL"

# Send publish notification
npmsafe slack --publish-notification --webhook "YOUR_WEBHOOK_URL"

# Send security alert
npmsafe slack --security-alert --webhook "YOUR_WEBHOOK_URL"

# Send to specific channel
npmsafe slack --message "Alert!" --webhook "YOUR_WEBHOOK_URL" --channel "#security"
```

### Discord Commands

```bash
# Test Discord connection
npmsafe discord --test --webhook "YOUR_WEBHOOK_URL"

# Send a simple message
npmsafe discord --message "Hello from NPMSafe!" --webhook "YOUR_WEBHOOK_URL"

# Send publish notification
npmsafe discord --publish-notification --webhook "YOUR_WEBHOOK_URL"

# Send security alert
npmsafe discord --security-alert --webhook "YOUR_WEBHOOK_URL"

# Send deployment status
npmsafe discord --deployment-status --webhook "YOUR_WEBHOOK_URL"

# Custom bot username
npmsafe discord --message "Alert!" --webhook "YOUR_WEBHOOK_URL" --username "Security Bot"
```

## API Usage

### Basic Usage

```javascript
import { SlackIntegration, DiscordIntegration } from 'npmsafe';

// Initialize Slack integration
const slack = new SlackIntegration({
  webhookUrl: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
  channel: '#npmsafe-alerts',
  username: 'NPMSafe Bot',
  iconEmoji: ':shield:',
});

// Initialize Discord integration
const discord = new DiscordIntegration({
  webhookUrl: 'https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK',
  username: 'NPMSafe Bot',
  avatarUrl: 'https://example.com/npmsafe-avatar.png',
});
```

### Sending Notifications

```javascript
// Send publish notification
await slack.sendPublishNotification({
  name: 'my-package',
  version: '1.2.3',
  description: 'A secure npm package',
  author: 'Your Name',
  repository: 'https://github.com/yourusername/my-package',
  vulnerabilities: 0,
  secrets: 0,
});

// Send security alert
await discord.sendSecurityAlert({
  type: 'secret',
  severity: 'high',
  title: 'API Key detected in source code',
  description: 'A potential API key was found during the security scan.',
  package: 'my-package',
  details: {
    'File': 'src/config.js',
    'Line': '42',
    'Pattern': 'API_KEY',
    'Recommendation': 'Move to environment variables',
  },
});
```

### Advanced Features

```javascript
// Discord interactive buttons
const approveButton = discord.createButton('Approve', 'approve_deploy', 'success');
const rejectButton = discord.createButton('Reject', 'reject_deploy', 'danger');
const viewDetailsButton = discord.createLinkButton('View Details', 'https://github.com/yourusername/my-package');

await discord.sendInteractiveMessage(
  '🔍 Deployment review required for my-package@1.2.3',
  [approveButton, rejectButton, viewDetailsButton]
);

// Slack threads
const threadTs = await slack.createThread(
  '🚨 Security scan completed for my-package@1.2.3',
  'Detailed scan results and recommendations will be posted here.'
);

if (threadTs) {
  await slack.sendToThread(threadTs, '📊 Scan Summary:\n• Files scanned: 156\n• Secrets found: 0');
}

// Scheduled messages
const reminderTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
await slack.scheduleMessage(
  '⏰ Daily security reminder: Run `npmsafe scan`',
  reminderTime,
  { channel: '#security-reminders' }
);
```

## Examples

### Complete Workflow Integration

```javascript
import { NPMSafe, SlackIntegration, DiscordIntegration } from 'npmsafe';

const npmsafe = new NPMSafe();
const slack = new SlackIntegration({ webhookUrl: 'YOUR_SLACK_WEBHOOK' });
const discord = new DiscordIntegration({ webhookUrl: 'YOUR_DISCORD_WEBHOOK' });

async function publishWithNotifications() {
  // Step 1: Pre-publish scan
  await slack.sendMessage('🔍 Starting pre-publish security scan...');
  const scanResults = await npmsafe.scan();
  
  if (scanResults.length > 0) {
    await slack.sendSecurityAlert({
      type: 'secret',
      severity: 'critical',
      title: 'Secrets detected - Publishing blocked',
      description: 'Secrets were found in the package. Publishing has been blocked.',
      package: 'my-package',
      details: {
        'Files with secrets': scanResults.length.toString(),
        'Action required': 'Remove secrets before publishing',
      },
    });
    return;
  }

  // Step 2: Publish notification
  await Promise.all([
    slack.sendPublishNotification({
      name: 'my-package',
      version: '1.2.3',
      description: 'A secure npm package',
      author: 'Your Name',
      repository: 'https://github.com/yourusername/my-package',
      vulnerabilities: 0,
      secrets: 0,
    }),
    discord.sendPublishNotification({
      name: 'my-package',
      version: '1.2.3',
      description: 'A secure npm package',
      author: 'Your Name',
      repository: 'https://github.com/yourusername/my-package',
      vulnerabilities: 0,
      secrets: 0,
    }),
  ]);

  // Step 3: Post-publish monitoring
  await discord.sendDeploymentStatus({
    environment: 'npm-registry',
    status: 'success',
    package: 'my-package',
    version: '1.2.3',
    duration: 120,
    logs: [
      'Package published to npm registry',
      'CDN propagation started',
      'Health checks completed',
    ],
    errors: [],
  });
}
```

### Team Collaboration

```javascript
// Get team members and send targeted notifications
const teamMembers = await slack.getTeamMembers();
const adminIds = teamMembers
  .filter(member => member.role === 'admin')
  .map(member => member.id);

await slack.sendToMembers(adminIds, '🔐 Security review required for new package deployment');

// Discord team mentions
const memberIds = ['123456789012345678', '987654321098765432'];
await discord.sendToMembers(memberIds, '🔐 Security review required for new package deployment');
```

### CI/CD Integration

```javascript
// GitHub Actions example
const slack = new SlackIntegration({
  webhookUrl: process.env.SLACK_WEBHOOK_URL,
  channel: '#ci-cd',
  username: 'GitHub Actions',
  iconEmoji: ':github:',
});

// Send deployment status
await slack.sendDeploymentStatus({
  environment: process.env.NODE_ENV || 'production',
  status: process.env.DEPLOYMENT_STATUS || 'success',
  package: process.env.PACKAGE_NAME,
  version: process.env.PACKAGE_VERSION,
  duration: parseInt(process.env.DEPLOYMENT_DURATION || '0'),
  logs: process.env.DEPLOYMENT_LOGS?.split('\n') || [],
  errors: process.env.DEPLOYMENT_ERRORS?.split('\n') || [],
});
```

## Best Practices

### 1. Webhook Security
- Use environment variables for webhook URLs
- Rotate webhook URLs regularly
- Use different webhooks for different environments
- Monitor webhook usage and rate limits

### 2. Message Organization
- Use consistent channel naming conventions
- Create dedicated channels for different types of alerts
- Use threads for detailed discussions
- Implement message threading for related notifications

### 3. Team Notifications
- Set up role-based notification channels
- Use mentions sparingly and appropriately
- Create escalation procedures for critical alerts
- Implement approval workflows for sensitive operations

### 4. Error Handling
- Always handle webhook failures gracefully
- Implement retry logic for failed messages
- Log webhook errors for debugging
- Provide fallback notification methods

### 5. Performance
- Batch notifications when possible
- Use async/await for non-blocking operations
- Implement rate limiting to respect API limits
- Cache team member information when appropriate

### 6. Monitoring
- Track webhook delivery success rates
- Monitor message response times
- Set up alerts for webhook failures
- Regular testing of notification channels

## Troubleshooting

### Common Issues

1. **Webhook URL Invalid**
   - Verify the webhook URL is correct
   - Check if the webhook is still active
   - Ensure proper permissions

2. **Rate Limiting**
   - Implement delays between messages
   - Use message batching
   - Monitor rate limit headers

3. **Message Formatting**
   - Check Discord embed limits (25 fields max)
   - Verify Slack block structure
   - Test message formatting in development

4. **Authentication Issues**
   - Verify webhook tokens
   - Check channel permissions
   - Ensure bot has proper access

### Debug Mode

Enable debug logging to troubleshoot issues:

```javascript
import { logger } from 'npmsafe';

logger.setLevel('debug');

const slack = new SlackIntegration({
  webhookUrl: 'YOUR_WEBHOOK_URL',
});

// Debug information will be logged
await slack.testConnection();
```

## Support

For issues and questions:
- Check the [NPMSafe documentation](https://github.com/yourusername/npmsafe)
- Open an issue on GitHub
- Join our Discord community
- Contact the development team

---

*This documentation covers the Slack and Discord integrations for NPMSafe. For more information about other features, see the main [README.md](../README.md).* 