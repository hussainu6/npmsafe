const { LicenseChecker } = require('../dist/audit/license-checker');

describe('LicenseChecker', () => {
  it('checks license compliance', async () => {
    const checker = new LicenseChecker({
      allowedLicenses: ['MIT'],
      blockedLicenses: ['GPL-3.0'],
      projectLicense: 'MIT',
      includeDevDependencies: false
    });
    const result = await checker.checkCompliance();
    expect(result).toHaveProperty('summary');
  });

  it('gets incompatible packages', async () => {
    const checker = new LicenseChecker({
      allowedLicenses: ['MIT'],
      blockedLicenses: ['GPL-3.0'],
      projectLicense: 'MIT',
      includeDevDependencies: false
    });
    const pkgs = await checker.getIncompatiblePackages();
    expect(Array.isArray(pkgs)).toBe(true);
  });
}); 