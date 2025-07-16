import { getCurrentDirname } from './file-utils';

describe('getCurrentDirname', () => {
  it('should return process.cwd() in Jest test environment', () => {
    const result = getCurrentDirname();
    expect(result).toBe(process.cwd());
  });

  it('should use fallback directory when provided', () => {
    const fallbackDir = '/custom/test/path';
    const result = getCurrentDirname(fallbackDir);
    expect(result).toBe(fallbackDir);
  });

  it('should return process.cwd() when no fallback is provided', () => {
    const result = getCurrentDirname();
    expect(result).toBe(process.cwd());
  });
});
