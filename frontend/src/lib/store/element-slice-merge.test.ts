/**
 * مسارات الستور لدمج الطبقات: النتائج المعلنة (نجاح/رفض) والهندسة الناتجة
 * على الورقة، والتراجع، وخطوة الترتيب، واسم الطبقة — الطبقة المتجهة الناتجة
 * تُختبر هندسياً في canvas/shape-merge.test.ts، وهنا يُختبر عقد الستور.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { useEditorStore } from '../editor-store';
import { deserializeProjectFile, serializeEditorState } from '../io/project-serializer';
import { CanvasElementSchema } from '../schema';

import type { CanvasElement, ShapeElement } from './types';

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
