import { NPMSafeLogger } from '../utils/logger.js';
import { readFileSync, existsSync } from 'fs';

export interface LicenseInfo {
  name: string;
  version: string;
  license: string;
  licenseText?: string;
  compatible: boolean;
  issues: string[];
  spdxId?: string;
  url?: string;
}

export interface LicenseComplianceResult {
  packages: LicenseInfo[];
  summary: {
    total: number;
    compatible: number;
    incompatible: number;
    unknown: number;
    issues: number;
  };
  recommendations: string[];
  projectLicense: string;
  timestamp: string;
  duration: number;
}

export interface LicenseCheckerOptions {
  allowedLicenses?: string[];
  blockedLicenses?: string[];
  projectLicense?: string;
  strictMode?: boolean;
  includeDevDependencies?: boolean;
}

export class LicenseChecker {
  private logger: NPMSafeLogger;
  private allowedLicenses: Set<string>;
  private blockedLicenses: Set<string>;
  private projectLicense: string;

  // Common license compatibility matrix
  private readonly licenseCompatibility: Record<string, string[]> = {
    'MIT': ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'Unlicense'],
    'Apache-2.0': ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'Unlicense'],
    'GPL-2.0': ['GPL-2.0', 'GPL-3.0', 'LGPL-2.1', 'LGPL-3.0'],
    'GPL-3.0': ['GPL-3.0', 'LGPL-3.0'],
    'LGPL-2.1': ['LGPL-2.1', 'LGPL-3.0', 'MIT', 'Apache-2.0'],
    'LGPL-3.0': ['LGPL-3.0', 'MIT', 'Apache-2.0'],
    'BSD-2-Clause': ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'Unlicense'],
    'BSD-3-Clause': ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'Unlicense'],
    'ISC': ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'Unlicense'],
    'Unlicense': ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'Unlicense'],
  };

  constructor(options: LicenseCheckerOptions = {}) {
    this.logger = new NPMSafeLogger();
    this.allowedLicenses = new Set(options.allowedLicenses || []);
    this.blockedLicenses = new Set(options.blockedLicenses || []);
    this.projectLicense = options.projectLicense || this.detectProjectLicense();
  }

  /**
   * Check license compliance for all dependencies
   */
  async checkCompliance(options: LicenseCheckerOptions = {}): Promise<LicenseComplianceResult> {
    const startTime = Date.now();
    this.logger.info('📄 Starting license compliance check...');

    try {
      // Update options
      if (options.allowedLicenses) {
        this.allowedLicenses = new Set(options.allowedLicenses);
      }
      if (options.blockedLicenses) {
        this.blockedLicenses = new Set(options.blockedLicenses);
      }
      if (options.projectLicense) {
        this.projectLicense = options.projectLicense;
      }

      // Get package information
      const packages = await this.getPackageLicenses(options.includeDevDependencies);
      
      // Analyze each package
      const analyzedPackages = packages.map(pkg => this.analyzePackage(pkg));
      
      // Generate summary
      const summary = this.generateSummary(analyzedPackages);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(analyzedPackages, summary);
      
      const duration = Date.now() - startTime;
      
      this.logger.info(`✅ License compliance check completed in ${duration}ms`);
      this.logger.info(`Found ${summary.incompatible} incompatible licenses out of ${summary.total} packages`);

      return {
        packages: analyzedPackages,
        summary,
        recommendations,
        projectLicense: this.projectLicense,
        timestamp: new Date().toISOString(),
        duration,
      };
    } catch (error) {
      this.logger.error('❌ License compliance check failed:', error);
      throw error;
    }
  }

  /**
   * Get license information for all packages
   */
  private async getPackageLicenses(includeDev = false): Promise<Array<{ name: string; version: string; license: string }>> {
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
      const dependencies = { ...packageJson.dependencies };
      
      if (includeDev) {
        Object.assign(dependencies, packageJson.devDependencies || {});
      }

      const packages: Array<{ name: string; version: string; license: string }> = [];

      for (const [name, version] of Object.entries(dependencies)) {
        try {
          const pkgPath = `node_modules/${name}/package.json`;
          if (existsSync(pkgPath)) {
            const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf-8'));
            packages.push({
              name,
              version: version as string,
              license: pkgJson.license || 'UNKNOWN',
            });
          }
        } catch (error) {
          this.logger.warn(`Could not read license for ${name}: ${error}`);
          packages.push({
            name,
            version: version as string,
            license: 'UNKNOWN',
          });
        }
      }

      return packages;
    } catch (error) {
      this.logger.error('Failed to read package.json:', error);
      return [];
    }
  }

  /**
   * Analyze a single package's license
   */
  private analyzePackage(pkg: { name: string; version: string; license: string }): LicenseInfo {
    const issues: string[] = [];
    let compatible = true;

    // Check if license is blocked
    if (this.blockedLicenses.has(pkg.license)) {
      issues.push(`License "${pkg.license}" is explicitly blocked`);
      compatible = false;
    }

    // Check if license is allowed (if allowlist is specified)
    if (this.allowedLicenses.size > 0 && !this.allowedLicenses.has(pkg.license)) {
      issues.push(`License "${pkg.license}" is not in the allowed list`);
      compatible = false;
    }

    // Check compatibility with project license
    if (this.projectLicense && pkg.license !== 'UNKNOWN') {
      const isCompatible = this.isLicenseCompatible(this.projectLicense, pkg.license);
      if (!isCompatible) {
        issues.push(`License "${pkg.license}" is incompatible with project license "${this.projectLicense}"`);
        compatible = false;
      }
    }

    // Check for unknown licenses
    if (pkg.license === 'UNKNOWN' || pkg.license === 'undefined') {
      issues.push('License information is missing or unknown');
      compatible = false;
    }

    return {
      name: pkg.name,
      version: pkg.version,
      license: pkg.license,
      compatible,
      issues,
      spdxId: this.normalizeLicense(pkg.license) || '',
      url: '',
    };
  }

  /**
   * Check if two licenses are compatible
   */
  private isLicenseCompatible(projectLicense: string, dependencyLicense: string): boolean {
    const normalizedProject = this.normalizeLicense(projectLicense);
    const normalizedDependency = this.normalizeLicense(dependencyLicense);

    // If either license is unknown, assume incompatible
    if (!normalizedProject || !normalizedDependency) {
      return false;
    }

    // Check compatibility matrix
    const compatibleLicenses = this.licenseCompatibility[normalizedProject];
    if (compatibleLicenses) {
      return compatibleLicenses.includes(normalizedDependency);
    }

    // If not in matrix, check if they're the same
    return normalizedProject === normalizedDependency;
  }

  /**
   * Normalize license string to SPDX format
   */
  private normalizeLicense(license: string): string | undefined {
    if (!license || license === 'UNKNOWN' || license === 'undefined') {
      return undefined;
    }

    // Common license variations
    const licenseMap: Record<string, string> = {
      'MIT': 'MIT',
      'Apache 2.0': 'Apache-2.0',
      'Apache-2.0': 'Apache-2.0',
      'Apache License 2.0': 'Apache-2.0',
      'GPL-2.0': 'GPL-2.0',
      'GPL-3.0': 'GPL-3.0',
      'GPLv2': 'GPL-2.0',
      'GPLv3': 'GPL-3.0',
      'LGPL-2.1': 'LGPL-2.1',
      'LGPL-3.0': 'LGPL-3.0',
      'BSD-2-Clause': 'BSD-2-Clause',
      'BSD-3-Clause': 'BSD-3-Clause',
      'BSD': 'BSD-3-Clause',
      'ISC': 'ISC',
      'Unlicense': 'Unlicense',
      'CC0-1.0': 'CC0-1.0',
      'CC-BY-4.0': 'CC-BY-4.0',
      'CC-BY-SA-4.0': 'CC-BY-SA-4.0',
    };

    return licenseMap[license] || license;
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(packages: LicenseInfo[]): LicenseComplianceResult['summary'] {
    const summary = {
      total: packages.length,
      compatible: 0,
      incompatible: 0,
      unknown: 0,
      issues: 0,
    };

    for (const pkg of packages) {
      if (pkg.compatible) {
        summary.compatible++;
      } else {
        summary.incompatible++;
      }

      if (pkg.license === 'UNKNOWN' || pkg.license === 'undefined') {
        summary.unknown++;
      }

      summary.issues += pkg.issues.length;
    }

    return summary;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(packages: LicenseInfo[], summary: any): string[] {
    const recommendations: string[] = [];

    if (summary.incompatible > 0) {
      recommendations.push(`🚨 ${summary.incompatible} packages have incompatible licenses`);
    }

    if (summary.unknown > 0) {
      recommendations.push(`⚠️ ${summary.unknown} packages have unknown or missing license information`);
    }

    // Specific recommendations for incompatible packages
    const incompatiblePackages = packages.filter(p => !p.compatible);
    if (incompatiblePackages.length > 0) {
      const blockedPackages = incompatiblePackages.filter(p => 
        p.issues.some(issue => issue.includes('blocked'))
      );
      
      if (blockedPackages.length > 0) {
        const names = blockedPackages.map(p => p.name).join(', ');
        recommendations.push(`🔴 Replace packages with blocked licenses: ${names}`);
      }

      const unknownLicenses = incompatiblePackages.filter(p => 
        p.license === 'UNKNOWN' || p.license === 'undefined'
      );
      
      if (unknownLicenses.length > 0) {
        const names = unknownLicenses.map(p => p.name).join(', ');
        recommendations.push(`🔍 Investigate packages with unknown licenses: ${names}`);
      }
    }

    if (summary.compatible === summary.total) {
      recommendations.push('✅ All package licenses are compatible with your project');
    }

    return recommendations;
  }

  /**
   * Detect project license from package.json
   */
  private detectProjectLicense(): string {
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
      return packageJson.license || 'UNKNOWN';
    } catch (error) {
      this.logger.warn('Could not detect project license from package.json');
      return 'UNKNOWN';
    }
  }

  /**
   * Check if a specific package's license is compatible
   */
  async checkPackageLicense(packageName: string, version?: string): Promise<LicenseInfo | null> {
    const packages = await this.getPackageLicenses();
    const pkg = packages.find(p => 
      p.name === packageName && 
      (!version || p.version === version)
    );

    if (!pkg) {
      return null;
    }

    return this.analyzePackage(pkg);
  }

  /**
   * Get all incompatible packages
   */
  async getIncompatiblePackages(): Promise<LicenseInfo[]> {
    const result = await this.checkCompliance();
    return result.packages.filter(p => !p.compatible);
  }

  /**
   * Get packages with unknown licenses
   */
  async getUnknownLicensePackages(): Promise<LicenseInfo[]> {
    const result = await this.checkCompliance();
    return result.packages.filter(p => 
      p.license === 'UNKNOWN' || p.license === 'undefined'
    );
  }

  /**
   * Generate a detailed report
   */
  async generateReport(options: LicenseCheckerOptions = {}): Promise<string> {
    const result = await this.checkCompliance(options);
    
    let report = `# License Compliance Report\n\n`;
    report += `**Generated:** ${result.timestamp}\n`;
    report += `**Duration:** ${result.duration}ms\n`;
    report += `**Project License:** ${result.projectLicense}\n\n`;

    // Summary
    report += `## Summary\n\n`;
    report += `- **Total Packages:** ${result.summary.total}\n`;
    report += `- **Compatible:** ${result.summary.compatible}\n`;
    report += `- **Incompatible:** ${result.summary.incompatible}\n`;
    report += `- **Unknown:** ${result.summary.unknown}\n`;
    report += `- **Total Issues:** ${result.summary.issues}\n\n`;

    // Recommendations
    if (result.recommendations.length > 0) {
      report += `## Recommendations\n\n`;
      for (const rec of result.recommendations) {
        report += `- ${rec}\n`;
      }
      report += `\n`;
    }

    // Incompatible packages
    const incompatiblePackages = result.packages.filter(p => !p.compatible);
    if (incompatiblePackages.length > 0) {
      report += `## Incompatible Packages\n\n`;
      for (const pkg of incompatiblePackages) {
        report += `### ${pkg.name}@${pkg.version}\n\n`;
        report += `- **License:** ${pkg.license}\n`;
        report += `- **SPDX ID:** ${pkg.spdxId || 'Unknown'}\n`;
        report += `- **Issues:**\n`;
        for (const issue of pkg.issues) {
          report += `  - ${issue}\n`;
        }
        report += `\n`;
      }
    }

    return report;
  }

  /**
   * Set allowed licenses
   */
  setAllowedLicenses(licenses: string[]): void {
    this.allowedLicenses = new Set(licenses);
    this.logger.info(`Allowed licenses updated: ${licenses.join(', ')}`);
  }

  /**
   * Set blocked licenses
   */
  setBlockedLicenses(licenses: string[]): void {
    this.blockedLicenses = new Set(licenses);
    this.logger.info(`Blocked licenses updated: ${licenses.join(', ')}`);
  }

  /**
   * Set project license
   */
  setProjectLicense(license: string): void {
    this.projectLicense = license;
    this.logger.info(`Project license set to: ${license}`);
  }
} 