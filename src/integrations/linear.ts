import { NPMSafeLogger } from '../utils/logger.js';

export interface LinearConfig {
  apiKey: string;
  teamId: string;
  issueType?: 'Bug' | 'Story' | 'Task';
  priority?: 'No priority' | 'Urgent' | 'High' | 'Medium' | 'Low';
  labels?: string[];
}

export interface LinearIssue {
  title: string;
  description: string;
  teamId: string;
  issueType: 'Bug' | 'Story' | 'Task';
  priority: 'No priority' | 'Urgent' | 'High' | 'Medium' | 'Low';
  assigneeId?: string;
  labels?: string[];
  estimate?: number;
  dueDate?: string;
  customFields?: Record<string, any>;
}

export interface LinearIssueResponse {
  id: string;
  title: string;
  description: string;
  number: number;
  url: string;
  state: {
    id: string;
    name: string;
    type: string;
  };
  priority: number;
  estimate: number;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  labels: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  team: {
    id: string;
    name: string;
    key: string;
  };
}

export interface LinearComment {
  id: string;
  body: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export class LinearIntegration {
  private config: LinearConfig;
  private logger: NPMSafeLogger;
  private baseHeaders: Record<string, string>;

  constructor(config: LinearConfig) {
    this.config = config;
    this.logger = new NPMSafeLogger();
    this.baseHeaders = {
      'Authorization': config.apiKey,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Create a new Linear issue
   */
  async createIssue(issue: Omit<LinearIssue, 'teamId'>): Promise<LinearIssueResponse> {
    try {
      const payload = {
        title: issue.title,
        description: issue.description,
        teamId: this.config.teamId,
        issueType: issue.issueType || this.config.issueType || 'Task',
        priority: issue.priority || this.config.priority || 'Medium',
        ...(issue.assigneeId && { assigneeId: issue.assigneeId }),
        ...(issue.labels && { labelIds: await this.getLabelIds(issue.labels) }),
        ...(issue.estimate && { estimate: issue.estimate }),
        ...(issue.dueDate && { dueDate: issue.dueDate }),
        ...(issue.customFields && issue.customFields),
      };

      const response = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: this.baseHeaders,
        body: JSON.stringify({
          query: `
            mutation CreateIssue($input: IssueCreateInput!) {
              issueCreate(input: $input) {
                success
                issue {
                  id
                  title
                  description
                  number
                  url
                  state {
                    id
                    name
                    type
                  }
                  priority
                  estimate
                  dueDate
                  createdAt
                  updatedAt
                  labels {
                    id
                    name
                    color
                  }
                  assignee {
                    id
                    name
                    email
                  }
                  team {
                    id
                    name
                    key
                  }
                }
              }
            }
          `,
          variables: {
            input: payload,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Linear API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid Linear API response');
      }
      if ((result as any).errors) {
        throw new Error(`Linear GraphQL error: ${(result as any).errors[0].message}`);
      }
      if (!(result as any).data.issueCreate.success) {
        throw new Error('Failed to create Linear issue');
      }
      const createdIssue = (result as any).data.issueCreate.issue;
      this.logger.info(`✅ Linear issue created: ${createdIssue.title} (#${createdIssue.number})`);
      return createdIssue as LinearIssueResponse;
    } catch (error) {
      this.logger.error('Failed to create Linear issue:', error);
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
  }): Promise<LinearIssueResponse> {
    const priorityMap = {
      low: 'Low' as const,
      medium: 'Medium' as const,
      high: 'High' as const,
      critical: 'Urgent' as const,
    };

    const description = this.formatSecurityDescription(vulnerability);

    return this.createIssue({
      title: `[Security] ${vulnerability.title}`,
      description,
      issueType: 'Bug',
      priority: priorityMap[vulnerability.severity],
      labels: ['security', 'vulnerability', 'npmsafe'],
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
  }): Promise<LinearIssueResponse> {
    const description = this.formatDependencyDescription(audit);
    const hasCritical = audit.vulnerabilities.some(v => v.severity === 'critical');
    const hasHigh = audit.vulnerabilities.some(v => v.severity === 'high');

    return this.createIssue({
      title: `[Dependency Audit] ${audit.summary}`,
      description,
      issueType: 'Task',
      priority: hasCritical ? 'Urgent' : hasHigh ? 'High' : 'Medium',
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
  }): Promise<LinearIssueResponse> {
    const description = this.formatLicenseDescription(compliance);

    return this.createIssue({
      title: `[License Compliance] ${compliance.summary}`,
      description,
      issueType: 'Task',
      priority: compliance.incompatiblePackages.length > 0 ? 'High' : 'Medium',
      labels: ['license', 'compliance', 'npmsafe'],
    });
  }

  /**
   * Update issue status
   */
  async updateIssueStatus(issueId: string, stateName: string): Promise<boolean> {
    try {
      // Get available states
      const statesResponse = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: this.baseHeaders,
        body: JSON.stringify({
          query: `
            query GetTeamStates($teamId: String!) {
              team(id: $teamId) {
                states {
                  nodes {
                    id
                    name
                    type
                  }
                }
              }
            }
          `,
          variables: {
            teamId: this.config.teamId,
          },
        }),
      });

      if (!statesResponse.ok) {
        throw new Error(`Failed to get states: ${statesResponse.statusText}`);
      }

      const statesData = await statesResponse.json();
      if (!statesData || typeof statesData !== 'object') {
        throw new Error('Invalid Linear states response');
      }
      const state = (statesData as any).data.team.states.nodes.find((s: any) => 
        s.name.toLowerCase() === stateName.toLowerCase()
      );

      if (!state) {
        this.logger.warn(`State "${stateName}" not found for team ${this.config.teamId}`);
        return false;
      }

      // Update issue state
      const updateResponse = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: this.baseHeaders,
        body: JSON.stringify({
          query: `
            mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
              issueUpdate(id: $id, input: $input) {
                success
              }
            }
          `,
          variables: {
            id: issueId,
            input: {
              stateId: state.id,
            },
          },
        }),
      });

      if (!updateResponse.ok) {
        throw new Error(`Failed to update issue: ${updateResponse.statusText}`);
      }

      const result = await updateResponse.json();
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid Linear update response');
      }
      if ((result as any).errors) {
        throw new Error(`Linear GraphQL error: ${(result as any).errors[0].message}`);
      }
      if (!(result as any).data.issueUpdate.success) {
        throw new Error('Failed to update Linear issue');
      }
      this.logger.info(`✅ Issue ${issueId} updated to state "${stateName}"`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to update issue ${issueId}:`, error);
      return false;
    }
  }

  /**
   * Add comment to issue
   */
  async addComment(issueId: string, comment: string): Promise<LinearComment> {
    try {
      const response = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: this.baseHeaders,
        body: JSON.stringify({
          query: `
            mutation CreateComment($input: CommentCreateInput!) {
              commentCreate(input: $input) {
                success
                comment {
                  id
                  body
                  author {
                    id
                    name
                    email
                  }
                  createdAt
                  updatedAt
                }
              }
            }
          `,
          variables: {
            input: {
              issueId,
              body: comment,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add comment: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid Linear comment response');
      }
      if ((result as any).errors) {
        throw new Error(`Linear GraphQL error: ${(result as any).errors[0].message}`);
      }
      if (!(result as any).data.commentCreate.success) {
        throw new Error('Failed to create Linear comment');
      }
      const createdComment = (result as any).data.commentCreate.comment;
      this.logger.info(`✅ Comment added to issue ${issueId}`);
      return createdComment as LinearComment;
    } catch (error) {
      this.logger.error(`Failed to add comment to issue ${issueId}:`, error);
      throw error;
    }
  }

  /**
   * Get issue details
   */
  async getIssue(issueId: string): Promise<LinearIssueResponse> {
    try {
      const response = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: this.baseHeaders,
        body: JSON.stringify({
          query: `
            query GetIssue($id: String!) {
              issue(id: $id) {
                id
                title
                description
                number
                url
                state {
                  id
                  name
                  type
                }
                priority
                estimate
                dueDate
                createdAt
                updatedAt
                labels {
                  id
                  name
                  color
                }
                assignee {
                  id
                  name
                  email
                }
                team {
                  id
                  name
                  key
                }
              }
            }
          `,
          variables: {
            id: issueId,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get issue: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid Linear API response');
      }
      if ((result as any).errors) {
        throw new Error(`Linear GraphQL error: ${(result as any).errors[0].message}`);
      }
      return (result as any).data.issue;
    } catch (error) {
      this.logger.error(`Failed to get issue ${issueId}:`, error);
      throw error;
    }
  }

  /**
   * Search for issues
   */
  async searchIssues(query: string, limit = 50): Promise<LinearIssueResponse[]> {
    try {
      const response = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: this.baseHeaders,
        body: JSON.stringify({
          query: `
            query SearchIssues($query: String!, $limit: Int!) {
              issueSearch(query: $query, limit: $limit) {
                nodes {
                  id
                  title
                  description
                  number
                  url
                  state {
                    id
                    name
                    type
                  }
                  priority
                  estimate
                  dueDate
                  createdAt
                  updatedAt
                  labels {
                    id
                    name
                    color
                  }
                  assignee {
                    id
                    name
                    email
                  }
                  team {
                    id
                    name
                    key
                  }
                }
              }
            }
          `,
          variables: {
            query,
            limit,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to search issues: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid Linear API response');
      }
      if ((result as any).errors) {
        throw new Error(`Linear GraphQL error: ${(result as any).errors[0].message}`);
      }
      return (result as any).data.issueSearch.nodes;
    } catch (error) {
      this.logger.error('Failed to search issues:', error);
      throw error;
    }
  }

  /**
   * Get security-related issues
   */
  async getSecurityIssues(): Promise<LinearIssueResponse[]> {
    const query = `team:"${this.config.teamId}" label:security`;
    return this.searchIssues(query);
  }

  /**
   * Get dependency-related issues
   */
  async getDependencyIssues(): Promise<LinearIssueResponse[]> {
    const query = `team:"${this.config.teamId}" label:dependency`;
    return this.searchIssues(query);
  }

  /**
   * Get label IDs by names
   */
  private async getLabelIds(labelNames: string[]): Promise<string[]> {
    try {
      const response = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: this.baseHeaders,
        body: JSON.stringify({
          query: `
            query GetTeamLabels($teamId: String!) {
              team(id: $teamId) {
                labels {
                  nodes {
                    id
                    name
                  }
                }
              }
            }
          `,
          variables: {
            teamId: this.config.teamId,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get labels: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid Linear API response');
      }
      if ((result as any).errors) {
        throw new Error(`Linear GraphQL error: ${(result as any).errors[0].message}`);
      }
      const labels = (result as any).data.team.labels.nodes;
      const labelIds: string[] = [];

      for (const labelName of labelNames) {
        const label = labels.find((l: any) => l.name.toLowerCase() === labelName.toLowerCase());
        if (label) {
          labelIds.push(label.id);
        }
      }

      return labelIds;
    } catch (error) {
      this.logger.warn('Failed to get label IDs:', error);
      return [];
    }
  }

  /**
   * Test the Linear connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: this.baseHeaders,
        body: JSON.stringify({
          query: `
            query GetViewer {
              viewer {
                id
                name
                email
              }
            }
          `,
        }),
      });

      if (!response.ok) {
        throw new Error(`Connection test failed: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid Linear API response');
      }
      if ((result as any).errors) {
        throw new Error(`Linear GraphQL error: ${(result as any).errors[0].message}`);
      }
      const user = (result as any).data.viewer;
      this.logger.info(`✅ Linear connection successful - logged in as ${user.name}`);
      return true;
    } catch (error) {
      this.logger.error('❌ Linear connection test failed:', error);
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
  updateConfig(newConfig: Partial<LinearConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.baseHeaders = {
      'Authorization': this.config.apiKey,
      'Content-Type': 'application/json',
    };
    this.logger.info('Linear configuration updated');
  }
} 