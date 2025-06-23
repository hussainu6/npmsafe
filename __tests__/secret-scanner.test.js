const { SecretScanner } = require('../dist/scanners/secret-scanner');

describe('SecretScanner', () => {
  it('detects secrets in files', async () => {
    const scanner = new SecretScanner({
      patterns: [
        { name: 'API Key', pattern: /AKIA[0-9A-Z]{16}/, severity: 'high' }
      ]
    });
    const results = await scanner.scan({
      files: [{ file: 'test.js', content: 'const key = "AKIA1234567890ABCD12";' }]
    });
    console.log('Scan results:', results);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.pattern.name === 'API Key')).toBe(true);
  });

  it('detects secrets with default patterns', async () => {
    const scanner = new SecretScanner();
    const results = await scanner.scan({
      files: [{ file: 'test.js', content: 'const key = "AKIA1234567890ABCD12";' }]
    });
    console.log('Default scan results:', results);
    expect(results.length).toBeGreaterThan(0);
  });

  it('respects allowed secrets', async () => {
    const scanner = new SecretScanner({
      patterns: [
        { name: 'API Key', pattern: /AKIA[0-9A-Z]{16}/, severity: 'high' }
      ],
      allowedSecrets: ['AKIA1234567890ABCD12']
    });
    const results = await scanner.scan({
      files: [{ file: 'test.js', content: 'const key = "AKIA1234567890ABCD12";' }]
    });
    // Should not find any matches for the allowed secret
    expect(results.filter(r => r.value === 'AKIA1234567890ABCD12').length).toBe(0);
  });
}); 