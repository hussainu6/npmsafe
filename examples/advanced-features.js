#!/usr/bin/env node

/**
 * NPMSafe Advanced Features Example
 * 
 * This file demonstrates the advanced features of NPMSafe including:
 * - License compliance checking
 * - Dependency vulnerability auditing
 * - Linear integration for issue management
 * - Comprehensive security workflows
 */

import { 
  NPMSafe, 
  LicenseChecker, 
  DependencyAuditor, 
  LinearIntegration,
  SlackIntegration,
  DiscordIntegration 
} from '../src/index.js';

// Example 1: License Compliance Checking
async function licenseComplianceExample() {
  console.log('📄 Setting up license compliance check...');
  
  const licenseChecker = new LicenseChecker({
    allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC'],
    blockedLicenses: ['GPL-2.0', 'GPL-3.0'],
    projectLicense: 'MIT',
    includeDevDependencies: false,
  });

  // Check license compliance
  const result = await licenseChecker.checkCompliance();
  
  console.log('License Compliance Results:');
  console.log(`- Total packages: ${result.summary.total}`);
  console.log(`- Compatible: ${result.summary.compatible}`);
  console.log(`- Incompatible: ${result.summary.incompatible}`);
  console.log(`- Unknown: ${result.summary.unknown}`);

  // Get incompatible packages
  const incompatiblePackages = await licenseChecker.getIncompatiblePackages();
  if (incompatiblePackages.length > 0) {
    console.log('\n🚨 Incompatible packages found:');
    for (const pkg of incompatiblePackages) {
      console.log(`  • ${pkg.name}@${pkg.version} (${pkg.license})`);
      for (const issue of pkg.issues) {
        console.log(`    - ${issue}`);
      }
    }
  }

  // Generate report
  const report = await licenseChecker.generateReport();
  console.log('\n📊 License Compliance Report:');
  console.log(report);

  return result;
}

// Example 2: Dependency Vulnerability Auditing
async function dependencyAuditExample() {
  console.log('🔍 Setting up dependency vulnerability audit...');
  
  const dependencyAuditor = new DependencyAuditor();

  // Run comprehensive audit
  const result = await dependencyAuditor.audit({
    production: true,
    auditLevel: 'moderate',
    timeout: 30000,
  });

  console.log('Dependency Audit Results:');
  console.log(`- Total vulnerabilities: ${result.summary.total}`);
  console.log(`- Critical: ${result.summary.critical}`);
  console.log(`- High: ${result.summary.high}`);
  console.log(`- Moderate: ${result.summary.moderate}`);
  console.log(`- Low: ${result.summary.low}`);

  // Check for critical vulnerabilities
  const hasCritical = await dependencyAuditor.hasCriticalVulnerabilities();
  if (hasCritical) {
    console.log('\n🚨 Critical vulnerabilities detected!');
  }

  // Get security score
  const securityScore = await dependencyAuditor.getSecurityScore();
  console.log(`\n🛡️ Security Score: ${securityScore}/100`);

  // Get vulnerabilities by severity
  const highVulns = await dependencyAuditor.getVulnerabilitiesBySeverity('high');
  if (highVulns.length > 0) {
    console.log('\n🔴 High severity vulnerabilities:');
    for (const vuln of highVulns) {
      console.log(`  • ${vuln.package}@${vuln.version}: ${vuln.title}`);
      if (vuln.fixedIn) {
        console.log(`    Fixed in: ${vuln.fixedIn}`);
      }
    }
  }

  // Generate report
  const report = await dependencyAuditor.generateReport();
  console.log('\n📊 Dependency Audit Report:');
  console.log(report);

  return result;
}

// Example 3: Linear Integration for Issue Management
async function linearIntegrationExample() {
  console.log('📋 Setting up Linear integration...');
  
  const linear = new LinearIntegration({
    apiKey: process.env.LINEAR_API_KEY || 'your-linear-api-key',
    teamId: process.env.LINEAR_TEAM_ID || 'your-team-id',
    issueType: 'Bug',
    priority: 'Medium',
    labels: ['npmsafe', 'security'],
  });

  // Test connection
  const connectionTest = await linear.testConnection();
  if (!connectionTest) {
    console.log('❌ Linear connection failed. Please check your API key and team ID.');
    return;
  }

  // Create security vulnerability issue
  const securityIssue = await linear.createSecurityIssue({
    title: 'API Key detected in source code',
    description: 'A potential API key was found during the security scan.',
    severity: 'high',
    package: 'my-awesome-package',
    version: '1.2.3',
    file: 'src/config.js',
    line: 42,
    recommendation: 'Move API key to environment variables',
  });

  console.log(`✅ Security issue created: ${securityIssue.title} (#${securityIssue.number})`);

  // Create dependency audit issue
  const dependencyIssue = await linear.createDependencyIssue({
    summary: 'Multiple high-severity vulnerabilities found',
    vulnerabilities: [
      {
        package: 'lodash',
        version: '4.17.15',
        severity: 'high',
        title: 'Prototype pollution vulnerability',
        fixedIn: '4.17.21',
      },
      {
        package: 'axios',
        version: '0.21.1',
        severity: 'medium',
        title: 'SSRF vulnerability',
        fixedIn: '0.21.2',
      },
    ],
    recommendations: [
      'Update lodash to version 4.17.21 or later',
      'Update axios to version 0.21.2 or later',
      'Run npm audit fix to automatically fix vulnerabilities',
    ],
  });

  console.log(`✅ Dependency issue created: ${dependencyIssue.title} (#${dependencyIssue.number})`);

  // Add comment to issue
  await linear.addComment(securityIssue.id, '🔍 Investigation in progress. Will update with findings.');

  // Get security-related issues
  const securityIssues = await linear.getSecurityIssues();
  console.log(`\n📋 Found ${securityIssues.length} security-related issues in Linear`);

  return { securityIssue, dependencyIssue };
}

// Example 4: Comprehensive Security Workflow
async function comprehensiveSecurityWorkflow() {
  console.log('🔄 Starting comprehensive security workflow...');
  
  const npmsafe = new NPMSafe();
  const licenseChecker = new LicenseChecker();
  const dependencyAuditor = new DependencyAuditor();
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

  const results = {
    secrets: null,
    licenses: null,
    dependencies: null,
    issues: [],
  };

  try {
    // Step 1: Secret scanning
    console.log('🔍 Step 1: Scanning for secrets...');
    results.secrets = await npmsafe.scan({
      patterns: '**/*',
      exclude: 'node_modules/**',
      entropy: 3.5,
    });

    if (results.secrets.length > 0) {
      console.log(`🚨 Found ${results.secrets.length} potential secrets`);
      
      // Create Linear issue for secrets
      const secretIssue = await linear.createSecurityIssue({
        title: 'Secrets detected in source code',
        description: `Found ${results.secrets.length} potential secrets during scan.`,
        severity: 'critical',
        recommendation: 'Remove secrets and use environment variables',
      });
      results.issues.push(secretIssue);

      // Send Slack alert
      await slack.sendSecurityAlert({
        type: 'secret',
        severity: 'critical',
        title: 'Secrets detected - Publishing blocked',
        description: 'Secrets were found in the package. Publishing has been blocked.',
        package: 'my-awesome-package',
        details: {
          'Files with secrets': results.secrets.length.toString(),
          'Action required': 'Remove secrets before publishing',
        },
      });

      return results; // Stop workflow if secrets found
    }

    // Step 2: License compliance check
    console.log('📄 Step 2: Checking license compliance...');
    results.licenses = await licenseChecker.checkCompliance();

    if (results.licenses.summary.incompatible > 0) {
      console.log(`⚠️ Found ${results.licenses.summary.incompatible} incompatible licenses`);
      
      // Create Linear issue for license compliance
      const licenseIssue = await linear.createLicenseIssue({
        summary: `${results.licenses.summary.incompatible} packages have incompatible licenses`,
        incompatiblePackages: results.licenses.packages.filter(p => !p.compatible),
        recommendations: results.licenses.recommendations,
      });
      results.issues.push(licenseIssue);
    }

    // Step 3: Dependency vulnerability audit
    console.log('🔍 Step 3: Auditing dependencies...');
    results.dependencies = await dependencyAuditor.audit();

    if (results.dependencies.summary.critical > 0 || results.dependencies.summary.high > 0) {
      console.log(`🚨 Found ${results.dependencies.summary.critical} critical and ${results.dependencies.summary.high} high vulnerabilities`);
      
      // Create Linear issue for dependencies
      const dependencyIssue = await linear.createDependencyIssue({
        summary: `${results.dependencies.summary.critical} critical and ${results.dependencies.summary.high} high vulnerabilities found`,
        vulnerabilities: results.dependencies.vulnerabilities.filter(v => 
          v.severity === 'critical' || v.severity === 'high'
        ),
        recommendations: results.dependencies.recommendations,
      });
      results.issues.push(dependencyIssue);
    }

    // Step 4: Send notifications
    console.log('📢 Step 4: Sending notifications...');
    
    const hasIssues = results.licenses.summary.incompatible > 0 || 
                     results.dependencies.summary.critical > 0 || 
                     results.dependencies.summary.high > 0;

    if (hasIssues) {
      // Send Discord alert
      await discord.sendSecurityAlert({
        type: 'vulnerability',
        severity: 'high',
        title: 'Security issues detected during pre-publish scan',
        description: 'Multiple security issues were found. Please review before publishing.',
        package: 'my-awesome-package',
        details: {
          'License issues': results.licenses.summary.incompatible.toString(),
          'Critical vulnerabilities': results.dependencies.summary.critical.toString(),
          'High vulnerabilities': results.dependencies.summary.high.toString(),
        },
      });
    } else {
      // Send success notification
      await Promise.all([
        slack.sendMessage('✅ Pre-publish security scan completed successfully!'),
        discord.sendMessage('✅ Pre-publish security scan completed successfully!'),
      ]);
    }

    console.log('✅ Comprehensive security workflow completed');
    return results;

  } catch (error) {
    console.error('❌ Security workflow failed:', error);
    
    // Send error notification
    await Promise.all([
      slack.sendMessage(`❌ Security workflow failed: ${error.message}`),
      discord.sendMessage(`❌ Security workflow failed: ${error.message}`),
    ]);
    
    throw error;
  }
}

// Example 5: Automated CI/CD Integration
async function cicdIntegrationExample() {
  console.log('🚀 Setting up CI/CD integration...');
  
  const linear = new LinearIntegration({
    apiKey: process.env.LINEAR_API_KEY || 'your-linear-api-key',
    teamId: process.env.LINEAR_TEAM_ID || 'your-team-id',
  });
  const slack = new SlackIntegration({
    webhookUrl: process.env.SLACK_WEBHOOK_URL || 'your-slack-webhook',
  });

  // Simulate CI/CD environment variables
  const env = {
    PACKAGE_NAME: process.env.PACKAGE_NAME || 'my-awesome-package',
    PACKAGE_VERSION: process.env.PACKAGE_VERSION || '1.2.3',
    BUILD_STATUS: process.env.BUILD_STATUS || 'success',
    DEPLOYMENT_ENV: process.env.DEPLOYMENT_ENV || 'production',
    COMMIT_SHA: process.env.COMMIT_SHA || 'abc123',
    BRANCH: process.env.BRANCH || 'main',
  };

  // Create deployment tracking issue
  const deploymentIssue = await linear.createIssue({
    title: `[Deployment] ${env.PACKAGE_NAME}@${env.PACKAGE_VERSION} to ${env.DEPLOYMENT_ENV}`,
    description: `Deploying ${env.PACKAGE_NAME}@${env.PACKAGE_VERSION} to ${env.DEPLOYMENT_ENV}\n\n**Details:**\n- Commit: ${env.COMMIT_SHA}\n- Branch: ${env.BRANCH}\n- Status: ${env.BUILD_STATUS}`,
    issueType: 'Task',
    priority: 'Medium',
    labels: ['deployment', 'cicd', 'npmsafe'],
  });

  console.log(`✅ Deployment issue created: ${deploymentIssue.title} (#${deploymentIssue.number})`);

  // Send deployment status to Slack
  await slack.sendDeploymentStatus({
    environment: env.DEPLOYMENT_ENV,
    status: env.BUILD_STATUS === 'success' ? 'success' : 'failure',
    package: env.PACKAGE_NAME,
    version: env.PACKAGE_VERSION,
    duration: 120,
    logs: [
      'Security scan completed',
      'Dependency audit passed',
      'License compliance verified',
      'Deployment initiated',
    ],
    errors: env.BUILD_STATUS === 'failure' ? ['Build failed'] : [],
  });

  // Update issue status based on build result
  if (env.BUILD_STATUS === 'success') {
    await linear.updateIssueStatus(deploymentIssue.id, 'Done');
    await linear.addComment(deploymentIssue.id, '✅ Deployment completed successfully');
  } else {
    await linear.updateIssueStatus(deploymentIssue.id, 'In Progress');
    await linear.addComment(deploymentIssue.id, '❌ Deployment failed - investigation required');
  }

  return deploymentIssue;
}

// Main execution
async function main() {
  console.log('🚀 NPMSafe Advanced Features Examples\n');

  try {
    // Uncomment the examples you want to run
    
    // await licenseComplianceExample();
    // await dependencyAuditExample();
    // await linearIntegrationExample();
    // await comprehensiveSecurityWorkflow();
    // await cicdIntegrationExample();

    console.log('\n📚 Advanced features examples completed!');
    console.log('\n💡 To use these features:');
    console.log('1. Set up environment variables for integrations');
    console.log('2. Configure your NPMSafe config file');
    console.log('3. Integrate with your CI/CD pipeline');
    console.log('4. Set up automated workflows for your team');

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
  licenseComplianceExample,
  dependencyAuditExample,
  linearIntegrationExample,
  comprehensiveSecurityWorkflow,
  cicdIntegrationExample,
}; 