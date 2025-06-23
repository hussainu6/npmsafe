const { WebhookManager } = require('../dist/webhooks/webhook');

describe('WebhookManager', () => {
  it('sends webhook events', async () => {
    const manager = new WebhookManager(['http://example.com']);
    await expect(manager.sendEvent({
      event: 'scan',
      package: 'test-package',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      data: { test: 'data' }
    })).resolves.not.toThrow();
  });
}); 