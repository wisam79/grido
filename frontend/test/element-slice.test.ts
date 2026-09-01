import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../src/lib/editor-store';
import type { TextElement } from '../src/lib/store/types';

describe('ElementSlice Unit Tests', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
    useEditorStore.getState().setMode('single');
  });

  it('adds a text element with default parameters', () => {
    useEditorStore.getState().addTextElement('مرحباً بك');
    const elements = useEditorStore.getState().elements;

    expect(elements.length).toBe(1);
    expect(elements[0].type).toBe('text');
    expect((elements[0] as TextElement).text).toBe('مرحباً بك');
  });

  it('adds a shape element correctly', () => {
    useEditorStore.getState().addShapeElement('rect');
    const elements = useEditorStore.getState().elements;

    expect(elements.length).toBe(1);
    expect(elements[0].type).toBe('shape');
  });

  it('updates element properties', () => {
    useEditorStore.getState().addTextElement('نص جديد');
    const elId = useEditorStore.getState().elements[0].id;

    useEditorStore.getState().updateElement(elId, { text: 'نص معدل', fontSize: 32 });

    const updated = useEditorStore.getState().elements.find((e) => e.id === elId) as TextElement | undefined;
    expect(updated?.text).toBe('نص معدل');
    expect(updated?.fontSize).toBe(32);
  });

  it('removes an element by ID', () => {
    useEditorStore.getState().addTextElement('عنصر 1');
    const elId = useEditorStore.getState().elements[0].id;

    useEditorStore.getState().removeElement(elId);

    expect(useEditorStore.getState().elements.length).toBe(0);
    expect(useEditorStore.getState().selectedId).toBeNull();
  });

  it('duplicates an element', () => {
    useEditorStore.getState().addTextElement('عنصر أصلي');
    const origId = useEditorStore.getState().elements[0].id;

    useEditorStore.getState().duplicateElement(origId);

    const elements = useEditorStore.getState().elements as TextElement[];
    expect(elements.length).toBe(2);
    expect(elements[1].text).toBe('عنصر أصلي');
    expect(elements[1].id).not.toBe(origId);
  });

  it('reorders elements using bringToFront and sendToBack', () => {
    useEditorStore.getState().addTextElement('الأول');
    useEditorStore.getState().addTextElement('الثاني');

    const firstId = useEditorStore.getState().elements[0].id;
    const secondId = useEditorStore.getState().elements[1].id;

    useEditorStore.getState().bringToFront(firstId);
    const el1 = useEditorStore.getState().elements.find((e) => e.id === firstId);
    const el2 = useEditorStore.getState().elements.find((e) => e.id === secondId);
    expect(el1!.zIndex).toBeGreaterThan(el2!.zIndex);

    useEditorStore.getState().sendToBack(firstId);
    const el1Back = useEditorStore.getState().elements.find((e) => e.id === firstId);
    expect(el1Back!.zIndex).toBeLessThan(el2!.zIndex);
  });

  it('updates image filters (brightness, contrast, saturation, cornerRadius)', () => {
    useEditorStore.getState().addImageElement('/local-image/sample.jpg', 1);
    const imgEl = useEditorStore.getState().elements[0];
    expect(imgEl.type).toBe('image');

    useEditorStore.getState().updateElement(imgEl.id, {
      brightness: 0.2,
      contrast: 0.1,
      saturation: 1.2,
      blur: 2,
      cornerRadius: 12,
    });

    const updated = useEditorStore.getState().elements.find((e) => e.id === imgEl.id) as any;
    expect(updated.brightness).toBe(0.2);
    expect(updated.contrast).toBe(0.1);
    expect(updated.saturation).toBe(1.2);
    expect(updated.blur).toBe(2);
    expect(updated.cornerRadius).toBe(12);
  });

  it('toggles locked state and flips element horizontally/vertically', () => {
    useEditorStore.getState().addImageElement('/local-image/sample.jpg', 1);
    const imgEl = useEditorStore.getState().elements[0];

    useEditorStore.getState().updateElement(imgEl.id, {
      locked: true,
      flipX: true,
      flipY: false,
    });

    const updated = useEditorStore.getState().elements.find((e) => e.id === imgEl.id) as any;
    expect(updated.locked).toBe(true);
    expect(updated.flipX).toBe(true);
    expect(updated.flipY).toBe(false);
  });

  it('groups elements and preserves their relative layout during alignment', () => {
    useEditorStore.getState().addTextElement('النص 1');
    useEditorStore.getState().addTextElement('النص 2');
    const [el1, el2] = useEditorStore.getState().elements;

    useEditorStore.getState().updateElement(el1.id, { x: 0.1, y: 0.2, width: 0.1, height: 0.1 });
    useEditorStore.getState().updateElement(el2.id, { x: 0.3, y: 0.2, width: 0.1, height: 0.1 });

    useEditorStore.getState().setSelectedIds([el1.id, el2.id]);
    useEditorStore.getState().groupSelectedElements();

    const grouped = useEditorStore.getState().elements;
    expect(grouped[0].groupId).toBeDefined();
    expect(grouped[0].groupId).toBe(grouped[1].groupId);

    // محاذاة المجموعة ككتلة واحدة للمنتصف
    useEditorStore.getState().alignSelectedElements('center');

    const aligned = useEditorStore.getState().elements;
    const initialRelativeDistance = 0.3 - 0.1; // 0.2
    const newRelativeDistance = aligned[1].x - aligned[0].x;

    // يجب أن تحافظ العناصر على المسافة النسبية بين بعضها تماماً
    expect(Math.abs(newRelativeDistance - initialRelativeDistance)).toBeLessThan(0.0001);
  });
});
