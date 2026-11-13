/**
 * مسارات الستور لدمج الطبقات: النتائج المعلنة (نجاح/رفض) والهندسة الناتجة
 * على الورقة، والتراجع، وخطوة الترتيب، واسم الطبقة — الطبقة المتجهة الناتجة
 * تُختبر هندسياً في canvas/shape-merge.test.ts، وهنا يُختبر عقد الستور.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
