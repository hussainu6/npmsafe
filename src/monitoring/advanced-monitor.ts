import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { logger } from '../utils/logger.js';
import { Analytics } from '../analytics/analytics.js';
import { WebhookManager } from '../webhooks/webhook.js';
import { SlackIntegration } from '../integrations/slack.js';
import { DiscordIntegration } from '../integrations/discord.js';
import type { NPMSafeConfig } from '../types/index.js';

export interface MonitoringConfig {
  enabled: boolean;
  interval: number; // milliseconds
  metrics: {
    cpu: boolean;
    memory: boolean;
    disk: boolean;
    network: boolean;
    process: boolean;
    custom: boolean;
  };
  alerts: {
    enabled: boolean;
    thresholds: {
      cpu: number;
      memory: number;
      disk: number;
      responseTime: number;
    };
    channels: string[];
  };
  storage: {
    type: 'memory' | 'file' | 'database';
    retention: number; // days
    maxDataPoints: number;
  };
  integrations: {
    slack?: {
      webhookUrl: string;
      channel: string;
    };
    discord?: {
      webhookUrl: string;
      channel: string;
    };
    webhooks?: string[];
  };
}

export interface MetricData {
  id: string;
  timestamp: string;
  type: 'cpu' | 'memory' | 'disk' | 'network' | 'process' | 'custom';
  value: number;
  unit: string;
  labels: Record<string, string>;
  metadata?: any;
}

export interface Alert {
  id: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  type: string;
  message: string;
  metric?: MetricData;
  resolved: boolean;
  resolvedAt?: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  availability: number;
  customMetrics: Record<string, number>;
}

export class AdvancedMonitor extends EventEmitter {
  private config: MonitoringConfig;
  private metrics: MetricData[] = [];
  private alerts: Alert[] = [];
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;
  private performanceMetrics!: PerformanceMetrics;
  private analytics!: Analytics;
  private webhookManager!: WebhookManager;
  private slackIntegration?: SlackIntegration;
  private discordIntegration?: DiscordIntegration;
  private startTime: number;

  constructor(config: Partial<MonitoringConfig> = {}) {
    super();
    
    this.config = {
      enabled: true,
      interval: 30000,
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
          memory: 80,
          disk: 80,
          responseTime: 1000
        },
        channels: ['slack', 'discord', 'webhook']
      },
      storage: {
        type: 'memory',
        retention: 30,
        maxDataPoints: 10000
      },
      integrations: {},
      ...config
    };

    this.initializeComponents();
    this.startTime = Date.now();
  }

  private initializeComponents(): void {
    this.analytics = new Analytics();
    this.webhookManager = new WebhookManager([]);
    this.initializePerformanceMetrics();

    if (this.config.integrations.slack?.webhookUrl) {
      this.slackIntegration = new SlackIntegration({
        webhookUrl: this.config.integrations.slack.webhookUrl
      });
    }

    if (this.config.integrations.discord?.webhookUrl) {
      this.discordIntegration = new DiscordIntegration({
        webhookUrl: this.config.integrations.discord.webhookUrl
      });
    }
  }

  private initializePerformanceMetrics(): void {
    this.performanceMetrics = {
      responseTime: 0,
      throughput: 0,
      errorRate: 0,
      availability: 100,
      customMetrics: {}
    };
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Monitor is already running');
      return;
    }

    try {
      logger.info('Starting advanced monitoring system...');
      this.isRunning = true;

      // Start collecting metrics
      this.intervalId = setInterval(() => {
        this.collectMetrics();
      }, this.config.interval);

      // Initial metrics collection
      await this.collectMetrics();

      logger.info('Advanced monitoring system started successfully');
      this.emit('started');
    } catch (error) {
      logger.error('Failed to start monitoring system:', error);
      this.isRunning = false;
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Monitor is not running');
      return;
    }

    try {
      logger.info('Stopping advanced monitoring system...');
      this.isRunning = false;

      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = undefined;
      }

      logger.info('Advanced monitoring system stopped');
      this.emit('stopped');
    } catch (error) {
      logger.error('Error stopping monitoring system:', error);
      throw error;
    }
  }

  private async collectMetrics(): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const newMetrics: MetricData[] = [];

      // CPU metrics
      if (this.config.metrics.cpu) {
        const cpuUsage = await this.getCPUUsage();
        newMetrics.push({
          id: uuidv4(),
          timestamp,
          type: 'cpu',
          value: cpuUsage,
          unit: '%',
          labels: { source: 'system' }
        });
      }

      // Memory metrics
      if (this.config.metrics.memory) {
        const memoryUsage = await this.getMemoryUsage();
        newMetrics.push({
          id: uuidv4(),
          timestamp,
          type: 'memory',
          value: memoryUsage.heapUsed,
          unit: 'bytes',
          labels: { type: 'heap' }
        });
        newMetrics.push({
          id: uuidv4(),
          timestamp,
          type: 'memory',
          value: memoryUsage.rss,
          unit: 'bytes',
          labels: { type: 'rss' }
        });
      }

      // Disk metrics
      if (this.config.metrics.disk) {
        const diskUsage = await this.getDiskUsage();
        newMetrics.push({
          id: uuidv4(),
          timestamp,
          type: 'disk',
          value: diskUsage.used,
          unit: 'bytes',
          labels: { path: diskUsage.path }
        });
      }

      // Process metrics
      if (this.config.metrics.process) {
        const processMetrics = await this.getProcessMetrics();
        newMetrics.push({
          id: uuidv4(),
          timestamp,
          type: 'process',
          value: processMetrics.uptime,
          unit: 'seconds',
          labels: { metric: 'uptime' }
        });
        newMetrics.push({
          id: uuidv4(),
          timestamp,
          type: 'process',
          value: processMetrics.pid,
          unit: 'number',
          labels: { metric: 'pid' }
        });
      }

      // Add new metrics
      this.metrics.push(...newMetrics);

      // Cleanup old metrics
      this.cleanupOldMetrics();

      // Check for alerts
      await this.checkAlerts(newMetrics);

      // Emit metrics collected event
      this.emit('metrics-collected', newMetrics);

      // Update analytics
      await this.updateAnalytics(newMetrics);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Failed to collect metrics:', errorMessage);
      this.emit('error', error);
    }
  }

  private async getCPUUsage(): Promise<number> {
    const startUsage = process.cpuUsage();
    await new Promise(resolve => setTimeout(resolve, 100));
    const endUsage = process.cpuUsage(startUsage);
    
    const totalCPU = endUsage.user + endUsage.system;
    const totalTime = 100000; // 100ms in microseconds
    
    return (totalCPU / totalTime) * 100;
  }

  private async getMemoryUsage(): Promise<NodeJS.MemoryUsage> {
    return process.memoryUsage();
  }

  private async getDiskUsage(): Promise<{ used: number; total: number; path: string }> {
    // Mock disk usage - in real implementation, use fs.statfs or similar
    return {
      used: 1024 * 1024 * 1024 * 50, // 50GB
      total: 1024 * 1024 * 1024 * 100, // 100GB
      path: process.cwd()
    };
  }

  private async getProcessMetrics(): Promise<{ uptime: number; pid: number }> {
    return {
      uptime: process.uptime(),
      pid: process.pid
    };
  }

  private async checkAlerts(metrics: MetricData[]): Promise<void> {
    if (!this.config.alerts.enabled) return;

    for (const metric of metrics) {
      const threshold = this.config.alerts.thresholds[metric.type as keyof typeof this.config.alerts.thresholds];
      
      if (threshold && metric.value > threshold) {
        await this.createAlert({
          severity: metric.value > threshold * 1.5 ? 'critical' : 'warning',
          type: `${metric.type}_high`,
          message: `${metric.type.toUpperCase()} usage is high: ${metric.value}${metric.unit}`,
          metric
        });
      }
    }
  }

  private async createAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'resolved' | 'acknowledged'>): Promise<void> {
    const alert: Alert = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      resolved: false,
      acknowledged: false,
      ...alertData
    };

    this.alerts.push(alert);
    this.emit('alert-created', alert);

    // Send notifications
    await this.sendAlertNotifications(alert);
  }

  private async sendAlertNotifications(alert: Alert): Promise<void> {
    const message = `🚨 **${alert.severity.toUpperCase()} Alert**: ${alert.message}`;

    try {
      if (this.slackIntegration) {
        await this.slackIntegration.sendMessage(message);
      }

      if (this.discordIntegration) {
        await this.discordIntegration.sendMessage(message);
      }

      await this.webhookManager.sendEvent({
        event: 'scan',
        package: 'monitoring',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        data: {
          alert,
        }
      });
    } catch (error) {
      logger.error('Failed to send alert notifications:', error);
    }
  }

  public async addCustomMetric(name: string, value: number, unit: string = '', labels: Record<string, string> = {}): Promise<void> {
    if (!this.config.metrics.custom) return;

    const metric: MetricData = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type: 'custom',
      value,
      unit,
      labels: { name, ...labels }
    };

    this.metrics.push(metric);
    this.emit('custom-metric-added', metric);
  }

  public async updatePerformanceMetrics(metrics: Partial<PerformanceMetrics>): Promise<void> {
    this.performanceMetrics = { ...this.performanceMetrics, ...metrics };
    this.emit('performance-updated', this.performanceMetrics);
  }

  public async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date().toISOString();
      this.emit('alert-acknowledged', alert);
    }
  }

  public async resolveAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      this.emit('alert-resolved', alert);
    }
  }

  private cleanupOldMetrics(): void {
    const cutoffDate = moment().subtract(this.config.storage.retention, 'days').toDate();
    
    this.metrics = this.metrics.filter(metric => 
      new Date(metric.timestamp) > cutoffDate
    );

    // Limit data points
    if (this.metrics.length > this.config.storage.maxDataPoints) {
      this.metrics = this.metrics.slice(-this.config.storage.maxDataPoints);
    }
  }

  private async updateAnalytics(metrics: MetricData[]): Promise<void> {
    try {
      for (const metric of metrics) {
        await this.analytics.recordEvent({
          type: 'audit',
          timestamp: new Date().toISOString(),
          details: {
            value: metric.value,
            unit: metric.unit,
            labels: metric.labels,
            metricType: metric.type
          }
        });
      }
    } catch (error) {
      logger.error('Error updating analytics:', error);
    }
  }

  // Public getters
  public getMetrics(type?: string, limit: number = 100): MetricData[] {
    let filtered = this.metrics;
    
    if (type) {
      filtered = filtered.filter(m => m.type === type);
    }

    return filtered.slice(-limit);
  }

  public getAlerts(resolved: boolean = false, limit: number = 100): Alert[] {
    return this.alerts
      .filter(a => a.resolved === resolved)
      .slice(-limit);
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  public getStats(): {
    totalMetrics: number;
    totalAlerts: number;
    activeAlerts: number;
    uptime: number;
    isRunning: boolean;
  } {
    return {
      totalMetrics: this.metrics.length,
      totalAlerts: this.alerts.length,
      activeAlerts: this.alerts.filter(a => !a.resolved).length,
      uptime: Date.now() - this.startTime,
      isRunning: this.isRunning
    };
  }

  public getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit('config-updated', this.config);
  }
} 