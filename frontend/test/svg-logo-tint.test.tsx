import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const rasterizeMock = vi.fn(
  async (_svg: string, width: number, height: number): Promise<HTMLCanvasElement> => {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    return c;
  },
);

const renderBlobMock = vi.fn(async (svg: string, width: number, height: number): Promise<Blob> => {
  return new Blob([`${width}x${height}:${svg.slice(0, 64)}`], { type: 'image/png' });
});

vi.mock('@/features/stickers/lib/svg-rasterizer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/stickers/lib/svg-rasterizer')>();
  return {
    ...actual,
    rasterizeSvgToCanvas: (...args: Parameters<typeof actual.rasterizeSvgToCanvas>) =>
      rasterizeMock(args[0], args[1], args[2]),
    renderSvgToPngBlob: (...args: Parameters<typeof actual.renderSvgToPngBlob>) =>
      renderBlobMock(args[0], args[1] ?? 0, args[2] ?? 0),
  };
});

import { ImageStyleProperties } from '@/components/editor/properties/panels/image-properties';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ensureStickerPrintResolution } from '@/features/stickers/lib/print-rerasterize';
import {
  clearStickerDisplayCache,
  useStickerDisplayRaster,
} from '@/hooks/use-sticker-display-raster';
import { useCanvasInteraction } from '@/lib/canvas/canvas-interaction-store';
import {
  applySvgLogoTint,
  clearSvgLogoCache,
  ensureSvgRasterDimensions,
  normalizeAndSanitizeSvgMarkup,
  parseSvgDimensions,
  primeSvgMarkupCache,
} from '@/lib/canvas/svg-logo';
import { useEditorStore } from '@/lib/editor-store';
import { runFreeformPreflight } from '@/lib/export/freeform-preflight';
import { deserializeProjectFile, serializeEditorState } from '@/lib/io/project-serializer';
import { buildSingleComposition } from '@/lib/print/single-print-composition';
import { parseSanitizedCanvasElements } from '@/lib/schema';
import { seedHistorySnapshot } from '@/lib/store/slices/history-slice';

import type { EditorState } from '@/lib/editor-store';
import type { ImageElement } from '@/lib/store/types';

function makeBaseImage(width: number, height: number): HTMLImageElement {
  return {
    width,
    height,
    naturalWidth: width,
    naturalHeight: height,
  } as unknown as HTMLImageElement;
}

function makeSvgImageElement(overrides: Partial<ImageElement> = {}): ImageElement {
  return {
    id: 'logo-1',
    type: 'image',
    imageSrc: '/local-image/brand-logo.svg',
    x: 0.1,
    y: 0.1,
    width: 0.25,
    height: 0.25,
    rotation: 0,
    opacity: 1,
    zIndex: 1,
    filter: 'none',
    brightness: 100,
    contrast: 100,
    saturation: 100,
    flipX: false,
    flipY: false,
    ...overrides,
  };
}

describe('FF-06 SVG logo sanitization, tinting, Konva, print & inspector UI', () => {
  beforeEach(() => {
    clearSvgLogoCache();
    clearStickerDisplayCache();
    rasterizeMock.mockClear();
    renderBlobMock.mockClear();
    useCanvasInteraction.setState({ isDragging: false, isTransforming: false });
    useEditorStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('normalizes Illustrator <style> rules, strips dangerous vectors, and stamps raster dimensions', () => {
    const rawSvg = `
      <svg width="24" height="12" onclick="alert(1)">
        <style>
          .cls-1 { fill: #123456; stroke: none; }
          .bad { background: url(https://evil.test/x.png); fill: #abcdef; }
        </style>
        <script>alert('xss')</script>
        <foreignObject width="10" height="10"><div>html</div></foreignObject>
        <animate attributeName="x" from="0" to="10" dur="1s" />
        <rect class="cls-1" x="0" y="0" width="24" height="12" onload="evil()" />
        <circle cx="6" cy="6" r="4" fill="url(https://evil.test/grad)" />
      </svg>
    `;

    const clean = normalizeAndSanitizeSvgMarkup(rawSvg);
    expect(clean).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(clean).toContain('viewBox="0 0 24 12"');
    expect(clean).toContain('fill:#123456');
    expect(clean).not.toContain('<style');
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('foreignObject');
    expect(clean).not.toContain('<animate');
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('onload');
    expect(clean).not.toContain('https://evil.test');

    const stamped = ensureSvgRasterDimensions(clean, 1500, 750);
    expect(stamped).toContain('viewBox="0 0 24 12"');
    expect(stamped).toContain('width="1500"');
    expect(stamped).toContain('height="750"');
  });

  it('normalizes small and physical-unit SVG dimensions while preserving aspect ratio', () => {
    expect(parseSvgDimensions('<svg width="24" height="12"></svg>')).toEqual({
      width: 1024,
      height: 512,
    });
    const mmDims = parseSvgDimensions('<svg width="50mm" height="25mm"></svg>');
    expect(mmDims).not.toBeNull();
    expect(mmDims!.width).toBeGreaterThanOrEqual(1024);
    expect(mmDims!.width / mmDims!.height).toBeCloseTo(2, 2);
  });

  it('tints fills, stroke-only icons, and gradient stops while protecting masks, clipPaths, and invalid inputs', () => {
    const complexSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <defs>
          <linearGradient id="brandGrad">
            <stop offset="0%" stop-color="#112233" stop-opacity="0.4" />
            <stop offset="100%" stop-color="#445566" stop-opacity="1" />
          </linearGradient>
          <mask id="cutMask">
            <rect width="64" height="64" fill="#FFFFFF" />
            <circle cx="32" cy="32" r="10" fill="#000000" />
          </mask>
          <clipPath id="clipBox">
            <rect x="4" y="4" width="56" height="56" fill="#000000" />
          </clipPath>
        </defs>
        <path id="filled-shape" fill="#1D4ED8" d="M0 0h20v20H0z" />
        <path id="stroke-icon" fill="none" stroke="currentColor" stroke-width="3" d="M4 4l12 12" />
        <rect id="grad-rect" width="10" height="10" fill="url(#brandGrad)" />
      </svg>
    `;

    const tinted = applySvgLogoTint(complexSvg, '#ef4444');
    const doc = new DOMParser().parseFromString(tinted, 'image/svg+xml');
    expect(doc.getElementById('filled-shape')?.getAttribute('fill')).toBe('#EF4444');
    expect(doc.getElementById('stroke-icon')?.getAttribute('fill')).toBe('none');
    expect(doc.getElementById('stroke-icon')?.getAttribute('stroke')).toBe('#EF4444');
    expect(doc.getElementById('grad-rect')?.getAttribute('fill')).toBe('url(#brandGrad)');

    const stops = doc.querySelectorAll('#brandGrad stop');
    expect(stops[0]?.getAttribute('stop-color')).toBe('#EF4444');
    expect(stops[0]?.getAttribute('stop-opacity')).toBe('0.4');
    expect(stops[1]?.getAttribute('stop-color')).toBe('#EF4444');

    expect(doc.querySelector('#cutMask rect')?.getAttribute('fill')).toBe('#FFFFFF');
    expect(doc.querySelector('#cutMask circle')?.getAttribute('fill')).toBe('#000000');
    expect(doc.querySelector('#clipBox rect')?.getAttribute('fill')).toBe('#000000');

    expect(applySvgLogoTint(complexSvg, undefined)).toBe(complexSvg);
    expect(applySvgLogoTint(complexSvg, 'transparent')).toBe(complexSvg);
    expect(applySvgLogoTint(complexSvg, 'none')).toBe(complexSvg);
    expect(applySvgLogoTint(complexSvg, 'url(https://evil.test/x)')).toBe(complexSvg);
  });

  it('keeps tinted SVG raster crisp below baseImage size, sticks during color updates, and resets on clear', async () => {
    vi.useFakeTimers();
    const logoSrc = '/local-image/brand-logo.svg';
    const cleanSvg = normalizeAndSanitizeSvgMarkup(
      '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#111827"/></svg>',
    );
    primeSvgMarkupCache(logoSrc, cleanSvg);

    const baseImage = makeBaseImage(1024, 1024);

    const { result, rerender } = renderHook(
      ({ tint }: { tint?: string }) =>
        useStickerDisplayRaster({
          imageSrc: logoSrc,
          svgTintColor: tint,
          nodeW: 200,
          nodeH: 200,
          baseImage,
        }),
      { initialProps: { tint: '#EF4444' as string | undefined } },
    );

    await act(async () => {
      vi.advanceTimersByTime(20);
      await Promise.resolve();
    });

    const redCanvas = result.current;
    expect(redCanvas).not.toBeNull();
    expect(rasterizeMock).toHaveBeenCalledTimes(1);
    expect(rasterizeMock.mock.calls[0]?.[0]).toContain('#EF4444');

    // التبديل إلى لون جديد: يحتفظ بآخر كانفس ملون بدون وميض للون الأصلي حتى ينتهي الـ 16ms debounce
    rerender({ tint: '#3B82F6' });
    expect(result.current).toBe(redCanvas);

    await act(async () => {
      vi.advanceTimersByTime(20);
      await Promise.resolve();
    });

    const blueCanvas = result.current;
    expect(blueCanvas).not.toBeNull();
    expect(blueCanvas).not.toBe(redCanvas);
    expect(rasterizeMock).toHaveBeenCalledTimes(2);
    expect(rasterizeMock.mock.calls[1]?.[0]).toContain('#3B82F6');

    // عند استعادة اللون الأصلي والعنصر أصغر من baseImage: يعود فوراً لـ null لعرض الأصل بلا تكلفة إضافية
    rerender({ tint: undefined });
    expect(result.current).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });
    expect(rasterizeMock).toHaveBeenCalledTimes(2);
    expect(result.current).toBeNull();
  });

  it('produces distinct per-element print rasters, bypasses Go fast path, and skips false low-DPI warnings', async () => {
    const logoSrc = '/local-image/brand-logo.svg';
    const cleanSvg = normalizeAndSanitizeSvgMarkup(
      '<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#0F172A"/></svg>',
    );
    primeSvgMarkupCache(logoSrc, cleanSvg);

    const elRed = makeSvgImageElement({ id: 'logo-red', svgTintColor: '#EF4444' });
    const elBlue = makeSvgImageElement({ id: 'logo-blue', x: 0.5, svgTintColor: '#3B82F6' });

    let uploadSeq = 0;
    const upload = vi.fn(async () => `/local-image/print-${++uploadSeq}.png`);

    const dims = new Map([[logoSrc, { width: 1024, height: 1024 }]]);
    const reRaster = await ensureStickerPrintResolution([elRed, elBlue], {
      canvasWidthMM: 200,
      canvasHeightMM: 200,
      targetDpi: 300,
      imageDimensions: dims,
      upload,
    });

    expect(upload).toHaveBeenCalledTimes(2);
    const redUrl = reRaster.elementSrcMap.get('logo-red');
    const blueUrl = reRaster.elementSrcMap.get('logo-blue');
    expect(redUrl).toBe('/local-image/print-1.png');
    expect(blueUrl).toBe('/local-image/print-2.png');
    expect(redUrl).not.toBe(blueUrl);

    const fastComp = buildSingleComposition({
      canvasWidth: 1200,
      canvasHeight: 1200,
      canvasWidthMM: 200,
      canvasHeightMM: 200,
      backgroundColor: '#FFFFFF',
      elements: [elRed],
    });
    expect(fastComp.eligible).toBe(false);
    expect(fastComp.reason).toContain('شعار SVG متجه');

    const preflightValid = runFreeformPreflight({
      elements: [makeSvgImageElement({ id: 'svg-huge', width: 0.9, height: 0.9 })],
      canvasWidthMM: 500,
      canvasHeightMM: 500,
      canvasWidthPx: 1200,
      canvasHeightPx: 1200,
      imageDimensions: new Map([[logoSrc, { width: 100, height: 100 }]]),
      minDpi: 250,
    });
    expect(preflightValid.blocking).toHaveLength(0);
    expect(preflightValid.warnings).toHaveLength(0);

    const preflightMissing = runFreeformPreflight({
      elements: [makeSvgImageElement({ id: 'svg-missing' })],
      canvasWidthMM: 200,
      canvasHeightMM: 200,
      canvasWidthPx: 1200,
      canvasHeightPx: 1200,
      imageDimensions: new Map(),
      minDpi: 250,
    });
    expect(preflightMissing.blocking).toHaveLength(1);
    expect(preflightMissing.blocking[0]?.kind).toBe('unreadable');
  });

  it('renders لون الشعار section for SVG logos, collapses AI tools, avoids duplicate history, and undoes in one step', () => {
    const svgEl = makeSvgImageElement();
    const photoEl = makeSvgImageElement({ id: 'photo-1', imageSrc: '/local-image/photo.png' });

    useEditorStore.setState((s) => ({
      elements: [photoEl],
      selectedIds: [photoEl.id],
      ...seedHistorySnapshot({ ...s, elements: [photoEl] }),
    }));

    const Harness = ({ elementId }: { elementId: string }) => {
      const liveEl = useEditorStore((s) =>
        s.elements.find((el): el is ImageElement => el.id === elementId && el.type === 'image'),
      );
      if (!liveEl) return null;
      return (
        <div dir="rtl">
          <TooltipProvider>
            <ImageStyleProperties
              element={liveEl}
              onUpdate={(id, patch) => useEditorStore.getState().updateElement(id, patch)}
            />
          </TooltipProvider>
        </div>
      );
    };

    const { rerender } = render(<Harness elementId={photoEl.id} />);
    expect(screen.queryByText('لون الشعار')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'أدوات الذكاء الاصطناعي' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    act(() => {
      useEditorStore.setState((s) => ({
        elements: [svgEl],
        selectedIds: [svgEl.id],
        ...seedHistorySnapshot({ ...s, elements: [svgEl] }),
      }));
    });
    rerender(<Harness elementId={svgEl.id} />);

    expect(screen.getByText('لون الشعار')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'أدوات الذكاء الاصطناعي' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('button', { name: 'استعادة اللون الأصلي' })).not.toBeInTheDocument();

    const redBtn = screen.getByRole('button', { name: 'لون أحمر' });
    fireEvent.click(redBtn);
    expect((useEditorStore.getState().elements[0] as ImageElement).svgTintColor).toBe('#EF4444');
    expect(useEditorStore.getState().history).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'استعادة اللون الأصلي' })).toBeInTheDocument();

    // النقر مرة ثانية على نفس اللون النشط لا يضيف قيد تراجع مكرراً
    fireEvent.click(screen.getByRole('button', { name: 'لون أحمر' }));
    expect(useEditorStore.getState().history).toHaveLength(2);

    // استعادة اللون الأصلي بضغطة واحدة
    fireEvent.click(screen.getByRole('button', { name: 'استعادة اللون الأصلي' }));
    expect((useEditorStore.getState().elements[0] as ImageElement).svgTintColor).toBeUndefined();
    expect(useEditorStore.getState().history).toHaveLength(3);

    // التراجع بخطوة واحدة يستعيد اللون الأحمر، وخطوة أخرى تعيد للأصل
    act(() => {
      useEditorStore.getState().undo();
    });
    expect((useEditorStore.getState().elements[0] as ImageElement).svgTintColor).toBe('#EF4444');

    act(() => {
      useEditorStore.getState().undo();
    });
    expect((useEditorStore.getState().elements[0] as ImageElement).svgTintColor).toBeUndefined();
  });

  it('sanitizes svgTintColor and SVG data URIs in schema parsing and project deserialization', () => {
    const svgWithScript = '<svg xmlns="http://www.w3.org/2000/svg"><script>1</script><rect/></svg>';
    const encodedDirty = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgWithScript)}`;

    const parsedValid = parseSanitizedCanvasElements([
      makeSvgImageElement({
        imageSrc: encodedDirty,
        svgTintColor: '#3b82f6',
      }),
    ]);
    expect(parsedValid).not.toBeNull();
    expect(parsedValid?.[0]).toMatchObject({ svgTintColor: '#3B82F6' });
    const parsedSrc = (parsedValid?.[0] as ImageElement).imageSrc!;
    expect(parsedSrc).toMatch(/^data:image\/svg\+xml;/);
    expect(decodeURIComponent(atob(parsedSrc.split(',')[1] || ''))).not.toContain('<script');

    const parsedUnsafeTint = parseSanitizedCanvasElements([
      makeSvgImageElement({
        svgTintColor: 'url(https://evil.test/a)',
      }),
      makeSvgImageElement({
        id: 'logo-trans',
        svgTintColor: 'transparent',
      }),
    ]);
    expect((parsedUnsafeTint?.[0] as ImageElement).svgTintColor).toBeUndefined();
    expect((parsedUnsafeTint?.[1] as ImageElement).svgTintColor).toBeUndefined();

    const dirtyHtmlUri = 'data:image/svg+xml;charset=utf-8,<html><body>bad</body></html>';
    expect(
      parseSanitizedCanvasElements([makeSvgImageElement({ imageSrc: dirtyHtmlUri })]),
    ).toBeNull();

    const baseState: Partial<EditorState> = {
      mode: 'single',
      canvasWidth: 1200,
      canvasHeight: 1200,
      backgroundColor: '#FFFFFF',
      elements: [makeSvgImageElement({ svgTintColor: '#10b981' })],
      slots: [],
      template: null,
      collageTemplate: null,
      printSettings: {
        paperId: 'a4',
        paperWidthMM: 210,
        paperHeightMM: 297,
        marginMM: 5,
        dpi: 300,
        copiesPerSheet: 1,
        showCutLines: true,
        orientation: 'portrait',
      },
      showGrid: false,
      gridSize: 50,
      gridColor: '#000000',
      gridOpacity: 0.15,
    };

    const jsonObj = JSON.parse(
      JSON.stringify(serializeEditorState(baseState as EditorState)),
    ) as Record<string, unknown>;
    const roundTripped = deserializeProjectFile(jsonObj);
    expect((roundTripped.elements[0] as ImageElement).svgTintColor).toBe('#10B981');

    (jsonObj.elements as Array<Record<string, unknown>>)[0].svgTintColor = 'javascript:alert(1)';
    const stripped = deserializeProjectFile(jsonObj);
    expect((stripped.elements[0] as ImageElement).svgTintColor).toBeUndefined();

    (jsonObj.elements as Array<Record<string, unknown>>)[0].imageSrc = dirtyHtmlUri;
    expect(() => deserializeProjectFile(jsonObj)).toThrow();
  });
});
