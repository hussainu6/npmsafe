const { NPMSafe } = require('../dist/index');

describe('NPMSafe', () => {
  it('scans for secrets', async () => {
    const npmsafe = new NPMSafe();
    const results = await npmsafe.scan({
      files: [{ file: 'test.js', content: 'const key = "SECRET";' }],
      patterns: [{ name: 'Test', regex: 'SECRET', severity: 'high' }]
    });
    expect(Array.isArray(results)).toBe(true);
  });

  it('analyzes version', async () => {
    const npmsafe = new NPMSafe();
    const analysis = await npmsafe.analyzeVersion('1.0.0', { commits: [{ message: 'feat: add' }] });
    expect(analysis).toHaveProperty('recommendedBump');
  });

  it('updates config', () => {
    const npmsafe = new NPMSafe();
    npmsafe.updateConfig({ version: '2.0.0' });
    expect(npmsafe.getConfig().version).toBe('2.0.0');
  });
}); 