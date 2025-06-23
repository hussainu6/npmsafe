import axios from 'axios';
import logger from '../utils/logger.js';

export class GitHubIntegration {
  private token: string;
  private repo: string;

  constructor(token: string, repo: string) {
    this.token = token;
    this.repo = repo;
  }

  async checkPRSecrets(prNumber: number, secrets: string[]): Promise<boolean> {
    // Example: Post a comment if secrets are found in a PR
    if (secrets.length === 0) return true;
    const url = `https://api.github.com/repos/${this.repo}/issues/${prNumber}/comments`;
    const body = {
      body: `🚨 Secrets detected in this PR:\n${secrets.map(s => `- ${s}`).join('\n')}`
    };
    try {
      await axios.post(url, body, {
        headers: { Authorization: `token ${this.token}` }
      });
      logger.info(`Commented on PR #${prNumber} about detected secrets.`);
      return false;
    } catch (error: any) {
      logger.error(`Failed to comment on PR: ${error.message}`);
      return false;
    }
  }

  async createRelease(tag: string, notes: string) {
    const url = `https://api.github.com/repos/${this.repo}/releases`;
    const body = {
      tag_name: tag,
      name: tag,
      body: notes,
      draft: false,
      prerelease: false
    };
    try {
      await axios.post(url, body, {
        headers: { Authorization: `token ${this.token}` }
      });
      logger.info(`GitHub release created for tag ${tag}`);
    } catch (error: any) {
      logger.error(`Failed to create GitHub release: ${error.message}`);
    }
  }
} 