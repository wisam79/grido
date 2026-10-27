import { describe, it, expect } from 'vitest';

import { classifySaveResult } from '../src/lib/io/save-result';

describe('classifySaveResult', () => {
  it('maps "success" to success', () => {
    expect(classifySaveResult('success')).toBe('success');
  });

  it('maps an empty string to cancel', () => {
    expect(classifySaveResult('')).toBe('cancel');
  });

  it('maps any other text to error', () => {
    expect(classifySaveResult('error')).toBe('error');
    expect(classifySaveResult('Access is denied.')).toBe('error');
    expect(classifySaveResult('success ')).toBe('error');
  });
});
