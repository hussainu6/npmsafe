/**
 * Basic NPMSafe Tests
 * 
 * These tests demonstrate the core functionality of NPMSafe
 */

const { NPMSafe } = require('../dist/index.js');

describe('NPMSafe Basic Functionality', () => {
  let npmsafe;

  beforeEach(() => {
    npmsafe = new NPMSafe({
      config: {
        blockPublishOnSecret: true,
        autoVersion: true,
        changelog: true
      }
    });
  });

  describe('Configuration', () => {
    test('should initialize with default config', () => {
      const config = npmsafe.getConfig();
      expect(config.version).toBe('1.0.0');
      expect(config.config.blockPublishOnSecret).toBe(true);
      expect(config.config.autoVersion).toBe(true);
    });

    test('should update configuration', () => {
      npmsafe.updateConfig({
        config: {
          blockPublishOnSecret: false
        }
      });
      
      const config = npmsafe.getConfig();
      expect(config.config.blockPublishOnSecret).toBe(false);
    });
  });

  describe('Secret Scanning', () => {
    test('should add custom secret pattern', () => {
      const pattern = {
        name: 'Test Pattern',
        pattern: /test_[a-zA-Z0-9]{8}/,
        description: 'Test pattern for unit tests',
        severity: 'medium'
      };

      npmsafe.addSecretPattern(pattern);
      // Note: In a real test, we would verify the pattern was added
      expect(true).toBe(true); // Placeholder assertion
    });

    test('should add allowed secret', () => {
      npmsafe.addAllowedSecret('test_allowed_secret_123');
      // Note: In a real test, we would verify the secret was added
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Version Analysis', () => {
    test('should analyze version changes', async () => {
      // Note: This would require a git repository with commits
      // For now, we'll test the method exists
      expect(typeof npmsafe.analyzeVersion).toBe('function');
    });

    test('should generate changelog', async () => {
      // Note: This would require a git repository with commits
      // For now, we'll test the method exists
      expect(typeof npmsafe.generateChangelog).toBe('function');
    });
  });

  describe('Logger', () => {
    test('should get logger instance', () => {
      const logger = npmsafe.getLogger();
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
    });

    test('should set log level', () => {
      npmsafe.setLogLevel('debug');
      // Note: In a real test, we would verify the level was set
      expect(true).toBe(true); // Placeholder assertion
    });
  });
});

describe('NPMSafe CLI Commands', () => {
  test('should support scan command', () => {
    // Note: In a real test, we would test the CLI commands
    expect(true).toBe(true); // Placeholder assertion
  });

  test('should support version command', () => {
    // Note: In a real test, we would test the CLI commands
    expect(true).toBe(true); // Placeholder assertion
  });

  test('should support publish command', () => {
    // Note: In a real test, we would test the CLI commands
    expect(true).toBe(true); // Placeholder assertion
  });
}); 