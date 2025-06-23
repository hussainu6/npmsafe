import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import logger from '../utils/logger.js';
import { NPMSafeLogger } from '../utils/logger.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface Vulnerability {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  package: string;
  version: string;
  fixedIn?: string;
  cwe?: string[];
  cvss?: {
    score: number;
    vector: string;
  };
  references?: string[];
  advisory?: string;
}

export interface DependencyAuditResult {
  vulnerabilities: Vulnerability[];
  summary: {
    total: number;
    low: number;
    moderate: number;
    high: number;
    critical: number;
    riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  };
  recommendations: string[];
  packages: {
    name: string;
    version: string;
    vulnerabilities: Vulnerability[];
  }[];
  timestamp: string;
  duration: number;
}

export interface LicenseInfo {
  package: string;
  version: string;
  license: string;
  licenseText?: string;
  compatible: boolean;
  issues: string[];
  spdxId?: string;
  url?: string;
}

export interface LicenseAuditResult {
  licenses: LicenseInfo[];
  summary: {
    total: number;
    compatible: number;
    incompatible: number;
    unknown: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  recommendations: string[];
}

export interface AuditOptions {
  registry?: string;
  production?: boolean;
  dev?: boolean;
  auditLevel?: 'low' | 'moderate' | 'high' | 'critical';
  ignoreDevDependencies?: boolean;
  timeout?: number;
}

export class DependencyAuditor {
  private allowedLicenses = [
    'MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'CC0-1.0',
    'Unlicense', 'WTFPL', 'Zlib', '0BSD', 'CC-BY-4.0', 'CC-BY-SA-4.0'
  ];

  private restrictedLicenses = [
    'GPL-1.0', 'GPL-2.0', 'GPL-3.0', 'LGPL-2.0', 'LGPL-2.1', 'LGPL-3.0',
    'AGPL-1.0', 'AGPL-3.0', 'MPL-1.0', 'MPL-1.1', 'MPL-2.0'
  ];

  private logger: NPMSafeLogger;
  private npmAuditCache: Map<string, any> = new Map();
  private cacheExpiry: number = 3600000; // 1 hour

  constructor() {
    this.logger = new NPMSafeLogger();
  }

  /**
   * Run a comprehensive dependency audit
   */
  async audit(options: AuditOptions = {}): Promise<DependencyAuditResult> {
    const startTime = Date.now();
    this.logger.info('🔍 Starting dependency vulnerability audit...');

    try {
      // Run npm audit
      const npmAuditResult = await this.runNpmAudit(options);
      
      // Parse and enhance the results
      const vulnerabilities = this.parseNpmAuditResult(npmAuditResult);
      
      // Generate summary
      const summary = this.generateSummary(vulnerabilities);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(vulnerabilities, summary);
      
      // Group by packages
      const packages = this.groupByPackages(vulnerabilities);
      
      const duration = Date.now() - startTime;
      
      this.logger.info(`✅ Dependency audit completed in ${duration}ms`);
      this.logger.info(`Found ${summary.total} vulnerabilities (${summary.critical} critical, ${summary.high} high)`);

      return {
        vulnerabilities,
        summary,
        recommendations,
        packages,
        timestamp: new Date().toISOString(),
        duration,
      };
    } catch (error) {
      this.logger.error('❌ Dependency audit failed:', error);
      throw error;
    }
  }

  /**
   * Run npm audit command
   */
  private async runNpmAudit(options: AuditOptions): Promise<any> {
    const cacheKey = JSON.stringify(options);
    const cached = this.npmAuditCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      this.logger.debug('Using cached npm audit result');
      return cached.data;
    }

    const args = ['audit', '--json'];
    
    if (options.production) {
      args.push('--production');
    }
    
    if (options.auditLevel) {
      args.push('--audit-level', options.auditLevel);
    }

    try {
      const { stdout } = await execAsync(`npm ${args.join(' ')}`, {
        timeout: options.timeout || 30000,
      });

      const result = JSON.parse(stdout);
      
      // Cache the result
      this.npmAuditCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error: any) {
      if (error.code === 'ENOAUDIT') {
        this.logger.warn('No vulnerabilities found');
        return { vulnerabilities: {} };
      }
      throw error;
    }
  }

  /**
   * Parse npm audit JSON result
   */
  private parseNpmAuditResult(auditResult: any): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    
    if (!auditResult.vulnerabilities) {
      return vulnerabilities;
    }

    for (const [packageName, vulnData] of Object.entries(auditResult.vulnerabilities)) {
      const vuln = vulnData as any;
      
      vulnerabilities.push({
        id: vuln.id || `npm-${packageName}-${Date.now()}`,
        title: vuln.title || `Vulnerability in ${packageName}`,
        description: vuln.description || 'No description available',
        severity: this.mapSeverity(vuln.severity),
        package: packageName,
        version: vuln.version || 'unknown',
        fixedIn: vuln.fixedIn,
        cwe: vuln.cwe || [],
        cvss: vuln.cvss && typeof vuln.cvss.score === 'number' && typeof vuln.cvss.vector === 'string' ? {
          score: vuln.cvss.score,
          vector: vuln.cvss.vector,
        } : undefined,
        references: vuln.references || [],
        advisory: vuln.advisory,
      } as Vulnerability);
    }

    return vulnerabilities;
  }

  /**
   * Map npm severity to our severity levels
   */
  private mapSeverity(npmSeverity: string): 'low' | 'moderate' | 'high' | 'critical' {
    switch (npmSeverity?.toLowerCase()) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      case 'moderate':
      case 'medium':
        return 'moderate';
      case 'low':
      case 'info':
        return 'low';
      default:
        return 'moderate';
    }
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(vulnerabilities: Vulnerability[]): DependencyAuditResult['summary'] {
    const summary: DependencyAuditResult['summary'] = {
      total: vulnerabilities.length,
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
      riskLevel: 'low'
    };

    vulnerabilities.forEach(vuln => {
      switch (vuln.severity) {
        case 'critical': summary.critical++; break;
        case 'high': summary.high++; break;
        case 'moderate': summary.moderate++; break;
        case 'low': summary.low++; break;
      }
    });

    // Calculate risk level
    if (summary.critical > 0) summary.riskLevel = 'critical';
    else if (summary.high > 2) summary.riskLevel = 'high';
    else if (summary.high > 0 || summary.moderate > 5) summary.riskLevel = 'moderate';
    else summary.riskLevel = 'low';

    return summary;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(vulnerabilities: Vulnerability[], summary: any): string[] {
    const recommendations: string[] = [];

    if (summary.critical > 0) {
      recommendations.push('🚨 CRITICAL: Update packages with critical vulnerabilities immediately');
    }

    if (summary.high > 0) {
      recommendations.push('🔴 HIGH: Update packages with high severity vulnerabilities as soon as possible');
    }

    if (summary.moderate > 0) {
      recommendations.push('🟠 MEDIUM: Consider updating packages with medium severity vulnerabilities');
    }

    // Specific recommendations for packages with fixes available
    const packagesWithFixes = vulnerabilities.filter(v => v.fixedIn);
    if (packagesWithFixes.length > 0) {
      const packageNames = [...new Set(packagesWithFixes.map(v => v.package))];
      recommendations.push(`📦 Update these packages to fix vulnerabilities: ${packageNames.join(', ')}`);
    }

    // Recommendations for packages without fixes
    const packagesWithoutFixes = vulnerabilities.filter(v => !v.fixedIn);
    if (packagesWithoutFixes.length > 0) {
      const packageNames = [...new Set(packagesWithoutFixes.map(v => v.package))];
      recommendations.push(`⚠️ Monitor these packages for security updates: ${packageNames.join(', ')}`);
    }

    if (vulnerabilities.length === 0) {
      recommendations.push('✅ No vulnerabilities found - keep dependencies updated regularly');
    }

    return recommendations;
  }

  /**
   * Group vulnerabilities by package
   */
  private groupByPackages(vulnerabilities: Vulnerability[]): DependencyAuditResult['packages'] {
    const packageMap = new Map<string, Vulnerability[]>();

    for (const vuln of vulnerabilities) {
      if (!packageMap.has(vuln.package)) {
        packageMap.set(vuln.package, []);
      }
      packageMap.get(vuln.package)!.push(vuln);
    }

    return Array.from(packageMap.entries()).map(([name, vulns]) => ({
      name,
      version: vulns[0]?.version || 'unknown',
      vulnerabilities: vulns,
    }));
  }

  /**
   * Check if a specific package has vulnerabilities
   */
  async checkPackage(packageName: string, version?: string): Promise<Vulnerability[]> {
    const auditResult = await this.audit();
    return auditResult.vulnerabilities.filter(v => 
      v.package === packageName && 
      (!version || v.version === version)
    );
  }

  /**
   * Get vulnerabilities by severity level
   */
  async getVulnerabilitiesBySeverity(severity: 'low' | 'moderate' | 'high' | 'critical'): Promise<Vulnerability[]> {
    const auditResult = await this.audit();
    return auditResult.vulnerabilities.filter(v => v.severity === severity);
  }

  /**
   * Check if there are any critical or high vulnerabilities
   */
  async hasCriticalVulnerabilities(): Promise<boolean> {
    const auditResult = await this.audit();
    return auditResult.summary.critical > 0 || auditResult.summary.high > 0;
  }

  /**
   * Get a quick security score (0-100, higher is better)
   */
  async getSecurityScore(): Promise<number> {
    const auditResult = await this.audit();
    const { summary } = auditResult;
    
    if (summary.total === 0) {
      return 100;
    }

    // Weighted scoring: critical = -20, high = -10, moderate = -5, low = -1
    const score = 100 - (summary.critical * 20 + summary.high * 10 + summary.moderate * 5 + summary.low * 1);
    return Math.max(0, score);
  }

  /**
   * Clear the audit cache
   */
  clearCache(): void {
    this.npmAuditCache.clear();
    this.logger.info('Cache cleared');
  }

  /**
   * Set cache expiry time
   */
  setCacheExpiry(expiryMs: number): void {
    this.cacheExpiry = expiryMs;
    this.logger.info(`Cache expiry set to ${expiryMs}ms`);
  }

  /**
   * Generate a detailed report
   */
  async generateReport(options: AuditOptions = {}): Promise<string> {
    const auditResult = await this.audit(options);
    
    let report = `# Dependency Security Audit Report\n\n`;
    report += `**Generated:** ${auditResult.timestamp}\n`;
    report += `**Duration:** ${auditResult.duration}ms\n\n`;

    // Summary
    report += `## Summary\n\n`;
    report += `- **Total Vulnerabilities:** ${auditResult.summary.total}\n`;
    report += `- **Critical:** ${auditResult.summary.critical}\n`;
    report += `- **High:** ${auditResult.summary.high}\n`;
    report += `- **Moderate:** ${auditResult.summary.moderate}\n`;
    report += `- **Low:** ${auditResult.summary.low}\n\n`;

    // Security Score
    const securityScore = await this.getSecurityScore();
    report += `## Security Score\n\n`;
    report += `**${securityScore}/100** ${this.getScoreEmoji(securityScore)}\n\n`;

    // Recommendations
    if (auditResult.recommendations.length > 0) {
      report += `## Recommendations\n\n`;
      for (const rec of auditResult.recommendations) {
        report += `- ${rec}\n`;
      }
      report += `\n`;
    }

    // Vulnerabilities by Package
    if (auditResult.packages.length > 0) {
      report += `## Vulnerabilities by Package\n\n`;
      for (const pkg of auditResult.packages) {
        report += `### ${pkg.name}@${pkg.version}\n\n`;
        for (const vuln of pkg.vulnerabilities) {
          report += `- **${vuln.severity.toUpperCase()}:** ${vuln.title}\n`;
          report += `  - ${vuln.description}\n`;
          if (vuln.fixedIn) {
            report += `  - **Fixed in:** ${vuln.fixedIn}\n`;
          }
          if (vuln.cvss) {
            report += `  - **CVSS:** ${vuln.cvss.score} (${vuln.cvss.vector})\n`;
          }
          report += `\n`;
        }
      }
    }

    return report;
  }

  /**
   * Get emoji for security score
   */
  private getScoreEmoji(score: number): string {
    if (score >= 90) return '🟢';
    if (score >= 70) return '🟡';
    if (score >= 50) return '🟠';
    return '🔴';
  }

  async auditLicenses(options: {
    projectLicense?: string;
    allowList?: string[];
    blockList?: string[];
  } = {}): Promise<LicenseAuditResult> {
    logger.progress('Auditing dependency licenses');

    const { projectLicense = 'MIT', allowList = this.allowedLicenses, blockList = this.restrictedLicenses } = options;

    try {
      // Get package.json
      const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      const licenses: LicenseInfo[] = [];
      let compatible = 0;
      let incompatible = 0;
      let unknown = 0;

      for (const [packageName, version] of Object.entries(dependencies)) {
        const licenseInfo = await this.getPackageLicense(packageName, version as string);
        
        if (licenseInfo) {
          const isCompatible = this.isLicenseCompatible(licenseInfo.license, projectLicense, allowList, blockList);
          const issues = this.getLicenseIssues(licenseInfo.license, projectLicense, allowList, blockList);

          licenses.push({
            ...licenseInfo,
            compatible: isCompatible,
            issues
          });

          if (isCompatible) {
            compatible++;
          } else {
            incompatible++;
          }
        } else {
          unknown++;
          licenses.push({
            package: packageName,
            version: version as string,
            license: 'unknown',
            compatible: false,
            issues: ['License information not available'],
            spdxId: '',
            url: ''
          });
        }
      }

      const summary = {
        total: licenses.length,
        compatible,
        incompatible,
        unknown,
        riskLevel: this.calculateLicenseRiskLevel(incompatible, unknown)
      };

      const recommendations = this.generateLicenseRecommendations(licenses, projectLicense);

      return { licenses, summary, recommendations };
    } catch (error) {
      logger.error('Error auditing licenses:', error);
      return {
        licenses: [],
        summary: { total: 0, compatible: 0, incompatible: 0, unknown: 0, riskLevel: 'low' },
        recommendations: ['Unable to audit licenses']
      };
    }
  }

  private async getPackageLicense(packageName: string, version: string): Promise<LicenseInfo | null> {
    try {
      // Try to get license from npm registry
      const registryOutput = execSync(`npm view ${packageName}@${version} license --json`, { encoding: 'utf-8' });
      const license = JSON.parse(registryOutput);
      
      return {
        package: packageName,
        version,
        license: license || 'unknown',
        compatible: false,
        issues: ['License information not available'],
        spdxId: '',
        url: ''
      };
    } catch (error) {
      return null;
    }
  }

  private isLicenseCompatible(
    license: string, 
    projectLicense: string, 
    allowList: string[], 
    blockList: string[]
  ): boolean {
    const normalizedLicense = this.normalizeLicense(license);
    
    // Check if explicitly blocked
    if (blockList.some(blocked => normalizedLicense.includes(blocked.toLowerCase()))) {
      return false;
    }

    // Check if explicitly allowed
    if (allowList.some(allowed => normalizedLicense.includes(allowed.toLowerCase()))) {
      return true;
    }

    // Default to compatible for unknown licenses
    return true;
  }

  private getLicenseIssues(
    license: string, 
    projectLicense: string, 
    allowList: string[], 
    blockList: string[]
  ): string[] {
    const issues: string[] = [];
    const normalizedLicense = this.normalizeLicense(license);

    if (blockList.some(blocked => normalizedLicense.includes(blocked.toLowerCase()))) {
      issues.push(`License ${license} is in the restricted list`);
    }

    if (!allowList.some(allowed => normalizedLicense.includes(allowed.toLowerCase()))) {
      issues.push(`License ${license} is not in the allowed list`);
    }

    return issues;
  }

  private normalizeLicense(license: string): string {
    return license.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private calculateLicenseRiskLevel(incompatible: number, unknown: number): 'low' | 'medium' | 'high' | 'critical' {
    if (incompatible > 5) return 'critical';
    if (incompatible > 2 || unknown > 10) return 'high';
    if (incompatible > 0 || unknown > 5) return 'medium';
    return 'low';
  }

  private generateLicenseRecommendations(licenses: LicenseInfo[], projectLicense: string): string[] {
    const recommendations: string[] = [];

    const incompatible = licenses.filter(l => !l.compatible);
    const unknown = licenses.filter(l => l.license === 'unknown');

    if (incompatible.length > 0) {
      recommendations.push(`⚠️ Found ${incompatible.length} packages with incompatible licenses`);
      recommendations.push('Review and replace incompatible dependencies');
    }

    if (unknown.length > 0) {
      recommendations.push(`❓ Found ${unknown.length} packages with unknown licenses`);
      recommendations.push('Manually verify license compatibility');
    }

    if (incompatible.length === 0 && unknown.length === 0) {
      recommendations.push('✅ All dependencies have compatible licenses');
    }

    return recommendations;
  }

  generateVulnerabilityReport(result: DependencyAuditResult): string {
    let report = `🔍 Dependency Vulnerability Report\n\n`;
    
    report += `📊 Summary:\n`;
    report += `  • Total vulnerabilities: ${result.summary.total}\n`;
    report += `  • Critical: ${result.summary.critical}\n`;
    report += `  • High: ${result.summary.high}\n`;
    report += `  • Moderate: ${result.summary.moderate}\n`;
    report += `  • Low: ${result.summary.low}\n`;
    report += `  • Risk Level: ${result.summary.riskLevel.toUpperCase()}\n`;
    report += `  • Total packages: ${result.packages.length}\n`;
    report += `  • Outdated packages: ${result.packages.filter(p => p.version !== 'unknown').length}\n\n`;

    if (result.vulnerabilities.length > 0) {
      report += `🚨 Vulnerabilities Found:\n`;
      result.vulnerabilities.forEach(vuln => {
        const icon = vuln.severity === 'critical' ? '🚨' : 
                    vuln.severity === 'high' ? '⚠️' : 
                    vuln.severity === 'moderate' ? '🔍' : 'ℹ️';
        report += `  ${icon} ${vuln.package}@${vuln.version} - ${vuln.title}\n`;
        if (vuln.fixedIn) {
          report += `    Fixed in: ${vuln.fixedIn}\n`;
        }
      });
      report += '\n';
    }

    if (result.recommendations.length > 0) {
      report += `💡 Recommendations:\n`;
      result.recommendations.forEach(rec => {
        report += `  • ${rec}\n`;
      });
      report += '\n';
    }

    return report;
  }

  generateLicenseReport(result: LicenseAuditResult): string {
    let report = `📄 License Compliance Report\n\n`;
    
    report += `📊 Summary:\n`;
    report += `  • Total packages: ${result.summary.total}\n`;
    report += `  • Compatible: ${result.summary.compatible}\n`;
    report += `  • Incompatible: ${result.summary.incompatible}\n`;
    report += `  • Unknown: ${result.summary.unknown}\n`;
    report += `  • Risk Level: ${result.summary.riskLevel.toUpperCase()}\n\n`;

    if (result.summary.incompatible > 0) {
      report += `⚠️ Incompatible Licenses:\n`;
      result.licenses.filter(l => !l.compatible).forEach(license => {
        report += `  • ${license.package}@${license.version} - ${license.license}\n`;
        license.issues.forEach(issue => {
          report += `    - ${issue}\n`;
        });
      });
      report += '\n';
    }

    if (result.summary.unknown > 0) {
      report += `❓ Unknown Licenses:\n`;
      result.licenses.filter(l => l.license === 'unknown').forEach(license => {
        report += `  • ${license.package}@${license.version}\n`;
      });
      report += '\n';
    }

    if (result.recommendations.length > 0) {
      report += `💡 Recommendations:\n`;
      result.recommendations.forEach(rec => {
        report += `  • ${rec}\n`;
      });
      report += '\n';
    }

    return report;
  }
} 