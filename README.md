# 🚦 NPMSafe

> **Your seatbelt & airbag for safe npm publishing – stop accidents before they happen**

[![npm version](https://badge.fury.io/js/npmsafe.svg)](https://badge.fury.io/js/npmsafe)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/npmsafe/npmsafe/workflows/Node.js%20CI/badge.svg)](https://github.com/npmsafe/npmsafe/actions)

## 📦 Repository

**GitHub Repository:** [https://github.com/hussainu6/npmsafe](https://github.com/hussainu6/npmsafe)

NPMSafe is a comprehensive CLI tool and Node.js library that makes npm package publishing ultra-safe, mistake-proof, and team-ready. It addresses the biggest developer pain points in real-world npm workflows with advanced secret scanning, semantic versioning, safety checks, analytics, monitoring, and extensive integrations.

## ✨ Features

### 🔐 Advanced Secret Leak Scanner
Deeply scans all files slated for publish for secrets, tokens, and high-entropy values with configurable patterns and entropy analysis.

```bash
npx npmsafe scan
```

**Example Output:**
```
🔐 Starting secret scan...
✅ No secrets found in files to be published
✅ No secrets found! Your package is safe to publish.
```

**Or when secrets are found:**
```
🚨 Found 3 potential secrets!
🚨 CRITICAL (1):
  🚨 Secret detected in config.js:1 - AWS Access Key
⚠️ HIGH (2):
  🚨 Secret detected in .env:5 - GitHub Token
  🚨 Secret detected in src/api.js:12 - Stripe Secret Key
```

### 🔢 Semantic Versioning Advisor
Guides you to select the correct `major.minor.patch` bump based on commit messages and changelog rules with confidence scoring.

```bash
npx npmsafe version
```

**Example Output:**
```
🔢 Analyzing version changes...
🔢 Version: 1.2.3 → 2.0.0 (major bump)
📋 Reasons for version bump:
  • Breaking change in commit: feat!: remove deprecated API
  • API changes detected in: src/core.js:processData
🎯 Confidence: 95.2%
```

### 🚦 Pre-publish Safety Simulation
Runs a dry run before publishing, displaying all files, target registry, and warnings.

```bash
npx npmsafe dry-run
```

**Example Output:**
```
🚦 Running pre-publish simulation...
Files to publish:
  📄 dist/index.js
  📄 package.json
  📄 README.md
  📄 LICENSE
Target registry: https://registry.npmjs.org/ (tag: latest)
Estimated size: 24 KB
✅ Pre-publish simulation completed successfully!
Your package is ready to publish.
```

### 📊 Analytics Dashboard & Real-time Monitoring
Web-based dashboard for monitoring publish metrics, security events, and team activity.

```bash
npx npmsafe dashboard
```

**Features:**
- 📈 Real-time publish metrics and trends
- 🔍 Security event tracking and alerts
- 👥 Team activity monitoring
- 📊 Dependency vulnerability tracking
- 🎯 Performance analytics
- 📱 Responsive web interface

### 🔔 Webhook & Integration System
Automated notifications and integrations with popular development tools.

**Supported Integrations:**
- **Slack** - Team notifications and alerts
- **Discord** - Community updates and security alerts
- **GitHub** - Issue creation and PR comments
- **Jira** - Ticket creation and status updates
- **Linear** - Project tracking and notifications
- **Email** - Custom email notifications
- **Custom Webhooks** - REST API integrations

### 🛡️ Advanced Security Features
- **Encrypted Secrets Vault** - Secure storage for sensitive data
- **API Key Verification** - Validate external service credentials
- **License Compliance Checking** - Ensure proper licensing
- **Dependency Vulnerability Scanning** - Audit package dependencies
- **Real-time Security Monitoring** - Continuous threat detection

### 🚀 Deployment Management
Streamlined deployment workflows with safety checks and rollback capabilities.

```bash
npx npmsafe deploy
```

**Features:**
- 🔄 Automated deployment pipelines
- 🛡️ Pre-deployment security scans
- 📊 Deployment analytics and metrics
- 🔙 One-click rollback capabilities
- 🌍 Multi-environment support

### 🧑‍💻 Smart Git & CI Status Integration
Blocks publishing if there are uncommitted changes or failing tests.

```bash
npx npmsafe publish
```

**Example Output:**
```
📦 Starting safe publish process...
🚫 Publishing blocked: Uncommitted changes detected. Please commit or stash before publishing.
```

### 📝 Automatic Changelog & Release Notes
Generates release notes and changelogs from commit history.

```bash
npx npmsafe changelog
```

**Example Output:**
```
## v2.0.0 (2024-01-15)

### ⚠️ Breaking Changes
- Remove deprecated `processData` function
- Change API signature for `transform` method

### ✨ Features
- Add new plugin system
- Implement advanced caching

### 🐛 Fixes
- Fix memory leak in data processing
- Resolve TypeScript compilation errors

### 📚 Documentation
- Update API documentation
- Add migration guide
```

### ⛔ Unpublish Impact Analyzer
Warns before unpublishing if any version is in use or breaking dependencies.

```bash
npx npmsafe unpublish
```

**Example Output:**
```
⛔ Analyzing unpublish impact...
⚠️ Impact Analysis:
  📥 Downloads/week: 5,203
  📦 Dependent packages: 12
  ⚠️ Risk level: MEDIUM
Warnings:
  • This version has active dependents
```

### 🔧 Advanced Testing & Quality Assurance
Comprehensive testing framework with automated quality checks.

```bash
npx npmsafe test
```

**Features:**
- 🧪 Automated test execution
- 📊 Test coverage reporting
- 🔍 Code quality analysis
- 🚀 Performance benchmarking
- 🛡️ Security testing integration

## 🚀 Quick Start

### Installation

```bash
# Install globally
npm install -g npmsafe

# Or use with npx
npx npmsafe

# Or install locally in your project
npm install --save-dev npmsafe
```

### Initialize Configuration

```bash
npx npmsafe init
```

This creates a `.npmsafe.json` configuration file:

```json
{
  "version": "1.0.0",
  "config": {
    "requireCI": true,
    "blockPublishOnSecret": true,
    "autoVersion": true,
    "changelog": true,
    "registry": "https://registry.npmjs.org/",
    "webhooks": [],
    "plugins": [],
    "secretPatterns": [],
    "allowedSecrets": [],
    "analytics": {
      "enabled": true,
      "dashboard": {
        "port": 3000,
        "host": "localhost"
      }
    },
    "monitoring": {
      "enabled": true,
      "interval": 30000
    },
    "integrations": {
      "slack": {
        "enabled": false,
        "webhookUrl": ""
      },
      "discord": {
        "enabled": false,
        "webhookUrl": ""
      },
      "github": {
        "enabled": false,
        "token": "",
        "repo": ""
      }
    }
  }
}
```

### Basic Usage

```bash
# Scan for secrets
npx npmsafe scan

# Analyze version changes
npx npmsafe version

# Run pre-publish simulation
npx npmsafe dry-run

# Publish with safety checks
npx npmsafe publish

# Generate changelog
npx npmsafe changelog

# Start analytics dashboard
npx npmsafe dashboard

# Run comprehensive tests
npx npmsafe test

# Check project status
npx npmsafe status
```

## 📖 Advanced Usage

### Secret Scanning

```bash
# Scan specific patterns
npx npmsafe scan --patterns "src/**/*.js,config/**/*"

# Exclude certain files
npx npmsafe scan --exclude "node_modules/**,dist/**"

# Set entropy threshold
npx npmsafe scan --entropy 4.0

# Scan with custom patterns
npx npmsafe scan --custom-patterns "custom_pattern.json"
```

### Version Management

```bash
# Interactive version bump
npx npmsafe version --interactive

# Auto-apply version bump
npx npmsafe version --auto

# Analyze since specific date
npx npmsafe version --since "2024-01-01"

# Generate changelog with custom format
npx npmsafe changelog --format markdown --output CHANGELOG.md
```

### Publishing

```bash
# Publish to specific tag
npx npmsafe publish --tag beta

# Publish to private registry
npx npmsafe publish --registry https://npm.company.com/

# Publish with OTP
npx npmsafe publish --otp 123456

# Publish with deployment pipeline
npx npmsafe deploy --environment production
```

### Analytics & Monitoring

```bash
# Start dashboard server
npx npmsafe dashboard --port 3000

# View analytics data
npx npmsafe analytics --format json

# Monitor in real-time
npx npmsafe monitor --interval 30s

# Export metrics
npx npmsafe metrics --export csv
```

### Webhook Management

```bash
# Add webhook
npx npmsafe webhook add --url "https://hooks.slack.com/xyz" --events publish,scan

# List webhooks
npx npmsafe webhook list

# Test webhook
npx npmsafe webhook test --id webhook_123

# Remove webhook
npx npmsafe webhook remove --id webhook_123
```

## 🔧 Configuration

### `.npmsafe.json`

```json
{
  "version": "1.0.0",
  "config": {
    "requireCI": true,
    "blockPublishOnSecret": true,
    "webhooks": [
      "https://hooks.slack.com/services/xyz",
      "https://discord.com/api/webhooks/xyz"
    ],
    "plugins": [
      "npmsafe-plugin-custom-checks"
    ],
    "secretPatterns": [
      {
        "name": "Custom API Key",
        "pattern": "custom_[a-zA-Z0-9]{32}",
        "description": "Custom API Key Pattern",
        "severity": "high"
      }
    ],
    "allowedSecrets": [
      "test_key_1234567890abcdef"
    ],
    "registry": "https://registry.npmjs.org/",
    "tag": "latest",
    "dryRun": false,
    "autoVersion": true,
    "changelog": true,
    "gitChecks": true,
    "impactAnalysis": true,
    "analytics": {
      "enabled": true,
      "dashboard": {
        "port": 3000,
        "host": "localhost",
        "auth": {
          "enabled": false,
          "username": "admin",
          "password": "secure_password"
        }
      },
      "storage": {
        "type": "file",
        "path": "./.npmsafe-analytics"
      }
    },
    "monitoring": {
      "enabled": true,
      "interval": 30000,
      "alerts": {
        "enabled": true,
        "webhooks": []
      }
    },
    "integrations": {
      "slack": {
        "enabled": true,
        "webhookUrl": "https://hooks.slack.com/services/xyz",
        "channel": "#npmsafe-alerts"
      },
      "discord": {
        "enabled": false,
        "webhookUrl": "",
        "channel": "npmsafe"
      },
      "github": {
        "enabled": false,
        "token": "",
        "repo": "owner/repo",
        "createIssues": true
      },
      "jira": {
        "enabled": false,
        "url": "",
        "username": "",
        "apiToken": "",
        "projectKey": "NPMSAFE"
      },
      "linear": {
        "enabled": false,
        "apiKey": "",
        "teamId": "",
        "createIssues": true
      }
    },
    "encryption": {
      "enabled": true,
      "algorithm": "aes-256-gcm",
      "keyPath": "./.npmsafe-key"
    },
    "deployment": {
      "enabled": true,
      "environments": {
        "staging": {
          "registry": "https://npm.company.com/",
          "tag": "staging"
        },
        "production": {
          "registry": "https://registry.npmjs.org/",
          "tag": "latest"
        }
      }
    },
    "testing": {
      "enabled": true,
      "frameworks": ["jest", "mocha"],
      "coverage": {
        "enabled": true,
        "threshold": 80
      }
    }
  }
}
```

## 🧩 Plugin System

NPMSafe supports a comprehensive plugin system for custom checks and integrations:

```javascript
// npmsafe-plugin-custom-checks/index.js
module.exports = {
  name: 'npmsafe-plugin-custom-checks',
  version: '1.0.0',
  hooks: {
    prePublish: async (config) => {
      // Custom pre-publish checks
      console.log('Running custom checks...');
      return true; // Return false to block publish
    },
    postPublish: async (config) => {
      // Custom post-publish actions
      console.log('Publish completed, running cleanup...');
    },
    onSecretFound: async (secret, config) => {
      // Custom secret handling
      console.log(`Custom secret handler: ${secret.pattern.name}`);
    },
    onVersionChange: async (oldVersion, newVersion, config) => {
      // Custom version change handling
      console.log(`Version changed: ${oldVersion} → ${newVersion}`);
    }
  }
};
```

## 🔌 Middleware Integration

Use NPMSafe as middleware in your Node.js applications:

```javascript
const express = require('express');
const { NPMSafe } = require('npmsafe');

const app = express();
const npmsafe = new NPMSafe({
  config: {
    requireCI: false,
    blockPublishOnSecret: true
  }
});

// NPMSafe middleware
app.use('/api/publish', async (req, res, next) => {
  const secrets = await npmsafe.scan();
  if (secrets.length > 0) {
    return res.status(400).json({ error: 'Secrets detected' });
  }
  next();
});

// Analytics endpoint
app.get('/api/analytics', async (req, res) => {
  const analytics = await npmsafe.getAnalytics();
  res.json(analytics);
});
```

## 🌐 Web Dashboard

Access the NPMSafe web dashboard for comprehensive monitoring:

```bash
npx npmsafe dashboard
```

**Dashboard Features:**
- 📊 Real-time metrics and charts
- 🔍 Security event logs
- 👥 Team activity tracking
- 📈 Publish history and trends
- 🛡️ Vulnerability reports
- ⚙️ Configuration management
- 🔔 Alert management

## 🛡️ Supported Package Managers

NPMSafe works with all major package managers:

- **npm** - Full support
- **yarn** - Full support
- **pnpm** - Full support
- **Private registries** - Configurable

## 🎯 Target Audience

- **Open source maintainers** - Prevent accidental secret leaks
- **Indie npm package developers** - Streamline publishing workflow
- **DevOps & engineering teams** - Enforce security policies
- **Enterprises** - CI/CD integration with strict requirements
- **Security teams** - Comprehensive security monitoring
- **Project managers** - Analytics and reporting

## 📊 Before vs After

### Before NPMSafe
```
$ npm publish
+ my-package@1.2.3
✅ Published successfully!

...later...
🚨 SECURITY ALERT: AWS credentials found in published package!
🚨 Package downloaded 50,000+ times
🚨 Emergency unpublish required
```

### After NPMSafe
```
$ npx npmsafe publish
🔐 Starting secret scan...
🚨 CRITICAL: AWS Access Key detected in config.js:15
🚫 Publishing blocked: Secrets detected in files to be published
✅ Crisis averted! No secrets published.
📊 Analytics updated
🔔 Slack notification sent
📝 Changelog generated
```

## 🚀 Advanced Features

### Real-time Monitoring
- Continuous security monitoring
- Performance tracking
- Dependency vulnerability alerts
- Team activity monitoring

### Advanced Integrations
- **GitHub** - Issue creation, PR comments, release management
- **Slack** - Team notifications, security alerts, status updates
- **Discord** - Community updates, security alerts
- **Jira** - Ticket creation, status updates, project tracking
- **Linear** - Issue tracking, project management
- **Email** - Custom email notifications
- **Custom APIs** - REST API integrations

### Security Features
- **Encrypted Secrets Vault** - Secure storage for sensitive data
- **API Key Verification** - Validate external service credentials
- **License Compliance** - Ensure proper licensing
- **Dependency Auditing** - Comprehensive vulnerability scanning
- **Real-time Threat Detection** - Continuous security monitoring

### Analytics & Reporting
- **Publish Metrics** - Download counts, version tracking
- **Security Analytics** - Secret detection patterns, vulnerability trends
- **Team Analytics** - Activity tracking, performance metrics
- **Custom Reports** - Configurable reporting and exports

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/npmsafe/npmsafe.git
cd npmsafe
npm install
npm run build
npm test
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- __tests__/secret-scanner.test.js

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the need for safer npm publishing workflows
- Built with modern TypeScript and Node.js best practices
- Community-driven development and feedback
- Advanced security and monitoring capabilities

---

**Made with ❤️ for the npm community**

*Stop npm publishing accidents before they happen with NPMSafe!* 