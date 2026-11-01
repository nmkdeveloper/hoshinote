import { describe, it, expect } from 'vitest';
import { cn } from './utils';
import { isTauri } from './api';

describe('Utility functions', () => {
  it('cn merges class names properly with tailwind-merge', () => {
    expect(cn('px-2 py-1', 'bg-blue-500')).toBe('px-2 py-1 bg-blue-500');
    // Conflict resolution
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('isTauri accurately detects window.__TAURI_INTERNALS__', () => {
    // In node/vitest environment, window.__TAURI_INTERNALS__ is undefined
    expect(isTauri()).toBe(false);
  });
});
