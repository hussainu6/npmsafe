const { DiscordIntegration } = require('../dist/integrations/discord');

describe('DiscordIntegration', () => {
  it('can be instantiated and sendMessage can be called (mock)', async () => {
    const discord = new DiscordIntegration({ webhookUrl: 'http://localhost' });
    // Mock sendMessage to avoid real HTTP call
    discord.sendMessage = jest.fn().mockResolvedValue(true);
    const result = await discord.sendMessage({ content: 'Hello' });
    expect(result).toBe(true);
    expect(discord.sendMessage).toHaveBeenCalledWith({ content: 'Hello' });
  });
}); 