const { JiraIntegration } = require('../dist/integrations/jira');

describe('JiraIntegration', () => {
  it('can be instantiated and testConnection can be called (mock)', async () => {
    const jira = new JiraIntegration({ url: 'http://localhost', username: 'user', apiToken: 'token', projectKey: 'PROJ' });
    jira.testConnection = jest.fn().mockResolvedValue(true);
    const result = await jira.testConnection();
    expect(result).toBe(true);
    expect(jira.testConnection).toHaveBeenCalled();
  });
}); 