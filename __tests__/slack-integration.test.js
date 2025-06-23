const { SlackIntegration } = require('../dist/integrations/slack');

describe('SlackIntegration', () => {
  it('can be instantiated and sendMessage can be called (mock)', async () => {
    const slack = new SlackIntegration({ webhookUrl: 'http://localhost' });
    // Mock sendMessage to avoid real HTTP call
    slack.sendMessage = jest.fn().mockResolvedValue(true);
    const result = await slack.sendMessage({ text: 'Hello' });
    expect(result).toBe(true);
    expect(slack.sendMessage).toHaveBeenCalledWith({ text: 'Hello' });
  });
}); 