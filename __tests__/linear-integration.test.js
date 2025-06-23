const { LinearIntegration } = require('../dist/integrations/linear');

describe('LinearIntegration', () => {
  it('can be instantiated and testConnection can be called (mock)', async () => {
    const linear = new LinearIntegration({ apiKey: 'fake', teamId: 'team' });
    linear.testConnection = jest.fn().mockResolvedValue(true);
    const result = await linear.testConnection();
    expect(result).toBe(true);
    expect(linear.testConnection).toHaveBeenCalled();
  });
}); 