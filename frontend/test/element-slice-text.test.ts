import { describe, it, expect, beforeEach } from 'vitest';

import { useEditorStore } from '../src/lib/editor-store';

describe('Element Slice Text & Typography Tests', () => {
  beforeEach(() => {
    useEditorStore.setState({
      elements: [],
      selectedId: null,
      selectedIds: [],
      canvasWidth: 1000,
      canvasHeight: 1000,
    });
  });

  it('returns the inserted text id and selects it for immediate editing', () => {
    const id = useEditorStore.getState().addTextElement('نص مخصص');

    const state = useEditorStore.getState();
    expect(state.elements).toHaveLength(1);
    expect(state.elements[0].id).toBe(id);
    expect(state.selectedId).toBe(id);
    expect(state.elements[0]).toMatchObject({ type: 'text', text: 'نص مخصص' });
  });

  it('creates curved stamp preset correctly', () => {
    useEditorStore.getState().addTextPreset('stamp-circle');
    const elements = useEditorStore.getState().elements;
    expect(elements.length).toBe(1);
    const el = elements[0];
    if (el.type === 'text') {
      expect(el.curve).toBe(60);
      expect(el.color).toBe('#dc2626');
    }
  });

  it('creates studio date preset with current date string and badge background', () => {
    useEditorStore.getState().addTextPreset('studio-date');
    const elements = useEditorStore.getState().elements;
    expect(elements.length).toBe(1);
    const el = elements[0];
    if (el.type === 'text') {
      expect(el.text).toBeDefined();
      expect(el.textBgColor).toBe('rgba(241, 245, 249, 0.95)');
      expect(el.fontSize).toBe(16);
    }
  });

  it('creates photographer tag with appropriate opacity and styling', () => {
    useEditorStore.getState().addTextPreset('photographer-tag');
    const elements = useEditorStore.getState().elements;
    expect(elements.length).toBe(1);
    const el = elements[0];
    if (el.type === 'text') {
      expect(el.text).toContain('تصوير');
      expect(el.opacity).toBe(0.9);
      expect(el.fontSize).toBe(22);
    }
  });

  it('creates badge preset with rounded background pill', () => {
    useEditorStore.getState().addTextPreset('badge');
    const elements = useEditorStore.getState().elements;
    expect(elements.length).toBe(1);
    const el = elements[0];
    if (el.type === 'text') {
      expect(el.textBgColor).toBe('#2563eb');
      expect(el.textBgRadius).toBe(999);
      expect(el.color).toBe('#ffffff');
    }
  });

  it('creates watermark preset with rotation and semi-transparency', () => {
    useEditorStore.getState().addTextPreset('watermark');
    const elements = useEditorStore.getState().elements;
    expect(elements.length).toBe(1);
    const el = elements[0];
    if (el.type === 'text') {
      expect(el.rotation).toBe(-35);
      expect(el.opacity).toBe(0.25);
      expect(el.text).toContain('GRIDO STUDIO');
    }
  });

  it('creates caption preset as a plain typographic label', () => {
    useEditorStore.getState().addTextPreset('caption');
    const elements = useEditorStore.getState().elements;
    expect(elements.length).toBe(1);
    const el = elements[0];
    if (el.type === 'text') {
      expect(el.fontSize).toBe(16);
      expect(el.fontWeight).toBe(600);
      expect(el.textBgColor).toBe('transparent');
    }
  });

  it('centers element horizontally and vertically on canvas', () => {
    useEditorStore.getState().addTextElement('Centered Text');
    const id = useEditorStore.getState().selectedId!;

    useEditorStore.getState().centerElementHorizontally(id);
    let el = useEditorStore.getState().elements.find((x) => x.id === id)!;
    expect(el.x + el.width / 2).toBeCloseTo(0.5, 2);

    useEditorStore.getState().centerElementVertically(id);
    el = useEditorStore.getState().elements.find((x) => x.id === id)!;
    expect(el.y + el.height / 2).toBeCloseTo(0.5, 2);
  });

  it('inserts text preset with custom text when provided', () => {
    useEditorStore.getState().addTextPreset('heading', 'عنوان مخصص للاختبار');
    const elements = useEditorStore.getState().elements;
    expect(elements.length).toBe(1);
    const el = elements[0];
    if (el.type === 'text') {
      expect(el.text).toBe('عنوان مخصص للاختبار');
      expect(el.fontSize).toBe(48);
      expect(el.fontWeight).toBe(800);
    }
  });

  it('applies preset style onto existing text element preserving content and position', () => {
    useEditorStore.getState().addTextElement('نص موجود مسبقاً');
    const id = useEditorStore.getState().selectedId!;
    let el = useEditorStore.getState().elements.find((x) => x.id === id)!;
    const originalX = el.x;
    const originalY = el.y;

    useEditorStore.getState().applyTextPreset(id, 'heading');
    el = useEditorStore.getState().elements.find((x) => x.id === id)!;

    if (el.type === 'text') {
      expect(el.text).toBe('نص موجود مسبقاً');
      expect(el.x).toBe(originalX);
      expect(el.y).toBe(originalY);
      expect(el.fontSize).toBe(48);
      expect(el.fontWeight).toBe(800);
    }
  });
});

describe('Element Slice — text resize anchor', () => {
  const anchorOf = (id: string) => {
    const el = useEditorStore.getState().elements.find((x) => x.id === id);
    return el?.type === 'text' ? el.textResizeAnchor : undefined;
  };

  beforeEach(() => {
    useEditorStore.setState({
      elements: [],
      selectedId: null,
      selectedIds: [],
      canvasWidth: 1000,
      canvasHeight: 1000,
    });
  });

  it('survives geometry-only sync patches (the re-measure correction)', () => {
    const id = useEditorStore.getState().addTextElement('مرساة');
    const store = useEditorStore.getState();

    // تحجيم الزاوية يكتب الركن مع حجم الخط والعرض في نفس التحديث.
    store.updateElement(id, {
      fontSize: 40,
      width: 0.3,
      height: 0.1,
      x: 0.2,
      y: 0.3,
      textResizeAnchor: 'top-left',
    });
    expect(anchorOf(id)).toBe('top-left');

    // تصحيح القياس اللاحق يغيّر الهندسة فقط — الركن يبقى.
    store.updateElement(id, { width: 0.31, height: 0.09, x: 0.19, y: 0.31 });
    expect(anchorOf(id)).toBe('top-left');
  });

  it('clears when typography or content changes and a new layout starts', () => {
    const id = useEditorStore.getState().addTextElement('نص');
    const store = useEditorStore.getState();
    const setAnchor = () => store.updateElement(id, { textResizeAnchor: 'bottom-right' });

    setAnchor();
    store.updateElement(id, { fontSize: 64 });
    expect(anchorOf(id)).toBeUndefined();

    setAnchor();
    store.updateElement(id, { text: 'نص جديد' });
    expect(anchorOf(id)).toBeUndefined();

    setAnchor();
    store.updateElements([{ id, patch: { fontWeight: 400 } }]);
    expect(anchorOf(id)).toBeUndefined();
  });

  it('clears on fit-to-content and preset application', () => {
    const id = useEditorStore.getState().addTextElement('نص');
    const store = useEditorStore.getState();

    store.updateElement(id, { textResizeAnchor: 'top-right' });
    store.fitTextToContent(id);
    expect(anchorOf(id)).toBeUndefined();

    store.updateElement(id, { textResizeAnchor: 'top-right' });
    store.applyTextPreset(id, 'heading');
    expect(anchorOf(id)).toBeUndefined();
  });
});
