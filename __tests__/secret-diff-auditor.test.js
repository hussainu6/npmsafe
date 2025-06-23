const { SecretDiffAuditor } = require('../dist/audit/secret-diff-auditor');

describe('SecretDiffAuditor', () => {
  it('computes secret diff', async () => {
    const auditor = new SecretDiffAuditor();
    const diff = await auditor.auditDiff({
      currentSecrets: [
        { file: 'a.js', line: 1, value: 'SECRET', entropy: 4, pattern: { name: 'Test', regex: 'SECRET', severity: 'high' } }
      ]
    });
    expect(diff).toHaveProperty('summary');
  });

  it('generates audit report', () => {
    const auditor = new SecretDiffAuditor();
    const diff = {
      added: [],
      removed: [],
      modified: [],
      unchanged: [],
      summary: { totalAdded: 0, totalRemoved: 0, totalModified: 0, totalUnchanged: 0, riskLevel: 'low' }
    };
    const report = auditor.generateAuditReport(diff);
    expect(typeof report).toBe('string');
  });
}); 