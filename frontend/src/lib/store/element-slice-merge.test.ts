/**
 * مسارات الستور لدمج الطبقات: النتائج المعلنة (نجاح/رفض) والهندسة الناتجة
 * على الورقة، والتراجع، وخطوة الترتيب، واسم الطبقة — الطبقة المتجهة الناتجة
 * تُختبر هندسياً في canvas/shape-merge.test.ts، وهنا يُختبر عقد الستور.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  computeStickerCoverRasterSize,
  prepareStickerExportOverrides,
} from '@/features/stickers/lib/print-rerasterize';

import { getDisplayImage, registerDisplayOwnership } from '../canvas/display-image';
import {
  buildShapeImageFillPatch,
  getImageShapePair,
  isFillableImageShape,
} from '../canvas/image-shape-fill';
import { captureStageBlob } from '../canvas/konva-export-utils';
import { useEditorStore } from '../editor-store';
import { advanceDocumentSession } from '../io/document-session';
import { uploadMediaBlob } from '../io/media-upload';
import { deserializeProjectFile, serializeEditorState } from '../io/project-serializer';
import { CanvasElementSchema } from '../schema';

import type { CanvasElement, ImageElement, ShapeElement } from './types';
import type Konva from 'konva';

vi.mock('../canvas/konva-export-utils', () => ({ captureStageBlob: vi.fn() }));
vi.mock('../io/media-upload', () => ({ uploadMediaBlob: vi.fn() }));
vi.mock('@/features/stickers/lib/print-rerasterize', () => ({
  computeStickerCoverRasterSize: vi.fn(),
  prepareStickerExportOverrides: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function addRect(x: number, y: number, w: number, h: number): string {
  useEditorStore.getState().addShapeElement('rect');
  const id = useEditorStore.getState().selectedId!;
  // radius: 0 — الاستدارة تترك مادة عند حافة القطع لا على الخط النظري،
  // والصندوق المتوقع في الطرح يحتاج حوافاً حادة
  useEditorStore.getState().updateElement(id, { x, y, width: w, height: h, radius: 0 });
  return id;
}

function byId(id: string): CanvasElement {
  const el = useEditorStore.getState().elements.find((e) => e.id === id);
  if (!el) throw new Error(`عنصر مفقود: ${id}`);
  return el;
}

describe('element-slice merge', () => {
  beforeEach(() => {
    vi.mocked(captureStageBlob).mockReset();
    vi.mocked(computeStickerCoverRasterSize).mockReset();
    vi.mocked(prepareStickerExportOverrides).mockReset();
    vi.mocked(uploadMediaBlob).mockReset();
    vi.mocked(uploadMediaBlob).mockResolvedValue({ imageSrc: '/local-image/raster.png' });
    useEditorStore.getState().reset();
    useEditorStore.getState().setMode('single');
  });

  it('unions two overlapping rects into one path layer', () => {
    const a = addRect(0.1, 0.1, 0.2, 0.2);
    const b = addRect(0.2, 0.2, 0.2, 0.2);
    useEditorStore.getState().setSelectedIds([a, b]);

    expect(useEditorStore.getState().mergeSelectedShapes('union')).toBe('ok');

    const { elements, canvasWidth, canvasHeight } = useEditorStore.getState();
    expect(elements).toHaveLength(1);
    const merged = elements[0] as ShapeElement;
    expect(merged.type).toBe('shape');
    expect(merged.shape).toBe('path');
    expect(merged.svgPath).toBeTruthy();
    // اتحاد مستطيلين متجاورين قطرياً = صندوق 0.1..0.4 في المحورين
    expect(merged.x * canvasWidth).toBeCloseTo(0.1 * canvasWidth, 0);
    expect(merged.y * canvasHeight).toBeCloseTo(0.1 * canvasHeight, 0);
    expect(merged.width * canvasWidth).toBeCloseTo(0.3 * canvasWidth, 0);
    expect(merged.height * canvasHeight).toBeCloseTo(0.3 * canvasHeight, 0);
    expect(useEditorStore.getState().selectedIds).toEqual([merged.id]);
  });

  it('subtracts the topmost layer out of the one behind it', () => {
    const back = addRect(0.1, 0.1, 0.4, 0.2);
    const front = addRect(0.35, 0.1, 0.15, 0.2);
    useEditorStore.getState().setSelectedIds([back, front]);

    expect(useEditorStore.getState().mergeSelectedShapes('subtract')).toBe('ok');

    const { elements, canvasWidth } = useEditorStore.getState();
    expect(elements).toHaveLength(1);
    const merged = elements[0] as ShapeElement;
    // يبقى 0.1..0.35 فقط — الطبقة الأمامية (الأعلى zIndex) هي القاطع
    expect(merged.x * canvasWidth).toBeCloseTo(0.1 * canvasWidth, 0);
    expect(merged.width * canvasWidth).toBeCloseTo(0.25 * canvasWidth, 0);
  });

  it('refuses non-shape and locked selections without touching the canvas', () => {
    const shape = addRect(0.1, 0.1, 0.2, 0.2);
    useEditorStore.getState().addTextElement('نص');
    const text = useEditorStore.getState().selectedId!;
    useEditorStore.getState().setSelectedIds([shape, text]);
    expect(useEditorStore.getState().mergeSelectedShapes('union')).toBe('unsupported');
    expect(useEditorStore.getState().elements).toHaveLength(2);

    useEditorStore.getState().updateElement(text, { text: 'نص', locked: true });
    useEditorStore.getState().removeElement(text, true);
    const other = addRect(0.2, 0.2, 0.2, 0.2);
    useEditorStore.getState().updateElement(other, { locked: true });
    useEditorStore.getState().setSelectedIds([shape, other]);
    expect(useEditorStore.getState().mergeSelectedShapes('union')).toBe('locked');
    expect(useEditorStore.getState().elements).toHaveLength(2);
  });

  it('needs at least two selected shapes', () => {
    const only = addRect(0.1, 0.1, 0.2, 0.2);
    useEditorStore.getState().setSelectedIds([only]);
    expect(useEditorStore.getState().mergeSelectedShapes('union')).toBe('need-two-shapes');

    const disjoint = addRect(0.7, 0.7, 0.1, 0.1);
    useEditorStore.getState().setSelectedIds([only, disjoint]);
    expect(useEditorStore.getState().mergeSelectedShapes('intersect')).toBe('empty-result');
  });

  it('restores the source layers on undo', () => {
    const a = addRect(0.1, 0.1, 0.2, 0.2);
    const b = addRect(0.2, 0.2, 0.2, 0.2);
    useEditorStore.getState().setSelectedIds([a, b]);
    expect(useEditorStore.getState().mergeSelectedShapes('union')).toBe('ok');
    expect(useEditorStore.getState().elements).toHaveLength(1);

    useEditorStore.getState().undo();
    const restored = useEditorStore.getState().elements;
    expect(restored).toHaveLength(2);
    expect(restored.every((el) => (el as ShapeElement).shape !== 'path')).toBe(true);
  });

  it('inherits the paint of the front layer', () => {
    const back = addRect(0.1, 0.1, 0.2, 0.2);
    useEditorStore.getState().updateElement(back, { fill: '#ff0000' });
    const front = addRect(0.2, 0.2, 0.2, 0.2);
    useEditorStore.getState().updateElement(front, { fill: '#00ff00', opacity: 0.5 });
    useEditorStore.getState().setSelectedIds([back, front]);

    useEditorStore.getState().mergeSelectedShapes('union');
    const merged = useEditorStore.getState().elements[0] as ShapeElement;
    expect(merged.fill).toBe('#00ff00');
    expect(merged.opacity).toBe(0.5);
  });

  it('moves one layer step at a time and reports the edges', () => {
    const bottom = addRect(0.1, 0.1, 0.1, 0.1);
    const middle = addRect(0.2, 0.2, 0.1, 0.1);
    const top = addRect(0.3, 0.3, 0.1, 0.1);
    const zOf = (id: string) => byId(id).zIndex;
    expect(zOf(bottom)).toBeLessThan(zOf(middle));

    expect(useEditorStore.getState().bringForward(bottom)).toBe(true);
    const middleZ = zOf(middle);
    expect(zOf(bottom)).toBeGreaterThan(middleZ);

    expect(useEditorStore.getState().bringForward(bottom)).toBe(true);
    expect(zOf(bottom)).toBeGreaterThan(zOf(top));

    // قمة الترتيب: لا حركة ولا دفعة تاريخ زائفة
    expect(useEditorStore.getState().bringForward(bottom)).toBe(false);
    expect(useEditorStore.getState().sendBackward(bottom)).toBe(true);
  });

  it('renames a layer and falls back to the automatic label when cleared', () => {
    const id = addRect(0.1, 0.1, 0.2, 0.2);
    useEditorStore.getState().renameElement(id, '  خلفية رأسية  ');
    expect(byId(id).name).toBe('خلفية رأسية');

    // الاسم يصل إلى المحرّك عبر Zod وحده — سقوطه هناك يعني ضياعه عند الحفظ
    const parsed = CanvasElementSchema.parse(byId(id));
    expect(parsed.name).toBe('خلفية رأسية');

    useEditorStore.getState().renameElement(id, '   ');
    expect(byId(id).name).toBeUndefined();
  });

  it('requires a live stage to rasterize', () => {
    const id = addRect(0.1, 0.1, 0.2, 0.2);
    useEditorStore.getState().setSelectedIds([id]);
    return expect(useEditorStore.getState().rasterizeSelected(null)).resolves.toBe('no-stage');
  });

  describe('rasterize freshness across capture and upload', () => {
    const stage = {} as Konva.Stage;
    const blob = () => new Blob(['raster'], { type: 'image/png' });

    function seedSelection() {
      const a = addRect(0.1, 0.1, 0.2, 0.2);
      const b = addRect(0.2, 0.2, 0.2, 0.2);
      const other = addRect(0.5, 0.5, 0.1, 0.1);
      const hidden = addRect(0.6, 0.6, 0.1, 0.1);
      useEditorStore.setState((s) => ({
        elements: s.elements.map((el) => {
          if (el.id === a) {
            return { ...el, type: 'image', imageSrc: '/local-image/source.png' } as ImageElement;
          }
          if (el.id === hidden) return { ...el, visible: false };
          return el;
        }),
      }));
      useEditorStore.getState().setSelectedIds([a, b, hidden]);
      useEditorStore.getState().pushHistory();
      return { a, b, other, hidden };
    }

    type Sources = ReturnType<typeof seedSelection>;
    const changes: Array<{ name: string; apply: (ids: Sources) => void }> = [
      {
        name: 'source position',
        apply: ({ a }) => useEditorStore.getState().updateElement(a, { x: 0.3 }),
      },
      {
        name: 'source image',
        apply: ({ a }) =>
          useEditorStore.getState().updateElement(a, { imageSrc: '/local-image/new.png' }),
      },
      {
        name: 'source paint',
        apply: ({ b }) => useEditorStore.getState().updateElement(b, { fill: '#123456' }),
      },
      {
        name: 'source visibility',
        apply: ({ b }) => useEditorStore.getState().updateElement(b, { visible: false }),
      },
      {
        name: 'source zIndex',
        apply: ({ b }) => useEditorStore.getState().updateElement(b, { zIndex: 99 }),
      },
      {
        name: 'source lock',
        apply: ({ a }) => useEditorStore.getState().updateElement(a, { locked: true }),
      },
      { name: 'source removal', apply: ({ a }) => useEditorStore.getState().removeElement(a) },
      { name: 'project', apply: () => useEditorStore.setState({ projectId: 'another-project' }) },
      { name: 'document session', apply: () => advanceDocumentSession() },
      {
        name: 'canvas width',
        apply: () => useEditorStore.setState((s) => ({ canvasWidth: s.canvasWidth + 1 })),
      },
      {
        name: 'canvas height',
        apply: () => useEditorStore.setState((s) => ({ canvasHeight: s.canvasHeight + 1 })),
      },
      { name: 'mode', apply: () => useEditorStore.setState({ mode: 'collage' }) },
    ];

    for (const phase of ['capture', 'upload'] as const) {
      it.each(changes)(
        `rejects $name changes during ${phase} without overwriting newer state`,
        async ({ apply }) => {
          const ids = seedSelection();
          const capture = deferred<Blob | null>();
          const upload = deferred<{ imageSrc: string }>();
          const uploadStarted = deferred<void>();
          vi.mocked(captureStageBlob).mockReturnValueOnce(capture.promise);
          vi.mocked(uploadMediaBlob).mockImplementationOnce(() => {
            uploadStarted.resolve();
            return upload.promise;
          });
          const pending = useEditorStore.getState().rasterizeSelected(stage);
          expect(vi.mocked(captureStageBlob).mock.calls[0][5]).toMatchObject({
            useFullResolution: true,
            includeNodeIds: new Set([ids.a, ids.b]),
          });
          if (phase === 'upload') {
            capture.resolve(blob());
            await uploadStarted.promise;
          }
          apply(ids);
          const newerState = useEditorStore.getState();
          if (phase === 'capture') capture.resolve(blob());
          else upload.resolve({ imageSrc: '/local-image/stale.png' });

          await expect(pending).resolves.toBe('failed');
          expect(useEditorStore.getState()).toBe(newerState);
          expect(uploadMediaBlob).toHaveBeenCalledTimes(phase === 'capture' ? 0 : 1);
        },
      );

      it(`keeps nonparticipant edits during ${phase} and adds exactly one undo step`, async () => {
        const ids = seedSelection();
        const originals = [byId(ids.a), byId(ids.b)];
        const capture = deferred<Blob | null>();
        const upload = deferred<{ imageSrc: string }>();
        const uploadStarted = deferred<void>();
        vi.mocked(captureStageBlob).mockReturnValueOnce(capture.promise);
        vi.mocked(uploadMediaBlob).mockImplementationOnce(() => {
          uploadStarted.resolve();
          return upload.promise;
        });
        const pending = useEditorStore.getState().rasterizeSelected(stage);
        if (phase === 'upload') {
          capture.resolve(blob());
          await uploadStarted.promise;
        }
        useEditorStore.getState().updateElement(ids.other, {
          x: 0.7,
          fill: '#abcdef',
          visible: false,
          zIndex: 40,
        });
        useEditorStore.getState().updateElement(ids.hidden, { name: 'not captured' });
        const newcomer = addRect(0.8, 0.8, 0.1, 0.1);
        useEditorStore.getState().pushHistory();
        const newerOther = byId(ids.other);
        const newerHidden = byId(ids.hidden);
        const newerNewcomer = byId(newcomer);
        const historyLength = useEditorStore.getState().history.length;
        const historyIndex = useEditorStore.getState().historyIndex;
        expect(byId(ids.a)).toBe(originals[0]);
        expect(byId(ids.b)).toBe(originals[1]);
        if (phase === 'capture') {
          capture.resolve(blob());
          await uploadStarted.promise;
        }
        upload.resolve({ imageSrc: '/local-image/fresh.png' });
        await expect(pending).resolves.toBe('ok');
        const state = useEditorStore.getState();
        const flat = state.elements.find(
          (el) => ![ids.other, ids.hidden, newcomer].includes(el.id),
        ) as ImageElement;
        expect(flat).toMatchObject({
          type: 'image',
          imageSrc: '/local-image/fresh.png',
          zIndex: originals[1].zIndex,
          opacity: 1,
          rotation: 0,
          visible: true,
          locked: false,
        });
        expect(state.elements).toHaveLength(4);
        expect(byId(ids.other)).toBe(newerOther);
        expect(byId(ids.hidden)).toBe(newerHidden);
        expect(byId(newcomer)).toBe(newerNewcomer);
        expect(state.selectedId).toBe(flat.id);
        expect(state.selectedIds).toEqual([flat.id]);
        expect(state.lastEditedImage).toBe(flat.imageSrc);
        expect(state.lastEditedImageAspect).toBeCloseTo(
          (flat.width * state.canvasWidth) / (flat.height * state.canvasHeight),
        );
        expect(state.history).toHaveLength(historyLength + 1);
        expect(state.historyIndex).toBe(historyIndex + 1);
        state.undo();
        expect(byId(ids.a)).toEqual(originals[0]);
        expect(byId(ids.b)).toEqual(originals[1]);
        expect(byId(ids.other)).toEqual(newerOther);
        expect(byId(newcomer)).toEqual(newerNewcomer);
      });
    }

    it('accepts a no-op source edit and a new elements array with the same source refs', async () => {
      const { a } = seedSelection();
      const capture = deferred<Blob | null>();
      vi.mocked(captureStageBlob).mockReturnValueOnce(capture.promise);
      const pending = useEditorStore.getState().rasterizeSelected(stage);
      const source = byId(a);
      useEditorStore.getState().updateElement(a, { x: source.x });
      useEditorStore.setState((s) => ({ elements: [...s.elements] }));
      expect(byId(a)).toBe(source);
      capture.resolve(blob());
      await expect(pending).resolves.toBe('ok');
    });

    it.each(['null', 'rejection'] as const)(
      'leaves selection/history untouched on capture %s',
      async (failure) => {
        seedSelection();
        const capture = deferred<Blob | null>();
        vi.mocked(captureStageBlob).mockReturnValueOnce(capture.promise);
        const original = useEditorStore.getState();
        const pending = original.rasterizeSelected(stage);
        if (failure === 'null') capture.resolve(null);
        else capture.reject(new Error('capture rejected'));
        await expect(pending).resolves.toBe('failed');
        expect(useEditorStore.getState()).toBe(original);
        expect(uploadMediaBlob).not.toHaveBeenCalled();
      },
    );
  });

  describe('FF-04 image shape filling', () => {
    function seedPair(patch: Partial<ImageElement> = {}) {
      useEditorStore.setState({ canvasWidth: 1000, canvasHeight: 1000 });
      const shapeId = addRect(0.3, 0.2, 0.1, 0.3);
      useEditorStore.getState().updateElement(shapeId, {
        fill: '#123456',
        stroke: '#abcdef',
        strokeWidth: 4,
        rotation: 20,
        fillImageSrc: '/local-image/old.png',
        fillImageFit: 'tile',
        fillImageScale: 2,
        fillImageRotation: 70,
        fillImageOffsetX: 0.2,
        fillImageOffsetY: -0.2,
        name: 'target',
      });
      const image: ImageElement = {
        id: 'source-photo',
        type: 'image',
        imageSrc: '/local-image/photo.png',
        x: 0.01,
        y: 0.02,
        width: 0.1,
        height: 0.05,
        rotation: 0,
        opacity: 1,
        zIndex: 100,
        visible: true,
        locked: false,
        ...patch,
      };
      useEditorStore.setState((state) => ({ elements: [...state.elements, image] }));
      useEditorStore.getState().setSelectedIds([image.id, shapeId]);
      useEditorStore.getState().pushHistory();
      const source = new Image();
      source.src = image.imageSrc;
      Object.defineProperties(source, {
        complete: { value: true, configurable: true },
        naturalWidth: { value: 400, configurable: true },
        naturalHeight: { value: 200, configurable: true },
      });
      const node = {
        getClassName: () => 'Image',
        isVisible: () => true,
        getStage: () => stage,
        image: vi.fn((): CanvasImageSource | undefined => source),
        getAttr: vi.fn((_name: string): unknown => undefined),
        cropX: () => 20,
        cropY: () => 30,
        cropWidth: () => 200,
        cropHeight: () => 100,
        getClientRect: vi.fn(() => ({ x: 10, y: 20, width: 100, height: 50 })),
      };
      const stage = {
        findOne: vi.fn((selector: string) => (selector === `#${image.id}` ? node : undefined)),
      } as unknown as Konva.Stage;
      return { image, shape: byId(shapeId) as ShapeElement, source, node, stage };
    }

    it('shares strict shape/pair eligibility and resets only the fill recipe', () => {
      const { image, shape } = seedPair();
      expect(isFillableImageShape(shape)).toBe(true);
      expect(isFillableImageShape({ ...shape, shape: 'line' })).toBe(false);
      expect(isFillableImageShape({ ...shape, shape: 'arrow' })).toBe(false);
      expect(isFillableImageShape({ ...shape, width: NaN })).toBe(false);
      expect(isFillableImageShape({ ...shape, rotation: Infinity })).toBe(false);
      expect(isFillableImageShape({ ...shape, shape: 'path', svgPath: 'not a path' })).toBe(false);
      expect(isFillableImageShape({ ...shape, shape: 'path', svgPath: 'M0 0 L0 10' })).toBe(false);
      expect(
        isFillableImageShape({ ...shape, shape: 'path', svgPath: 'M0 0 L10 0 L10 10 Z' }),
      ).toBe(true);
      expect(getImageShapePair([image, shape], [shape.id, image.id])).toEqual({ image, shape });
      for (const ids of [
        [image.id],
        [image.id, image.id],
        [image.id, 'missing'],
        [image.id, shape.id, 'extra'],
      ])
        expect(getImageShapePair([image, shape], ids)).toBeNull();
      expect(
        getImageShapePair([{ ...image, visible: false }, shape], [image.id, shape.id]),
      ).toBeNull();
      expect(buildShapeImageFillPatch('new')).toEqual({
        fillType: 'image',
        fillImageSrc: 'new',
        fillImageFit: 'cover',
        fillImageScale: undefined,
        fillImageRotation: undefined,
        fillImageOffsetX: undefined,
        fillImageOffsetY: undefined,
      });
    });

    it.each(['M0 0 L10 10', 'M0 0 L10 10 Z', 'M0 0 L10 0 L10 10', 'M0 0 L10 10 L20 20 Z'])(
      'rejects open/zero-area SVG contours (%s) without consuming the image',
      async (svgPath) => {
        const { image, shape, stage } = seedPair();
        useEditorStore.getState().updateElement(shape.id, { shape: 'path', svgPath });
        const target = byId(shape.id) as ShapeElement;
        expect(isFillableImageShape(target)).toBe(false);
        expect(getImageShapePair([image, target], [image.id, target.id])).toBeNull();
        const state = useEditorStore.getState();
        expect(state.fillShapeWithImage(target.id, image.imageSrc)).toBe('unsupported');
        await expect(state.maskSelectedImageWithShape(stage)).resolves.toBe('need-image-and-shape');
        expect(useEditorStore.getState()).toBe(state);
      },
    );

    it.each([
      'M0 0 L10 0 L10 10 L0 10 Z',
      'M0 0 L10 0 L10 10 L0 10 Z M2 2 L2 8 L8 8 L8 2 Z',
      'M0 0 C0 10 10 10 0 0 Z',
    ])('accepts real closed SVG fills, including a frame/hole (%s)', (svgPath) => {
      const { shape } = seedPair();
      expect(isFillableImageShape({ ...shape, shape: 'path', svgPath })).toBe(true);
    });

    it('fills from live state in one history step, preserves style and skips unchanged fills', () => {
      const { shape } = seedPair();
      const historyLength = useEditorStore.getState().history.length;
      expect(
        useEditorStore.getState().fillShapeWithImage(shape.id, '/local-image/new.png', shape),
      ).toBe('ok');
      expect(byId(shape.id)).toEqual({
        ...shape,
        ...buildShapeImageFillPatch('/local-image/new.png'),
      });
      expect(useEditorStore.getState().history).toHaveLength(historyLength + 1);
      const current = useEditorStore.getState();
      expect(current.fillShapeWithImage(shape.id, '/local-image/new.png')).toBe('unchanged');
      expect(useEditorStore.getState()).toBe(current);
      current.undo();
      expect(byId(shape.id)).toEqual(shape);
    });

    it.each([
      '',
      '   ',
      'javascript:alert(1)',
      'java\tscript:alert(1)',
      'vbscript:msgbox(1)',
      'data:text/html,<script/>',
    ])('rejects invalid fill sources (%s) without state/history changes', (src) => {
      const { shape } = seedPair();
      const state = useEditorStore.getState();
      expect(state.fillShapeWithImage(shape.id, src)).toBe('invalid-source');
      expect(useEditorStore.getState()).toBe(state);
    });

    it('refuses stale targets, locked siblings, partial groups and wrong mode', () => {
      const { image, shape } = seedPair();
      useEditorStore.getState().updateElement(shape.id, { fill: '#654321' });
      expect(useEditorStore.getState().fillShapeWithImage(shape.id, '/photo.png', shape)).toBe(
        'stale',
      );
      useEditorStore.setState((state) => ({
        elements: state.elements.map((el) => ({
          ...el,
          groupId: 'group',
          locked: el.id === image.id,
        })),
      }));
      expect(useEditorStore.getState().fillShapeWithImage(shape.id, '/photo.png')).toBe('locked');
      useEditorStore.getState().updateElement(image.id, { locked: false });
      expect(useEditorStore.getState().fillShapeWithImage(shape.id, '/photo.png')).toBe(
        'unsupported',
      );
      useEditorStore.setState({ mode: 'collage' });
      expect(useEditorStore.getState().fillShapeWithImage(shape.id, '/photo.png')).toBe(
        'wrong-mode',
      );
    });

    it('reuses plain photo src and consumes it atomically; undo restores the entire pair', async () => {
      const { image, shape, stage } = seedPair();
      const historyLength = useEditorStore.getState().history.length;
      await expect(useEditorStore.getState().maskSelectedImageWithShape(stage)).resolves.toBe('ok');
      const state = useEditorStore.getState();
      expect(state.elements).toEqual([{ ...shape, ...buildShapeImageFillPatch(image.imageSrc) }]);
      expect(state.selectedIds).toEqual([shape.id]);
      expect(state.selectedId).toBe(shape.id);
      expect(state.history).toHaveLength(historyLength + 1);
      expect(captureStageBlob).not.toHaveBeenCalled();
      expect(uploadMediaBlob).not.toHaveBeenCalled();
      state.undo();
      expect(byId(image.id)).toEqual(image);
      expect(byId(shape.id)).toEqual(shape);
    });

    it.each([
      { cropZoom: 2, cropPanX: 0.4, cropPanY: -0.2 },
      { filter: 'grayscale', brightness: 120, contrast: 80, saturation: 130, blur: 4 },
      { maskShape: 'circle' as const, flipX: true, flipY: true, opacity: 0.4, bgColor: '#fedcba' },
      { height: 0.1 },
    ])(
      'bakes the visible crop/filter/blur/mask/frame recipe ($filter) at target resolution',
      async (patch) => {
        const { image, shape, node, stage } = seedPair(patch);
        vi.mocked(captureStageBlob).mockImplementationOnce(async () => {
          expect(byId(image.id)).toBe(image);
          expect(node.cropX()).toBe(20);
          expect(node.cropY()).toBe(30);
          expect(node.cropWidth()).toBe(200);
          return new Blob(['photo pixels'], { type: 'image/png' });
        });
        const historyLength = useEditorStore.getState().history.length;
        await expect(useEditorStore.getState().maskSelectedImageWithShape(stage)).resolves.toBe(
          'ok',
        );
        expect(captureStageBlob).toHaveBeenCalledWith(
          stage,
          6,
          'image/png',
          undefined,
          { x: 10, y: 20, width: 100, height: 50 },
          {
            useFullResolution: true,
            includeNodeIds: [image.id],
            requireImageNodeIds: [image.id],
            readiness: { images: true },
            imageOverrides: undefined,
          },
        );
        expect(byId(shape.id)).toEqual({
          ...shape,
          ...buildShapeImageFillPatch('/local-image/raster.png'),
        });
        expect(useEditorStore.getState().history).toHaveLength(historyLength + 1);
        useEditorStore.getState().undo();
        expect(byId(image.id)).toEqual(image);
        expect(byId(shape.id)).toEqual(shape);
      },
    );

    it('uses sticker export overrides and disposes them after capture failure', async () => {
      const { image, stage } = seedPair({
        stickerSource: {
          templateId: 'label',
          params: {
            fields: {},
            primaryColor: '#000000',
            secondaryColor: '#ffffff',
            backgroundColor: '#ffffff',
            isTransparent: false,
          },
        },
      });
      const dispose = vi.fn();
      vi.mocked(prepareStickerExportOverrides).mockResolvedValueOnce({
        imageOverrides: [{ nodeId: image.id, src: 'blob:full-sticker' }],
        srcOverrides: new Map(),
        dispose,
      });
      vi.mocked(captureStageBlob).mockRejectedValueOnce(new Error('required source decode failed'));
      const state = useEditorStore.getState();
      await expect(state.maskSelectedImageWithShape(stage)).resolves.toBe('failed');
      expect(prepareStickerExportOverrides).toHaveBeenCalledWith({
        elements: [image],
        canvasWidth: 6000,
        canvasHeight: 6000,
        stageRef: stage,
      });
      expect(vi.mocked(captureStageBlob).mock.calls[0][5]?.imageOverrides).toEqual([
        { nodeId: image.id, src: 'blob:full-sticker' },
      ]);
      expect(dispose).toHaveBeenCalledOnce();
      expect(useEditorStore.getState()).toBe(state);
      expect(uploadMediaBlob).not.toHaveBeenCalled();
    });

    it('never consumes an undersized sticker when override preparation failed', async () => {
      const { stage } = seedPair({
        stickerSource: {
          templateId: 'label',
          params: {
            fields: {},
            primaryColor: '#000000',
            secondaryColor: '#ffffff',
            backgroundColor: '#ffffff',
            isTransparent: false,
          },
        },
      });
      const dispose = vi.fn();
      vi.mocked(prepareStickerExportOverrides).mockResolvedValueOnce({
        imageOverrides: [],
        srcOverrides: new Map(),
        dispose,
      });
      vi.mocked(computeStickerCoverRasterSize).mockReturnValueOnce({ width: 600, height: 300 });
      const state = useEditorStore.getState();
      await expect(state.maskSelectedImageWithShape(stage)).resolves.toBe('failed');
      expect(computeStickerCoverRasterSize).toHaveBeenCalledWith(600, 300, 2);
      expect(dispose).toHaveBeenCalledOnce();
      expect(captureStageBlob).not.toHaveBeenCalled();
      expect(uploadMediaBlob).not.toHaveBeenCalled();
      expect(useEditorStore.getState()).toBe(state);
    });

    it('rejects unsafe source/upload URIs and wrong mode without consuming either element', async () => {
      const invalid = seedPair({ imageSrc: 'javascript:alert(1)' });
      let state = useEditorStore.getState();
      await expect(state.maskSelectedImageWithShape(invalid.stage)).resolves.toBe('invalid-source');
      expect(useEditorStore.getState()).toBe(state);
      useEditorStore.setState({ mode: 'collage' });
      state = useEditorStore.getState();
      await expect(state.maskSelectedImageWithShape(invalid.stage)).resolves.toBe('wrong-mode');
      expect(useEditorStore.getState()).toBe(state);
      useEditorStore.getState().reset();
      useEditorStore.getState().setMode('single');
      const { stage } = seedPair({ blur: 2 });
      vi.mocked(captureStageBlob).mockResolvedValueOnce(new Blob(['pixels']));
      vi.mocked(uploadMediaBlob).mockResolvedValueOnce({ imageSrc: 'data:text/html,invalid' });
      state = useEditorStore.getState();
      await expect(state.maskSelectedImageWithShape(stage)).resolves.toBe('invalid-source');
      expect(useEditorStore.getState()).toBe(state);
    });

    it('requires an actual ready rendered photo even on the direct-source path', async () => {
      const { source, stage } = seedPair();
      Object.defineProperty(source, 'naturalWidth', { value: 0 });
      const state = useEditorStore.getState();
      await expect(state.maskSelectedImageWithShape(stage)).resolves.toBe('failed');
      await expect(
        state.maskSelectedImageWithShape({ findOne: () => undefined } as unknown as Konva.Stage),
      ).resolves.toBe('failed');
      await expect(state.maskSelectedImageWithShape(null)).resolves.toBe('no-stage');
      expect(useEditorStore.getState()).toBe(state);
      expect(captureStageBlob).not.toHaveBeenCalled();
    });

    it.each([{}, { blur: 2 }])(
      'rejects the previous ready photo while the new source is still loading ($blur)',
      async (patch) => {
        const { image, source, node, stage } = seedPair(patch);
        useEditorStore
          .getState()
          .updateElement(image.id, { imageSrc: '/local-image/new-square.png' });
        // React has rerendered desired props, but useAsyncImage still exposes the old 2:1 bitmap
        // and its cover crop. A desired-source attr alone must not claim readiness for the new photo.
        node.getAttr.mockReturnValue('/local-image/new-square.png');
        expect(source.naturalWidth / source.naturalHeight).toBe(2);
        const state = useEditorStore.getState();
        await expect(state.maskSelectedImageWithShape(stage)).resolves.toBe('failed');
        expect(useEditorStore.getState()).toBe(state);
        expect(captureStageBlob).not.toHaveBeenCalled();
        expect(uploadMediaBlob).not.toHaveBeenCalled();
      },
    );

    it('rejects prior derivative ownership even when both originals share the same thumbnail URL', async () => {
      const { source, node, stage } = seedPair({
        blur: 2,
        imageSrc: '/local-image/photo.png?revision=new',
      });
      source.src = '/local-image/thumb/photo.png?w=2048';
      registerDisplayOwnership(source, '/local-image/photo.png?revision=old');
      node.getAttr.mockReturnValue('/local-image/photo.png?revision=new');
      const state = useEditorStore.getState();
      await expect(state.maskSelectedImageWithShape(stage)).resolves.toBe('failed');
      expect(useEditorStore.getState()).toBe(state);
      expect(captureStageBlob).not.toHaveBeenCalled();
    });

    it('accepts an owned current derivative by canonical original URL, not its thumb URI', async () => {
      const { source, stage } = seedPair({
        blur: 2,
        imageSrc: '/local-image/photo.png?revision=new',
      });
      source.src = '/local-image/thumb/photo.png?w=2048';
      registerDisplayOwnership(
        source,
        new URL('/local-image/photo.png?revision=new', document.baseURI).href,
      );
      vi.mocked(captureStageBlob).mockResolvedValueOnce(new Blob(['pixels']));
      await expect(useEditorStore.getState().maskSelectedImageWithShape(stage)).resolves.toBe('ok');
    });

    it.each([false, true])(
      'checks actual bitmap provenance through canvas display proxies (current=%s)',
      async (current) => {
        const { source, node, stage } = seedPair({ blur: 2 });
        if (!current) source.src = '/local-image/previous-photo.png';
        Object.defineProperties(source, {
          naturalWidth: { value: 5000 },
          naturalHeight: { value: 2500 },
        });
        const context = vi
          .spyOn(HTMLCanvasElement.prototype, 'getContext')
          .mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
        let proxy: HTMLImageElement | HTMLCanvasElement | null;
        try {
          proxy = getDisplayImage(source);
        } finally {
          context.mockRestore();
        }
        expect(proxy).toBeInstanceOf(HTMLCanvasElement);
        node.image.mockReturnValue(proxy!);
        vi.mocked(captureStageBlob).mockResolvedValueOnce(new Blob(['pixels']));
        const state = useEditorStore.getState();
        await expect(state.maskSelectedImageWithShape(stage)).resolves.toBe(
          current ? 'ok' : 'failed',
        );
        if (!current) {
          expect(useEditorStore.getState()).toBe(state);
          expect(captureStageBlob).not.toHaveBeenCalled();
        }
      },
    );

    it('rejects unknown ordinary canvases even if a renderer attr claims the desired source', async () => {
      const { image, node, stage } = seedPair({ blur: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 200;
      node.image.mockReturnValue(canvas);
      node.getAttr.mockReturnValue(image.imageSrc);
      const state = useEditorStore.getState();
      await expect(state.maskSelectedImageWithShape(stage)).resolves.toBe('failed');
      expect(useEditorStore.getState()).toBe(state);
      expect(captureStageBlob).not.toHaveBeenCalled();
    });

    it.each(['current', 'old-base', 'wrong-source', 'loading-base'] as const)(
      'requires actual sticker canvas + ready current base bitmap witness (%s)',
      async (kind) => {
        const { source, node, stage } = seedPair({
          stickerSource: {
            templateId: 'label',
            params: {
              fields: {},
              primaryColor: '#000000',
              secondaryColor: '#ffffff',
              backgroundColor: '#ffffff',
              isTransparent: false,
            },
          },
        });
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 300;
        node.image.mockReturnValue(canvas);
        if (kind === 'old-base') source.src = '/local-image/previous-sticker.png';
        if (kind === 'loading-base') Object.defineProperty(source, 'complete', { value: false });
        node.getAttr.mockReturnValue({
          source: kind === 'wrong-source' ? document.createElement('canvas') : canvas,
          baseImage: source,
        });
        vi.mocked(prepareStickerExportOverrides).mockResolvedValueOnce({
          imageOverrides: [],
          srcOverrides: new Map(),
          dispose: vi.fn(),
        });
        vi.mocked(computeStickerCoverRasterSize).mockReturnValueOnce({ width: 600, height: 300 });
        vi.mocked(captureStageBlob).mockResolvedValueOnce(new Blob(['pixels']));
        const state = useEditorStore.getState();
        await expect(state.maskSelectedImageWithShape(stage)).resolves.toBe(
          kind === 'current' ? 'ok' : 'failed',
        );
        expect(node.getAttr).toHaveBeenCalledWith('gridoStickerRenderSource');
        if (kind !== 'current') {
          expect(useEditorStore.getState()).toBe(state);
          expect(captureStageBlob).not.toHaveBeenCalled();
          expect(prepareStickerExportOverrides).not.toHaveBeenCalled();
        }
      },
    );

    it('rejects hidden, locked and partial/locked group pairs before capture', async () => {
      const { image, shape, stage } = seedPair({ visible: false });
      await expect(useEditorStore.getState().maskSelectedImageWithShape(stage)).resolves.toBe(
        'need-image-and-shape',
      );
      useEditorStore.getState().updateElement(image.id, { visible: true, locked: true });
      await expect(useEditorStore.getState().maskSelectedImageWithShape(stage)).resolves.toBe(
        'locked',
      );
      useEditorStore.getState().updateElement(image.id, { locked: false, groupId: 'group' });
      const third = addRect(0.5, 0.5, 0.1, 0.1);
      useEditorStore.getState().updateElement(third, { groupId: 'group' });
      useEditorStore.getState().setSelectedIds([image.id, shape.id]);
      await expect(useEditorStore.getState().maskSelectedImageWithShape(stage)).resolves.toBe(
        'need-image-and-shape',
      );
      useEditorStore.getState().updateElement(third, { locked: true });
      await expect(useEditorStore.getState().maskSelectedImageWithShape(stage)).resolves.toBe(
        'locked',
      );
      expect(captureStageBlob).not.toHaveBeenCalled();
    });

    it('accepts a complete unlocked group without losing target metadata', async () => {
      const { image, shape, stage } = seedPair();
      useEditorStore.setState((state) => ({
        elements: state.elements.map((el) => ({ ...el, groupId: 'complete-pair' })),
      }));
      expect(
        getImageShapePair(useEditorStore.getState().elements, [image.id, shape.id]),
      ).not.toBeNull();
      await expect(useEditorStore.getState().maskSelectedImageWithShape(stage)).resolves.toBe('ok');
      expect(byId(shape.id).groupId).toBe('complete-pair');
    });

    const maskChanges = [
      {
        name: 'source crop',
        apply: (image: ImageElement, _shape: ShapeElement) =>
          useEditorStore.getState().updateElement(image.id, { cropPanY: 0.3 }),
      },
      {
        name: 'target geometry',
        apply: (_image: ImageElement, shape: ShapeElement) =>
          useEditorStore.getState().updateElement(shape.id, { width: 0.2 }),
      },
      {
        name: 'target paint',
        apply: (_image: ImageElement, shape: ShapeElement) =>
          useEditorStore.getState().updateElement(shape.id, { fill: '#fedcba' }),
      },
      {
        name: 'source removal',
        apply: (image: ImageElement, _shape: ShapeElement) =>
          useEditorStore.getState().removeElement(image.id),
      },
      {
        name: 'target lock',
        apply: (_image: ImageElement, shape: ShapeElement) =>
          useEditorStore.getState().updateElement(shape.id, { locked: true }),
      },
      { name: 'document session', apply: () => advanceDocumentSession() },
      { name: 'project', apply: () => useEditorStore.setState({ projectId: 'new-document' }) },
      { name: 'mode', apply: () => useEditorStore.setState({ mode: 'collage' }) },
      {
        name: 'mode roundtrip',
        apply: () => {
          useEditorStore.setState({ mode: 'collage' });
          useEditorStore.setState({ mode: 'single' });
        },
      },
      {
        name: 'canvas width roundtrip',
        apply: () => {
          useEditorStore.setState({ canvasWidth: 1100 });
          useEditorStore.setState({ canvasWidth: 1000 });
        },
      },
      {
        name: 'canvas height roundtrip',
        apply: () => {
          useEditorStore.setState({ canvasHeight: 1100 });
          useEditorStore.setState({ canvasHeight: 1000 });
        },
      },
      { name: 'canvas dimensions', apply: () => useEditorStore.setState({ canvasHeight: 1100 }) },
      {
        name: 'new partial group member',
        apply: (image: ImageElement, _shape: ShapeElement) =>
          useEditorStore.setState((state) => ({
            elements: [
              ...state.elements,
              { ...image, id: 'new-group-member', groupId: 'mask-group' },
            ],
          })),
      },
    ];
    for (const phase of ['capture', 'upload'] as const) {
      it(`rechecks actual rendered bitmap URI after ${phase} even if source object is unchanged`, async () => {
        const { source, stage } = seedPair({ blur: 2 });
        const capture = deferred<Blob | null>();
        const upload = deferred<{ imageSrc: string }>();
        const uploadStarted = deferred<void>();
        vi.mocked(captureStageBlob).mockReturnValueOnce(capture.promise);
        vi.mocked(uploadMediaBlob).mockImplementationOnce(() => {
          uploadStarted.resolve();
          return upload.promise;
        });
        const state = useEditorStore.getState();
        const pending = state.maskSelectedImageWithShape(stage);
        if (phase === 'upload') {
          capture.resolve(new Blob(['pixels']));
          await uploadStarted.promise;
        }
        source.src = '/local-image/previous-photo.png';
        if (phase === 'capture') capture.resolve(new Blob(['pixels']));
        else upload.resolve({ imageSrc: '/local-image/captured.png' });
        await expect(pending).resolves.toBe('failed');
        expect(useEditorStore.getState()).toBe(state);
        expect(uploadMediaBlob).toHaveBeenCalledTimes(phase === 'capture' ? 0 : 1);
      });
      it.each(maskChanges)(`rejects stale $name during mask ${phase}`, async ({ apply }) => {
        const { image, shape, stage } = seedPair({ cropZoom: 2, groupId: 'mask-group' });
        const capture = deferred<Blob | null>();
        const upload = deferred<{ imageSrc: string }>();
        const uploadStarted = deferred<void>();
        vi.mocked(captureStageBlob).mockReturnValueOnce(capture.promise);
        vi.mocked(uploadMediaBlob).mockImplementationOnce(() => {
          uploadStarted.resolve();
          return upload.promise;
        });
        const pending = useEditorStore.getState().maskSelectedImageWithShape(stage);
        if (phase === 'upload') {
          capture.resolve(new Blob(['pixels']));
          await uploadStarted.promise;
        }
        apply(image, shape);
        const newerState = useEditorStore.getState();
        if (phase === 'capture') capture.resolve(new Blob(['pixels']));
        else upload.resolve({ imageSrc: '/local-image/stale.png' });
        await expect(pending).resolves.toBe('stale');
        expect(useEditorStore.getState()).toBe(newerState);
        expect(uploadMediaBlob).toHaveBeenCalledTimes(phase === 'capture' ? 0 : 1);
      });
    }

    it('latches a mode roundtrip reverted synchronously by an earlier store listener', async () => {
      const { stage } = seedPair({ blur: 2 });
      const capture = deferred<Blob | null>();
      vi.mocked(captureStageBlob).mockReturnValueOnce(capture.promise);
      const restoreMode = useEditorStore.subscribe((next) => {
        if (next.mode === 'collage') useEditorStore.setState({ mode: 'single' });
      });
      try {
        const pending = useEditorStore.getState().maskSelectedImageWithShape(stage);
        useEditorStore.setState({ mode: 'collage' });
        const restored = useEditorStore.getState();
        expect(restored.mode).toBe('single');
        capture.resolve(new Blob(['pixels']));
        await expect(pending).resolves.toBe('stale');
        expect(useEditorStore.getState()).toBe(restored);
        expect(uploadMediaBlob).not.toHaveBeenCalled();
      } finally {
        restoreMode();
      }
    });

    it('keeps nonparticipants edited during capture and adds just one mask undo step', async () => {
      const { image, shape, stage } = seedPair({ blur: 5 });
      const capture = deferred<Blob | null>();
      vi.mocked(captureStageBlob).mockReturnValueOnce(capture.promise);
      const pending = useEditorStore.getState().maskSelectedImageWithShape(stage);
      const other = addRect(0.7, 0.7, 0.1, 0.1);
      useEditorStore.getState().updateElement(other, { fill: '#445566' });
      useEditorStore.getState().pushHistory();
      const otherRef = byId(other);
      const historyLength = useEditorStore.getState().history.length;
      capture.resolve(new Blob(['pixels']));
      await expect(pending).resolves.toBe('ok');
      expect(byId(other)).toBe(otherRef);
      expect(useEditorStore.getState().history).toHaveLength(historyLength + 1);
      useEditorStore.getState().undo();
      expect(byId(image.id)).toEqual(image);
      expect(byId(shape.id)).toEqual(shape);
      expect(byId(other)).toEqual(otherRef);
    });

    it.each([null, new Blob([])])('never consumes a photo on an empty capture', async (blob) => {
      const { stage } = seedPair({ blur: 3 });
      vi.mocked(captureStageBlob).mockResolvedValueOnce(blob);
      const state = useEditorStore.getState();
      await expect(state.maskSelectedImageWithShape(stage)).resolves.toBe('failed');
      expect(useEditorStore.getState()).toBe(state);
      expect(uploadMediaBlob).not.toHaveBeenCalled();
    });

    it('rejects capture areas exceeding the pixel budget before invoking capture', async () => {
      const { stage, node } = seedPair({ blur: 1 });
      node.getClientRect.mockReturnValueOnce({ x: 0, y: 0, width: 100_000, height: 100_000 });
      const state = useEditorStore.getState();
      await expect(state.maskSelectedImageWithShape(stage)).resolves.toBe('too-large');
      expect(useEditorStore.getState()).toBe(state);
      expect(captureStageBlob).not.toHaveBeenCalled();
    });
  });

  it('survives a save/load round-trip with its path and name', () => {
    const a = addRect(0.1, 0.1, 0.2, 0.2);
    const b = addRect(0.2, 0.2, 0.2, 0.2);
    useEditorStore.getState().setSelectedIds([a, b]);
    expect(useEditorStore.getState().mergeSelectedShapes('union')).toBe('ok');
    const merged = useEditorStore.getState().elements[0] as ShapeElement;
    useEditorStore.getState().renameElement(merged.id, 'شكل مدموج');

    // JSON يعيد نفس ما يكتبه الحفظ في الملف — يمرّر العنصر عبر Zod مرة أخرى
    const saved = JSON.parse(
      JSON.stringify(serializeEditorState(useEditorStore.getState())),
    ) as unknown;
    const loaded = deserializeProjectFile(saved);

    const restored = loaded.elements.find((el) => el.id === merged.id) as ShapeElement;
    expect(restored).toBeDefined();
    expect(restored.type).toBe('shape');
    expect(restored.shape).toBe('path');
    expect(restored.svgPath).toBe(merged.svgPath);
    expect(restored.name).toBe('شكل مدموج');
    expect(restored.width).toBeCloseTo(merged.width, 6);
    expect(restored.height).toBeCloseTo(merged.height, 6);
  });
});
