import { describe, expect, it } from 'vitest';

import {
  buildDisplaySrcFor,
  getThumbnailSrc,
  isLocalThumbnailable,
} from '../src/lib/canvas/thumbnail-src';

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

describe('thumbnail-src — buildDisplaySrcFor (ملكية الصور E3)', () => {
  it('builds the 2048px Go display derivative from a local source', () => {
    expect(buildDisplaySrcFor('/local-image/photo_1.jpg')).toBe(
      '/local-image/thumb/photo_1.jpg?w=2048',
    );
    expect(buildDisplaySrcFor('/local-image/صورة 1.png')).toBe(
      '/local-image/thumb/%D8%B5%D9%88%D8%B1%D8%A9%201.png?w=2048',
    );
    // idempotent: رابط مشتق قائم يمر سليماً ولا يُضاعف المسار
    expect(buildDisplaySrcFor('/local-image/thumb/photo_1.jpg?w=2048')).toBe(
      '/local-image/thumb/photo_1.jpg?w=2048',
    );
  });

  it('ignores non-local sources, print previews and unsupported extensions', () => {
    expect(buildDisplaySrcFor('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
    expect(buildDisplaySrcFor('blob:http://localhost/abc')).toBe('blob:http://localhost/abc');
    expect(buildDisplaySrcFor('https://example.com/a.jpg')).toBe('https://example.com/a.jpg');
    expect(buildDisplaySrcFor('/local-image/print_preview.png')).toBe(
      '/local-image/print_preview.png',
    );
    expect(buildDisplaySrcFor('/local-image/file.svg')).toBe('/local-image/file.svg');
    expect(buildDisplaySrcFor('/local-image/nested/img_1.png')).toBe(
      '/local-image/nested/img_1.png',
    );
  });
});
