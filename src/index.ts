import type {
  NPMSafeConfig,
  SecretPattern,
  SecretScanResult,
  VersionAnalysis,
  ChangelogEntry,
  CommitInfo,
  PublishSimulation,
  GitStatus,
  CIStatus,
  UnpublishImpact,
  WebhookPayload,
  Plugin,
  CLICommand,
  ScanOptions,
  VersionOptions,
  PublishOptions,
  MiddlewareOptions,
  LogLevel,
  Logger
} from './types/index.js';

import { SecretScanner } from './scanners/secret-scanner.js';
import { SemanticVersioner } from './versioning/semantic-versioner.js';
import { logger, NPMSafeLogger } from './utils/logger.js';

// Type exports
export type {
  NPMSafeConfig,
  SecretPattern,
  SecretScanResult,
  VersionAnalysis,
  ChangelogEntry,
  CommitInfo,
  PublishSimulation,
  GitStatus,
  CIStatus,
  UnpublishImpact,
  WebhookPayload,
  Plugin,
  CLICommand,
  ScanOptions,
  VersionOptions,
  PublishOptions,
  MiddlewareOptions,
  LogLevel,
  Logger
} from './types/index.js';

// Integration type exports
export type {
  SlackConfig,
  SlackMessage,
  SlackTeamMember
} from './integrations/slack.js';

export type {
  DiscordConfig,
  DiscordMessage,
  DiscordEmbed,
  DiscordField,
  DiscordFooter,
  DiscordThumbnail,
  DiscordImage,
  DiscordAuthor,
  DiscordComponent,
  DiscordTeamMember
} from './integrations/discord.js';

export type {
  JiraConfig,
  JiraIssue,
  JiraIssueResponse,
  JiraComment,
  JiraTransition
} from './integrations/jira.js';

export type {
  LinearConfig,
  LinearIssue,
  LinearIssueResponse,
  LinearComment
} from './integrations/linear.js';

// Audit type exports
export type {
  LicenseInfo,
  LicenseComplianceResult,
  LicenseCheckerOptions
} from './audit/license-checker.js';

export type {
  Vulnerability,
  DependencyAuditResult,
  AuditOptions
} from './audit/dependency-auditor.js';

export type {
  SecretDiffResult,
  SecretAuditHistory
} from './audit/secret-diff-auditor.js';

// Main library exports
export { SecretScanner } from './scanners/secret-scanner.js';
export { SemanticVersioner } from './versioning/semantic-versioner.js';
export { logger, NPMSafeLogger } from './utils/logger.js';

// Integration exports
export { GitHubIntegration } from './integrations/github.js';
export { SlackIntegration } from './integrations/slack.js';
export { DiscordIntegration } from './integrations/discord.js';
export { JiraIntegration } from './integrations/jira.js';
export { LinearIntegration } from './integrations/linear.js';

// Analytics and webhook exports
export { Analytics } from './analytics/analytics.js';
export { WebhookManager } from './webhooks/webhook.js';

// Audit exports
export { LicenseChecker } from './audit/license-checker.js';
export { DependencyAuditor } from './audit/dependency-auditor.js';
export { SecretDiffAuditor } from './audit/secret-diff-auditor.js';

// Advanced features exports
export { DashboardServer } from './server/dashboard-server.js';
export { AdvancedMonitor } from './monitoring/advanced-monitor.js';
export { DeploymentManager } from './deployment/deployment-manager.js';
export { AdvancedTesting } from './testing/advanced-testing.js';

// Advanced feature type exports
export type {
  DashboardConfig,
  DashboardStats
} from './server/dashboard-server.js';

export type {
  MonitoringConfig,
  MetricData,
  Alert,
  PerformanceMetrics
} from './monitoring/advanced-monitor.js';

export type {
  DeploymentConfig,
  Environment,
  DeploymentStrategy,
  Deployment,
  DeploymentStatus,
  HealthCheck,
  Approval,
  DeploymentLog,
  DeploymentRequest
} from './deployment/deployment-manager.js';

export type {
  TestingConfig,
  TestFramework,
  TestEnvironment,
  TestSuite,
  TestStatus,
  TestResult,
  TestSummary,
  PerformanceMetrics as TestPerformanceMetrics
} from './testing/advanced-testing.js';

// Main NPMSafe class
export class NPMSafe {
  private config: NPMSafeConfig;
  private secretScanner: SecretScanner;
  private versioner: SemanticVersioner;

  constructor(config?: Partial<NPMSafeConfig>) {
    this.config = {
      version: '1.0.0',
      config: {
        requireCI: true,
        blockPublishOnSecret: true,
        webhooks: [],
        plugins: [],
        secretPatterns: [],
        allowedSecrets: [],
        registry: 'https://registry.npmjs.org/',
        tag: 'latest',
        dryRun: false,
        autoVersion: true,
        changelog: true,
        gitChecks: true,
        impactAnalysis: true,
        encryption: {
          enabled: false,
          algorithm: 'aes-256-gcm'
        },
        ...config?.config
      }
    };

    this.secretScanner = new SecretScanner({
      patterns: this.config.config.secretPatterns || [],
      allowedSecrets: this.config.config.allowedSecrets || []
    });

    this.versioner = new SemanticVersioner();
  }

  // Secret scanning methods
  async scan(options?: ScanOptions): Promise<SecretScanResult[]> {
    return this.secretScanner.scan(options);
  }

  addSecretPattern(pattern: SecretPattern): void {
    this.secretScanner.addPattern(pattern);
  }

  addAllowedSecret(secret: string): void {
    this.secretScanner.addAllowedSecret(secret);
  }

  // Versioning methods
  async analyzeVersion(currentVersion: string, options?: any): Promise<VersionAnalysis> {
    return this.versioner.analyzeVersion(currentVersion, options);
  }

  async generateChangelog(version: string, since?: string): Promise<string> {
    return this.versioner.generateChangelog(version, since);
  }

  // Configuration methods
  getConfig(): NPMSafeConfig {
    return this.config;
  }

  updateConfig(updates: Partial<NPMSafeConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // Utility methods
  getLogger(): typeof logger {
    return logger;
  }

  setLogLevel(level: LogLevel): void {
    logger.setLevel(level);
  }
}

// Default export
export default NPMSafe; 