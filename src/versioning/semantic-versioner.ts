import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { VersionAnalysis, CommitInfo } from '../types/index.js';
import { logger } from '../utils/logger.js';

interface VersionOptions {
  since?: string;
  includeFiles?: string[];
  excludeFiles?: string[];
}

export class SemanticVersioner {
  /**
   * Analyze version bump based on commit history
   */
  async analyzeVersion(currentVersion: string, options: VersionOptions = {}): Promise<VersionAnalysis> {
    logger.info(`🔍 Analyzing version bump for ${currentVersion}`);

    try {
      // Get commit history
      const commits = await this.getCommitHistory();
      
      // Get file changes
      const fileChanges = await this.getFileChanges();
      
      // Analyze commits for version bump type
      const analysis = this.analyzeCommits(commits, fileChanges);
      
      // Generate new version
      const newVersion = this.calculateNewVersion(currentVersion, analysis.recommendedBump);
      
      // Calculate confidence
      const confidence = this.calculateConfidence(analysis);
      
      logger.info(`✅ Version analysis complete: ${currentVersion} → ${newVersion} (${analysis.recommendedBump})`);

      return {
        currentVersion,
        recommendedBump: analysis.recommendedBump,
        newVersion,
        reasons: analysis.reasons,
        confidence,
        breakingChanges: analysis.breakingChanges,
        features: analysis.features,
        fixes: analysis.fixes
      };
    } catch (error) {
      logger.error('❌ Version analysis failed:', error);
      throw error;
    }
  }

  /**
   * Get commit history from git
   */
  private async getCommitHistory(): Promise<CommitInfo[]> {
    try {
      const stdout = execSync('git log --pretty=format:"%H|%s|%an|%ad|%D" --date=short', { encoding: 'utf-8' });
      const lines = stdout.trim().split('\n');
      
      return lines.map((line: string) => {
        const [hash, message, author, date, refs] = line.split('|');
        const conventionalMatch = message?.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);
        
        return {
          hash: hash || '',
          message: message || '',
          author: author || '',
          date: date || '',
          type: conventionalMatch?.[1] || 'chore',
          scope: conventionalMatch?.[2] || '',
          breaking: conventionalMatch?.[3] === '!' || message?.includes('BREAKING CHANGE') || false
        };
      });
    } catch (error) {
      logger.warn('Could not get git commit history:', error);
      return [];
    }
  }

  /**
   * Get list of changed files
   */
  private async getFileChanges(): Promise<string[]> {
    try {
      const stdout = execSync('git diff --name-only HEAD~10', { encoding: 'utf-8' });
      return stdout.trim().split('\n').filter(Boolean);
    } catch (error) {
      logger.warn('Could not get file changes:', error);
      return [];
    }
  }

  /**
   * Analyze commits to determine version bump
   */
  private analyzeCommits(commits: CommitInfo[], fileChanges: string[]): {
    recommendedBump: 'major' | 'minor' | 'patch' | 'none';
    reasons: string[];
    breakingChanges: string[];
    features: string[];
    fixes: string[];
  } {
    let recommendedBump: 'major' | 'minor' | 'patch' | 'none' = 'none';
    const reasons: string[] = [];
    const breakingChanges: string[] = [];
    const features: string[] = [];
    const fixes: string[] = [];

    for (const commit of commits) {
      if (commit.breaking) {
        recommendedBump = 'major';
        breakingChanges.push(commit.message);
        reasons.push(`Breaking change: ${commit.message}`);
      } else if (commit.type === 'feat') {
        if (recommendedBump !== 'major') {
          recommendedBump = 'minor';
        }
        features.push(commit.message);
        reasons.push(`New feature: ${commit.message}`);
      } else if (commit.type === 'fix') {
        if (recommendedBump !== 'major' && recommendedBump !== 'minor') {
          recommendedBump = 'patch';
        }
        fixes.push(commit.message);
        reasons.push(`Bug fix: ${commit.message}`);
      }
    }

    // Check for API changes
    const tsFiles = fileChanges.filter(file => file.endsWith('.ts') || file.endsWith('.js'));
    if (tsFiles.length > 0) {
      const apiChanges = this.detectAPIChanges(tsFiles);
      if (apiChanges.breaking) {
        recommendedBump = 'major';
        reasons.push('API breaking changes detected');
      } else if (apiChanges.features) {
        if (recommendedBump !== 'major') {
          recommendedBump = 'minor';
        }
        reasons.push('API features detected');
      }
    }

    return {
      recommendedBump,
      reasons,
      breakingChanges,
      features,
      fixes
    };
  }

  /**
   * Calculate new version based on current version and bump type
   */
  private calculateNewVersion(currentVersion: string, bumpType: 'major' | 'minor' | 'patch' | 'none'): string {
    if (bumpType === 'none') {
      return currentVersion;
    }

    const [major, minor, patch] = currentVersion.split('.').map(Number);

    switch (bumpType) {
      case 'major':
        return `${(major || 0) + 1}.0.0`;
      case 'minor':
        return `${major || 0}.${(minor || 0) + 1}.0`;
      case 'patch':
        return `${major || 0}.${minor || 0}.${(patch || 0) + 1}`;
      default:
        return currentVersion;
    }
  }

  /**
   * Calculate confidence score (0-100)
   */
  private calculateConfidence(analysis: any): number {
    let confidence = 50;

    // Increase confidence based on number of commits
    if (analysis.breakingChanges.length > 0) confidence += 20;
    if (analysis.features.length > 0) confidence += 15;
    if (analysis.fixes.length > 0) confidence += 10;

    // Decrease confidence if no clear pattern
    if (analysis.reasons.length === 0) confidence -= 30;

    return Math.min(100, Math.max(0, confidence));
  }

  /**
   * Detect API changes in TypeScript/JavaScript files
   */
  private detectAPIChanges(files: string[]): { breaking: boolean; features: boolean } {
    // Simplified API change detection
    // In a real implementation, this would parse the files and analyze exports
    return {
      breaking: false,
      features: false
    };
  }

  /**
   * Compare two semantic versions
   */
  private compareVersions(version1: string, version2: string): number {
    const [major1, minor1, patch1] = version1.split('.').map(Number);
    const [major2, minor2, patch2] = version2.split('.').map(Number);

    if (major1 !== major2) return (major1 || 0) - (major2 || 0);
    if (minor1 !== minor2) return (minor1 || 0) - (minor2 || 0);
    return (patch1 || 0) - (patch2 || 0);
  }

  // Generate changelog from commits
  async generateChangelog(version: string, since?: string): Promise<string> {
    const commits = await this.getCommitHistory();
    
    const changelog = {
      breaking: [] as string[],
      features: [] as string[],
      fixes: [] as string[],
      docs: [] as string[],
      chore: [] as string[]
    };

    for (const commit of commits) {
      const message = commit.message.replace(/^[^:]+:\s*/, '');
      
      if (commit.breaking) {
        changelog.breaking.push(message);
      } else {
        switch (commit.type) {
          case 'feat':
            changelog.features.push(message);
            break;
          case 'fix':
          case 'perf':
            changelog.fixes.push(message);
            break;
          case 'docs':
            changelog.docs.push(message);
            break;
          default:
            changelog.chore.push(message);
        }
      }
    }

    let changelogText = `## ${version} (${new Date().toISOString().split('T')[0]})\n\n`;
    
    if (changelog.breaking.length > 0) {
      changelogText += '### ⚠️ Breaking Changes\n';
      changelog.breaking.forEach(change => {
        changelogText += `- ${change}\n`;
      });
      changelogText += '\n';
    }
    
    if (changelog.features.length > 0) {
      changelogText += '### ✨ Features\n';
      changelog.features.forEach(feature => {
        changelogText += `- ${feature}\n`;
      });
      changelogText += '\n';
    }
    
    if (changelog.fixes.length > 0) {
      changelogText += '### 🐛 Fixes\n';
      changelog.fixes.forEach(fix => {
        changelogText += `- ${fix}\n`;
      });
      changelogText += '\n';
    }
    
    if (changelog.docs.length > 0) {
      changelogText += '### 📚 Documentation\n';
      changelog.docs.forEach(doc => {
        changelogText += `- ${doc}\n`;
      });
      changelogText += '\n';
    }
    
    if (changelog.chore.length > 0) {
      changelogText += '### 🔧 Chores\n';
      changelog.chore.forEach(chore => {
        changelogText += `- ${chore}\n`;
      });
      changelogText += '\n';
    }

    return changelogText;
  }

  // Validate version format
  validateVersion(version: string): boolean {
    const semverPattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
    return semverPattern.test(version);
  }
} 