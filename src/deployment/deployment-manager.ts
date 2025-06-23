import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Analytics } from '../analytics/analytics.js';
import { WebhookManager } from '../webhooks/webhook.js';
import { SlackIntegration } from '../integrations/slack.js';
import { DiscordIntegration } from '../integrations/discord.js';
import { LinearIntegration } from '../integrations/linear.js';
import { JiraIntegration } from '../integrations/jira.js';
import { logger } from '../utils/logger.js';

export interface DeploymentConfig {
  environments: Environment[];
  strategies: DeploymentStrategy[];
  rollback: {
    enabled: boolean;
    automatic: boolean;
    maxRollbacks: number;
  };
  notifications: {
    slack?: {
      webhookUrl: string;
      channel: string;
    };
    discord?: {
      webhookUrl: string;
      channel: string;
    };
    linear?: {
      apiKey: string;
      teamId: string;
    };
    jira?: {
      url: string;
      username: string;
      apiToken: string;
      projectKey: string;
    };
  };
  monitoring: {
    healthChecks: boolean;
    performanceMonitoring: boolean;
    errorTracking: boolean;
  };
}

export interface Environment {
  name: string;
  type: 'development' | 'staging' | 'production' | 'custom';
  url: string;
  config: Record<string, any>;
  secrets: Record<string, string>;
  healthCheckUrl?: string;
  deploymentStrategy: string;
  autoApprove: boolean;
  requiredApprovers: string[];
}

export interface DeploymentStrategy {
  name: string;
  type: 'blue-green' | 'rolling' | 'canary' | 'recreate';
  config: {
    replicas?: number;
    maxUnavailable?: number;
    maxSurge?: number;
    canaryPercentage?: number;
    healthCheckPath?: string;
    healthCheckTimeout?: number;
  };
}

export interface Deployment {
  id: string;
  name: string;
  version: string;
  environment: string;
  status: DeploymentStatus;
  strategy: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  metadata: {
    commitHash?: string;
    branch?: string;
    author?: string;
    changelog?: string;
    artifacts?: string[];
  };
  health: {
    status: 'healthy' | 'unhealthy' | 'unknown';
    checks: HealthCheck[];
    lastChecked: string;
  };
  rollback?: {
    fromVersion: string;
    reason: string;
    timestamp: string;
  };
  approvals: Approval[];
  logs: DeploymentLog[];
}

export type DeploymentStatus = 
  | 'pending'
  | 'approved'
  | 'in-progress'
  | 'success'
  | 'failed'
  | 'rolled-back'
  | 'cancelled';

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'unknown';
  responseTime: number;
  lastChecked: string;
  details?: any;
}

export interface Approval {
  id: string;
  approver: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
  comment?: string;
}

export interface DeploymentLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  metadata?: any;
}

export interface DeploymentRequest {
  name: string;
  version: string;
  environment: string;
  strategy?: string;
  metadata?: {
    commitHash?: string;
    branch?: string;
    author?: string;
    changelog?: string;
    artifacts?: string[];
  };
  autoApprove?: boolean;
}

export class DeploymentManager extends EventEmitter {
  private config: DeploymentConfig;
  private deployments: Deployment[] = [];
  private analytics!: Analytics;
  private webhookManager!: WebhookManager;
  private slackIntegration?: SlackIntegration;
  private discordIntegration?: DiscordIntegration;
  private linearIntegration?: LinearIntegration;
  private jiraIntegration?: JiraIntegration;

  constructor(config: Partial<DeploymentConfig> = {}) {
    super();
    
    this.config = {
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
      notifications: {},
      monitoring: {
        healthChecks: true,
        performanceMonitoring: true,
        errorTracking: true
      },
      ...config
    };

    this.initializeComponents();
  }

  private initializeComponents(): void {
    this.analytics = new Analytics();
    this.webhookManager = new WebhookManager([]);

    if (this.config.notifications.slack?.webhookUrl) {
      this.slackIntegration = new SlackIntegration({
        webhookUrl: this.config.notifications.slack.webhookUrl
      });
    }

    if (this.config.notifications.discord?.webhookUrl) {
      this.discordIntegration = new DiscordIntegration({
        webhookUrl: this.config.notifications.discord.webhookUrl
      });
    }

    if (this.config.notifications.linear?.apiKey) {
      this.linearIntegration = new LinearIntegration({
        apiKey: this.config.notifications.linear.apiKey,
        teamId: this.config.notifications.linear.teamId
      });
    }

    if (this.config.notifications.jira?.url) {
      this.jiraIntegration = new JiraIntegration({
        baseUrl: this.config.notifications.jira.url,
        username: this.config.notifications.jira.username,
        apiToken: this.config.notifications.jira.apiToken,
        projectKey: this.config.notifications.jira.projectKey
      });
    }
  }

  public async createDeployment(request: DeploymentRequest): Promise<Deployment> {
    let deployment: Deployment | undefined = undefined;
    try {
      logger.info(`Creating deployment: ${request.name} v${request.version} to ${request.environment}`);

      const environment = this.config.environments.find(env => env.name === request.environment);
      if (!environment) {
        throw new Error(`Environment '${request.environment}' not found`);
      }

      const strategy = request.strategy || environment.deploymentStrategy;
      const strategyConfig = this.config.strategies.find(s => s.name === strategy);
      if (!strategyConfig) {
        throw new Error(`Deployment strategy '${strategy}' not found`);
      }

      deployment = {
        id: uuidv4(),
        name: request.name,
        version: request.version,
        environment: request.environment,
        status: 'pending',
        strategy,
        createdAt: new Date().toISOString(),
        metadata: request.metadata || {},
        health: {
          status: 'unknown',
          checks: [],
          lastChecked: new Date().toISOString()
        },
        approvals: [],
        logs: []
      };

      // Add initial log
      this.addDeploymentLog(deployment.id, 'info', 'Deployment created', { request });

      // Check if auto-approval is enabled
      if (environment.autoApprove || request.autoApprove) {
        await this.approveDeployment(deployment.id, 'system', 'Auto-approved');
      } else {
        // Create approval requests
        for (const approver of environment.requiredApprovers) {
          deployment.approvals.push({
            id: uuidv4(),
            approver,
            status: 'pending',
            timestamp: new Date().toISOString()
          });
        }
      }

      this.deployments.push(deployment);
      this.emit('deployment-created', deployment);

      // Send notifications
      await this.sendDeploymentNotifications(deployment, 'created');

      // Track analytics
      await this.analytics.recordEvent({
        type: 'publish',
        user: 'system',
        timestamp: new Date().toISOString(),
        details: { deploymentId: deployment.id, name: deployment.name, version: deployment.version, environment: deployment.environment, strategy }
      });

      await this.webhookManager.sendEvent({
        event: 'publish',
        package: deployment.name,
        version: deployment.version,
        timestamp: new Date().toISOString(),
        data: {
          deploymentId: deployment.id,
          environment: deployment.environment,
          strategy: deployment.strategy
        }
      });

      return deployment;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (deployment) {
        await this.handleDeploymentError(deployment.id, error);
      }
      throw error;
    }
  }

  public async approveDeployment(deploymentId: string, approver: string, comment?: string): Promise<void> {
    const deployment = this.deployments.find(d => d.id === deploymentId);
    if (!deployment) {
      throw new Error(`Deployment '${deploymentId}' not found`);
    }

    if (deployment.status !== 'pending') {
      throw new Error(`Deployment is not in pending status`);
    }

    const approval = deployment.approvals.find(a => a.approver === approver);
    if (approval) {
      approval.status = 'approved';
      approval.timestamp = new Date().toISOString();
      if (comment) approval.comment = comment;
    }

    this.addDeploymentLog(deploymentId, 'info', `Deployment approved by ${approver}`, { comment });

    // Check if all approvals are complete
    const pendingApprovals = deployment.approvals.filter(a => a.status === 'pending');
    if (pendingApprovals.length === 0) {
      deployment.status = 'approved';
      this.addDeploymentLog(deploymentId, 'info', 'All approvals received, deployment approved');
      
      // Start deployment
      await this.startDeployment(deploymentId);
    }

    this.emit('deployment-approved', { deploymentId, approver, comment });
  }

  public async rejectDeployment(deploymentId: string, approver: string, reason: string): Promise<void> {
    const deployment = this.deployments.find(d => d.id === deploymentId);
    if (!deployment) {
      throw new Error(`Deployment '${deploymentId}' not found`);
    }

    const approval = deployment.approvals.find(a => a.approver === approver);
    if (approval) {
      approval.status = 'rejected';
      approval.timestamp = new Date().toISOString();
      approval.comment = reason;
    }

    deployment.status = 'cancelled';
    this.addDeploymentLog(deploymentId, 'warn', `Deployment rejected by ${approver}: ${reason}`);

    await this.sendDeploymentNotifications(deployment, 'rejected');
    this.emit('deployment-rejected', { deploymentId, approver, reason });
  }

  private async startDeployment(deploymentId: string): Promise<void> {
    const deployment = this.deployments.find(d => d.id === deploymentId);
    if (!deployment) return;

    try {
      deployment.status = 'in-progress';
      deployment.startedAt = new Date().toISOString();
      
      this.addDeploymentLog(deploymentId, 'info', 'Deployment started');

      // Execute deployment based on strategy
      const strategy = this.config.strategies.find(s => s.name === deployment.strategy);
      if (!strategy) {
        throw new Error(`Strategy '${deployment.strategy}' not found`);
      }

      switch (strategy.type) {
        case 'recreate':
          await this.executeRecreateDeployment(deployment);
          break;
        case 'rolling':
          await this.executeRollingDeployment(deployment);
          break;
        case 'blue-green':
          await this.executeBlueGreenDeployment(deployment);
          break;
        case 'canary':
          await this.executeCanaryDeployment(deployment);
          break;
        default:
          throw new Error(`Unsupported deployment strategy: ${strategy.type}`);
      }

      // Mark deployment as successful
      deployment.status = 'success';
      deployment.completedAt = new Date().toISOString();
      deployment.duration = Date.now() - new Date(deployment.startedAt!).getTime();

      this.addDeploymentLog(deploymentId, 'info', 'Deployment completed successfully');

      await this.sendDeploymentNotifications(deployment, 'completed');
      this.emit('deployment-completed', deployment);

    } catch (error) {
      logger.error(`Deployment ${deploymentId} failed:`, error);
      
      deployment.status = 'failed';
      deployment.completedAt = new Date().toISOString();
      if (deployment.startedAt) {
        deployment.duration = Date.now() - new Date(deployment.startedAt).getTime();
      }

      this.addDeploymentLog(deploymentId, 'error', `Deployment failed: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);

      await this.sendDeploymentNotifications(deployment, 'failed');
      this.emit('deployment-failed', { deployment, error });

      // Check if automatic rollback is enabled
      if (this.config.rollback.automatic) {
        await this.rollbackDeployment(deploymentId, 'Automatic rollback due to deployment failure');
      }
    }
  }

  private async executeRecreateDeployment(deployment: Deployment): Promise<void> {
    this.addDeploymentLog(deployment.id, 'info', 'Executing recreate deployment strategy');
    
    // Simulate deployment steps
    await this.simulateDeploymentStep(2000);
    await this.simulateDeploymentStep(3000);
    await this.simulateDeploymentStep(2000);
  }

  private async executeRollingDeployment(deployment: Deployment): Promise<void> {
    this.addDeploymentLog(deployment.id, 'info', 'Executing rolling deployment strategy');
    
    const strategy = this.config.strategies.find(s => s.name === deployment.strategy);
    const maxUnavailable = strategy?.config.maxUnavailable || 1;
    const maxSurge = strategy?.config.maxSurge || 1;

    await this.simulateDeploymentStep(5000);
  }

  private async executeBlueGreenDeployment(deployment: Deployment): Promise<void> {
    this.addDeploymentLog(deployment.id, 'info', 'Executing blue-green deployment strategy');
    
    await this.simulateDeploymentStep(3000);
    await this.simulateDeploymentStep(2000);
    await this.simulateDeploymentStep(1000);
    await this.simulateDeploymentStep(2000);
  }

  private async executeCanaryDeployment(deployment: Deployment): Promise<void> {
    this.addDeploymentLog(deployment.id, 'info', 'Executing canary deployment strategy');
    
    const strategy = this.config.strategies.find(s => s.name === deployment.strategy);
    const canaryPercentage = strategy?.config.canaryPercentage || 10;

    await this.simulateDeploymentStep(3000);
    await this.simulateDeploymentStep(2000);
    await this.simulateDeploymentStep(3000);
    await this.simulateDeploymentStep(1000);
  }

  private async simulateDeploymentStep(duration: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, duration));
  }

  public async rollbackDeployment(deploymentId: string, reason: string): Promise<void> {
    const deployment = this.deployments.find(d => d.id === deploymentId);
    if (!deployment) {
      throw new Error(`Deployment '${deploymentId}' not found`);
    }

    // Find the previous successful deployment
    const previousDeployment = this.deployments
      .filter(d => d.environment === deployment.environment && d.status === 'success')
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[1];

    if (!previousDeployment) {
      throw new Error('No previous deployment found for rollback');
    }

    try {
      logger.info(`Rolling back deployment ${deploymentId} to version ${previousDeployment.version}`);

      deployment.status = 'rolled-back';
      deployment.rollback = {
        fromVersion: previousDeployment.version,
        reason,
        timestamp: new Date().toISOString()
      };

      this.addDeploymentLog(deploymentId, 'warn', `Rolling back to version ${previousDeployment.version}: ${reason}`);

      // Execute rollback
      await this.simulateDeploymentStep(3000);
      await this.simulateDeploymentStep(2000);

      this.addDeploymentLog(deploymentId, 'info', 'Rollback completed successfully');

      await this.sendDeploymentNotifications(deployment, 'rolled-back');
      this.emit('deployment-rolled-back', deployment);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      await this.handleRollbackError(deploymentId, error);
      throw error;
    }
  }

  public async getDeployments(filters?: {
    environment?: string;
    status?: DeploymentStatus;
    limit?: number;
  }): Promise<Deployment[]> {
    let filtered = this.deployments;

    if (filters?.environment) {
      filtered = filtered.filter(d => d.environment === filters.environment);
    }

    if (filters?.status) {
      filtered = filtered.filter(d => d.status === filters.status);
    }

    if (filters?.limit) {
      filtered = filtered.slice(-filters.limit);
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getDeployment(deploymentId: string): Deployment | undefined {
    return this.deployments.find(d => d.id === deploymentId);
  }

  public async addEnvironment(environment: Environment): Promise<void> {
    this.config.environments.push(environment);
    this.emit('environment-added', environment);
  }

  public async updateEnvironment(name: string, updates: Partial<Environment>): Promise<void> {
    const environment = this.config.environments.find(e => e.name === name);
    if (!environment) {
      throw new Error(`Environment '${name}' not found`);
    }

    Object.assign(environment, updates);
    this.emit('environment-updated', environment);
  }

  public getEnvironments(): Environment[] {
    return [...this.config.environments];
  }

  private addDeploymentLog(deploymentId: string, level: 'info' | 'warn' | 'error', message: string, metadata?: any): void {
    const deployment = this.deployments.find(d => d.id === deploymentId);
    if (!deployment) return;

    const log: DeploymentLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata
    };

    deployment.logs.push(log);
    this.emit('deployment-log', { deploymentId, log });
  }

  private async sendDeploymentNotifications(deployment: Deployment, event: string): Promise<void> {
    const message = `🚀 **Deployment ${event.toUpperCase()}**: ${deployment.name} v${deployment.version} to ${deployment.environment}`;

    try {
      if (this.slackIntegration) {
        await this.slackIntegration.sendMessage(message);
      }

      if (this.discordIntegration) {
        await this.discordIntegration.sendMessage(message);
      }

      if (this.linearIntegration) {
        await this.linearIntegration.createIssue({
          title: `Deployment ${event}`,
          description: message,
          issueType: 'Task',
          priority: 'Medium'
        });
      }

      await this.webhookManager.sendEvent({
        event: 'publish',
        package: deployment.name,
        version: deployment.version,
        timestamp: new Date().toISOString(),
        data: {
          deploymentId: deployment.id,
          environment: deployment.environment,
          strategy: deployment.strategy
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Failed to send deployment notifications:', errorMessage);
    }
  }

  public getConfig(): DeploymentConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<DeploymentConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit('config-updated', this.config);
  }

  private async handleDeploymentError(deploymentId: string, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    this.addDeploymentLog(deploymentId, 'error', `Deployment failed: ${errorMessage}`);
  }

  private async handleRollbackError(deploymentId: string, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    this.addDeploymentLog(deploymentId, 'error', `Rollback failed: ${errorMessage}`);
  }
} 