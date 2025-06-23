#!/usr/bin/env node

/**
 * NPMSafe Slack & Discord Integration Examples
 * 
 * This file demonstrates how to use the Slack and Discord integrations
 * with NPMSafe for notifications and alerts.
 */

import { SlackIntegration } from '../src/integrations/slack.js';
import { DiscordIntegration } from '../src/integrations/discord.js';

// Example 1: Basic Slack Integration
async function slackBasicExample() {
  console.log('🔗 Setting up Slack integration...');
  
  const slack = new SlackIntegration({
    webhookUrl: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
    channel: '#npmsafe-alerts',
    username: 'NPMSafe Bot',
    iconEmoji: ':shield:',
  });

  // Test connection
  const testResult = await slack.testConnection();
  console.log('Slack connection test:', testResult ? '✅ Success' : '❌ Failed');

  // Send a simple message
  await slack.sendMessage('🚀 NPMSafe is now monitoring your npm packages!');

  // Send a publish notification
  await slack.sendPublishNotification({
    name: 'my-awesome-package',
    version: '1.2.3',
    description: 'A secure and awesome npm package',
    author: 'Your Name',
    repository: 'https://github.com/yourusername/my-awesome-package',
    vulnerabilities: 0,
    secrets: 0,
  });

  // Send a security alert
  await slack.sendSecurityAlert({
    type: 'secret',
    severity: 'high',
    title: 'API Key detected in source code',
    description: 'A potential API key was found during the security scan.',
    package: 'my-awesome-package',
    details: {
      'File': 'src/config.js',
      'Line': '42',
      'Pattern': 'API_KEY',
      'Recommendation': 'Move to environment variables',
    },
  });
}

// Example 2: Advanced Slack Integration
async function slackAdvancedExample() {
  console.log('🔗 Setting up advanced Slack integration...');
  
  const slack = new SlackIntegration({
    webhookUrl: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
    channel: '#dev-ops',
    username: 'NPMSafe Security Scanner',
    iconEmoji: ':warning:',
  });

  // Send deployment status
  await slack.sendDeploymentStatus({
    environment: 'production',
    status: 'success',
    package: 'my-awesome-package',
    version: '1.2.3',
    duration: 45,
    logs: [
      'Deployment started at 2024-01-15T10:30:00Z',
      'Security scan completed - 0 vulnerabilities found',
      'Package published successfully',
      'Health checks passed',
    ],
    errors: [],
  });

  // Create a thread for detailed discussion
  const threadTs = await slack.createThread(
    '🚨 Security scan completed for my-awesome-package@1.2.3',
    'Detailed scan results and recommendations will be posted here.'
  );

  if (threadTs) {
    await slack.sendToThread(threadTs, '📊 Scan Summary:\n• Files scanned: 156\n• Secrets found: 0\n• Vulnerabilities: 0\n• Recommendations: 2');
  }

  // Schedule a reminder
  const reminderTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
  await slack.scheduleMessage(
    '⏰ Daily security reminder: Run `npmsafe scan` to check for new vulnerabilities',
    reminderTime,
    { channel: '#security-reminders' }
  );
}

// Example 3: Basic Discord Integration
async function discordBasicExample() {
  console.log('🎮 Setting up Discord integration...');
  
  const discord = new DiscordIntegration({
    webhookUrl: 'https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK',
    username: 'NPMSafe Bot',
    avatarUrl: 'https://example.com/npmsafe-avatar.png',
  });

  // Test connection
  const testResult = await discord.testConnection();
  console.log('Discord connection test:', testResult ? '✅ Success' : '❌ Failed');

  // Send a simple message
  await discord.sendMessage('🚀 NPMSafe is now monitoring your npm packages!');

  // Send a publish notification with rich embed
  await discord.sendPublishNotification({
    name: 'my-awesome-package',
    version: '1.2.3',
    description: 'A secure and awesome npm package with advanced features',
    author: 'Your Name',
    repository: 'https://github.com/yourusername/my-awesome-package',
    vulnerabilities: 0,
    secrets: 0,
  });

  // Send a security alert with colored embed
  await discord.sendSecurityAlert({
    type: 'vulnerability',
    severity: 'medium',
    title: 'Dependency vulnerability detected',
    description: 'A security vulnerability was found in package dependencies.',
    package: 'my-awesome-package',
    details: {
      'Dependency': 'lodash',
      'Version': '4.17.15',
      'CVE': 'CVE-2021-23337',
      'Severity': 'Medium',
      'Recommendation': 'Update to lodash@4.17.21 or later',
    },
  });
}

// Example 4: Advanced Discord Integration
async function discordAdvancedExample() {
  console.log('🎮 Setting up advanced Discord integration...');
  
  const discord = new DiscordIntegration({
    webhookUrl: 'https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK',
    username: 'NPMSafe Security Scanner',
    avatarUrl: 'https://example.com/npmsafe-security-avatar.png',
  });

  // Send deployment status with rich embed
  await discord.sendDeploymentStatus({
    environment: 'staging',
    status: 'pending',
    package: 'my-awesome-package',
    version: '1.2.3',
    duration: 30,
    logs: [
      'Deployment initiated',
      'Security scan in progress...',
      'Dependency audit completed',
    ],
    errors: [],
  });

  // Send interactive message with buttons
  const approveButton = discord.createButton('Approve', 'approve_deploy', 'success');
  const rejectButton = discord.createButton('Reject', 'reject_deploy', 'danger');
  const viewDetailsButton = discord.createLinkButton('View Details', 'https://github.com/yourusername/my-awesome-package');

  await discord.sendInteractiveMessage(
    '🔍 Deployment review required for my-awesome-package@1.2.3\n\nSecurity scan completed with 0 issues found.',
    [approveButton, rejectButton, viewDetailsButton]
  );

  // Send a formatted code block
  await discord.sendCodeBlock(
    `const npmsafe = require('npmsafe');

// Run security scan
const results = await npmsafe.scan({
  patterns: '**/*',
  exclude: 'node_modules/**',
  entropy: 3.5
});

console.log('Scan results:', results);`,
    'javascript'
  );

  // Send a table of scan results
  const headers = ['File', 'Issues', 'Severity', 'Status'];
  const rows = [
    ['src/config.js', '0', 'None', '✅ Clean'],
    ['src/utils.js', '1', 'Low', '⚠️ Warning'],
    ['package.json', '0', 'None', '✅ Clean'],
  ];

  await discord.sendTable(headers, rows);
}

// Example 5: Integration with NPMSafe workflow
async function npmsafeWorkflowExample() {
  console.log('🔄 Setting up NPMSafe workflow integration...');
  
  const slack = new SlackIntegration({
    webhookUrl: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
    channel: '#npmsafe-workflow',
    username: 'NPMSafe Workflow',
    iconEmoji: ':gear:',
  });

  const discord = new DiscordIntegration({
    webhookUrl: 'https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK',
    username: 'NPMSafe Workflow',
    avatarUrl: 'https://example.com/npmsafe-workflow-avatar.png',
  });

  // Simulate a complete NPMSafe workflow
  const packageInfo = {
    name: 'my-awesome-package',
    version: '1.2.3',
    description: 'A secure npm package with comprehensive testing',
    author: 'Your Name',
    repository: 'https://github.com/yourusername/my-awesome-package',
  };

  // Step 1: Pre-publish scan
  console.log('🔍 Step 1: Running pre-publish security scan...');
  await slack.sendMessage('🔍 Starting pre-publish security scan for my-awesome-package@1.2.3');
  
  // Simulate scan results
  const scanResults = {
    filesScanned: 156,
    secretsFound: 0,
    vulnerabilities: 0,
    warnings: 2,
  };

  if (scanResults.secretsFound > 0) {
    await slack.sendSecurityAlert({
      type: 'secret',
      severity: 'critical',
      title: 'Secrets detected - Publishing blocked',
      description: 'Secrets were found in the package. Publishing has been blocked.',
      package: packageInfo.name,
      details: {
        'Files with secrets': scanResults.secretsFound.toString(),
        'Action required': 'Remove secrets before publishing',
      },
    });
    return;
  }

  // Step 2: Version analysis
  console.log('🔢 Step 2: Analyzing version bump...');
  await discord.sendMessage('🔢 Analyzing version bump for my-awesome-package@1.2.3');
  
  // Step 3: Git status check
  console.log('📝 Step 3: Checking Git status...');
  await slack.sendMessage('📝 Checking Git status and CI/CD pipeline...');

  // Step 4: Publish notification
  console.log('📦 Step 4: Publishing package...');
  await Promise.all([
    slack.sendPublishNotification({
      ...packageInfo,
      vulnerabilities: scanResults.vulnerabilities,
      secrets: scanResults.secretsFound,
    }),
    discord.sendPublishNotification({
      ...packageInfo,
      vulnerabilities: scanResults.vulnerabilities,
      secrets: scanResults.secretsFound,
    }),
  ]);

  // Step 5: Post-publish monitoring
  console.log('🚀 Step 5: Setting up post-publish monitoring...');
  await discord.sendDeploymentStatus({
    environment: 'npm-registry',
    status: 'success',
    package: packageInfo.name,
    version: packageInfo.version,
    duration: 120,
    logs: [
      'Package published to npm registry',
      'CDN propagation started',
      'Health checks completed',
      'Monitoring enabled',
    ],
    errors: [],
  });

  console.log('✅ NPMSafe workflow completed successfully!');
}

// Example 6: Team collaboration
async function teamCollaborationExample() {
  console.log('👥 Setting up team collaboration...');
  
  const slack = new SlackIntegration({
    webhookUrl: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
    channel: '#team-security',
    username: 'NPMSafe Team Bot',
    iconEmoji: ':team:',
  });

  // Get team members (simulated)
  const teamMembers = await slack.getTeamMembers();
  console.log('Team members:', teamMembers);

  // Send notification to specific team members
  const adminIds = teamMembers.filter(member => member.role === 'admin').map(member => member.id);
  await slack.sendToMembers(adminIds, '🔐 Security review required for new package deployment');

  // Send to Discord team channel
  const discord = new DiscordIntegration({
    webhookUrl: 'https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK',
    username: 'NPMSafe Team Bot',
  });

  const memberIds = ['123456789012345678', '987654321098765432'];
  await discord.sendToMembers(memberIds, '🔐 Security review required for new package deployment');
}

// Main execution
async function main() {
  console.log('🚀 NPMSafe Slack & Discord Integration Examples\n');

  try {
    // Uncomment the examples you want to run
    
    // await slackBasicExample();
    // await slackAdvancedExample();
    // await discordBasicExample();
    // await discordAdvancedExample();
    // await npmsafeWorkflowExample();
    // await teamCollaborationExample();

    console.log('\n📚 Examples completed! Check your Slack and Discord channels for the messages.');
    console.log('\n💡 To use these integrations:');
    console.log('1. Set up webhook URLs in your environment variables');
    console.log('2. Configure your NPMSafe config file');
    console.log('3. Integrate with your CI/CD pipeline');
    console.log('4. Set up automated notifications for your team');

  } catch (error) {
    console.error('❌ Error running examples:', error);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  slackBasicExample,
  slackAdvancedExample,
  discordBasicExample,
  discordAdvancedExample,
  npmsafeWorkflowExample,
  teamCollaborationExample,
}; 