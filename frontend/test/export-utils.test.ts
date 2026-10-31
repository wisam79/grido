import { toast } from 'sonner';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { injectPngDpi, injectPngDpiBlob } from '../src/lib/canvas/png-dpi';
import { useEditorStore } from '../src/lib/editor-store';
import { exportCanvas, downloadBlob, quickExportPNG } from '../src/lib/export';
import { SaveFileDialog } from '../wailsjs/go/main/App';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// جسر Wails v3: downloadBlob/quickExportPNG تستورد SaveFileDialog من wailsjs/go/main/App
// (جسر يدوي يعيد التصدير من bindings/grido عبر @wailsio/runtime) — الحقن في window.go
// (نمط v2) لا تأثير له، لذا نحاكي وحدة الجسر نفسها بنمط المشروع (export-project.test.ts).
// ملاحظة: لا نستخدم importOriginal هنا — تحميل الجسر الحقيقي داخل الـfactory يفشل
// في jsdom («Cannot read properties of undefined (reading 'config')» من @wailsio/runtime).
vi.mock('../wailsjs/go/main/App', () => ({
  SaveFileDialog: vi.fn(),
}));

describe('export-utils - Image/Project Export Utilities Tests', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
    useEditorStore.setState({
      user: {
        plan: 'pro',
        status: 'active',
        expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
      } as any,
    });
    vi.clearAllMocks();

    // Mock Canvas context and toBlob for jsdom compatibility
    HTMLCanvasElement.prototype.toBlob = function (callback: any, type?: string, _quality?: any) {
      callback(new Blob(['mock-image-data'], { type: type || 'image/png' }));
    };
    HTMLCanvasElement.prototype.getContext = function () {
      return {
        fillRect: () => {},
        drawImage: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
        scale: () => {},
        beginPath: () => {},
        rect: () => {},
        clip: () => {},
        strokeRect: () => {},
        fillText: () => {},
        ellipse: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        fill: () => {},
        closePath: () => {},
        roundRect: () => {},
      } as any;
    };
  });

  it('should fall back to manual canvas when stageRef is absent', async () => {
    // Mock HTMLCanvasElement to prevent actually rendering, but verify fallback gets triggered
    const spy = vi.spyOn(document, 'createElement');

    // We expect exportCanvas to execute fallback logic using document.createElement("canvas")
    const blob = await exportCanvas('png', 0.95, null);

    expect(spy).toHaveBeenCalledWith('canvas');
    expect(blob).toBeInstanceOf(Blob);
    spy.mockRestore();
  });

  it('should call SaveFileDialog during downloadBlob for image files', async () => {
    const mockSaveFileDialog = vi.mocked(SaveFileDialog);
    mockSaveFileDialog.mockResolvedValue('success');

    const blob = new Blob(['mock-image-data'], { type: 'image/png' });
    const result = await downloadBlob(blob, 'photo.png');

    expect(mockSaveFileDialog).toHaveBeenCalled();
    expect(result).toBe('success');
  });

  it('should trigger toast notifications for quickExportPNG success, cancel, and failures', async () => {
    const mockSaveFileDialog = vi.mocked(SaveFileDialog);
    mockSaveFileDialog.mockResolvedValue('success');

    // Case 1: Success
    await quickExportPNG();
    expect(toast.success).toHaveBeenCalledWith('تم تصدير الصورة بنجاح');

    // Case 2: SaveFileDialog returns error
    vi.clearAllMocks();
    mockSaveFileDialog.mockResolvedValue('error');
    await quickExportPNG();
    expect(toast.error).toHaveBeenCalledWith('فشل تصدير الصورة');
    expect(toast.success).not.toHaveBeenCalled();

    // Case 3: User cancelled dialog (returns empty string)
    vi.clearAllMocks();
    mockSaveFileDialog.mockResolvedValue('');
    await quickExportPNG();
    expect(toast.info).toHaveBeenCalledWith('تم إلغاء تصدير الصورة');
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });
});

/** أصغر PNG صالح بنيوياً لفحص الحاقن: توقيع + IHDR + IDAT + IEND */
function makeMinimalPng(): Uint8Array {
  const chunk = (type: string, data: Uint8Array): Uint8Array => {
    const out = new Uint8Array(12 + data.length);
    const view = new DataView(out.buffer);
    view.setUint32(0, data.length);
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(data, 8);
    return out;
  };
  const ihdr = chunk('IHDR', new Uint8Array(13));
  const idat = chunk('IDAT', new Uint8Array([0x00, 0x00]));
  const iend = chunk('IEND', new Uint8Array(0));
  const png = new Uint8Array(8 + ihdr.length + idat.length + iend.length);
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  png.set(ihdr, 8);
  png.set(idat, 8 + ihdr.length);
  png.set(iend, 8 + ihdr.length + idat.length);
  return png;
}

function readU32(bytes: Uint8Array, at: number): number {
  return ((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0;
}

describe('png-dpi - pHYs injection (B-15: sticker PNG exports carry DPI)', () => {
  it('inserts a pHYs chunk after IHDR with the correct pixels-per-meter', () => {
    const png = makeMinimalPng();
    const out = injectPngDpi(png, 300);
    expect(out.length).toBe(png.length + 21);
    // pHYs مباشرة بعد نهاية IHDR (8 + 25)
    expect(String.fromCharCode(out[37], out[38], out[39], out[40])).toBe('pHYs');
    // 300 DPI = 11811 بكسل/متر (round(300/0.0254))
    expect(readU32(out, 41)).toBe(11811);
    expect(readU32(out, 45)).toBe(11811);
    expect(out[49]).toBe(1); // unit = meter
  });

  it('is idempotent and respects an existing pHYs chunk', () => {
    const png = makeMinimalPng();
    const once = injectPngDpi(png, 600);
    expect(readU32(once, 41)).toBe(23622); // round(600/0.0254)
    const twice = injectPngDpi(once, 300);
    expect(twice).toBe(once); // بلا استبدال كثافة مسجلة
    expect(twice.length).toBe(once.length);
  });

  it('passes through invalid input untouched', () => {
    const png = makeMinimalPng();
    expect(injectPngDpi(png, 0)).toBe(png); // خارج المدى 36–2400
    expect(injectPngDpi(png, 9999)).toBe(png);
    const notPng = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(injectPngDpi(notPng, 300)).toBe(notPng);
  });

  it('blob wrapper passes non-PNG blobs through', async () => {
    const svgBlob = new Blob(['<svg/>'], { type: 'image/svg+xml' });
    expect(await injectPngDpiBlob(svgBlob, 300)).toBe(svgBlob);
  });
});
