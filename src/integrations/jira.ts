import { NPMSafeLogger } from '../utils/logger.js';

export interface JiraConfig {
  baseUrl: string;
  username: string;
  apiToken: string;
  projectKey: string;
  issueType?: string;
  customFields?: Record<string, any>;
}

export interface JiraIssue {
  key: string;
  summary: string;
  description: string;
  issueType: string;
  priority: 'Lowest' | 'Low' | 'Medium' | 'High' | 'Highest';
  assignee?: string;
  reporter?: string;
  labels?: string[];
  components?: string[];
  customFields?: Record<string, any>;
}

export interface JiraIssueResponse {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description: string;
    status: {
      name: string;
      statusCategory: {
        name: string;
      };
    };
    priority: {
      name: string;
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
    };
    reporter: {
      displayName: string;
      emailAddress: string;
    };
    created: string;
    updated: string;
    labels: string[];
    components: Array<{
      name: string;
    }>;
  };
}

export interface JiraTransition {
  id: string;
  name: string;
  to: {
    name: string;
    statusCategory: {
      name: string;
    };
  };
}

export interface JiraComment {
  body: string;
  author?: {
    displayName: string;
    emailAddress: string;
  };
  created: string;
  updated: string;
}

export class JiraIntegration {
  private config: JiraConfig;
  private logger: NPMSafeLogger;
  private baseHeaders: Record<string, string>;

  constructor(config: JiraConfig) {
    this.config = config;
    this.logger = new NPMSafeLogger();
    this.baseHeaders = {
      'Authorization': `Basic ${Buffer.from(`${config.username}:${config.apiToken}`).toString('base64')}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  /**
   * Create a new Jira issue
   */
  async createIssue(issue: Omit<JiraIssue, 'key'>): Promise<JiraIssueResponse> {
    try {
      const payload = {
        fields: {
          project: {
            key: this.config.projectKey,
          },
          summary: issue.summary,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: issue.description,
                  },
                ],
              },
            ],
          },
          issuetype: {
            name: issue.issueType || this.config.issueType || 'Task',
          },
          priority: {
            name: issue.priority,
          },
          ...(issue.assignee && { assignee: { name: issue.assignee } }),
          ...(issue.reporter && { reporter: { name: issue.reporter } }),
          ...(issue.labels && { labels: issue.labels }),
          ...(issue.components && { components: issue.components.map(name => ({ name })) }),
          ...(issue.customFields && issue.customFields),
          ...(this.config.customFields && this.config.customFields),
        },
      };

      const response = await fetch(`${this.config.baseUrl}/rest/api/3/issue`, {
        method: 'POST',
        headers: this.baseHeaders,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jira API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      if (!result || typeof result !== 'object' || !('key' in result)) {
        throw new Error('Invalid Jira issue response');
      }
      this.logger.info(`✅ Jira issue created: ${(result as any).key}`);
      return result as unknown as JiraIssueResponse;
    } catch (error) {
      this.logger.error('Failed to create Jira issue:', error);
      throw error;
    }
  }

  /**
   * Create a security vulnerability issue
   */
  async createSecurityIssue(vulnerability: {
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    package?: string;
    version?: string;
    cve?: string;
    cvss?: number;
    file?: string;
    line?: number;
    recommendation?: string;
  }): Promise<JiraIssueResponse> {
    const priorityMap = {
      low: 'Low' as const,
      medium: 'Medium' as const,
      high: 'High' as const,
      critical: 'Highest' as const,
    };

    const description = this.formatSecurityDescription(vulnerability);

    return this.createIssue({
      summary: `[Security] ${vulnerability.title}`,
      description,
      issueType: 'Bug',
      priority: priorityMap[vulnerability.severity],
      labels: ['security', 'vulnerability', 'npmsafe'],
      customFields: {
        ...(vulnerability.package && { 'customfield_package': vulnerability.package }),
        ...(vulnerability.version && { 'customfield_version': vulnerability.version }),
        ...(vulnerability.cve && { 'customfield_cve': vulnerability.cve }),
        ...(vulnerability.cvss && { 'customfield_cvss': vulnerability.cvss }),
      },
    });
  }

  /**
   * Create a dependency audit issue
   */
  async createDependencyIssue(audit: {
    summary: string;
    vulnerabilities: Array<{
      package: string;
      version: string;
      severity: string;
      title: string;
      fixedIn?: string;
    }>;
    recommendations: string[];
  }): Promise<JiraIssueResponse> {
    const description = this.formatDependencyDescription(audit);
    const hasCritical = audit.vulnerabilities.some(v => v.severity === 'critical');
    const hasHigh = audit.vulnerabilities.some(v => v.severity === 'high');

    return this.createIssue({
      summary: `[Dependency Audit] ${audit.summary}`,
      description,
      issueType: 'Task',
      priority: hasCritical ? 'Highest' : hasHigh ? 'High' : 'Medium',
      labels: ['dependency', 'audit', 'npmsafe'],
    });
  }

  /**
   * Create a license compliance issue
   */
  async createLicenseIssue(compliance: {
    summary: string;
    incompatiblePackages: Array<{
      name: string;
      version: string;
      license: string;
      issues: string[];
    }>;
    recommendations: string[];
  }): Promise<JiraIssueResponse> {
    const description = this.formatLicenseDescription(compliance);

    return this.createIssue({
      summary: `[License Compliance] ${compliance.summary}`,
      description,
      issueType: 'Task',
      priority: compliance.incompatiblePackages.length > 0 ? 'High' : 'Medium',
      labels: ['license', 'compliance', 'npmsafe'],
    });
  }

  /**
   * Update issue status
   */
  async transitionIssue(issueKey: string, transitionName: string): Promise<boolean> {
    try {
      // Get available transitions
      const transitionsResponse = await fetch(
        `${this.config.baseUrl}/rest/api/3/issue/${issueKey}/transitions`,
        {
          headers: this.baseHeaders,
        }
      );

      if (!transitionsResponse.ok) {
        throw new Error(`Failed to get transitions: ${transitionsResponse.statusText}`);
      }

      const transitionsData = await transitionsResponse.json();
      if (!transitionsData || typeof transitionsData !== 'object' || !('transitions' in transitionsData)) {
        throw new Error('Invalid Jira transitions response');
      }
      const transition = (transitionsData as any).transitions.find((t: JiraTransition) =>
        t.name.toLowerCase() === transitionName.toLowerCase()
      );

      if (!transition) {
        this.logger.warn(`Transition "${transitionName}" not found for issue ${issueKey}`);
        return false;
      }

      // Execute transition
      const transitionResponse = await fetch(
        `${this.config.baseUrl}/rest/api/3/issue/${issueKey}/transitions`,
        {
          method: 'POST',
          headers: this.baseHeaders,
          body: JSON.stringify({
            transition: {
              id: transition.id,
            },
          }),
        }
      );

      if (!transitionResponse.ok) {
        throw new Error(`Failed to transition issue: ${transitionResponse.statusText}`);
      }

      this.logger.info(`✅ Issue ${issueKey} transitioned to "${transitionName}"`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to transition issue ${issueKey}:`, error);
      return false;
    }
  }

  /**
   * Add comment to issue
   */
  async addComment(issueKey: string, comment: string): Promise<JiraComment> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/rest/api/3/issue/${issueKey}/comment`,
        {
          method: 'POST',
          headers: this.baseHeaders,
          body: JSON.stringify({
            body: {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: comment,
                    },
                  ],
                },
              ],
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to add comment: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result || typeof result !== 'object' || !('id' in result)) {
        throw new Error('Invalid Jira comment response');
      }
      this.logger.info(`✅ Comment added to issue ${issueKey}`);
      return result as unknown as JiraComment;
    } catch (error) {
      this.logger.error(`Failed to add comment to issue ${issueKey}:`, error);
      throw error;
    }
  }

  /**
   * Get issue details
   */
  async getIssue(issueKey: string): Promise<JiraIssueResponse> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/rest/api/3/issue/${issueKey}`,
        {
          headers: this.baseHeaders,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get issue: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result || typeof result !== 'object' || !('key' in result)) {
        throw new Error('Invalid Jira issue response');
      }
      return result as unknown as JiraIssueResponse;
    } catch (error) {
      this.logger.error(`Failed to get issue ${issueKey}:`, error);
      throw error;
    }
  }

  /**
   * Search for issues
   */
  async searchIssues(jql: string, maxResults = 50): Promise<JiraIssueResponse[]> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/rest/api/3/search`,
        {
          method: 'POST',
          headers: this.baseHeaders,
          body: JSON.stringify({
            jql,
            maxResults,
            fields: ['summary', 'description', 'status', 'priority', 'assignee', 'reporter', 'labels', 'components'],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to search issues: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result || typeof result !== 'object' || !('issues' in result)) {
        throw new Error('Invalid Jira search response');
      }
      return (result as any).issues;
    } catch (error) {
      this.logger.error('Failed to search issues:', error);
      throw error;
    }
  }

  /**
   * Get security-related issues
   */
  async getSecurityIssues(): Promise<JiraIssueResponse[]> {
    const jql = `project = ${this.config.projectKey} AND labels = security ORDER BY priority DESC, created DESC`;
    return this.searchIssues(jql);
  }

  /**
   * Get dependency-related issues
   */
  async getDependencyIssues(): Promise<JiraIssueResponse[]> {
    const jql = `project = ${this.config.projectKey} AND labels = dependency ORDER BY priority DESC, created DESC`;
    return this.searchIssues(jql);
  }

  /**
   * Test the Jira connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/rest/api/3/myself`,
        {
          headers: this.baseHeaders,
        }
      );

      if (!response.ok) {
        throw new Error(`Connection test failed: ${response.statusText}`);
      }

      const user = await response.json();
      if (!user || typeof user !== 'object' || !('displayName' in user)) {
        throw new Error('Invalid Jira user response');
      }
      this.logger.info(`✅ Jira connection successful - logged in as ${(user as any).displayName}`);
      return true;
    } catch (error) {
      this.logger.error('❌ Jira connection test failed:', error);
      return false;
    }
  }

  /**
   * Format security vulnerability description
   */
  private formatSecurityDescription(vulnerability: any): string {
    let description = `${vulnerability.description}\n\n`;

    if (vulnerability.package) {
      description += `**Package:** ${vulnerability.package}\n`;
    }
    if (vulnerability.version) {
      description += `**Version:** ${vulnerability.version}\n`;
    }
    if (vulnerability.cve) {
      description += `**CVE:** ${vulnerability.cve}\n`;
    }
    if (vulnerability.cvss) {
      description += `**CVSS Score:** ${vulnerability.cvss}\n`;
    }
    if (vulnerability.file) {
      description += `**File:** ${vulnerability.file}`;
      if (vulnerability.line) {
        description += `:${vulnerability.line}`;
      }
      description += '\n';
    }
    if (vulnerability.recommendation) {
      description += `\n**Recommendation:** ${vulnerability.recommendation}\n`;
    }

    description += `\n---\n*Issue created by NPMSafe Security Scanner*`;
    return description;
  }

  /**
   * Format dependency audit description
   */
  private formatDependencyDescription(audit: any): string {
    let description = `${audit.summary}\n\n`;

    if (audit.vulnerabilities.length > 0) {
      description += `**Vulnerabilities Found:**\n`;
      for (const vuln of audit.vulnerabilities) {
        description += `• ${vuln.package}@${vuln.version} - ${vuln.severity.toUpperCase()}: ${vuln.title}\n`;
        if (vuln.fixedIn) {
          description += `  Fixed in: ${vuln.fixedIn}\n`;
        }
      }
      description += '\n';
    }

    if (audit.recommendations.length > 0) {
      description += `**Recommendations:**\n`;
      for (const rec of audit.recommendations) {
        description += `• ${rec}\n`;
      }
      description += '\n';
    }

    description += `---\n*Issue created by NPMSafe Dependency Auditor*`;
    return description;
  }

  /**
   * Format license compliance description
   */
  private formatLicenseDescription(compliance: any): string {
    let description = `${compliance.summary}\n\n`;

    if (compliance.incompatiblePackages.length > 0) {
      description += `**Incompatible Packages:**\n`;
      for (const pkg of compliance.incompatiblePackages) {
        description += `• ${pkg.name}@${pkg.version} (${pkg.license})\n`;
        for (const issue of pkg.issues) {
          description += `  - ${issue}\n`;
        }
      }
      description += '\n';
    }

    if (compliance.recommendations.length > 0) {
      description += `**Recommendations:**\n`;
      for (const rec of compliance.recommendations) {
        description += `• ${rec}\n`;
      }
      description += '\n';
    }

    description += `---\n*Issue created by NPMSafe License Checker*`;
    return description;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<JiraConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.baseHeaders = {
      'Authorization': `Basic ${Buffer.from(`${this.config.username}:${this.config.apiToken}`).toString('base64')}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    this.logger.info('Jira configuration updated');
  }
} 