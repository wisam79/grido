import { describe, expect, it } from 'vitest';

import { getThumbnailSrc, isLocalThumbnailable } from '../src/lib/canvas/thumbnail-src';

describe('thumbnail-src', () => {
  it('derives a local thumbnail URL and encodes the filename', () => {
    expect(getThumbnailSrc('/local-image/img_123.png', 128)).toBe(
      '/local-image/thumb/img_123.png?w=128',
    );
    expect(getThumbnailSrc('/local-image/صورة 1.jpg', 256)).toBe(
      '/local-image/thumb/%D8%B5%D9%88%D8%B1%D8%A9%201.jpg?w=256',
    );
  });

  it('falls back to the original source for non-local or print previews', () => {
    expect(getThumbnailSrc('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
    expect(getThumbnailSrc('blob:http://localhost/abc')).toBe('blob:http://localhost/abc');
    expect(getThumbnailSrc('/local-image/print_preview.png')).toBe(
      '/local-image/print_preview.png',
    );
    expect(getThumbnailSrc('/local-image/thumb/img_1.png?w=128')).toBe(
      '/local-image/thumb/img_1.png?w=128',
    );
  });

  it('normalizes unsupported widths and rejects unsupported extensions', () => {
    expect(getThumbnailSrc('/local-image/img_1.png', 999)).toBe(
      '/local-image/thumb/img_1.png?w=256',
    );
    expect(getThumbnailSrc('/local-image/file.svg')).toBe('/local-image/file.svg');
    expect(isLocalThumbnailable('/local-image/img_1.webp')).toBe(true);
    expect(isLocalThumbnailable('/local-image/nested/img_1.png')).toBe(false);
  });
});
