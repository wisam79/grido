import { describe, expect, it } from 'vitest';

import { wrapTextLines } from '../src/lib/canvas/text-layout';

const measurer = {
  measureText: (text: string) => ({ width: text.length * 10 }),
};

describe('wrapTextLines', () => {
  it('wraps on word boundaries', () => {
    expect(wrapTextLines(measurer, 'hello world again', 120, 'word')).toEqual([
      'hello world',
      'again',
    ]);
  });

  it('wraps on characters when requested', () => {
    expect(wrapTextLines(measurer, 'abcdef', 25, 'char')).toEqual(['ab', 'cd', 'ef']);
  });

  it('only splits explicit newlines in none mode', () => {
    expect(wrapTextLines(measurer, 'a very long line\nsecond', 20, 'none')).toEqual([
      'a very long line',
      'second',
    ]);
  });

  it('preserves empty lines', () => {
    expect(wrapTextLines(measurer, 'a\n\nb', 100, 'word')).toEqual(['a', '', 'b']);
  });
});
