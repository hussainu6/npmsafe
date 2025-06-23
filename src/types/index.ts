export interface NPMSafeConfig {
  version: string;
  config: {
    requireCI?: boolean;
    blockPublishOnSecret?: boolean;
    webhooks?: string[];
    plugins?: string[];
    secretPatterns?: SecretPattern[];
    allowedSecrets?: string[];
    registry?: string;
    tag?: string;
    dryRun?: boolean;
    autoVersion?: boolean;
    changelog?: boolean;
    gitChecks?: boolean;
    impactAnalysis?: boolean;
    encryption?: {
      enabled: boolean;
      algorithm: string;
      keyPath?: string;
    };
    // Integration and workflow config additions
    githubToken?: string;
    githubRepo?: string;
    slackWebhookUrl?: string;
    discordWebhookUrl?: string;
    linearApiKey?: string;
    linearTeamId?: string;
    jiraUrl?: string;
    jiraUsername?: string;
    jiraApiToken?: string;
    jiraProjectKey?: string;
  };
}

export interface SecretPattern {
  name: string;
  pattern: RegExp;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  entropy?: number;
}

export interface SecretScanResult {
  file: string;
  line: number;
  column: number;
  pattern: SecretPattern;
  value: string;
  entropy?: number;
  context: string;
}

export interface VersionAnalysis {
  currentVersion: string;
  recommendedBump: 'major' | 'minor' | 'patch' | 'none';
  newVersion: string;
  reasons: string[];
  confidence: number;
  breakingChanges: string[];
  features: string[];
  fixes: string[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    breaking: string[];
    features: string[];
    fixes: string[];
    docs: string[];
    chore: string[];
  };
  commits: CommitInfo[];
}

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
  type: string;
  scope?: string;
  breaking: boolean;
}

export interface PublishSimulation {
  files: string[];
  size: number;
  registry: string;
  tag: string;
  warnings: string[];
  errors: string[];
  changelog?: ChangelogEntry;
  version?: VersionAnalysis;
}

export interface GitStatus {
  isClean: boolean;
  uncommittedFiles: string[];
  currentBranch: string;
  ahead: number;
  behind: number;
  lastCommit: string;
}

export interface CIStatus {
  isPassing: boolean;
  provider: string;
  buildUrl?: string;
  lastRun: string;
  status: 'passing' | 'failing' | 'pending' | 'unknown';
}

export interface UnpublishImpact {
  downloads: number;
  dependents: number;
  dependentPackages: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  warnings: string[];
}

export interface WebhookPayload {
  event: 'publish' | 'unpublish' | 'rollback' | 'scan' | 'version';
  package: string;
  version: string;
  timestamp: string;
  data: Record<string, any>;
}

export interface Plugin {
  name: string;
  version: string;
  hooks: {
    prePublish?: (config: NPMSafeConfig) => Promise<boolean>;
    postPublish?: (config: NPMSafeConfig) => Promise<void>;
    preScan?: (files: string[]) => Promise<string[]>;
    postScan?: (results: SecretScanResult[]) => Promise<SecretScanResult[]>;
  };
}

export interface CLICommand {
  name: string;
  description: string;
  action: (options: Record<string, any>) => Promise<void>;
  options?: Array<{
    flags: string;
    description: string;
    defaultValue?: any;
  }>;
}

export interface ScanOptions {
  patterns?: string[];
  exclude?: string[];
  include?: string[];
  entropy?: number;
  maxFileSize?: number;
  timeout?: number;
  files?: Array<{ file: string; content: string }>;
}

export interface VersionOptions {
  auto?: boolean;
  interactive?: boolean;
  dryRun?: boolean;
  commit?: boolean;
  tag?: boolean;
}

export interface PublishOptions {
  dryRun?: boolean;
  tag?: string;
  registry?: string;
  access?: 'public' | 'restricted';
  otp?: string;
}

export interface MiddlewareOptions {
  config?: NPMSafeConfig;
  onError?: (error: Error) => void;
  onSuccess?: (result: any) => void;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface Logger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  success: (message: string, ...args: any[]) => void;
} 