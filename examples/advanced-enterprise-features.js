#!/usr/bin/env node

/**
 * NPMSafe Advanced Enterprise Features Example
 * 
 * This file demonstrates the advanced enterprise features of NPMSafe including:
 * - Web Dashboard Server with real-time monitoring
 * - Advanced monitoring system with metrics and alerts
 * - Deployment management with CI/CD integration
 * - Advanced testing framework with multiple strategies
 * - Comprehensive security workflows
 * - Real-time notifications and analytics
 */

import { 
  NPMSafe, 
  DashboardServer,
  AdvancedMonitor,
  DeploymentManager,
  AdvancedTesting,
  LicenseChecker, 
  DependencyAuditor, 
  SecretDiffAuditor,
  LinearIntegration,
  SlackIntegration,
  DiscordIntegration 
} from '../src/index.js';

// Example 1: Web Dashboard Server
async function dashboardServerExample() {
  console.log('🌐 Setting up web dashboard server...');
  
  const dashboard = new DashboardServer({
    port: 3000,
    host: 'localhost',
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    auth: {
      enabled: true,
      users: [
        {
          username: 'admin',
          password: 'admin123',
          role: 'admin'
        },
        {
          username: 'developer',
          password: 'dev123',
          role: 'user'
        }
      ]
    },
    features: {
      realTimeMonitoring: true,
      analytics: true,
      integrations: true,
      securityAudit: true,
      deploymentManagement: true
    }
  });

  try {
    await dashboard.start();
    console.log('✅ Dashboard server started successfully');
    console.log('📊 Access dashboard at: http://localhost:3000');
    console.log('🔐 Login with: admin/admin123 or developer/dev123');
    
    // Get dashboard stats
    const stats = await dashboard.getStats();
    console.log('📈 Dashboard Stats:', stats);
    
    return dashboard;
  } catch (error) {
    console.error('❌ Failed to start dashboard server:', error);
    throw error;
  }
}

// Example 2: Advanced Monitoring System
async function advancedMonitoringExample() {
  console.log('📊 Setting up advanced monitoring system...');
  
  const monitor = new AdvancedMonitor({
    enabled: true,
    interval: 30000, // 30 seconds
    metrics: {
      cpu: true,
      memory: true,
      disk: true,
      network: true,
      process: true,
      custom: true
    },
    alerts: {
      enabled: true,
      thresholds: {
        cpu: 80,
        memory: 85,
        disk: 90,
        responseTime: 5000
      },
      channels: ['slack', 'discord', 'webhook']
    },
    storage: {
      type: 'memory',
      retention: 30,
      maxDataPoints: 10000
    },
    integrations: {
      slack: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL || 'your-slack-webhook',
        channel: '#alerts'
      },
      discord: {
        webhookUrl: process.env.DISCORD_WEBHOOK_URL || 'your-discord-webhook',
        channel: '#monitoring'
      }
    }
  });

  // Set up event listeners
  monitor.on('metrics-collected', (metrics) => {
    console.log(`📊 Collected ${metrics.length} metrics`);
  });

  monitor.on('alert-created', (alert) => {
    console.log(`🚨 Alert created: ${alert.message}`);
  });

  monitor.on('started', () => {
    console.log('✅ Monitoring system started');
  });

  try {
    await monitor.start();
    console.log('✅ Advanced monitoring system started successfully');
    
    // Add custom metrics
    await monitor.addCustomMetric('api_requests', 150, 'requests/min', { endpoint: '/api/users' });
    await monitor.addCustomMetric('database_connections', 25, 'connections', { database: 'postgres' });
    
    // Get monitoring stats
    const stats = monitor.getStats();
    console.log('📈 Monitoring Stats:', stats);
    
    return monitor;
  } catch (error) {
    console.error('❌ Failed to start monitoring system:', error);
    throw error;
  }
}

// Example 3: Deployment Management System
async function deploymentManagementExample() {
  console.log('🚀 Setting up deployment management system...');
  
  const deploymentManager = new DeploymentManager({
    environments: [
      {
        name: 'development',
        type: 'development',
        url: 'http://dev.example.com',
        config: {},
        secrets: {},
        deploymentStrategy: 'recreate',
        autoApprove: true,
        requiredApprovers: []
      },
      {
        name: 'staging',
        type: 'staging',
        url: 'http://staging.example.com',
        config: {},
        secrets: {},
        deploymentStrategy: 'blue-green',
        autoApprove: false,
        requiredApprovers: ['dev-lead']
      },
      {
        name: 'production',
        type: 'production',
        url: 'http://prod.example.com',
        config: {},
        secrets: {},
        deploymentStrategy: 'canary',
        autoApprove: false,
        requiredApprovers: ['dev-lead', 'ops-lead']
      }
    ],
    strategies: [
      {
        name: 'recreate',
        type: 'recreate',
        config: {}
      },
      {
        name: 'rolling',
        type: 'rolling',
        config: {
          maxUnavailable: 1,
          maxSurge: 1
        }
      },
      {
        name: 'blue-green',
        type: 'blue-green',
        config: {
          healthCheckPath: '/health',
          healthCheckTimeout: 30
        }
      },
      {
        name: 'canary',
        type: 'canary',
        config: {
          canaryPercentage: 10,
          healthCheckPath: '/health',
          healthCheckTimeout: 30
        }
      }
    ],
    rollback: {
      enabled: true,
      automatic: false,
      maxRollbacks: 5
    },
    notifications: {
      slack: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL || 'your-slack-webhook',
        channel: '#deployments'
      },
      discord: {
        webhookUrl: process.env.DISCORD_WEBHOOK_URL || 'your-discord-webhook',
        channel: '#deployments'
      },
      linear: {
        apiKey: process.env.LINEAR_API_KEY || 'your-linear-api-key',
        teamId: process.env.LINEAR_TEAM_ID || 'your-team-id'
      }
    },
    monitoring: {
      healthChecks: true,
      performanceMonitoring: true,
      errorTracking: true
    }
  });

  // Set up event listeners
  deploymentManager.on('deployment-created', (deployment) => {
    console.log(`🚀 Deployment created: ${deployment.name} v${deployment.version}`);
  });

  deploymentManager.on('deployment-completed', (deployment) => {
    console.log(`✅ Deployment completed: ${deployment.name} v${deployment.version}`);
  });

  deploymentManager.on('deployment-failed', ({ deployment, error }) => {
    console.log(`❌ Deployment failed: ${deployment.name} v${deployment.version} - ${error.message}`);
  });

  try {
    // Create a deployment
    const deployment = await deploymentManager.createDeployment({
      name: 'my-awesome-app',
      version: '2.1.0',
      environment: 'staging',
      strategy: 'blue-green',
      metadata: {
        commitHash: 'abc123',
        branch: 'feature/new-feature',
        author: 'john.doe@example.com',
        changelog: 'Added new user authentication features'
      }
    });

    console.log('✅ Deployment created successfully');
    console.log(`📋 Deployment ID: ${deployment.id}`);
    console.log(`🔍 Status: ${deployment.status}`);

    // Approve deployment (simulate)
    if (deployment.status === 'pending') {
      await deploymentManager.approveDeployment(deployment.id, 'dev-lead', 'Looks good to me!');
      console.log('✅ Deployment approved');
    }

    // Get deployment history
    const deployments = await deploymentManager.getDeployments({ limit: 10 });
    console.log(`📊 Total deployments: ${deployments.length}`);

    return deploymentManager;
  } catch (error) {
    console.error('❌ Deployment management error:', error);
    throw error;
  }
}

// Example 4: Advanced Testing Framework
async function advancedTestingExample() {
  console.log('🧪 Setting up advanced testing framework...');
  
  const testing = new AdvancedTesting({
    frameworks: [
      {
        name: 'jest',
        type: 'unit',
        command: 'npx',
        args: ['jest', '--coverage', '--json'],
        configFile: 'jest.config.js',
        coverage: true,
        parallel: true
      },
      {
        name: 'cypress',
        type: 'e2e',
        command: 'npx',
        args: ['cypress', 'run', '--reporter', 'json'],
        coverage: false,
        parallel: true
      },
      {
        name: 'playwright',
        type: 'e2e',
        command: 'npx',
        args: ['playwright', 'test', '--reporter=json'],
        coverage: false,
        parallel: true
      },
      {
        name: 'artillery',
        type: 'performance',
        command: 'npx',
        args: ['artillery', 'run', '--output', 'results.json'],
        coverage: false,
        parallel: false
      }
    ],
    parallel: {
      enabled: true,
      maxWorkers: 4
    },
    reporting: {
      enabled: true,
      formats: ['json', 'html', 'junit'],
      outputDir: './test-results'
    },
    coverage: {
      enabled: true,
      threshold: 80,
      exclude: ['node_modules/**', 'coverage/**']
    },
    notifications: {
      slack: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL || 'your-slack-webhook',
        channel: '#testing'
      },
      discord: {
        webhookUrl: process.env.DISCORD_WEBHOOK_URL || 'your-discord-webhook',
        channel: '#testing'
      }
    },
    environments: [
      {
        name: 'local',
        type: 'local',
        config: {}
      },
      {
        name: 'docker',
        type: 'docker',
        config: {
          image: 'node:18',
          volumes: ['./:/app'],
          workingDir: '/app'
        }
      }
    ],
    timeouts: {
      unit: 30000,
      integration: 60000,
      e2e: 300000,
      performance: 600000
    }
  });

  // Set up event listeners
  testing.on('test-execution-started', ({ reportId, suites }) => {
    console.log(`🧪 Test execution started: ${reportId}`);
    console.log(`📋 Test suites: ${suites.length}`);
  });

  testing.on('test-execution-completed', (report) => {
    console.log(`✅ Test execution completed: ${report.summary.passedTests}/${report.summary.totalTests} passed`);
  });

  testing.on('suite-started', (suite) => {
    console.log(`🔍 Starting test suite: ${suite.name}`);
  });

  testing.on('suite-completed', (suite) => {
    console.log(`✅ Test suite completed: ${suite.name} - ${suite.summary.passed}/${suite.summary.total} passed`);
  });

  try {
    // Run comprehensive tests
    const report = await testing.runTests({
      frameworks: ['jest', 'cypress'],
      environments: ['local'],
      parallel: true,
      coverage: true,
      metadata: {
        branch: 'main',
        commit: 'abc123',
        author: 'john.doe@example.com',
        tags: ['regression', 'smoke']
      }
    });

    console.log('✅ Test execution completed successfully');
    console.log(`📊 Test Report ID: ${report.id}`);
    console.log(`📈 Summary: ${report.summary.passedTests}/${report.summary.totalTests} tests passed`);
    console.log(`⏱️ Duration: ${report.summary.totalDuration}ms`);
    
    if (report.summary.overallCoverage) {
      console.log(`📊 Coverage: ${report.summary.overallCoverage.toFixed(2)}%`);
    }

    // Get test history
    const reports = testing.getReports(5);
    console.log(`📋 Recent test reports: ${reports.length}`);

    return testing;
  } catch (error) {
    console.error('❌ Testing framework error:', error);
    throw error;
  }
}

// Example 5: Comprehensive Security Workflow
async function comprehensiveSecurityWorkflow() {
  console.log('🛡️ Starting comprehensive security workflow...');
  
  const npmsafe = new NPMSafe();
  const licenseChecker = new LicenseChecker();
  const dependencyAuditor = new DependencyAuditor();
  const secretDiffAuditor = new SecretDiffAuditor();
  const linear = new LinearIntegration({
    apiKey: process.env.LINEAR_API_KEY || 'your-linear-api-key',
    teamId: process.env.LINEAR_TEAM_ID || 'your-team-id',
  });
  const slack = new SlackIntegration({
    webhookUrl: process.env.SLACK_WEBHOOK_URL || 'your-slack-webhook',
  });
  const discord = new DiscordIntegration({
    webhookUrl: process.env.DISCORD_WEBHOOK_URL || 'your-discord-webhook',
  });

  try {
    // Step 1: Secret Scanning
    console.log('🔍 Step 1: Secret scanning...');
    const secretResults = await npmsafe.scan({
      patterns: '**/*',
      exclude: 'node_modules/**',
      entropy: 3.5,
    });

    if (secretResults.length > 0) {
      console.log(`🚨 Found ${secretResults.length} potential secrets`);
      
      // Create Linear issue for secrets
      await linear.createSecurityIssue({
        title: 'Potential secrets detected in codebase',
        description: `Found ${secretResults.length} potential secrets during security scan.`,
        severity: 'high',
        package: 'my-awesome-package',
        version: '1.2.3',
        file: secretResults[0].file,
        line: secretResults[0].line,
        recommendation: 'Review and remove or secure all detected secrets',
      });

      // Send notifications
      await slack.sendAlert({
        title: 'Security Alert: Secrets Detected',
        message: `Found ${secretResults.length} potential secrets in the codebase.`,
        severity: 'high',
        timestamp: new Date().toISOString()
      });

      await discord.sendAlert({
        title: 'Security Alert: Secrets Detected',
        message: `Found ${secretResults.length} potential secrets in the codebase.`,
        severity: 'high',
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('✅ No secrets found');
    }

    // Step 2: License Compliance Check
    console.log('📄 Step 2: License compliance check...');
    const licenseResult = await licenseChecker.checkCompliance({
      allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC'],
      blockedLicenses: ['GPL-2.0', 'GPL-3.0'],
      projectLicense: 'MIT',
      includeDevDependencies: false,
    });

    console.log(`📊 License compliance: ${licenseResult.summary.compatible}/${licenseResult.summary.total} packages compatible`);

    if (licenseResult.summary.incompatible > 0) {
      const incompatiblePackages = await licenseChecker.getIncompatiblePackages();
      console.log(`🚨 Found ${incompatiblePackages.length} incompatible packages`);

      // Create Linear issue for license violations
      await linear.createLicenseIssue({
        summary: 'License compliance violations detected',
        incompatiblePackages: incompatiblePackages.slice(0, 5), // Limit to first 5
        recommendations: [
          'Review and replace incompatible packages',
          'Consider alternative packages with compatible licenses',
          'Update license policy if necessary'
        ]
      });
    }

    // Step 3: Dependency Vulnerability Audit
    console.log('🔍 Step 3: Dependency vulnerability audit...');
    const auditResult = await dependencyAuditor.audit({
      production: true,
      auditLevel: 'moderate',
      timeout: 30000,
    });

    console.log(`📊 Vulnerability audit: ${auditResult.summary.total} vulnerabilities found`);

    if (auditResult.summary.critical > 0 || auditResult.summary.high > 0) {
      console.log(`🚨 Found ${auditResult.summary.critical} critical and ${auditResult.summary.high} high vulnerabilities`);

      // Create Linear issue for vulnerabilities
      await linear.createDependencyIssue({
        summary: 'High-severity vulnerabilities detected',
        vulnerabilities: auditResult.vulnerabilities.filter(v => 
          v.severity === 'critical' || v.severity === 'high'
        ).slice(0, 10), // Limit to first 10
        recommendations: [
          'Update vulnerable packages to latest versions',
          'Run npm audit fix to automatically fix vulnerabilities',
          'Review and test changes before deployment'
        ]
      });

      // Send critical alert
      await slack.sendAlert({
        title: 'Critical: High-severity vulnerabilities detected',
        message: `Found ${auditResult.summary.critical} critical and ${auditResult.summary.high} high vulnerabilities.`,
        severity: 'critical',
        timestamp: new Date().toISOString()
      });
    }

    // Step 4: Secret Diff Audit
    console.log('🔍 Step 4: Secret diff audit...');
    const diffResult = await secretDiffAuditor.auditDiff({
      version: '1.2.0',
      currentSecrets: secretResults,
    });

    console.log(`📊 Secret diff: ${diffResult.summary.totalAdded} added, ${diffResult.summary.totalRemoved} removed`);

    if (diffResult.summary.riskLevel === 'critical' || diffResult.summary.riskLevel === 'high') {
      console.log(`🚨 High-risk secret changes detected: ${diffResult.summary.riskLevel}`);

      await slack.sendAlert({
        title: 'High-risk secret changes detected',
        message: `Secret diff audit shows ${diffResult.summary.riskLevel} risk level.`,
        severity: 'high',
        timestamp: new Date().toISOString()
      });
    }

    // Step 5: Generate comprehensive report
    console.log('📋 Step 5: Generating comprehensive security report...');
    
    const securityReport = {
      timestamp: new Date().toISOString(),
      secrets: {
        total: secretResults.length,
        riskLevel: diffResult.summary.riskLevel
      },
      licenses: {
        total: licenseResult.summary.total,
        compatible: licenseResult.summary.compatible,
        incompatible: licenseResult.summary.incompatible
      },
      vulnerabilities: {
        total: auditResult.summary.total,
        critical: auditResult.summary.critical,
        high: auditResult.summary.high,
        moderate: auditResult.summary.moderate,
        low: auditResult.summary.low
      },
      overallRisk: this.calculateOverallRisk(secretResults, licenseResult, auditResult, diffResult)
    };

    console.log('📊 Security Report:', securityReport);

    // Send final notification
    await slack.sendNotification({
      title: 'Security Workflow Completed',
      message: `Security workflow completed with ${securityReport.overallRisk} risk level.`,
      status: securityReport.overallRisk === 'low' ? 'success' : 'warning',
      timestamp: new Date().toISOString()
    });

    console.log('✅ Comprehensive security workflow completed successfully');
    return securityReport;

  } catch (error) {
    console.error('❌ Security workflow failed:', error);
    
    // Send failure notification
    await slack.sendAlert({
      title: 'Security Workflow Failed',
      message: `Security workflow failed: ${error.message}`,
      severity: 'critical',
      timestamp: new Date().toISOString()
    });
    
    throw error;
  }
}

// Helper function to calculate overall risk
function calculateOverallRisk(secrets, licenseResult, auditResult, diffResult) {
  let riskScore = 0;
  
  // Secret risk
  if (secrets.length > 0) riskScore += 3;
  if (diffResult.summary.riskLevel === 'critical') riskScore += 3;
  else if (diffResult.summary.riskLevel === 'high') riskScore += 2;
  
  // License risk
  if (licenseResult.summary.incompatible > 0) riskScore += 1;
  
  // Vulnerability risk
  if (auditResult.summary.critical > 0) riskScore += 3;
  if (auditResult.summary.high > 0) riskScore += 2;
  if (auditResult.summary.moderate > 0) riskScore += 1;
  
  if (riskScore >= 6) return 'critical';
  if (riskScore >= 4) return 'high';
  if (riskScore >= 2) return 'medium';
  return 'low';
}

// Main execution function
async function main() {
  console.log('🚀 NPMSafe Advanced Enterprise Features Demo');
  console.log('=============================================\n');

  try {
    // Initialize all advanced features
    const dashboard = await dashboardServerExample();
    const monitor = await advancedMonitoringExample();
    const deploymentManager = await deploymentManagementExample();
    const testing = await advancedTestingExample();
    
    // Run comprehensive security workflow
    const securityReport = await comprehensiveSecurityWorkflow();

    console.log('\n🎉 All advanced features initialized successfully!');
    console.log('📊 Dashboard: http://localhost:3000');
    console.log('📈 Monitoring: Active with real-time metrics');
    console.log('🚀 Deployment: Ready for CI/CD workflows');
    console.log('🧪 Testing: Framework ready for comprehensive testing');
    console.log('🛡️ Security: Workflow completed successfully');

    // Keep the services running for demo
    console.log('\n⏳ Keeping services running for demo...');
    console.log('Press Ctrl+C to stop all services');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down services...');
      
      try {
        await dashboard.stop();
        await monitor.stop();
        console.log('✅ All services stopped gracefully');
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
      }
      
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  dashboardServerExample,
  advancedMonitoringExample,
  deploymentManagementExample,
  advancedTestingExample,
  comprehensiveSecurityWorkflow
}; 