import { readFileSync, statSync } from 'fs';
import { glob } from 'glob';
import { SecretPattern, SecretScanResult, ScanOptions } from '../types/index.js';
import logger from '../utils/logger.js';

export class SecretScanner {
  private defaultPatterns: SecretPattern[] = [
    // API Keys
    {
      name: 'AWS Access Key',
      pattern: /AKIA[0-9A-Z]{12}/,
      description: 'AWS Access Key ID',
      severity: 'critical'
    },
    {
      name: 'AWS Secret Key',
      pattern: /[0-9a-zA-Z/+]{40}/,
      description: 'AWS Secret Access Key',
      severity: 'critical',
      entropy: 4.5
    },
    {
      name: 'GitHub Token',
      pattern: /ghp_[a-zA-Z0-9]{36}/,
      description: 'GitHub Personal Access Token',
      severity: 'high'
    },
    {
      name: 'GitHub OAuth Token',
      pattern: /gho_[a-zA-Z0-9]{36}/,
      description: 'GitHub OAuth Token',
      severity: 'high'
    },
    {
      name: 'NPM Token',
      pattern: /npm_[a-zA-Z0-9]{36}/,
      description: 'NPM Access Token',
      severity: 'high'
    },
    {
      name: 'Stripe Secret Key',
      pattern: /sk_live_[a-zA-Z0-9]{24}/,
      description: 'Stripe Live Secret Key',
      severity: 'critical'
    },
    {
      name: 'Stripe Test Key',
      pattern: /sk_test_[a-zA-Z0-9]{24}/,
      description: 'Stripe Test Secret Key',
      severity: 'medium'
    },
    {
      name: 'Slack Bot Token',
      pattern: /xoxb-[a-zA-Z0-9-]+/,
      description: 'Slack Bot User OAuth Token',
      severity: 'high'
    },
    {
      name: 'Slack User Token',
      pattern: /xoxp-[a-zA-Z0-9-]+/,
      description: 'Slack User OAuth Token',
      severity: 'high'
    },
    {
      name: 'Discord Bot Token',
      pattern: /[MN][a-zA-Z0-9]{23}\.[\w-]{6}\.[\w-]{27}/,
      description: 'Discord Bot Token',
      severity: 'high'
    },
    {
      name: 'JWT Secret',
      pattern: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
      description: 'JWT Token',
      severity: 'medium'
    },
    {
      name: 'Private Key',
      pattern: /-----BEGIN PRIVATE KEY-----/,
      description: 'Private Key File',
      severity: 'critical'
    },
    {
      name: 'RSA Private Key',
      pattern: /-----BEGIN RSA PRIVATE KEY-----/,
      description: 'RSA Private Key',
      severity: 'critical'
    },
    {
      name: 'SSH Private Key',
      pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/,
      description: 'SSH Private Key',
      severity: 'critical'
    },
    {
      name: 'Database URL',
      pattern: /(mongodb|postgresql|mysql|redis):\/\/[^:\s]+:[^@\s]+@[^:\s]+:\d+/,
      description: 'Database Connection String with Credentials',
      severity: 'critical'
    },
    {
      name: 'Email Password',
      pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}.*[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
      description: 'Email with Password',
      severity: 'high'
    }
  ];

  private customPatterns: SecretPattern[] = [];
  private allowedSecrets: string[] = [];

  constructor(options?: { patterns?: SecretPattern[], allowedSecrets?: string[] }) {
    if (options?.patterns) {
      this.customPatterns = options.patterns;
    }
    if (options?.allowedSecrets) {
      this.allowedSecrets = options.allowedSecrets;
    }
  }

  async scan(options: ScanOptions = {}): Promise<SecretScanResult[]> {
    const {
      patterns = ['**/*'],
      exclude = ['node_modules/**', 'dist/**', 'build/**', '.git/**', '*.log'],
      include = [],
      entropy = 3.5,
      maxFileSize = 1024 * 1024, // 1MB
      timeout = 30000,
      files = []
    } = options;

    logger.progress('Scanning for secrets');

    const results: SecretScanResult[] = [];
    const startTime = Date.now();

    // Scan provided file content first
    for (const fileData of files) {
      if (Date.now() - startTime > timeout) {
        logger.warn('Scan timeout reached');
        break;
      }

      try {
        const fileResults = this.scanContent(fileData.content, fileData.file, entropy);
        results.push(...fileResults);
      } catch (error) {
        logger.debug(`Error scanning content for ${fileData.file}: ${error}`);
      }
    }

    // Then scan files from filesystem if no content provided
    if (files.length === 0) {
      const allPatterns = [...patterns, ...include];
      const filePaths = await this.getFiles(allPatterns, exclude);
      
      for (const file of filePaths) {
        if (Date.now() - startTime > timeout) {
          logger.warn('Scan timeout reached');
          break;
        }

        try {
          const fileResults = await this.scanFile(file, entropy, maxFileSize);
          results.push(...fileResults);
        } catch (error) {
          logger.debug(`Error scanning ${file}: ${error}`);
        }
      }
    }

    return this.filterResults(results);
  }

  private async getFiles(patterns: string[], exclude: string[]): Promise<string[]> {
    const files: string[] = [];
    
    for (const pattern of patterns) {
      try {
        const matches = await glob(pattern, {
          ignore: exclude,
          nodir: true,
          absolute: true
        });
        files.push(...matches);
      } catch (error) {
        logger.debug(`Error with pattern ${pattern}: ${error}`);
      }
    }

    return [...new Set(files)];
  }

  private async scanFile(filePath: string, minEntropy: number, maxFileSize: number): Promise<SecretScanResult[]> {
    try {
      const stats = statSync(filePath);
      if (stats.size > maxFileSize) {
        logger.debug(`Skipping large file: ${filePath} (${stats.size} bytes)`);
        return [];
      }

      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const results: SecretScanResult[] = [];

      // Scan with predefined patterns
      const allPatterns = [...this.defaultPatterns, ...this.customPatterns];
      
      for (const pattern of allPatterns) {
        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
          const line = lines[lineNum];
          if (!line) continue;
          
          console.log(`Checking line ${lineNum + 1}: "${line}" against pattern ${pattern.name}`);
          
          try {
            // Create a new regex object to avoid state issues
            const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags + 'g');
            const matches = line.matchAll(regex);
            
            // Debug: Check if the regex matches at all
            const testMatch = regex.test(line);
            console.log(`Regex test result for ${pattern.name}: ${testMatch}`);
            
            for (const match of matches) {
              const value = match[0];
              const column = (match.index ?? 0) + 1;
              
              console.log(`Found match: "${value}" at column ${column}`);
              
              // Skip if in allowed secrets
              if (this.allowedSecrets.includes(value)) {
                console.log(`Skipping allowed secret: "${value}"`);
                continue;
              }

              // Check entropy if required
              if (pattern.entropy && this.calculateEntropy(value) < pattern.entropy) {
                console.log(`Skipping low entropy: "${value}"`);
                continue;
              }

              // Get context (surrounding lines)
              const context = this.getContext(lines, lineNum, 2);

              results.push({
                file: filePath,
                line: lineNum + 1,
                column,
                pattern,
                value,
                entropy: this.calculateEntropy(value),
                context
              });
            }
          } catch (error) {
            console.log(`Error matching pattern ${pattern.name}:`, error);
          }
        }
      }

      // Scan for high entropy strings (potential secrets)
      if (minEntropy > 0) {
        const entropyResults = this.scanForHighEntropy(content, filePath, minEntropy);
        results.push(...entropyResults);
      }

      return results;
    } catch (error) {
      logger.debug(`Error reading file ${filePath}: ${error}`);
      return [];
    }
  }

  private scanForHighEntropy(content: string, filePath: string, minEntropy: number): SecretScanResult[] {
    const results: SecretScanResult[] = [];
    const lines = content.split('\n');
    
    // Look for potential secrets (high entropy strings)
    const potentialSecretPattern = /[a-zA-Z0-9+/]{20,}={0,2}/g;
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      if (!line) continue;
      
      const matches = line.matchAll(potentialSecretPattern);
      
      for (const match of matches) {
        const value = match[0];
        const entropy = this.calculateEntropy(value);
        
        if (entropy >= minEntropy && !this.isLikelyNotSecret(value)) {
          const column = (match.index ?? 0) + 1;
          const context = this.getContext(lines, lineNum, 2);
          
          results.push({
            file: filePath,
            line: lineNum + 1,
            column,
            pattern: {
              name: 'High Entropy String',
              pattern: potentialSecretPattern,
              description: `High entropy string (${entropy.toFixed(2)})`,
              severity: 'medium'
            },
            value,
            entropy,
            context
          });
        }
      }
    }
    
    return results;
  }

  private calculateEntropy(str: string): number {
    const charCount: Record<string, number> = {};
    const len = str.length;
    
    for (const char of str) {
      charCount[char] = (charCount[char] || 0) + 1;
    }
    
    let entropy = 0;
    for (const count of Object.values(charCount)) {
      const probability = count / len;
      entropy -= probability * Math.log2(probability);
    }
    
    return entropy;
  }

  private isLikelyNotSecret(str: string): boolean {
    // Common patterns that look like secrets but aren't
    const falsePositives = [
      /^[0-9a-f]{32}$/, // MD5 hashes
      /^[0-9a-f]{40}$/, // SHA1 hashes
      /^[0-9a-f]{64}$/, // SHA256 hashes
      /^[A-Za-z0-9+/]{22}={0,2}$/, // Base64 encoded UUIDs
      /^[0-9]{10,}$/, // Long numbers (timestamps, etc.)
      /^[A-Z]{2,}[0-9]{2,}[A-Z0-9]*$/, // Product codes, etc.
    ];
    
    return falsePositives.some(pattern => pattern.test(str));
  }

  private getContext(lines: string[], lineNum: number, contextLines: number): string {
    const start = Math.max(0, lineNum - contextLines);
    const end = Math.min(lines.length, lineNum + contextLines + 1);
    return lines.slice(start, end).join('\n');
  }

  private filterResults(results: SecretScanResult[]): SecretScanResult[] {
    // Remove duplicates
    const seen = new Set<string>();
    return results.filter(result => {
      const key = `${result.file}:${result.line}:${result.column}:${result.value}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Utility methods
  addPattern(pattern: SecretPattern): void {
    this.customPatterns.push(pattern);
  }

  addAllowedSecret(secret: string): void {
    this.allowedSecrets.push(secret);
  }

  getPatterns(): SecretPattern[] {
    return [...this.defaultPatterns, ...this.customPatterns];
  }

  // Generate report
  generateReport(results: SecretScanResult[]): string {
    if (results.length === 0) {
      return '✅ No secrets found in scanned files.';
    }

    const severityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    results.forEach(result => {
      severityCounts[result.pattern.severity]++;
    });

    let report = `🚨 Found ${results.length} potential secrets:\n\n`;
    
    // Group by severity
    const grouped = results.reduce((acc, result) => {
      if (!acc[result.pattern.severity]) {
        acc[result.pattern.severity] = [];
      }
      acc[result.pattern.severity].push(result);
      return acc;
    }, {} as Record<string, SecretScanResult[]>);

    // Report by severity
    ['critical', 'high', 'medium', 'low'].forEach(severity => {
      const group = grouped[severity];
      if (group && group.length > 0) {
        const icon = severity === 'critical' ? '🚨' : 
                    severity === 'high' ? '⚠️' : 
                    severity === 'medium' ? '🔍' : 'ℹ️';
        
        report += `${icon} ${severity.toUpperCase()} (${group.length}):\n`;
        group.forEach(result => {
          report += `  • ${result.file}:${result.line} - ${result.pattern.name}\n`;
        });
        report += '\n';
      }
    });

    return report;
  }

  private scanContent(content: string, filePath: string, minEntropy: number): SecretScanResult[] {
    const lines = content.split('\n');
    const results: SecretScanResult[] = [];

    // Scan with predefined patterns
    const allPatterns = [...this.defaultPatterns, ...this.customPatterns];
    
    console.log('Scanning content:', content);
    console.log('All patterns:', allPatterns.map(p => ({ name: p.name, pattern: p.pattern })));
    
    for (const pattern of allPatterns) {
      for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];
        if (!line) continue;
        
        console.log(`Checking line ${lineNum + 1}: "${line}" against pattern ${pattern.name}`);
        
        try {
          // Create a new regex object to avoid state issues
          const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags + 'g');
          const matches = line.matchAll(regex);
          
          // Debug: Check if the regex matches at all
          const testMatch = regex.test(line);
          console.log(`Regex test result for ${pattern.name}: ${testMatch}`);
          
          for (const match of matches) {
            const value = match[0];
            const column = (match.index ?? 0) + 1;
            
            console.log(`Found match: "${value}" at column ${column}`);
            
            // Skip if in allowed secrets
            if (this.allowedSecrets.includes(value)) {
              console.log(`Skipping allowed secret: "${value}"`);
              continue;
            }

            // Check entropy if required
            if (pattern.entropy && this.calculateEntropy(value) < pattern.entropy) {
              console.log(`Skipping low entropy: "${value}"`);
              continue;
            }

            // Get context (surrounding lines)
            const context = this.getContext(lines, lineNum, 2);

            results.push({
              file: filePath,
              line: lineNum + 1,
              column,
              pattern,
              value,
              entropy: this.calculateEntropy(value),
              context
            });
          }
        } catch (error) {
          console.log(`Error matching pattern ${pattern.name}:`, error);
        }
      }
    }

    // Scan for high entropy strings (potential secrets)
    if (minEntropy > 0) {
      const entropyResults = this.scanForHighEntropy(content, filePath, minEntropy);
      results.push(...entropyResults);
    }

    console.log('Final results:', results);
    return results;
  }
} 