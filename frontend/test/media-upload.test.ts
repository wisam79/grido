import { describe, it, expect, vi, beforeEach } from 'vitest';

import * as imageDimensions from '@/lib/canvas/image-dimensions';
import { uploadMediaBlob, uploadCanvasBlob } from '@/lib/io/media-upload';
import * as localApi from '@/lib/local-api';

describe('media-upload', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    imageDimensions.clearImageAspectRatioCache();
  });

  it('uploadMediaBlob uploads binary blob to /api/upload-media and caches aspect ratio', async () => {
    const fetchSpy = vi.spyOn(localApi, 'fetchLocalApi').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 'success',
          imageSrc: '/local-image/test-binary.png',
          width: 400,
          height: 200,
          aspectRatio: 2.0,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const blob = new Blob(['fake binary content'], { type: 'image/png' });
    const result = await uploadMediaBlob(blob, 'test.png');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.imageSrc).toBe('/local-image/test-binary.png');
    expect(result.width).toBe(400);
    expect(result.height).toBe(200);
    expect(result.aspectRatio).toBe(2.0);
    expect(imageDimensions.getCachedImageAspectRatio('/local-image/test-binary.png')).toBe(2.0);
  });

  it('uploadCanvasBlob converts canvas to blob and uploads binary', async () => {
    vi.spyOn(localApi, 'fetchLocalApi').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 'success',
          imageSrc: '/local-image/refined-canvas.png',
          width: 300,
          height: 300,
          aspectRatio: 1.0,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;

    // mock toBlob on HTMLCanvasElement in jsdom
    canvas.toBlob = vi.fn((cb) => {
      cb(new Blob(['canvas bytes'], { type: 'image/png' }));
    });

    const result = await uploadCanvasBlob(canvas, 'image/png', undefined, 'refined.png');

    expect(result.imageSrc).toBe('/local-image/refined-canvas.png');
    expect(imageDimensions.getCachedImageAspectRatio('/local-image/refined-canvas.png')).toBe(1.0);
  });
});
