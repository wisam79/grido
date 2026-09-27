import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportCanvas } from '../src/lib/export/export-canvas';
import { applyWatermarkIfFree } from '../src/lib/export/export-watermark';
import { useEditorStore } from '../src/lib/editor-store';

vi.mock('../src/lib/export/export-watermark', () => ({
  applyWatermarkIfFree: vi.fn(async (blob: Blob) => blob),
}));

/**
 * خيار watermark في exportCanvas:
 * الافتراضي true (كل مسارات التسليم)، وfalse للالتقاطات الوسيطة مثل نقل التصميم
 * إلى الكولاج — وإلا ظهرت العلامة مرتين (مرة داخل اللقطة ومرة عند تصدير الكولاج).
 */
describe('exportCanvas — خيار العلامة المائية', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEditorStore.getState().reset();
    useEditorStore.setState({
      mode: 'single',
      canvasWidth: 900,
      canvasHeight: 500,
      backgroundColor: '#ffffff',
      elements: [],
    } as never);
    // المرسم الاحتياطي (بلا Stage) — jsdom لا يوفّر getContext/toBlob
    HTMLCanvasElement.prototype.getContext = function () {
      return { fillStyle: '', fillRect: () => {} } as never;
    };
    HTMLCanvasElement.prototype.toBlob = function (cb: never) {
      (cb as (b: Blob) => void)(new Blob(['raw'], { type: 'image/png' }));
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('يُطبّق العلامة مائياً افتراضياً', async () => {
    const blob = await exportCanvas('png', 1, null);
    expect(blob).not.toBeNull();
    expect(applyWatermarkIfFree).toHaveBeenCalledTimes(1);
  });

  it('يتخطى العلامة عند watermark: false', async () => {
    const blob = await exportCanvas('png', 1, null, { watermark: false });
    expect(blob).not.toBeNull();
    expect(await blob!.text()).toBe('raw');
    expect(applyWatermarkIfFree).not.toHaveBeenCalled();
  });
});
