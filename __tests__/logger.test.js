const { logger } = require('../dist/utils/logger');

describe('Logger', () => {
  it('logs info messages', () => {
    expect(() => logger.info('info message')).not.toThrow();
  });

  it('sets log level', () => {
    logger.setLevel('warn');
    expect(logger.level).toBe('warn');
    logger.setLevel('info'); // reset
  });
}); 