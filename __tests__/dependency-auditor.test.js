const { DependencyAuditor } = require('../dist/audit/dependency-auditor');

describe('DependencyAuditor', () => {
  it('audits dependencies', async () => {
    const auditor = new DependencyAuditor();
    const result = await auditor.audit({ production: true, auditLevel: 'low', timeout: 10000 });
    expect(result).toHaveProperty('summary');
  });

  it('gets security score', async () => {
    const auditor = new DependencyAuditor();
    const score = await auditor.getSecurityScore();
    expect(typeof score).toBe('number');
  });
}); 