# NPMSafe Advanced Features

This document covers the advanced features of NPMSafe that go beyond basic secret scanning and versioning.

## Table of Contents

1. [License Compliance Checking](#license-compliance-checking)
2. [Dependency Vulnerability Auditing](#dependency-vulnerability-auditing)
3. [Linear Integration](#linear-integration)
4. [Comprehensive Security Workflows](#comprehensive-security-workflows)
5. [CI/CD Integration](#cicd-integration)
6. [Advanced Configuration](#advanced-configuration)

## License Compliance Checking

NPMSafe includes a comprehensive license compliance checker that analyzes package licenses and ensures compatibility with your project requirements.

### Basic Usage

```javascript
import { LicenseChecker } from 'npmsafe';

const licenseChecker = new LicenseChecker({
  allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC'],
  blockedLicenses: ['GPL-2.0', 'GPL-3.0'],
  projectLicense: 'MIT',
  includeDevDependencies: false,
});

const result = await licenseChecker.checkCompliance();
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowedLicenses` | `string[]` | `[]` | Whitelist of allowed licenses |
| `blockedLicenses` | `string[]` | `[]` | Blacklist of blocked licenses |
| `projectLicense` | `string` | Auto-detected | Your project's license |
| `strictMode` | `boolean` | `false` | Strict compatibility checking |
| `includeDevDependencies` | `boolean` | `false` | Include dev dependencies |

### License Compatibility Matrix

NPMSafe includes a built-in license compatibility matrix:

- **MIT**: Compatible with MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, Unlicense
- **Apache-2.0**: Compatible with MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, Unlicense
- **GPL-2.0**: Compatible with GPL-2.0, GPL-3.0, LGPL-2.1, LGPL-3.0
- **GPL-3.0**: Compatible with GPL-3.0, LGPL-3.0
- **LGPL-2.1**: Compatible with LGPL-2.1, LGPL-3.0, MIT, Apache-2.0
- **LGPL-3.0**: Compatible with LGPL-3.0, MIT, Apache-2.0

### Advanced Features

```javascript
// Check specific package
const packageInfo = await licenseChecker.checkPackageLicense('lodash', '4.17.21');

// Get incompatible packages
const incompatible = await licenseChecker.getIncompatiblePackages();

// Get packages with unknown licenses
const unknown = await licenseChecker.getUnknownLicensePackages();

// Generate detailed report
const report = await licenseChecker.generateReport();

// Update configuration
licenseChecker.setAllowedLicenses(['MIT', 'Apache-2.0']);
licenseChecker.setBlockedLicenses(['GPL-3.0']);
licenseChecker.setProjectLicense('MIT');
```

## Dependency Vulnerability Auditing

NPMSafe provides comprehensive dependency vulnerability scanning using npm audit and enhanced analysis.

### Basic Usage

```javascript
import { DependencyAuditor } from 'npmsafe';

const dependencyAuditor = new DependencyAuditor();

const result = await dependencyAuditor.audit({
  production: true,
  auditLevel: 'moderate',
  timeout: 30000,
});
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `production` | `boolean` | `false` | Only check production dependencies |
| `auditLevel` | `string` | `'moderate'` | Minimum severity level |
| `timeout` | `number` | `30000` | API timeout in milliseconds |
| `registry` | `string` | npm default | Custom registry URL |
| `ignoreDevDependencies` | `boolean` | `false` | Ignore dev dependencies |

### Advanced Features

```javascript
// Check for critical vulnerabilities
const hasCritical = await dependencyAuditor.hasCriticalVulnerabilities();

// Get security score (0-100)
const score = await dependencyAuditor.getSecurityScore();

// Get vulnerabilities by severity
const highVulns = await dependencyAuditor.getVulnerabilitiesBySeverity('high');

// Check specific package
const packageVulns = await dependencyAuditor.checkPackage('lodash', '4.17.15');

// Generate detailed report
const report = await dependencyAuditor.generateReport();

// Cache management
dependencyAuditor.clearCache();
dependencyAuditor.setCacheExpiry(7200000); // 2 hours
```

### Vulnerability Information

Each vulnerability includes:

- **ID**: Unique vulnerability identifier
- **Title**: Vulnerability title
- **Description**: Detailed description
- **Severity**: low, moderate, high, critical
- **Package**: Affected package name
- **Version**: Affected version
- **Fixed In**: Version that fixes the vulnerability
- **CWE**: Common Weakness Enumeration IDs
- **CVSS**: Common Vulnerability Scoring System
- **References**: Related links and advisories

## Linear Integration

NPMSafe integrates with Linear for automated issue management and workflow tracking.

### Setup

```javascript
import { LinearIntegration } from 'npmsafe';

const linear = new LinearIntegration({
  apiKey: process.env.LINEAR_API_KEY,
  teamId: process.env.LINEAR_TEAM_ID,
  issueType: 'Bug',
  priority: 'Medium',
  labels: ['npmsafe', 'security'],
});
```

### Creating Issues

```javascript
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
  ],
  recommendations: [
    'Update lodash to version 4.17.21 or later',
    'Run npm audit fix to automatically fix vulnerabilities',
  ],
});

// Create license compliance issue
const licenseIssue = await linear.createLicenseIssue({
  summary: 'Incompatible licenses detected',
  incompatiblePackages: [
    {
      name: 'some-package',
      version: '1.0.0',
      license: 'GPL-3.0',
      issues: ['License incompatible with project MIT license'],
    },
  ],
  recommendations: [
    'Replace some-package with MIT-compatible alternative',
  ],
});
```

### Issue Management

```javascript
// Update issue status
await linear.updateIssueStatus(issueId, 'In Progress');

// Add comments
await linear.addComment(issueId, '🔍 Investigation in progress. Will update with findings.');

// Get issue details
const issue = await linear.getIssue(issueId);

// Search issues
const securityIssues = await linear.getSecurityIssues();
const dependencyIssues = await linear.getDependencyIssues();

// Test connection
const isConnected = await linear.testConnection();
```

## Comprehensive Security Workflows

NPMSafe provides comprehensive security workflows that combine multiple checks and integrations.

### Basic Workflow

```javascript
import { NPMSafe, LicenseChecker, DependencyAuditor, LinearIntegration } from 'npmsafe';

async function securityWorkflow() {
  const npmsafe = new NPMSafe();
  const licenseChecker = new LicenseChecker();
  const dependencyAuditor = new DependencyAuditor();
  const linear = new LinearIntegration({
    apiKey: process.env.LINEAR_API_KEY,
    teamId: process.env.LINEAR_TEAM_ID,
  });

  const results = {
    secrets: null,
    licenses: null,
    dependencies: null,
    issues: [],
  };

  try {
    // Step 1: Secret scanning
    results.secrets = await npmsafe.scan({
      patterns: '**/*',
      exclude: 'node_modules/**',
      entropy: 3.5,
    });

    if (results.secrets.length > 0) {
      // Create Linear issue for secrets
      const secretIssue = await linear.createSecurityIssue({
        title: 'Secrets detected in source code',
        description: `Found ${results.secrets.length} potential secrets during scan.`,
        severity: 'critical',
        recommendation: 'Remove secrets and use environment variables',
      });
      results.issues.push(secretIssue);
      return results; // Stop workflow if secrets found
    }

    // Step 2: License compliance check
    results.licenses = await licenseChecker.checkCompliance();

    if (results.licenses.summary.incompatible > 0) {
      const licenseIssue = await linear.createLicenseIssue({
        summary: `${results.licenses.summary.incompatible} packages have incompatible licenses`,
        incompatiblePackages: results.licenses.packages.filter(p => !p.compatible),
        recommendations: results.licenses.recommendations,
      });
      results.issues.push(licenseIssue);
    }

    // Step 3: Dependency vulnerability audit
    results.dependencies = await dependencyAuditor.audit();

    if (results.dependencies.summary.critical > 0 || results.dependencies.summary.high > 0) {
      const dependencyIssue = await linear.createDependencyIssue({
        summary: `${results.dependencies.summary.critical} critical and ${results.dependencies.summary.high} high vulnerabilities found`,
        vulnerabilities: results.dependencies.vulnerabilities.filter(v => 
          v.severity === 'critical' || v.severity === 'high'
        ),
        recommendations: results.dependencies.recommendations,
      });
      results.issues.push(dependencyIssue);
    }

    return results;
  } catch (error) {
    console.error('Security workflow failed:', error);
    throw error;
  }
}
```

### Advanced Workflow with Notifications

```javascript
import { SlackIntegration, DiscordIntegration } from 'npmsafe';

async function advancedSecurityWorkflow() {
  const slack = new SlackIntegration({
    webhookUrl: process.env.SLACK_WEBHOOK_URL,
  });
  const discord = new DiscordIntegration({
    webhookUrl: process.env.DISCORD_WEBHOOK_URL,
  });

  const results = await securityWorkflow();

  // Send notifications based on results
  const hasIssues = results.licenses.summary.incompatible > 0 || 
                   results.dependencies.summary.critical > 0 || 
                   results.dependencies.summary.high > 0;

  if (hasIssues) {
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
    await slack.sendMessage('✅ Pre-publish security scan completed successfully!');
  }

  return results;
}
```

## CI/CD Integration

NPMSafe can be integrated into CI/CD pipelines for automated security checks.

### GitHub Actions Example

```yaml
name: NPMSafe Security Check

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  security-check:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Install NPMSafe
      run: npm install -g npmsafe
    
    - name: Run security workflow
      run: |
        node examples/advanced-features.js
      env:
        LINEAR_API_KEY: ${{ secrets.LINEAR_API_KEY }}
        LINEAR_TEAM_ID: ${{ secrets.LINEAR_TEAM_ID }}
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
        DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_WEBHOOK_URL }}
    
    - name: Check for security issues
      run: |
        if [ -f "security-report.json" ]; then
          echo "Security issues found. Check Linear for details."
          exit 1
        fi
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `LINEAR_API_KEY` | Linear API key | For Linear integration |
| `LINEAR_TEAM_ID` | Linear team ID | For Linear integration |
| `SLACK_WEBHOOK_URL` | Slack webhook URL | For Slack notifications |
| `DISCORD_WEBHOOK_URL` | Discord webhook URL | For Discord notifications |
| `PACKAGE_NAME` | Package name | For CI/CD context |
| `PACKAGE_VERSION` | Package version | For CI/CD context |
| `BUILD_STATUS` | Build status | For CI/CD context |
| `DEPLOYMENT_ENV` | Deployment environment | For CI/CD context |

## Advanced Configuration

### NPMSafe Configuration File

```json
{
  "license": {
    "allowedLicenses": ["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC"],
    "blockedLicenses": ["GPL-2.0", "GPL-3.0"],
    "projectLicense": "MIT",
    "includeDevDependencies": false
  },
  "dependencies": {
    "production": true,
    "auditLevel": "moderate",
    "timeout": 30000
  },
  "integrations": {
    "linear": {
      "apiKey": "${LINEAR_API_KEY}",
      "teamId": "${LINEAR_TEAM_ID}",
      "issueType": "Bug",
      "priority": "Medium",
      "labels": ["npmsafe", "security"]
    },
    "slack": {
      "webhookUrl": "${SLACK_WEBHOOK_URL}",
      "channel": "#security",
      "username": "NPMSafe Bot"
    },
    "discord": {
      "webhookUrl": "${DISCORD_WEBHOOK_URL}",
      "username": "NPMSafe Bot",
      "avatarUrl": "https://example.com/npmsafe-avatar.png"
    }
  },
  "workflows": {
    "prePublish": {
      "enabled": true,
      "steps": ["secrets", "licenses", "dependencies"],
      "notifications": ["slack", "discord"],
      "issueCreation": true
    },
    "ci": {
      "enabled": true,
      "steps": ["secrets", "dependencies"],
      "notifications": ["slack"],
      "issueCreation": false
    }
  }
}
```

### Custom Middleware

```javascript
import { NPMSafe } from 'npmsafe';

const npmsafe = new NPMSafe();

// Add custom middleware
npmsafe.use(async (context, next) => {
  console.log(`Starting ${context.type} check...`);
  const startTime = Date.now();
  
  await next();
  
  const duration = Date.now() - startTime;
  console.log(`${context.type} check completed in ${duration}ms`);
});

// Custom validation
npmsafe.use(async (context, next) => {
  if (context.type === 'license' && context.result.summary.incompatible > 5) {
    throw new Error('Too many incompatible licenses found');
  }
  
  await next();
});
```

## Best Practices

### 1. License Management

- Define clear license policies for your organization
- Use allowlists and blocklists to enforce policies
- Regularly review and update license compatibility
- Document license decisions and exceptions

### 2. Dependency Management

- Run dependency audits regularly (weekly/monthly)
- Set up automated alerts for new vulnerabilities
- Maintain a security score target (e.g., >80)
- Use dependency update automation tools

### 3. Issue Management

- Create consistent issue templates
- Use appropriate labels and priorities
- Set up automated issue assignment
- Track issue resolution metrics

### 4. CI/CD Integration

- Run security checks on every build
- Block deployments with critical issues
- Send notifications for all security events
- Maintain audit trails for compliance

### 5. Team Communication

- Set up dedicated security channels
- Use appropriate notification levels
- Provide clear action items in alerts
- Regular security review meetings

## Troubleshooting

### Common Issues

1. **Linear API Errors**
   - Verify API key and team ID
   - Check Linear API rate limits
   - Ensure proper permissions

2. **License Check Failures**
   - Verify package.json exists
   - Check node_modules permissions
   - Review license normalization

3. **Dependency Audit Timeouts**
   - Increase timeout value
   - Check network connectivity
   - Verify npm registry access

4. **Integration Failures**
   - Verify webhook URLs
   - Check authentication tokens
   - Review API permissions

### Debug Mode

Enable debug logging for troubleshooting:

```javascript
import { NPMSafeLogger } from 'npmsafe';

const logger = new NPMSafeLogger();
logger.setLevel('debug');

// Or set environment variable
process.env.NPMSAFE_LOG_LEVEL = 'debug';
```

### Support

For additional support:

- Check the [main documentation](../README.md)
- Review [examples](../examples/)
- Open an issue on GitHub
- Join the community discussions

## Migration Guide

### From Basic NPMSafe

If you're upgrading from basic NPMSafe features:

1. **Update imports** to include new modules
2. **Configure integrations** with your tools
3. **Set up workflows** for your use cases
4. **Update CI/CD** pipelines
5. **Train team** on new features

### From Other Tools

If migrating from other security tools:

1. **Export current policies** from existing tools
2. **Map configurations** to NPMSafe equivalents
3. **Set up integrations** with your workflow
4. **Run parallel checks** during transition
5. **Gradually migrate** workflows

---

For more information, see the [main NPMSafe documentation](../README.md) and [examples](../examples/). 