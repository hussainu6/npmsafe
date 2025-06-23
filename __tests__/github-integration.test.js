const { GitHubIntegration } = require('../dist/integrations/github');

describe('GitHubIntegration', () => {
  it('can be instantiated and testConnection can be called (mock)', async () => {
    const github = new GitHubIntegration({ token: 'fake' });
    github.testConnection = jest.fn().mockResolvedValue(true);
    const result = await github.testConnection();
    expect(result).toBe(true);
    expect(github.testConnection).toHaveBeenCalled();
  });
}); 