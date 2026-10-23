import { test, expect } from '@playwright/test';

import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

import type { Page } from '@playwright/test';

/**
 * حرس تطابق التحويل بين المعاينة (Konva Stage) والتصدير اليدوي
 * (renderFittedBranch) — الدوران في Konva حول أصل العنصر (x,y) لا حول مركزه.
 * نقارن موضع الحبر (مركز + صندوق محيط) في اللقطتين لعنصر مدوّر، لأن انحراف
 * المحور يزيح الكتلة بمئات البكسلات ولا يلتقطه أي اختبار وحدات.
 */

type InkStats = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centerX: number;
  centerY: number;
  count: number;
};

async function compareRotatedPreviewWithExport(page: Page, kind: 'text' | 'image') {
  return page.evaluate(async (elementKind) => {
    const storePath = '/src/lib/editor-store.ts';
    const storeMod = (await import(/* @vite-ignore */ storePath)) as {
      useEditorStore: {
        getState: () => {
          elements: Array<Record<string, unknown>>;
          canvasWidth: number;
          canvasHeight: number;
          addTextElement: (text?: string) => string;
          addImageElement: (src: string, aspect?: number) => void;
          updateElement: (id: string, patch: Record<string, unknown>) => void;
        };
        setState: (state: Record<string, unknown>) => void;
      };
    };
    const store = storeMod.useEditorStore;

    // ورقة بيضاء وعنصر واحد فقط — عزل الحبر عن أي خلفية أو عناصر أخرى
    store.setState({
      elements: [],
      selectedIds: [],
      selectedId: null,
      editingTextId: null,
      mode: 'single',
      backgroundColor: '#ffffff',
      backgroundGradientColor2: null,
    });

    if (elementKind === 'text') {
      const state = store.getState();
      const id = state.addTextElement('ROTATED');
      state.updateElement(id, {
        x: 0.2,
        y: 0.3,
        width: 0.4,
        height: 0.1,
        rotation: 90,
        textSizing: 'fixed',
        fontSize: 72,
        fontFamily: 'Arial',
        fontWeight: 400,
        textAlign: 'left',
        color: '#000000',
        letterSpacing: 0,
        textBgColor: 'transparent',
        lineHeight: 1.2,
        curve: 0,
      });
    } else {
      const source = document.createElement('canvas');
      source.width = 200;
      source.height = 100;
      const sourceCtx = source.getContext('2d');
      if (!sourceCtx) throw new Error('no 2d context');
      sourceCtx.fillStyle = '#000000';
      sourceCtx.fillRect(0, 0, 200, 100);

      store.getState().addImageElement(source.toDataURL('image/png'), 2);
      const id = store.getState().elements[0].id as string;
      store.getState().updateElement(id, {
        x: 0.15,
        y: 0.25,
        width: 0.3,
        height: 0.15,
        rotation: 35,
        opacity: 1,
        cornerRadius: 0,
      });
    }
    store.setState({ selectedIds: [], selectedId: null });

    const stage = (
      window as unknown as {
        __gridoStage?: {
          find: (selector: string) => Array<{ image?: () => { width?: number } | undefined }>;
        };
      }
    ).__gridoStage;
    if (!stage) throw new Error('stage missing');

    // اترك تأثيرات مزامنة الهندسة/تحميل الصورة تكتمل قبل أخذ المقاييس
    for (let i = 0; i < 40; i++) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      if (elementKind !== 'image') continue;
      const image = stage.find('Image')[0]?.image?.();
      if (image && (image.width ?? 0) > 0) break;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));

    const finalState = store.getState();
    const elements = finalState.elements;
    const cw = finalState.canvasWidth;
    const ch = finalState.canvasHeight;
    if (elements.length !== 1) throw new Error(`expected one element, got ${elements.length}`);

    const capturePath = '/src/lib/canvas/konva-export-utils.ts';
    const { captureStageBlob } = (await import(/* @vite-ignore */ capturePath)) as {
      captureStageBlob: (
        target: unknown,
        pixelRatio: number,
        mime?: string,
        quality?: number,
        captureRect?: { x: number; y: number; width: number; height: number },
        options?: { useFullResolution?: boolean },
      ) => Promise<Blob | null>;
    };
    const fitPath = '/src/lib/canvas/fit.ts';
    const { paperCaptureRect } = (await import(/* @vite-ignore */ fitPath)) as {
      paperCaptureRect: (
        w: number,
        h: number,
      ) => {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    };
    const exportPath = '/src/lib/export/export-canvas-fitted.ts';
    const { renderFittedBranch } = (await import(/* @vite-ignore */ exportPath)) as {
      renderFittedBranch: (
        ctx: CanvasRenderingContext2D,
        els: unknown,
        width: number,
        height: number,
      ) => Promise<void>;
    };
    const geometryPath = '/src/lib/canvas/element-geometry.ts';
    const { getElementPixelVisualBox } = (await import(/* @vite-ignore */ geometryPath)) as {
      getElementPixelVisualBox: (
        x: number,
        y: number,
        w: number,
        h: number,
        rotation: number,
      ) => { minX: number; minY: number; maxX: number; maxY: number };
    };

    const blob = await captureStageBlob(
      stage,
      1,
      'image/png',
      undefined,
      paperCaptureRect(cw, ch),
      { useFullResolution: true },
    );
    if (!blob) throw new Error('stage capture failed');
    const bitmap = await createImageBitmap(blob);
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = cw;
    previewCanvas.height = ch;
    const previewCtx = previewCanvas.getContext('2d');
    if (!previewCtx) throw new Error('no preview context');
    previewCtx.drawImage(bitmap, 0, 0, cw, ch);

    const manualCanvas = document.createElement('canvas');
    manualCanvas.width = cw;
    manualCanvas.height = ch;
    const manualCtx = manualCanvas.getContext('2d');
    if (!manualCtx) throw new Error('no manual context');
    manualCtx.fillStyle = '#ffffff';
    manualCtx.fillRect(0, 0, cw, ch);
    await renderFittedBranch(manualCtx, elements, cw, ch);

    const el = elements[0];
    const box = getElementPixelVisualBox(
      (el.x as number) * cw,
      (el.y as number) * ch,
      (el.width as number) * cw,
      (el.height as number) * ch,
      el.rotation as number,
    );
    const pad = 60;
    const region = {
      x: Math.max(0, Math.floor(box.minX - pad)),
      y: Math.max(0, Math.floor(box.minY - pad)),
      w: Math.min(cw, Math.ceil(box.maxX + pad)) - Math.max(0, Math.floor(box.minX - pad)),
      h: Math.min(ch, Math.ceil(box.maxY + pad)) - Math.max(0, Math.floor(box.minY - pad)),
    };

    const inkStats = (canvas: HTMLCanvasElement): InkStats => {
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no ctx');
      const data = ctx.getImageData(region.x, region.y, region.w, region.h).data;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      let weightSum = 0;
      let weightedX = 0;
      let weightedY = 0;
      let count = 0;
      for (let y = 0; y < region.h; y++) {
        for (let x = 0; x < region.w; x++) {
          const i = (y * region.w + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          // الحبر داكن على أبيض؛ يُتجاهل أي إطار ورقة فاتح
          const darkness = 255 - Math.min(r, g, b);
          if (a < 16 || darkness < 30) continue;
          count++;
          const px = region.x + x;
          const py = region.y + y;
          if (px < minX) minX = px;
          if (py < minY) minY = py;
          if (px > maxX) maxX = px;
          if (py > maxY) maxY = py;
          weightSum += darkness;
          weightedX += px * darkness;
          weightedY += py * darkness;
        }
      }
      return {
        minX,
        minY,
        maxX,
        maxY,
        centerX: weightSum > 0 ? weightedX / weightSum : Number.NaN,
        centerY: weightSum > 0 ? weightedY / weightSum : Number.NaN,
        count,
      };
    };

    bitmap.close();
    return {
      preview: inkStats(previewCanvas),
      manual: inkStats(manualCanvas),
      element: {
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        rotation: el.rotation,
      },
      box,
    };
  }, kind);
}

test.describe('export transform parity with the Konva preview', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('rotated text keeps the same ink position in preview and manual export', async ({
    page,
  }) => {
    const result = await compareRotatedPreviewWithExport(page, 'text');

    expect(result.preview.count).toBeGreaterThan(100);
    expect(result.manual.count).toBeGreaterThan(100);
    // الانحراف قبل الإصلاح كان بمئات البكسلات (دوران حول المركز بدل الأصل)
    expect(Math.abs(result.manual.centerX - result.preview.centerX)).toBeLessThan(2);
    expect(Math.abs(result.manual.centerY - result.preview.centerY)).toBeLessThan(2);
    expect(Math.abs(result.manual.minX - result.preview.minX)).toBeLessThanOrEqual(2);
    expect(Math.abs(result.manual.minY - result.preview.minY)).toBeLessThanOrEqual(2);
    expect(Math.abs(result.manual.maxX - result.preview.maxX)).toBeLessThanOrEqual(2);
    expect(Math.abs(result.manual.maxY - result.preview.maxY)).toBeLessThanOrEqual(2);
  });

  test('rotated image keeps the same ink position in preview and manual export', async ({
    page,
  }) => {
    const result = await compareRotatedPreviewWithExport(page, 'image');

    expect(result.preview.count).toBeGreaterThan(1000);
    expect(result.manual.count).toBeGreaterThan(1000);
    expect(Math.abs(result.manual.centerX - result.preview.centerX)).toBeLessThan(2);
    expect(Math.abs(result.manual.centerY - result.preview.centerY)).toBeLessThan(2);
    expect(Math.abs(result.manual.minX - result.preview.minX)).toBeLessThanOrEqual(2);
    expect(Math.abs(result.manual.minY - result.preview.minY)).toBeLessThanOrEqual(2);
    expect(Math.abs(result.manual.maxX - result.preview.maxX)).toBeLessThanOrEqual(2);
    expect(Math.abs(result.manual.maxY - result.preview.maxY)).toBeLessThanOrEqual(2);
  });
});
