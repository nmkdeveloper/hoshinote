import { describe, it, expect } from 'vitest';
import { isNewerVersion } from '../lib/updater';

describe('GitHub Auto-Updater Version Comparison', () => {
  it('correctly detects newer minor and patch versions', () => {
    expect(isNewerVersion('0.2.0', '0.2.1')).toBe(true);
    expect(isNewerVersion('0.2.0', '0.3.0')).toBe(true);
    expect(isNewerVersion('0.2.0', '1.0.0')).toBe(true);
  });

  it('handles "v" prefix correctly', () => {
    expect(isNewerVersion('0.2.0', 'v0.3.0')).toBe(true);
    expect(isNewerVersion('v0.2.0', '0.3.0')).toBe(true);
    expect(isNewerVersion('v0.2.0', 'v0.2.0')).toBe(false);
  });

  it('rejects equal or older versions', () => {
    expect(isNewerVersion('0.2.0', '0.2.0')).toBe(false);
    expect(isNewerVersion('0.2.0', '0.1.9')).toBe(false);
    expect(isNewerVersion('1.0.0', '0.9.9')).toBe(false);
  });

  it('handles two-digit and multi-component versions safely', () => {
    expect(isNewerVersion('0.2.0', '0.10.0')).toBe(true);
    expect(isNewerVersion('0.9.1', '0.10.0')).toBe(true);
    expect(isNewerVersion('0.10.0', '0.9.5')).toBe(false);
  });
});
