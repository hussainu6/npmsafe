import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

export interface AnalyticsEvent {
  type: 'publish' | 'scan' | 'unpublish' | 'audit' | 'login' | 'error';
  timestamp: string;
  user?: string;
  details?: Record<string, any>;
}

export class Analytics {
  private analyticsFile = path.resolve('.npmsafe-analytics.json');
  private history: AnalyticsEvent[] = [];

  constructor() {
    this.load();
  }

  recordEvent(event: AnalyticsEvent) {
    this.history.push({ ...event, timestamp: new Date().toISOString() });
    this.save();
  }

  getStats() {
    const stats: Record<string, number> = {};
    for (const event of this.history) {
      stats[event.type] = (stats[event.type] || 0) + 1;
    }
    return stats;
  }

  generateReport(): string {
    const stats = this.getStats();
    let report = '📊 NPMSafe Analytics Report\n\n';
    for (const [type, count] of Object.entries(stats)) {
      const icon = type === 'publish' ? '📦' : type === 'scan' ? '🔐' : type === 'unpublish' ? '⛔' : 'ℹ️';
      report += `${icon} ${type}: ${count}\n`;
    }
    report += `\nTotal events: ${this.history.length}\n`;
    return report;
  }

  private load() {
    if (existsSync(this.analyticsFile)) {
      try {
        this.history = JSON.parse(readFileSync(this.analyticsFile, 'utf-8'));
      } catch {
        this.history = [];
      }
    }
  }

  private save() {
    writeFileSync(this.analyticsFile, JSON.stringify(this.history, null, 2));
  }
} 