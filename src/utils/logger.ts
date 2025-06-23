import chalk from 'chalk';
import { Logger, LogLevel } from '../types/index.js';

class NPMSafeLogger implements Logger {
  private level: LogLevel = 'info';
  private silent: boolean = false;

  constructor(level: LogLevel = 'info') {
    this.level = level;
    this.silent = level === 'silent';
  }

  setLevel(level: LogLevel): void {
    this.level = level;
    this.silent = level === 'silent';
  }

  private shouldLog(messageLevel: LogLevel): boolean {
    if (this.silent) return false;
    
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      silent: 4
    };
    
    return levels[messageLevel] >= levels[this.level];
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(chalk.gray(`🔍 ${message}`), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(chalk.blue(`ℹ️  ${message}`), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.log(chalk.yellow(`⚠️  ${message}`), ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.log(chalk.red(`❌ ${message}`), ...args);
    }
  }

  success(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(chalk.green(`✅ ${message}`), ...args);
    }
  }

  // Special logging methods for npmsafe
  version(current: string, recommended: string, bump: string): void {
    if (this.shouldLog('info')) {
      console.log(chalk.cyan(`🔢 Version: ${current} → ${recommended} (${bump} bump)`));
    }
  }

  secretFound(file: string, line: number, pattern: string): void {
    if (this.shouldLog('warn')) {
      console.log(chalk.red(`🚨 Secret detected in ${file}:${line} - ${pattern}`));
    }
  }

  secretClean(): void {
    if (this.shouldLog('info')) {
      console.log(chalk.green(`🔐 No secrets found in files to be published`));
    }
  }

  gitStatus(status: string): void {
    if (this.shouldLog('info')) {
      const icon = status === 'clean' ? '✅' : '⚠️';
      const color = status === 'clean' ? chalk.green : chalk.yellow;
      console.log(color(`${icon} Git status: ${status}`));
    }
  }

  ciStatus(status: string): void {
    if (this.shouldLog('info')) {
      const icon = status === 'passing' ? '✅' : '❌';
      const color = status === 'passing' ? chalk.green : chalk.red;
      console.log(color(`${icon} CI status: ${status}`));
    }
  }

  publishReady(files: string[], size: string): void {
    if (this.shouldLog('info')) {
      console.log(chalk.green(`📦 Ready to publish ${files.length} files (${size})`));
    }
  }

  publishBlocked(reason: string): void {
    if (this.shouldLog('error')) {
      console.log(chalk.red(`🚫 Publishing blocked: ${reason}`));
    }
  }

  // Table output for structured data
  table(headers: string[], rows: string[][]): void {
    if (!this.shouldLog('info')) return;

    const maxWidths = headers.map((header, i) => {
      const columnValues = [header, ...rows.map(row => row[i] || '')];
      return Math.max(...columnValues.map(val => val.length));
    });

    // Print header
    const headerRow = headers.map((header, i) => 
      chalk.bold(header.padEnd(maxWidths[i]))
    ).join(' | ');
    console.log(chalk.cyan(headerRow));
    console.log(chalk.gray('-'.repeat(headerRow.length)));

    // Print rows
    rows.forEach(row => {
      const rowStr = row.map((cell, i) => 
        (cell || '').padEnd(maxWidths[i])
      ).join(' | ');
      console.log(rowStr);
    });
  }

  // Progress indicator
  progress(message: string): void {
    if (this.shouldLog('info')) {
      console.log(chalk.blue(`⏳ ${message}...`));
    }
  }

  // Summary output
  summary(results: Record<string, any>): void {
    if (!this.shouldLog('info')) return;

    console.log(chalk.bold('\n📊 Summary:'));
    Object.entries(results).forEach(([key, value]) => {
      const icon = this.getSummaryIcon(key, value);
      const color = this.getSummaryColor(key, value);
      console.log(color(`${icon} ${key}: ${value}`));
    });
  }

  private getSummaryIcon(key: string, value: any): string {
    const icons: Record<string, string> = {
      'Secrets Found': value > 0 ? '🚨' : '✅',
      'Git Status': value === 'clean' ? '✅' : '⚠️',
      'CI Status': value === 'passing' ? '✅' : '❌',
      'Version Bump': '🔢',
      'Files to Publish': '📦',
      'Warnings': value > 0 ? '⚠️' : '✅',
      'Errors': value > 0 ? '❌' : '✅'
    };
    return icons[key] || 'ℹ️';
  }

  private getSummaryColor(key: string, value: any): any {
    if (key.includes('Error') || key.includes('Secret') && value > 0) return chalk.red;
    if (key.includes('Warning') && value > 0) return chalk.yellow;
    if (key.includes('Status') && value === 'clean') return chalk.green;
    if (key.includes('Status') && value === 'passing') return chalk.green;
    return chalk.white;
  }
}

// Create singleton instance
const logger = new NPMSafeLogger();

export { logger, NPMSafeLogger };
export default logger; 