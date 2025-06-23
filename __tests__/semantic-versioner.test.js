const { SemanticVersioner } = require('../dist/versioning/semantic-versioner');

describe('SemanticVersioner', () => {
  it('analyzes version bump', async () => {
    const versioner = new SemanticVersioner();
    // Test without git repository - should handle gracefully
    const analysis = await versioner.analyzeVersion('1.2.3');
    expect(analysis).toHaveProperty('currentVersion', '1.2.3');
    expect(analysis).toHaveProperty('recommendedBump');
    expect(analysis).toHaveProperty('newVersion');
  });

  it('generates changelog', async () => {
    const versioner = new SemanticVersioner();
    // Test without git repository - should handle gracefully
    const changelog = await versioner.generateChangelog('1.2.3', '1.2.0');
    expect(typeof changelog).toBe('string');
  });
}); 