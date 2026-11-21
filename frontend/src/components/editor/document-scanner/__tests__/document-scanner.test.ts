import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import React from 'react';
import { toast } from 'sonner';
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ScannerSidebar } from '../components/scanner-sidebar';

import {
  approxPolyDP,
  extractFourCornersFromHull,
  sortCornerPoints,
  inferSmartDocumentAspect,
  splitQuadIntoIdCards,
  addManualDocumentQuad,
  computePerspectiveTransform,
} from '../core';
import { detectDocumentAuto, terminateMlWorker } from '../core/ml-orchestrator';
import { warpDocumentViaGo } from '../core/warp-client';
import { useScannerDetection } from '../hooks/use-scanner-detection';
import { useScannerProcessor } from '../hooks/use-scanner-processor';

vi.mock('../core/warp-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../core/warp-client')>()),
  warpDocumentViaGo: vi.fn(),
}));
vi.mock('../core/ml-orchestrator', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../core/ml-orchestrator')>()),
  detectDocumentAuto: vi.fn(),
  warmupMlDetector: vi.fn(),
  terminateMlWorker: vi.fn(),
}));

import type { Point } from '../core';
import type { DetectedDocument } from '../core/types';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const ownedCorners: Point[] = [
  { x: 10, y: 10 },
  { x: 190, y: 10 },
  { x: 190, y: 90 },
  { x: 10, y: 90 },
];

function ownedImage() {
  const img = new Image();
  Object.defineProperties(img, {
    naturalWidth: { value: 200 },
    naturalHeight: { value: 100 },
  });
  return img;
}

function warpResult(url: string) {
  return { url, width: 200, height: 100 };
}

describe('scanner operation ownership regressions', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('cancels a preview reset before React renders, with a stable reset callback', async () => {
    const pending = deferred<ReturnType<typeof warpResult>>();
    vi.mocked(warpDocumentViaGo).mockReturnValueOnce(pending.promise);
    const { result } = renderHook(() =>
      useScannerProcessor({ current: ownedImage() }, 'original', 0, true),
    );
    const reset = result.current.resetPreview;
    let attempt!: Promise<void>;
    act(() => {
      attempt = result.current.handleTogglePreview(ownedCorners, 'free');
      reset();
    });
    expect(vi.mocked(warpDocumentViaGo).mock.calls[0][6]?.aborted).toBe(true);
    await act(async () => {
      pending.resolve(warpResult('/old.png'));
      await attempt;
    });
    expect(result.current.resetPreview).toBe(reset);
    expect(result.current.isPreviewMode).toBe(false);
    expect(result.current.isPreviewing).toBe(false);
    expect(result.current.previewSrc).toBeNull();
  });

  it('aborts close/unmount and an old finally cannot clear a reopened preview', async () => {
    const old = deferred<ReturnType<typeof warpResult>>();
    const fresh = deferred<ReturnType<typeof warpResult>>();
    vi.mocked(warpDocumentViaGo)
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(fresh.promise);
    const imgRef = { current: ownedImage() };
    const view = renderHook(({ open }) => useScannerProcessor(imgRef, 'original', 0, open), {
      initialProps: { open: true },
    });
    let first!: Promise<void>;
    act(() => {
      first = view.result.current.handleTogglePreview(ownedCorners, 'free');
    });
    view.rerender({ open: false });
    expect(vi.mocked(warpDocumentViaGo).mock.calls[0][6]?.aborted).toBe(true);
    view.rerender({ open: true });
    let second!: Promise<void>;
    act(() => {
      second = view.result.current.handleTogglePreview(ownedCorners, 'free');
    });
    await act(async () => {
      old.resolve(warpResult('/old.png'));
      await first;
    });
    expect(view.result.current.isPreviewing).toBe(true);
    expect(view.result.current.previewSrc).toBeNull();
    view.unmount();
    expect(vi.mocked(warpDocumentViaGo).mock.calls[1][6]?.aborted).toBe(true);
    await act(async () => {
      fresh.resolve(warpResult('/fresh.png'));
      await second;
    });
  });

  it('keeps export owned across preview reset and rejects a concurrent preview attempt', async () => {
    vi.useFakeTimers();
    const pending = deferred<ReturnType<typeof warpResult>>();
    vi.mocked(warpDocumentViaGo).mockReturnValueOnce(pending.promise);
    const { result } = renderHook(() =>
      useScannerProcessor({ current: ownedImage() }, 'original', 0, true),
    );
    const save = vi.fn();
    const done = vi.fn();
    let attempt!: Promise<void>;
    act(() => {
      attempt = result.current.handleApplyActive(ownedCorners, 'free', save, done);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    act(() => {
      result.current.resetPreview();
    });
    await act(async () => {
      await result.current.handleTogglePreview(ownedCorners, 'free');
    });
    expect(warpDocumentViaGo).toHaveBeenCalledTimes(1);
    expect(vi.mocked(warpDocumentViaGo).mock.calls[0][6]?.aborted).toBe(false);
    expect(result.current.isExporting).toBe(true);
    await act(async () => {
      pending.resolve(warpResult('/export.png'));
      await attempt;
    });
    expect(save).toHaveBeenCalledWith('/export.png');
    expect(done).toHaveBeenCalledTimes(1);
    expect(result.current.isExporting).toBe(false);
  });

  it('suppresses a cancelled export result and error after reopening', async () => {
    vi.useFakeTimers();
    const pending = deferred<ReturnType<typeof warpResult>>();
    vi.mocked(warpDocumentViaGo).mockReturnValueOnce(pending.promise);
    const errorToast = vi.spyOn(toast, 'error');
    const { result } = renderHook(() =>
      useScannerProcessor({ current: ownedImage() }, 'original', 0, true),
    );
    const save = vi.fn();
    const done = vi.fn();
    let attempt!: Promise<void>;
    act(() => {
      attempt = result.current.handleApplyActive(ownedCorners, 'free', save, done);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    act(() => {
      result.current.resetProcessorState();
    });
    await act(async () => {
      pending.reject(new Error('late failure'));
      await attempt;
    });
    expect(save).not.toHaveBeenCalled();
    expect(done).not.toHaveBeenCalled();
    expect(errorToast).not.toHaveBeenCalled();
  });

  it('locks document-list, selection and add/delete actions while processing', () => {
    const docs: DetectedDocument[] = [
      { id: 'a', corners: ownedCorners, confidence: 1, label: 'A', aspectType: 'free' },
      { id: 'b', corners: ownedCorners, confidence: 1, label: 'B', aspectType: 'free' },
    ];
    const onSelect = vi.fn();
    const onToggle = vi.fn();
    const onDelete = vi.fn();
    const onAdd = vi.fn();
    render(
      React.createElement(
        TooltipProvider,
        null,
        React.createElement(ScannerSidebar, {
          detectionMode: 'multi',
          detectedDocs: docs,
          activeDocIndex: 0,
          selectedDocIds: ['a', 'b'],
          isDetecting: true,
          onSelectDoc: onSelect,
          onToggleCheckDoc: onToggle,
          onDeleteDoc: onDelete,
          onAddDocument: onAdd,
          onSelectAllDocs: vi.fn(),
          onAutoDetect: vi.fn(),
          onReset: vi.fn(),
          filterMode: 'original',
          onFilterChange: vi.fn(),
          aspectType: 'free',
          onAspectChange: vi.fn(),
        }),
      ),
    );
    const select = screen.getByTitle('تحديد A');
    const remove = screen.getByRole('button', { name: 'حذف A' });
    const add = screen.getByRole('button', { name: 'إضافة' });
    const check = screen.getAllByRole('button', { name: 'إلغاء التضمين' })[0];
    for (const button of [select, remove, add, check]) {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    expect(onSelect).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
    expect(onAdd).not.toHaveBeenCalled();
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('restores per-document metadata, replaces only the split parent and keeps selection unique', () => {
    const { result } = renderHook(() => useScannerDetection(false, ''));
    const docs: DetectedDocument[] = [
      {
        id: 'a',
        corners: ownedCorners,
        confidence: 1,
        label: 'A',
        aspectType: 'free',
        rotation: 90,
        filterMode: 'bw',
      },
      {
        id: 'b',
        corners: ownedCorners,
        confidence: 1,
        label: 'B',
        aspectType: 'id_card',
        rotation: 270,
        filterMode: 'magic',
      },
    ];
    act(() => {
      result.current.setDetectedDocs(docs);
      result.current.setSelectedDocIds(['a']);
    });
    const corners = vi.fn();
    const aspect = vi.fn();
    const rotation = vi.fn();
    const reset = vi.fn();
    const filter = vi.fn();
    act(() => {
      result.current.selectDocument(1, corners, aspect, rotation, reset, filter);
    });
    expect(rotation).toHaveBeenLastCalledWith(270);
    expect(filter).toHaveBeenLastCalledWith('magic');
    act(() => {
      result.current.toggleDocSelection('a');
    });
    expect(result.current.selectedDocIds).toEqual(['a']);
    act(() => {
      result.current.handleSplitIdCards(ownedCorners, corners, aspect, reset, rotation, filter);
    });
    expect(result.current.detectedDocs).toHaveLength(3);
    expect(result.current.detectedDocs[0]).toBe(docs[0]);
    expect(result.current.detectedDocs.some((doc) => doc.id === 'b')).toBe(false);
    expect(
      result.current.detectedDocs
        .slice(1)
        .every((doc) => doc.rotation === 270 && doc.filterMode === 'magic'),
    ).toBe(true);
    expect(new Set(result.current.selectedDocIds).size).toBe(2);
    expect(result.current.activeDocIndex).toBe(1);
    act(() => {
      result.current.handleDeleteDocument(
        result.current.detectedDocs[1].id,
        corners,
        aspect,
        reset,
        rotation,
        filter,
      );
    });
    expect(rotation).toHaveBeenLastCalledWith(90);
    expect(filter).toHaveBeenLastCalledWith('bw');
  });

  it('clears old image documents during decoding and ignores late detection completion', async () => {
    const images: HTMLImageElement[] = [];
    const OriginalImage = globalThis.Image;
    vi.stubGlobal(
      'Image',
      class {
        constructor() {
          const img = new OriginalImage();
          Object.defineProperties(img, {
            naturalWidth: { value: 200 },
            naturalHeight: { value: 100 },
          });
          images.push(img);
          return img;
        }
      },
    );
    const load = (img: HTMLImageElement) => img.onload?.call(img, new Event('load'));
    const old = deferred<Awaited<ReturnType<typeof detectDocumentAuto>>>();
    const fresh = deferred<Awaited<ReturnType<typeof detectDocumentAuto>>>();
    vi.mocked(detectDocumentAuto)
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(fresh.promise);
    const view = renderHook(({ src }) => useScannerDetection(true, src), {
      initialProps: { src: '/a.png' },
    });
    const onCorners = vi.fn();
    const onAspect = vi.fn();
    const onResetDocMeta = vi.fn();
    act(() => {
      view.result.current.setDetectionCallbacks({ onCorners, onAspect, onResetDocMeta });
      load(images[0]);
    });
    const oldDoc: DetectedDocument = {
      id: 'old',
      corners: ownedCorners,
      confidence: 1,
      label: 'Old',
      aspectType: 'id_card',
    };
    act(() => {
      view.result.current.setDetectedDocs([oldDoc]);
    });
    view.rerender({ src: '/b.png' });
    expect(vi.mocked(detectDocumentAuto).mock.calls[0][4]?.aborted).toBe(true);
    expect(view.result.current.detectedDocs).toEqual([]);
    expect(view.result.current.imgSize).toEqual({ w: 0, h: 0 });
    act(() => {
      load(images[1]);
    });
    await act(async () => {
      old.resolve({ corners: ownedCorners, documents: [oldDoc], confidence: 1, method: 'scanic' });
      await old.promise;
    });
    expect(view.result.current.isDetecting).toBe(true);
    expect(view.result.current.detectedDocs).toEqual([]);
    const newDoc = { ...oldDoc, id: 'new', aspectType: 'free' as const };
    await act(async () => {
      fresh.resolve({
        corners: ownedCorners,
        documents: [newDoc],
        confidence: 1,
        method: 'scanic',
      });
      await fresh.promise;
    });
    expect(view.result.current.detectedDocs).toEqual([newDoc]);
    expect(onAspect).toHaveBeenLastCalledWith('free');
    expect(onResetDocMeta).toHaveBeenCalled();
    view.unmount();
    expect(terminateMlWorker).toHaveBeenCalled();
  });
});

describe('Document Scanner - Core Geometry & Vision', () => {
  beforeAll(() => {
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string) {
      if (contextId === '2d') {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const canvas = this;
        const w = canvas.width || 100;
        const h = canvas.height || 100;
        const mockCanvas = canvas as HTMLCanvasElement & { _mockData?: Uint8ClampedArray };
        if (!mockCanvas._mockData || mockCanvas._mockData.length !== w * h * 4) {
          mockCanvas._mockData = new Uint8ClampedArray(w * h * 4);
        }
        const ctx2d = {
          canvas,
          createImageData: (cw: number, ch: number) => ({
            data: new Uint8ClampedArray(cw * ch * 4),
            width: cw,
            height: ch,
          }),
          drawImage: (src: CanvasImageSource) => {
            const mockSrc = src as (CanvasImageSource & { _mockData?: Uint8ClampedArray }) | null;
            if (mockSrc && mockSrc._mockData) {
              const srcData = mockSrc._mockData;
              const destData = mockCanvas._mockData;
              if (destData) {
                const len = Math.min(srcData.length, destData.length);
                for (let i = 0; i < len; i++) {
                  destData[i] = srcData[i];
                }
              }
            }
          },
          getImageData: (sx: number, sy: number, sw: number, sh: number) => {
            const data = new Uint8ClampedArray(sw * sh * 4);
            const src = mockCanvas._mockData || new Uint8ClampedArray(sw * sh * 4);
            for (let i = 0; i < data.length && i < src.length; i++) {
              data[i] = src[i];
            }
            return { data, width: sw, height: sh };
          },
          putImageData: (imgData: ImageData) => {
            mockCanvas._mockData = new Uint8ClampedArray(imgData.data);
          },
          translate: () => {},
          rotate: () => {},
          scale: () => {},
          beginPath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          closePath: () => {},
          stroke: () => {},
          fill: () => {},
          save: () => {},
          restore: () => {},
        } as unknown as CanvasRenderingContext2D;
        return ctx2d;
      }
      return null;
    } as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });
  describe('approxPolyDP', () => {
    it('simplifies a segmented polygon with intermediate collinear-ish points into 4 corners', () => {
      // مستطيل به نقاط زائدة على الحواف
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 50, y: 1 }, // نقطة زائدة قريبة من الحافة العلوية
        { x: 100, y: 0 },
        { x: 101, y: 50 }, // نقطة زائدة قريبة من الحافة اليمنى
        { x: 100, y: 100 },
        { x: 50, y: 99 }, // نقطة زائدة قريبة من الحافة السفلية
        { x: 0, y: 100 },
        { x: 0, y: 0 }, // مغلق
      ];

      const approx = approxPolyDP(points, 5);
      // بعد التقريب واستبعاد النقطة المغلقة المكررة
      const unique = approx.slice(0, -1);
      expect(unique.length).toBe(4);
      expect(unique[0]).toEqual({ x: 0, y: 0 });
      expect(unique[1]).toEqual({ x: 100, y: 0 });
      expect(unique[2]).toEqual({ x: 100, y: 100 });
      expect(unique[3]).toEqual({ x: 0, y: 100 });
    });

    it('handles degenerate 2-point arrays gracefully', () => {
      const line: Point[] = [
        { x: 10, y: 10 },
        { x: 90, y: 90 },
      ];
      const res = approxPolyDP(line, 2);
      expect(res.length).toBe(2);
    });
  });

  describe('extractFourCornersFromHull', () => {
    it('extracts four true corners from an 8-point convex hull polygon', () => {
      const hull: Point[] = [
        { x: 10, y: 10 },
        { x: 50, y: 12 },
        { x: 100, y: 10 },
        { x: 102, y: 60 },
        { x: 100, y: 120 },
        { x: 55, y: 118 },
        { x: 10, y: 120 },
        { x: 8, y: 65 },
      ];

      const corners = extractFourCornersFromHull(hull);
      expect(corners).not.toBeNull();
      expect(corners?.length).toBe(4);

      if (corners) {
        // [0] TL, [1] TR, [2] BR, [3] BL
        expect(corners[0].x).toBeLessThan(corners[1].x);
        expect(corners[0].y).toBeLessThan(corners[3].y);
        expect(corners[1].y).toBeLessThan(corners[2].y);
        expect(corners[3].x).toBeLessThan(corners[2].x);
      }
    });

    it('returns sorted points directly if hull already has exactly 4 points', () => {
      const quad: Point[] = [
        { x: 200, y: 50 },
        { x: 50, y: 50 },
        { x: 50, y: 150 },
        { x: 200, y: 150 },
      ];
      const sorted = extractFourCornersFromHull(quad);
      expect(sorted).not.toBeNull();
      expect(sorted?.length).toBe(4);
      expect(sorted?.[0]).toEqual({ x: 50, y: 50 }); // TL
    });
  });

  describe('sortCornerPoints', () => {
    it('sorts shuffled points into clockwise TL, TR, BR, BL order', () => {
      const shuffled: Point[] = [
        { x: 300, y: 400 }, // BR
        { x: 100, y: 100 }, // TL
        { x: 300, y: 100 }, // TR
        { x: 100, y: 400 }, // BL
      ];

      const sorted = sortCornerPoints(shuffled);
      expect(sorted[0]).toEqual({ x: 100, y: 100 }); // Top-Left
      expect(sorted[1]).toEqual({ x: 300, y: 100 }); // Top-Right
      expect(sorted[2]).toEqual({ x: 300, y: 400 }); // Bottom-Right
      expect(sorted[3]).toEqual({ x: 100, y: 400 }); // Bottom-Left
    });
  });

  describe('inferSmartDocumentAspect', () => {
    it('identifies standard ID Card (ID-1 / 1.586)', () => {
      const idCardQuad: Point[] = [
        { x: 0, y: 0 },
        { x: 158, y: 0 },
        { x: 158, y: 100 },
        { x: 0, y: 100 },
      ];
      expect(inferSmartDocumentAspect(idCardQuad)).toBe('id_card');
    });

    it('identifies A4 Portrait (0.707)', () => {
      const a4Portrait: Point[] = [
        { x: 0, y: 0 },
        { x: 70, y: 0 },
        { x: 70, y: 100 },
        { x: 0, y: 100 },
      ];
      expect(inferSmartDocumentAspect(a4Portrait)).toBe('a4_p');
    });

    it('identifies A4 Landscape (1.414)', () => {
      const a4Landscape: Point[] = [
        { x: 0, y: 0 },
        { x: 141, y: 0 },
        { x: 141, y: 100 },
        { x: 0, y: 100 },
      ];
      expect(inferSmartDocumentAspect(a4Landscape)).toBe('a4_l');
    });

    it('identifies Square documents', () => {
      const squareQuad: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ];
      expect(inferSmartDocumentAspect(squareQuad)).toBe('square');
    });

    it('identifies custom/free ratios', () => {
      const freeQuad: Point[] = [
        { x: 0, y: 0 },
        { x: 300, y: 0 },
        { x: 300, y: 100 },
        { x: 0, y: 100 },
      ];
      expect(inferSmartDocumentAspect(freeQuad)).toBe('free');
    });
  });

  describe('splitQuadIntoIdCards', () => {
    const parentQuad: Point[] = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 260 },
      { x: 0, y: 260 },
    ];

    it('splits vertically into 2 ID card documents with a small safety margin', () => {
      const cards = splitQuadIntoIdCards(parentQuad, 'vertical');
      expect(cards.length).toBe(2);
      expect(cards[0].id).toContain('doc-');
      expect(cards[1].id).toContain('doc-');
      expect(cards[0].aspectType).toBe('id_card');
      expect(cards[1].aspectType).toBe('id_card');

      // Card 1 top half
      expect(cards[0].corners[0]).toEqual({ x: 0, y: 0 });
      expect(cards[0].corners[1]).toEqual({ x: 200, y: 0 });

      // Card 2 bottom half
      expect(cards[1].corners[2]).toEqual({ x: 200, y: 260 });
      expect(cards[1].corners[3]).toEqual({ x: 0, y: 260 });
    });

    it('splits horizontally into 2 ID card documents', () => {
      const cards = splitQuadIntoIdCards(parentQuad, 'horizontal');
      expect(cards.length).toBe(2);
      expect(cards[0].aspectType).toBe('id_card');
      expect(cards[1].aspectType).toBe('id_card');
    });

    it('honors an explicit seam ratio instead of always cutting at the midpoint', () => {
      const cards = splitQuadIntoIdCards(parentQuad, 'vertical', 0.4);
      expect(cards.length).toBe(2);
      // الحد انتقل إلى 40% (بفاصل أمان ±1%) بدل المنتصف 50%
      expect(cards[0].corners[2].y).toBe(Math.round(260 * 0.39));
      expect(cards[1].corners[0].y).toBe(Math.round(260 * 0.41));
      expect(cards[0].corners[2].y).toBeLessThan(Math.round(260 * 0.49));
    });
  });

  describe('addManualDocumentQuad', () => {
    it('adds a clean new document quad in an organized grid', () => {
      const existing: DetectedDocument[] = [];
      const doc1 = addManualDocumentQuad(existing, 1000, 800);
      expect(doc1.corners.length).toBe(4);
      expect(doc1.aspectType).toBe('free');
      expect(doc1.label).toContain('1');

      const doc2 = addManualDocumentQuad([doc1], 1000, 800);
      expect(doc2.label).toContain('2');
      // doc2 should be in column 2
      expect(doc2.corners[0].x).toBeGreaterThan(doc1.corners[0].x);
    });
  });

  describe('computePerspectiveTransform', () => {
    it('computes an accurate homography transform for a standard rectangle', () => {
      const src: Point[] = [
        { x: 10, y: 10 },
        { x: 110, y: 10 },
        { x: 110, y: 110 },
        { x: 10, y: 110 },
      ];
      const dst: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ];

      const h = computePerspectiveTransform(src, dst);
      expect(h.length).toBe(9);
      // No NaNs or Infinities
      for (const val of h) {
        expect(Number.isFinite(val)).toBe(true);
      }
    });
  });

  describe('Safety, Overlaps & Memory Verification', () => {
    it('computes quad overlap stats safely without negative union area', async () => {
      const { computeQuadOverlapStats } = await import('../core/quad-geometry');
      const q1: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ];
      const q2: Point[] = [
        { x: 50, y: 50 },
        { x: 150, y: 50 },
        { x: 150, y: 150 },
        { x: 50, y: 150 },
      ];

      const stats = computeQuadOverlapStats(q1, q2);
      expect(stats.iou).toBeGreaterThan(0);
      expect(stats.iou).toBeLessThanOrEqual(1);
      expect(stats.overlapRatio1).toBeGreaterThan(0);
      expect(stats.overlapRatio2).toBeGreaterThan(0);
    });

    it('prevents call stack overflow on deeply complex polygons via approxPolyDP depth guard', () => {
      const complexPoly: Point[] = [];
      for (let i = 0; i < 200; i++) {
        complexPoly.push({ x: i * 2, y: (i % 2 === 0 ? 10 : 20) + i * 0.1 });
      }
      const approx = approxPolyDP(complexPoly, 0.5);
      expect(approx.length).toBeGreaterThan(0);
    });

    it('handles degenerate collinear points in findRotatedQuadCorners gracefully', async () => {
      const { findRotatedQuadCorners } = await import('../core/quad-geometry');
      const collinear: Point[] = [
        { x: 10, y: 10 },
        { x: 50, y: 50 },
        { x: 100, y: 100 },
      ];
      const res = findRotatedQuadCorners(collinear);
      expect(res).not.toBeNull();
      expect(res?.length).toBe(4);
    });

    it('safely handles addManualDocumentQuad wrapping when count > 6', () => {
      const existing: DetectedDocument[] = [];
      for (let i = 0; i < 10; i++) {
        const doc = addManualDocumentQuad(existing, 1000, 800);
        existing.push(doc);
        expect(doc.corners[0].x).toBeGreaterThanOrEqual(0);
        expect(doc.corners[1].x).toBeLessThanOrEqual(1000);
        expect(doc.corners[0].y).toBeGreaterThanOrEqual(0);
        expect(doc.corners[2].y).toBeLessThanOrEqual(800);
      }
      expect(existing.length).toBe(10);
    });

    it('rotates canvas with destroySrcCanvas = false preserving source canvas dimensions', async () => {
      const { rotateCanvas } = await import('../core/perspective-warper');
      const c = document.createElement('canvas');
      c.width = 100;
      c.height = 200;
      const ctx = c.getContext('2d');
      if (ctx) {
        const imgData = ctx.createImageData(100, 200);
        ctx.putImageData(imgData, 0, 0);
      }
      const rot = rotateCanvas(c, 90, false);
      expect(rot.width).toBe(200);
      expect(rot.height).toBe(100);
      expect(c.width).toBe(100); // Preserved
    });

    it('applies border cleanup safely with bounds clamping', async () => {
      const { applyBorderCleanup } = await import('../core/filters');
      const c = document.createElement('canvas');
      c.width = 50;
      c.height = 50;
      const ctx = c.getContext('2d');
      if (ctx) {
        const imgData = ctx.createImageData(50, 50);
        // Fill black
        for (let i = 0; i < 50 * 50 * 4; i += 4) {
          imgData.data[i] = 0;
          imgData.data[i + 1] = 0;
          imgData.data[i + 2] = 0;
          imgData.data[i + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);

        const cleaned = applyBorderCleanup(c, 5);
        const data = cleaned.getContext('2d')!.getImageData(0, 0, 50, 50).data;
        // Border pixel at (0, 0) should be white (255)
        expect(data[0]).toBe(255);
        expect(data[1]).toBe(255);
        expect(data[2]).toBe(255);
        // Center pixel at (25, 25) should still be black (0)
        const centerIdx = (25 * 50 + 25) * 4;
        expect(data[centerIdx]).toBe(0);
      }
    });
  });

  describe('useScannerProcessor Hook & Modal Cleanup', () => {
    it('resets isExporting and previewMode when open transitions to false', async () => {
      const { renderHook, act } = await import('@testing-library/react');
      const { useScannerProcessor } = await import('../hooks/use-scanner-processor');

      const imgRef = { current: null };
      let isOpen = true;

      const { result, rerender } = renderHook(() =>
        useScannerProcessor(imgRef, 'original', 0, isOpen),
      );

      expect(result.current.isExporting).toBe(false);
      expect(result.current.isPreviewMode).toBe(false);

      // Transition to open = false
      isOpen = false;
      act(() => {
        rerender();
      });

      expect(result.current.isExporting).toBe(false);
      expect(result.current.isPreviewMode).toBe(false);
      expect(result.current.previewSrc).toBeNull();
    });
  });
});
