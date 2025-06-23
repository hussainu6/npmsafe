import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { logger } from '../utils/logger.js';
import { Analytics } from '../analytics/analytics.js';
import { WebhookManager } from '../webhooks/webhook.js';
import { SecretScanner } from '../scanners/secret-scanner.js';
import { SemanticVersioner } from '../versioning/semantic-versioner.js';
import { LicenseChecker } from '../audit/license-checker.js';
import { DependencyAuditor } from '../audit/dependency-auditor.js';
import { SecretDiffAuditor } from '../audit/secret-diff-auditor.js';
import { SlackIntegration } from '../integrations/slack.js';
import { DiscordIntegration } from '../integrations/discord.js';
import { LinearIntegration } from '../integrations/linear.js';
import { JiraIntegration } from '../integrations/jira.js';
import { GitHubIntegration } from '../integrations/github.js';
import type { NPMSafeConfig, LogLevel } from '../types/index.js';

export interface DashboardConfig {
  port: number;
  host: string;
  jwtSecret: string;
  corsOrigin: string;
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  auth: {
    enabled: boolean;
    users: Array<{
      username: string;
      password: string;
      role: 'admin' | 'user' | 'viewer';
    }>;
  };
  features: {
    realTimeMonitoring: boolean;
    analytics: boolean;
    integrations: boolean;
    securityAudit: boolean;
    deploymentManagement: boolean;
  };
}

export interface DashboardStats {
  totalScans: number;
  totalPublishes: number;
  totalSecretsFound: number;
  totalVulnerabilities: number;
  totalLicenseIssues: number;
  activeIntegrations: number;
  lastScan: string;
  lastPublish: string;
  systemHealth: 'healthy' | 'warning' | 'critical';
  uptime: number;
}

interface Session {
  id: string;
  user: any;
  createdAt: number;
}

export class DashboardServer {
  private app!: express.Application;
  private server?: any;
  private io!: any;
  private config: DashboardConfig;
  private analytics!: Analytics;
  private webhookManager!: WebhookManager;
  private secretScanner!: SecretScanner;
  private versioner!: SemanticVersioner;
  private licenseChecker!: LicenseChecker;
  private dependencyAuditor!: DependencyAuditor;
  private secretDiffAuditor!: SecretDiffAuditor;
  private sessions: Map<string, Session> = new Map();
  private stats!: DashboardStats;
  private isRunning: boolean = false;

  constructor(config: Partial<DashboardConfig> = {}) {
    this.config = {
      port: 3000,
      host: 'localhost',
      jwtSecret: process.env.JWT_SECRET || 'npmsafe-dashboard-secret',
      corsOrigin: process.env.CORS_ORIGIN || '*',
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100
      },
      auth: {
        enabled: true,
        users: [
          {
            username: 'admin',
            password: bcrypt.hashSync('admin123', 10),
            role: 'admin'
          }
        ]
      },
      features: {
        realTimeMonitoring: true,
        analytics: true,
        integrations: true,
        securityAudit: true,
        deploymentManagement: true
      },
      ...config
    };

    this.initializeComponents();
    this.setupExpress();
    this.setupMiddleware();
    this.setupRoutes();
    this.getSocketIO();
    this.initializeStats();
  }

  private initializeComponents(): void {
    this.app = express();
    this.server = createServer(this.app);
    this.analytics = new Analytics();
    this.webhookManager = new WebhookManager([]);
    this.secretScanner = new SecretScanner();
    this.versioner = new SemanticVersioner();
    this.licenseChecker = new LicenseChecker();
    this.dependencyAuditor = new DependencyAuditor();
    this.secretDiffAuditor = new SecretDiffAuditor();
    this.stats = {
      totalScans: 0,
      totalPublishes: 0,
      totalSecretsFound: 0,
      totalVulnerabilities: 0,
      totalLicenseIssues: 0,
      activeIntegrations: 0,
      lastScan: 'Never',
      lastPublish: '',
      systemHealth: 'healthy',
      uptime: 0
    };
  }

  private setupExpress(): void {
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: this.config.corsOrigin,
        methods: ['GET', 'POST']
      }
    });

    this.io.on('connection', (socket: any) => {
      logger.info(`Dashboard client connected: ${socket.id}`);

      socket.on('join-room', (room: string) => {
        socket.join(room);
        logger.info(`Client ${socket.id} joined room: ${room}`);
      });

      socket.on('disconnect', () => {
        logger.info(`Dashboard client disconnected: ${socket.id}`);
      });
    });
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({ origin: this.config.corsOrigin }));
    this.app.use(compression());
    this.app.use(morgan('combined'));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Logging
    this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });

    // Authentication middleware
    if (this.config.auth.enabled) {
      this.app.use(this.authMiddleware.bind(this));
    }
  }

  private authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const session = this.sessions.get(token);
    if (!session || Date.now() - session.createdAt > 24 * 60 * 60 * 1000) { // 24 hours
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    (req as any).user = session.user;
    next();
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
      });
    });

    // Authentication routes
    this.app.post('/auth/login', this.login.bind(this));
    this.app.post('/auth/logout', this.logout.bind(this));

    // API routes
    this.app.get('/api/stats', this.getStats.bind(this));
    this.app.get('/api/analytics', this.getAnalytics.bind(this));
    this.app.post('/api/scan', this.runScan.bind(this));
    this.app.post('/api/audit', this.runAudit.bind(this));
    this.app.get('/api/integrations', this.getIntegrations.bind(this));
    this.app.post('/api/integrations/:type/test', this.testIntegration.bind(this));
    this.app.get('/api/logs', this.getLogs.bind(this));
    this.app.post('/api/webhooks', this.createWebhook.bind(this));
    this.app.get('/api/webhooks', this.getWebhooks.bind(this));
    this.app.delete('/api/webhooks/:id', this.deleteWebhook.bind(this));

    // Real-time monitoring
    this.app.get('/api/monitoring/status', this.getMonitoringStatus.bind(this));
    this.app.post('/api/monitoring/start', this.startMonitoring.bind(this));
    this.app.post('/api/monitoring/stop', this.stopMonitoring.bind(this));

    // Deployment management
    this.app.get('/api/deployments', this.getDeployments.bind(this));
    this.app.post('/api/deployments', this.createDeployment.bind(this));
    this.app.put('/api/deployments/:id', this.updateDeployment.bind(this));
    this.app.delete('/api/deployments/:id', this.deleteDeployment.bind(this));

    // Serve static files for dashboard
    this.app.use(express.static('public'));
    this.app.get('*', (req, res) => {
      res.sendFile('public/index.html', { root: '.' });
    });
  }

  private async login(req: express.Request, res: express.Response): Promise<void> {
    const { username, password } = req.body;

    const user = this.config.auth.users.find(u => u.username === username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { username: user.username, role: user.role },
      this.config.jwtSecret,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { username: user.username, role: user.role } });
  }

  private async logout(req: express.Request, res: express.Response): Promise<void> {
    // In a real implementation, you might want to blacklist the token
    res.json({ message: 'Logged out successfully' });
  }

  private async getStats(req: express.Request, res: express.Response): Promise<void> {
    try {
      this.updateStats();
      res.json(this.stats);
    } catch (error) {
      logger.error('Error getting stats:', error);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  }

  private async getAnalytics(req: express.Request, res: express.Response): Promise<void> {
    try {
      const analytics = await this.analytics.getStats();
      res.json(analytics);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Failed to get analytics:', errorMessage);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  }

  private async runScan(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { patterns, exclude, entropy } = req.body;
      
      logger.info('Starting scan from dashboard...');
      const results = await this.secretScanner.scan({ patterns, exclude, entropy });
      
      // Emit real-time updates
      this.io.emit('scan-progress', { status: 'completed', results });
      
      res.json({ results, count: results.length });
    } catch (error) {
      logger.error('Error running scan:', error);
      res.status(500).json({ error: 'Failed to run scan' });
    }
  }

  private async runAudit(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { type, options } = req.body;
      let results: any;

      switch (type) {
        case 'license':
          results = await this.licenseChecker.checkCompliance(options);
          break;
        case 'dependency':
          results = await this.dependencyAuditor.audit(options);
          break;
        case 'secret-diff':
          results = await this.secretDiffAuditor.auditDiff(options);
          break;
        default:
          res.status(400).json({ error: 'Invalid audit type' });
          return;
      }

      // Emit real-time updates
      this.io.emit('audit-completed', { type, results });
      
      res.json({ results });
    } catch (error) {
      logger.error('Error running audit:', error);
      res.status(500).json({ error: 'Failed to run audit' });
    }
  }

  private async getIntegrations(req: express.Request, res: express.Response): Promise<void> {
    try {
      const integrations = Array.from((this as any).integrations?.entries() || []).map((entry: any) => {
        const [type, integration] = entry;
        return {
          type,
          status: integration.isConnected ? 'connected' : 'disconnected',
          config: integration.getConfig()
        };
      });
      
      res.json(integrations);
    } catch (error) {
      logger.error('Error getting integrations:', error);
      res.status(500).json({ error: 'Failed to get integrations' });
    }
  }

  private async testIntegration(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { type } = req.params;
      const integration = (this as any).integrations?.get(type);
      
      if (!integration) {
        res.status(404).json({ error: 'Integration not found' });
        return;
      }

      const result = await integration.testConnection();
      res.json({ success: result });
    } catch (error) {
      logger.error('Error testing integration:', error);
      res.status(500).json({ error: 'Failed to test integration' });
    }
  }

  private async getLogs(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { level, limit = 100, since } = req.query;
      // In a real implementation, you would fetch logs from a database or file
      const logs = [
        { timestamp: new Date().toISOString(), level: 'info', message: 'Dashboard accessed' },
        { timestamp: new Date().toISOString(), level: 'warn', message: 'High memory usage detected' }
      ];
      
      res.json(logs);
    } catch (error) {
      logger.error('Error getting logs:', error);
      res.status(500).json({ error: 'Failed to get logs' });
    }
  }

  private async createWebhook(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { url, events } = req.body;
      const webhook = await (this.webhookManager as any).addWebhook(url, events);
      res.json(webhook);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Failed to create webhook:', errorMessage);
      res.status(500).json({ error: 'Failed to create webhook' });
    }
  }

  private async getWebhooks(req: express.Request, res: express.Response): Promise<void> {
    try {
      const webhooks = await (this.webhookManager as any).getWebhooks();
      res.json(webhooks);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Failed to get webhooks:', errorMessage);
      res.status(500).json({ error: 'Failed to get webhooks' });
    }
  }

  private async deleteWebhook(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { id } = req.params;
      await (this.webhookManager as any).removeWebhook(id);
      res.json({ success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Failed to delete webhook:', errorMessage);
      res.status(500).json({ error: 'Failed to delete webhook' });
    }
  }

  private async getMonitoringStatus(req: express.Request, res: express.Response): Promise<void> {
    try {
      res.json({
        isRunning: this.isRunning,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      });
    } catch (error) {
      logger.error('Error getting monitoring status:', error);
      res.status(500).json({ error: 'Failed to get monitoring status' });
    }
  }

  private async startMonitoring(req: express.Request, res: express.Response): Promise<void> {
    try {
      this.isRunning = true;
      this.io.emit('monitoring-started', { timestamp: new Date().toISOString() });
      res.json({ message: 'Monitoring started' });
    } catch (error) {
      logger.error('Error starting monitoring:', error);
      res.status(500).json({ error: 'Failed to start monitoring' });
    }
  }

  private async stopMonitoring(req: express.Request, res: express.Response): Promise<void> {
    try {
      this.isRunning = false;
      this.io.emit('monitoring-stopped', { timestamp: new Date().toISOString() });
      res.json({ message: 'Monitoring stopped' });
    } catch (error) {
      logger.error('Error stopping monitoring:', error);
      res.status(500).json({ error: 'Failed to stop monitoring' });
    }
  }

  private async getDeployments(req: express.Request, res: express.Response): Promise<void> {
    try {
      // Mock deployment data
      const deployments = [
        {
          id: uuidv4(),
          name: 'Production Deploy',
          status: 'success',
          timestamp: new Date().toISOString(),
          version: '1.2.3',
          environment: 'production'
        }
      ];
      
      res.json(deployments);
    } catch (error) {
      logger.error('Error getting deployments:', error);
      res.status(500).json({ error: 'Failed to get deployments' });
    }
  }

  private async createDeployment(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { name, version, environment } = req.body;
      const deployment = {
        id: uuidv4(),
        name,
        version,
        environment,
        status: 'pending',
        timestamp: new Date().toISOString()
      };
      
      // Emit real-time update
      this.io.emit('deployment-created', deployment);
      
      res.json(deployment);
    } catch (error) {
      logger.error('Error creating deployment:', error);
      res.status(500).json({ error: 'Failed to create deployment' });
    }
  }

  private async updateDeployment(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      // Mock update
      const deployment = { id, status, updatedAt: new Date().toISOString() };
      
      // Emit real-time update
      this.io.emit('deployment-updated', deployment);
      
      res.json(deployment);
    } catch (error) {
      logger.error('Error updating deployment:', error);
      res.status(500).json({ error: 'Failed to update deployment' });
    }
  }

  private async deleteDeployment(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Emit real-time update
      this.io.emit('deployment-deleted', { id });
      
      res.json({ message: 'Deployment deleted successfully' });
    } catch (error) {
      logger.error('Error deleting deployment:', error);
      res.status(500).json({ error: 'Failed to delete deployment' });
    }
  }

  private initializeStats(): void {
    this.stats = {
      totalScans: 0,
      totalPublishes: 0,
      totalSecretsFound: 0,
      totalVulnerabilities: 0,
      totalLicenseIssues: 0,
      activeIntegrations: 0,
      lastScan: 'Never',
      lastPublish: '',
      systemHealth: 'healthy',
      uptime: 0
    };
  }

  private updateStats(): void {
    this.stats.uptime = process.uptime();
    this.stats.activeIntegrations = (this as any).integrations?.size || 0;
  }

  public async start(): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        this.server.listen(this.config.port, this.config.host, () => {
          logger.info(`Dashboard server running on http://${this.config.host}:${this.config.port}`);
          this.isRunning = true;
          resolve();
        });

        this.server.on('error', (error: any) => {
          logger.error('Dashboard server error:', error);
          reject(error);
        });
      });

      // Start background tasks
      this.startBackgroundTasks();
    } catch (error) {
      logger.error('Failed to start dashboard server:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      this.isRunning = false;
      this.server.close();
      logger.info('Dashboard server stopped');
    } catch (error) {
      logger.error('Error stopping dashboard server:', error);
      throw error;
    }
  }

  private startBackgroundTasks(): void {
    // Update stats every 30 seconds
    setInterval(() => {
      this.updateStats();
      this.io.emit('stats-updated', this.stats);
    }, 30000);

    // Health check every minute
    setInterval(() => {
      const health = this.checkSystemHealth();
      this.io.emit('health-updated', health);
    }, 60000);
  }

  private checkSystemHealth(): any {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    let health = 'healthy';
    if (memoryUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
      health = 'warning';
    }
    if (memoryUsage.heapUsed > 1 * 1024 * 1024 * 1024) { // 1GB
      health = 'critical';
    }

    return {
      status: health,
      memory: memoryUsage,
      cpu: cpuUsage,
      timestamp: new Date().toISOString()
    };
  }

  public getSocketIO(): SocketIOServer {
    return this.io;
  }

  public getConfig(): DashboardConfig {
    return this.config;
  }
} 