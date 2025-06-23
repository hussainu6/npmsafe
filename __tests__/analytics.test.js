const { Analytics } = require('../dist/analytics/analytics');

describe('Analytics', () => {
  it('tracks events and retrieves analytics', async () => {
    const analytics = new Analytics();
    await analytics.recordEvent({
      type: 'audit',
      timestamp: new Date().toISOString(),
      details: { foo: 'bar' }
    });
    const data = await analytics.getStats();
    expect(data).toBeDefined();
  });
}); 