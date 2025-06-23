import { readFileSync, existsSync, writeFileSync } from 'fs';
import { SecretScanResult } from '../types/index.js';
import logger from '../utils/logger.js';

export interface SecretDiffResult {
  added: SecretScanResult[];
  removed: SecretScanResult[];
  modified: Array<{
    old: SecretScanResult;
    newSecret: SecretScanResult;
  }>;
  unchanged: SecretScanResult[];
  summary: {
    totalAdded: number;
    totalRemoved: number;
    totalModified: number;
    totalUnchanged: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface SecretAuditHistory {
  version: string;
  timestamp: string;
  secrets: SecretScanResult[];
  diff?: SecretDiffResult;
}

export class SecretDiffAuditor {
  private auditFile = '.npmsafe-audit.json';
  private history: SecretAuditHistory[] = [];

  constructor() {
    this.loadAuditHistory();
  }

  async auditDiff(options: {
    since?: string;
    version?: string;
    currentSecrets: SecretScanResult[];
    compareTo?: SecretScanResult[];
  }): Promise<SecretDiffResult> {
    logger.progress('Auditing secret changes');

    const { since, version, currentSecrets, compareTo } = options;
    
    // Get baseline secrets to compare against
    let baselineSecrets: SecretScanResult[] = [];
    
    if (compareTo) {
      baselineSecrets = compareTo;
    } else if (since) {
      baselineSecrets = this.getSecretsSince(since);
    } else if (version) {
      baselineSecrets = this.getSecretsForVersion(version);
    } else {
      // Compare with last audit
      const lastAudit = this.getLastAudit();
      if (lastAudit) {
        baselineSecrets = lastAudit.secrets;
      }
    }

    const diff = this.computeDiff(baselineSecrets, currentSecrets);
    
    // Save current audit
    this.saveAudit({
      version: version || 'current',
      timestamp: new Date().toISOString(),
      secrets: currentSecrets,
      diff
    });

    return diff;
  }

  private computeDiff(baseline: SecretScanResult[], current: SecretScanResult[]): SecretDiffResult {
    const added: SecretScanResult[] = [];
    const removed: SecretScanResult[] = [];
    const modified: Array<{ old: SecretScanResult; newSecret: SecretScanResult }> = [];
    const unchanged: SecretScanResult[] = [];

    // Create maps for efficient lookup
    const baselineMap = new Map<string, SecretScanResult>();
    const currentMap = new Map<string, SecretScanResult>();

    baseline.forEach(secret => {
      const key = this.getSecretKey(secret);
      baselineMap.set(key, secret);
    });

    current.forEach(secret => {
      const key = this.getSecretKey(secret);
      currentMap.set(key, secret);
    });

    // Find added secrets
    current.forEach(secret => {
      const key = this.getSecretKey(secret);
      if (!baselineMap.has(key)) {
        added.push(secret);
      }
    });

    // Find removed secrets
    baseline.forEach(secret => {
      const key = this.getSecretKey(secret);
      if (!currentMap.has(key)) {
        removed.push(secret);
      }
    });

    // Find modified secrets
    baseline.forEach(secret => {
      const key = this.getSecretKey(secret);
      const currentSecret = currentMap.get(key);
      if (currentSecret && this.hasSecretChanged(secret, currentSecret)) {
        modified.push({ old: secret, newSecret: currentSecret });
      }
    });

    // Find unchanged secrets
    baseline.forEach(secret => {
      const key = this.getSecretKey(secret);
      const currentSecret = currentMap.get(key);
      if (currentSecret && !this.hasSecretChanged(secret, currentSecret)) {
        unchanged.push(currentSecret);
      }
    });

    const summary = {
      totalAdded: added.length,
      totalRemoved: removed.length,
      totalModified: modified.length,
      totalUnchanged: unchanged.length,
      riskLevel: this.calculateRiskLevel(added, removed, modified)
    };

    return { added, removed, modified, unchanged, summary };
  }

  private getSecretKey(secret: SecretScanResult): string {
    return `${secret.file}:${secret.line}:${secret.pattern.name}`;
  }

  private hasSecretChanged(old: SecretScanResult, current: SecretScanResult): boolean {
    return old.value !== current.value || 
           old.entropy !== current.entropy ||
           old.pattern.severity !== current.pattern.severity;
  }

  private calculateRiskLevel(
    added: SecretScanResult[], 
    removed: SecretScanResult[], 
    modified: Array<{ old: SecretScanResult; newSecret: SecretScanResult }>
  ): 'low' | 'medium' | 'high' | 'critical' {
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;

    // Count added secrets by severity
    added.forEach(secret => {
      switch (secret.pattern.severity) {
        case 'critical': criticalCount++; break;
        case 'high': highCount++; break;
        case 'medium': mediumCount++; break;
      }
    });

    // Count modified secrets that increased in severity
    modified.forEach(({ old, newSecret }) => {
      if (this.getSeverityWeight(newSecret.pattern.severity) > this.getSeverityWeight(old.pattern.severity)) {
        switch (newSecret.pattern.severity) {
          case 'critical': criticalCount++; break;
          case 'high': highCount++; break;
          case 'medium': mediumCount++; break;
        }
      }
    });

    if (criticalCount > 0) return 'critical';
    if (highCount > 2) return 'high';
    if (highCount > 0 || mediumCount > 5) return 'medium';
    return 'low';
  }

  private getSeverityWeight(severity: string): number {
    switch (severity) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  private loadAuditHistory(): void {
    if (existsSync(this.auditFile)) {
      try {
        const data = readFileSync(this.auditFile, 'utf-8');
        this.history = JSON.parse(data);
      } catch (error) {
        logger.debug('Error loading audit history:', error);
        this.history = [];
      }
    }
  }

  private saveAudit(audit: SecretAuditHistory): void {
    this.history.push(audit);
    
    // Keep only last 50 audits
    if (this.history.length > 50) {
      this.history = this.history.slice(-50);
    }

    try {
      writeFileSync(this.auditFile, JSON.stringify(this.history, null, 2));
    } catch (error) {
      logger.error('Error saving audit history:', error);
    }
  }

  private getLastAudit(): SecretAuditHistory | undefined {
    return this.history.length > 0 ? this.history[this.history.length - 1] : undefined;
  }

  private getSecretsSince(since: string): SecretScanResult[] {
    const sinceDate = new Date(since);
    const relevantAudits = this.history.filter(audit => 
      new Date(audit.timestamp) >= sinceDate
    );
    
    if (relevantAudits.length === 0) return [];
    
    // Return secrets from the most recent audit before the since date
    return relevantAudits[relevantAudits.length - 1].secrets;
  }

  private getSecretsForVersion(version: string): SecretScanResult[] {
    const audit = this.history.find(audit => audit.version === version);
    return audit ? audit.secrets : [];
  }

  generateAuditReport(diff: SecretDiffResult): string {
    let report = `🔍 Secret Audit Report\n\n`;
    
    report += `📊 Summary:\n`;
    report += `  • Added: ${diff.summary.totalAdded}\n`;
    report += `  • Removed: ${diff.summary.totalRemoved}\n`;
    report += `  • Modified: ${diff.summary.totalModified}\n`;
    report += `  • Unchanged: ${diff.summary.totalUnchanged}\n`;
    report += `  • Risk Level: ${diff.summary.riskLevel.toUpperCase()}\n\n`;

    if (diff.added.length > 0) {
      report += `🚨 NEW SECRETS (${diff.added.length}):\n`;
      diff.added.forEach(secret => {
        const icon = secret.pattern.severity === 'critical' ? '🚨' : 
                    secret.pattern.severity === 'high' ? '⚠️' : '🔍';
        report += `  ${icon} ${secret.file}:${secret.line} - ${secret.pattern.name}\n`;
      });
      report += '\n';
    }

    if (diff.removed.length > 0) {
      report += `✅ REMOVED SECRETS (${diff.removed.length}):\n`;
      diff.removed.forEach(secret => {
        report += `  ✅ ${secret.file}:${secret.line} - ${secret.pattern.name}\n`;
      });
      report += '\n';
    }

    if (diff.modified.length > 0) {
      report += `🔄 MODIFIED SECRETS (${diff.modified.length}):\n`;
      diff.modified.forEach(({ old, newSecret }) => {
        const severityChange = old.pattern.severity !== newSecret.pattern.severity ? 
          ` (${old.pattern.severity} → ${newSecret.pattern.severity})` : '';
        report += `  🔄 ${newSecret.file}:${newSecret.line} - ${newSecret.pattern.name}${severityChange}\n`;
      });
      report += '\n';
    }

    return report;
  }

  getAuditHistory(limit: number = 10): SecretAuditHistory[] {
    return this.history.slice(-limit);
  }

  exportAuditHistory(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.exportToCSV();
    }
    return JSON.stringify(this.history, null, 2);
  }

  private exportToCSV(): string {
    const headers = ['Version', 'Timestamp', 'Total Secrets', 'Added', 'Removed', 'Modified', 'Risk Level'];
    const rows = this.history.map(audit => [
      audit.version,
      audit.timestamp,
      audit.secrets.length,
      audit.diff?.summary.totalAdded || 0,
      audit.diff?.summary.totalRemoved || 0,
      audit.diff?.summary.totalModified || 0,
      audit.diff?.summary.riskLevel || 'unknown'
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
} 