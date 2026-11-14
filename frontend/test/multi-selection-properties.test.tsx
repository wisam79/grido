import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Profiler } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PropertiesPanel } from '../src/components/editor/panels/properties-panel';
import { ElementProperties } from '../src/components/editor/properties/element-properties';
import { MultiSelectionProperties } from '../src/components/editor/properties/multi-selection-properties';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { useEditorStore } from '../src/lib/editor-store';
import { advanceDocumentSession } from '../src/lib/io/document-session';
import {
  aggregateSelectionValue,
  buildSelectionLayerPatches,
  buildSelectionPropertyPatches,
  canArrangeSelection,
  deriveSelectionProperties,
  getSelectionElements,
  parseSelectionNumber,
} from '../src/lib/selection-properties';

import type {
  CanvasElement,
  ImageElement,
  ShapeElement,
  TextElement,
} from '../src/lib/editor-store';

const base = { x: 0.1, y: 0.2, width: 0.2, height: 0.1, rotation: 0, opacity: 1, zIndex: 10 };
const text: TextElement = {
  ...base,
  id: 'text',
  type: 'text',
  text: 'ألف',
  fontSize: 24,
  fontFamily: 'Cairo',
  color: '#000000',
};
const image: ImageElement = {
  ...base,
  x: 0.4,
  id: 'image',
  type: 'image',
  imageSrc: 'image.png',
  opacity: 0.5,
  zIndex: 20,
};
const shape: ShapeElement = {
  ...base,
  id: 'shape',
  type: 'shape',
  shape: 'rect',
  fill: '#ffffff',
  locked: true,
  opacity: 0.8,
  zIndex: 30,
};
const unrelated: ShapeElement = {
  ...base,
  id: 'other',
  type: 'shape',
  shape: 'rect',
  fill: '#333333',
  zIndex: 40,
};
const initial = useEditorStore.getState();

function seed(elements: CanvasElement[], ids = elements.map((element) => element.id)) {
  useEditorStore.setState({
    ...initial,
    mode: 'single',
    elements,
    selectedIds: ids,
    selectedId: ids[0] ?? null,
    history: [],
    historyIndex: -1,
  });
  useEditorStore.getState().pushHistory();
}
function panel() {
  return render(
    <TooltipProvider>
      <PropertiesPanel />
    </TooltipProvider>,
  );
}
function write(label: string, value: string, end: 'Enter' | 'blur' | 'Escape' = 'Enter') {
  const input = screen.getByRole('textbox', { name: label });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value } });
  if (end === 'blur') fireEvent.blur(input);
  else fireEvent.keyDown(input, { key: end });
}

beforeEach(() => seed([text, image, shape, unrelated], ['text', 'image', 'shape']));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useEditorStore.setState(initial);
});

describe('selection property source matrix', () => {
  it('aggregates all members, including locks, and distinguishes genuine zero from mixed/empty', () => {
    expect(aggregateSelectionValue([0, 0])).toEqual({ kind: 'value', value: 0 });
    expect(aggregateSelectionValue([0, 1])).toEqual({ kind: 'mixed' });
    expect(aggregateSelectionValue([])).toBeUndefined();
    expect(deriveSelectionProperties([text, image, shape])).toMatchObject({
      selectedCount: 3,
      eligibleCount: 2,
      fields: [{ key: 'opacity', state: { kind: 'mixed' } }],
    });
    expect(getSelectionElements([text, image], ['text', 'text', 'missing'], 'image')).toEqual([
      text,
    ]);
  });

  it('offers only the finite type-supported fields, not a primary element broadcast', () => {
    const keys = (elements: CanvasElement[]) =>
      deriveSelectionProperties(elements).fields.map((field) => field.key);
    expect(keys([text, { ...text, id: 't2' }])).toEqual(['opacity', 'fontSize', 'textColor']);
    expect(keys([image, { ...image, id: 'i2' }])).toEqual([
      'opacity',
      'brightness',
      'contrast',
      'saturation',
      'filter',
    ]);
    expect(keys([shape, { ...shape, id: 's2' }])).toEqual(['opacity', 'shapeFill']);
    expect(keys([text, image, shape])).toEqual(['opacity']);
    expect(keys([{ ...text, fillType: 'linear' }, text])).not.toContain('textColor');
    expect(keys([{ ...shape, shape: 'line' }, shape])).not.toContain('shapeFill');
    expect(keys([{ ...shape, shape: 'arc' }, shape])).not.toContain('shapeFill');
    expect(keys([{ ...image, filter: 'unknown' }, image])).not.toContain('filter');
    expect(keys([{ ...text, fontSize: NaN }, text])).not.toContain('fontSize');
  });

  it('revalidates whitelist, lock eligibility and numeric input at commit', () => {
    expect(
      buildSelectionPropertyPatches([text, image, shape], { key: 'fontSize', value: 80 }),
    ).toEqual([]);
    expect(
      buildSelectionPropertyPatches([text, image, shape], { key: 'opacity', value: 60 }),
    ).toEqual([
      { id: 'text', patch: { opacity: 0.6 } },
      { id: 'image', patch: { opacity: 0.6 } },
    ]);
    expect(
      buildSelectionPropertyPatches([text, shape], { key: 'opacity', value: Infinity }),
    ).toEqual([]);
    expect(parseSelectionNumber('', 0, 100)).toBeUndefined();
    expect(parseSelectionNumber('bad42', 0, 100)).toBeUndefined();
    expect(parseSelectionNumber('١٢٫٥', 0, 100)).toBe(12.5);
    expect(parseSelectionNumber('101', 0, 100)).toBeUndefined();
  });

  it('guards incomplete/locked groups and preserves stack ordering', () => {
    const grouped = [
      { ...text, groupId: 'g' },
      { ...image, groupId: 'g' },
    ];
    expect(canArrangeSelection(grouped, ['text'])).toBe(false);
    expect(canArrangeSelection(grouped, ['text', 'image'])).toBe(true);
    expect(
      canArrangeSelection([grouped[0], { ...grouped[1], locked: true }], ['text', 'image']),
    ).toBe(false);
    expect(
      buildSelectionLayerPatches(
        [text, image, shape, unrelated],
        ['text', 'image', 'shape'],
        'front',
      ),
    ).toEqual([
      { id: 'text', patch: { zIndex: 50 } },
      { id: 'image', patch: { zIndex: 60 } },
    ]);
  });
});

describe('real store / RTL multi-selection properties', () => {
  it('shows contextual counts and no first-element content, fields or header actions for a mixed selection', () => {
    panel();
    expect(screen.getByText('خصائص التحديد')).toBeInTheDocument();
    expect(screen.getByText('3 محدد · 2 قابل للتعديل')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'الشفافية' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'الشفافية' })).toHaveAttribute(
      'placeholder',
      'مختلط',
    );
    expect(screen.queryByRole('textbox', { name: 'حجم الخط' })).not.toBeInTheDocument();
    expect(screen.queryByText('ألف')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'قفل العنصر' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('W')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('X')).not.toBeInTheDocument();
  });

  it('keeps mixed numeric typing draft-only and commits once on Enter/blur, undo restores both', () => {
    panel();
    const batch = vi.spyOn(useEditorStore.getState(), 'updateElements');
    const history = vi.spyOn(useEditorStore.getState(), 'pushHistory');
    const input = screen.getByRole('textbox', { name: 'الشفافية' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '60' } });
    expect(batch).not.toHaveBeenCalled();
    expect(history).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(batch).toHaveBeenCalledTimes(1);
    expect(history).toHaveBeenCalledTimes(1);
    expect(useEditorStore.getState().elements[0].opacity).toBe(0.6);
    expect(useEditorStore.getState().elements[1].opacity).toBe(0.6);
    expect(useEditorStore.getState().elements[2]).toBe(shape);
    expect(useEditorStore.getState().elements[3]).toBe(unrelated);
    expect(screen.getByRole('textbox', { name: 'الشفافية' })).toHaveValue(''); // locked member remains different
    write('الشفافية', '70', 'blur');
    expect(batch).toHaveBeenCalledTimes(2);
    expect(history).toHaveBeenCalledTimes(2);
    act(() => useEditorStore.getState().undo());
    expect(
      useEditorStore
        .getState()
        .elements.slice(0, 2)
        .map((element) => element.opacity),
    ).toEqual([0.6, 0.6]);
    act(() => useEditorStore.getState().undo());
    expect(
      useEditorStore
        .getState()
        .elements.slice(0, 2)
        .map((element) => element.opacity),
    ).toEqual([1, 0.5]);
  });

  it('Escape discards only the unpreviewed draft, preserving independent edits and history', () => {
    panel();
    const history = vi.spyOn(useEditorStore.getState(), 'pushHistory');
    const input = screen.getByRole('textbox', { name: 'الشفافية' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '25' } });
    act(() => useEditorStore.getState().updateElement('other', { x: 0.8 }));
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.blur(input);
    expect(history).not.toHaveBeenCalled();
    expect(useEditorStore.getState().elements.slice(0, 3)).toEqual([text, image, shape]);
    expect(useEditorStore.getState().elements[3].x).toBe(0.8);
    expect(input).toHaveValue('');
  });

  it('does not invent zero for blank/invalid mixed numeric fields or push no-op history', () => {
    panel();
    const history = vi.spyOn(useEditorStore.getState(), 'pushHistory');
    write('الشفافية', '', 'blur');
    expect(history).not.toHaveBeenCalled();
    write('الشفافية', '120', 'blur');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(history).not.toHaveBeenCalled();
    write('الشفافية', '60');
    history.mockClear();
    write('الشفافية', '60');
    expect(history).not.toHaveBeenCalled();
  });

  it('edits homogeneous text size/color without overwriting content, geometry, fonts or locked text', () => {
    const t2 = {
      ...text,
      id: 't2',
      fontSize: 48,
      color: '#ffffff',
      text: 'باء',
      textResizeAnchor: 'bottom-right' as const,
    };
    const t3 = { ...text, id: 't3', locked: true };
    seed([text, t2, t3]);
    panel();
    expect(screen.getByRole('textbox', { name: 'حجم الخط' })).toHaveValue('');
    write('حجم الخط', '32');
    write('لون النص', '#ff0000');
    const [a, b, c] = useEditorStore.getState().elements;
    expect(a).toMatchObject({
      text: 'ألف',
      fontSize: 32,
      color: '#ff0000',
      x: text.x,
      width: text.width,
      fontFamily: 'Cairo',
    });
    expect(b).toMatchObject({
      text: 'باء',
      fontSize: 32,
      color: '#ff0000',
      x: t2.x,
      width: t2.width,
      textResizeAnchor: undefined,
    });
    expect(c).toBe(t3);
    expect(useEditorStore.getState().history).toHaveLength(3);
  });

  it('edits image adjustments/filters atomically, preserving sources and ratios', () => {
    const i2 = {
      ...image,
      id: 'i2',
      width: 0.6,
      brightness: 150,
      filter: 'sepia',
      imageSrc: 'other.png',
    };
    seed([image, i2]);
    panel();
    expect(screen.getByRole('textbox', { name: 'السطوع' })).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'فلتر الصورة' })).toHaveValue('');
    write('السطوع', '110');
    fireEvent.change(screen.getByRole('combobox', { name: 'فلتر الصورة' }), {
      target: { value: 'grayscale' },
    });
    expect(useEditorStore.getState().elements).toEqual([
      { ...image, brightness: 110, filter: 'grayscale' },
      { ...i2, brightness: 110, filter: 'grayscale' },
    ]);
    expect(useEditorStore.getState().history).toHaveLength(3);
  });

  it('edits solid shape fill but omits color on mixed gradient/linear sources', () => {
    const s1 = { ...shape, locked: false };
    const s2 = { ...s1, id: 's2', fill: '#000000', shape: 'ellipse' as const };
    seed([s1, s2]);
    panel();
    write('لون التعبئة', '#123456');
    expect(useEditorStore.getState().elements).toEqual([
      { ...s1, fill: '#123456' },
      { ...s2, fill: '#123456' },
    ]);
    act(() => useEditorStore.getState().updateElement('s2', { fillType: 'linear' }));
    expect(screen.queryByRole('textbox', { name: 'لون التعبئة' })).not.toBeInTheDocument();
  });

  it('resets pending field sessions across selection/type/lock changes', () => {
    panel();
    const input = screen.getByRole('textbox', { name: 'الشفافية' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '25' } });
    act(() => useEditorStore.getState().setSelectedIds(['image', 'other']));
    expect(screen.getByRole('textbox', { name: 'الشفافية' })).toHaveValue('');
    expect(useEditorStore.getState().elements[1]).toBe(image);
    write('الشفافية', '40');
    expect(useEditorStore.getState().elements[0]).toBe(text);
    expect(useEditorStore.getState().elements[1].opacity).toBe(0.4);
  });

  it('preserves a focused draft across selected source updates and uses the latest eligible values', () => {
    seed([text, image]);
    panel();
    const input = screen.getByRole('textbox', { name: 'الشفافية' });
    act(() => input.focus());
    fireEvent.change(input, { target: { value: '25' } });
    act(() => {
      useEditorStore.getState().updateElement('image', { opacity: 1, imageSrc: 'updated.png' });
      useEditorStore.getState().updateElement('text', { x: 0.7 });
    });
    expect(screen.getByRole('textbox', { name: 'الشفافية' })).toBe(input);
    expect(input).toHaveFocus();
    expect(input).toHaveValue('25');
    const batch = vi.spyOn(useEditorStore.getState(), 'updateElements');
    const history = vi.spyOn(useEditorStore.getState(), 'pushHistory');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(batch).toHaveBeenCalledTimes(1);
    expect(history).toHaveBeenCalledTimes(1);
    expect(useEditorStore.getState().elements).toEqual([
      { ...text, x: 0.7, opacity: 0.25 },
      { ...image, imageSrc: 'updated.png', opacity: 0.25 },
    ]);
    expect(input).toHaveValue('25');
  });

  it('rejects a stale gesture across document sessions even after rerender with the same IDs', () => {
    seed([text, image]);
    const view = render(<MultiSelectionProperties elements={[text, image]} />);
    const input = screen.getByRole('textbox', { name: 'الشفافية' });
    act(() => input.focus());
    fireEvent.change(input, { target: { value: '25' } });
    const replacement = [
      { ...text, text: 'مستند آخر', opacity: 0.8 },
      { ...image, imageSrc: 'new.png', opacity: 0.8 },
    ];
    act(() => {
      advanceDocumentSession();
      seed(replacement);
    });
    view.rerender(<MultiSelectionProperties elements={replacement} />);
    expect(screen.getByRole('textbox', { name: 'الشفافية' })).toBe(input);
    expect(input).toHaveValue('25');
    const batch = vi.spyOn(useEditorStore.getState(), 'updateElements');
    const history = vi.spyOn(useEditorStore.getState(), 'pushHistory');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(batch).not.toHaveBeenCalled();
    expect(history).not.toHaveBeenCalled();
    expect(useEditorStore.getState().elements).toEqual(replacement);
    expect(input).toHaveValue('80');
    write('الشفافية', '50');
    expect(batch).toHaveBeenCalledTimes(1);
    expect(history).toHaveBeenCalledTimes(1);
  });

  it('keys the panel session to the document rather than recycled IDs', () => {
    seed([text, image]);
    panel();
    const input = screen.getByRole('textbox', { name: 'الشفافية' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '25' } });
    act(() => {
      advanceDocumentSession();
      seed([
        { ...text, opacity: 0.8 },
        { ...image, opacity: 0.8 },
      ]);
    });
    expect(screen.getByRole('textbox', { name: 'الشفافية' })).not.toBe(input);
    expect(screen.getByRole('textbox', { name: 'الشفافية' })).toHaveValue('80');
    expect(useEditorStore.getState().history).toHaveLength(1);
  });

  it('disables and rejects front/back for incomplete groups and groups with locked members', () => {
    const grouped = [{ ...text, groupId: 'g' }, { ...image, groupId: 'g' }, unrelated];
    for (const direction of ['front', 'back'] as const) {
      expect(buildSelectionLayerPatches(grouped, ['text', 'other'], direction)).toEqual([]);
      expect(
        buildSelectionLayerPatches(
          [grouped[0], { ...grouped[1], locked: true }, unrelated],
          ['text', 'image'],
          direction,
        ),
      ).toEqual([]);
    }
    seed(grouped, ['text', 'other']);
    panel();
    const history = vi.spyOn(useEditorStore.getState(), 'pushHistory');
    expect(screen.getByRole('button', { name: 'إلى المقدمة' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'إلى الخلف' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'إلى المقدمة' }));
    fireEvent.click(screen.getByRole('button', { name: 'إلى الخلف' }));
    expect(history).not.toHaveBeenCalled();
    act(() => useEditorStore.getState().setSelectedIds(['text', 'image']));
    expect(screen.getByRole('button', { name: 'إلى المقدمة' })).toBeEnabled();
    const front = screen.getByRole('button', { name: 'إلى المقدمة' });
    // Lock immediately before the event, before React renders disabled controls:
    // action-time eligibility must protect the group independently of the UI.
    act(() => {
      useEditorStore.getState().updateElement('image', { locked: true });
      fireEvent.click(front);
    });
    expect(history).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'إلى المقدمة' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'إلى الخلف' })).toBeDisabled();
    expect(useEditorStore.getState().elements.map((element) => element.zIndex)).toEqual([
      10, 20, 40,
    ]);
  });

  it('shows short instructions only when mixed values or partial lock eligibility need them', () => {
    seed([text, { ...text, id: 't2' }]);
    panel();
    expect(screen.queryByText('المختلط: اعتماد بـ Enter أو مغادرة الحقل.')).not.toBeInTheDocument();
    expect(screen.queryByText('التعديل لغير المقفل فقط.')).not.toBeInTheDocument();
    act(() => useEditorStore.getState().updateElement('t2', { fontSize: 48, locked: true }));
    expect(screen.getByText('المختلط: اعتماد بـ Enter أو مغادرة الحقل.')).toBeInTheDocument();
    expect(screen.getByText('التعديل لغير المقفل فقط.')).toBeInTheDocument();
  });

  it('uses existing group-relative alignment and one history entry for group/layer gestures', () => {
    seed([text, image, unrelated], ['text', 'image']);
    panel();
    const history = vi.spyOn(useEditorStore.getState(), 'pushHistory');
    fireEvent.click(screen.getByRole('button', { name: 'تجميع' }));
    expect(history).toHaveBeenCalledTimes(1);
    const before = useEditorStore.getState().elements;
    expect(before[0].groupId).toBe(before[1].groupId);
    fireEvent.click(screen.getByRole('button', { name: 'محاذاة يسار' }));
    const aligned = useEditorStore.getState().elements;
    expect(aligned[1].x - aligned[0].x).toBeCloseTo(before[1].x - before[0].x);
    expect(aligned[1].width).toBe(image.width);
    expect(history).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'إلى المقدمة' }));
    expect(history).toHaveBeenCalledTimes(3);
    expect(useEditorStore.getState().elements[0].zIndex).toBeLessThan(
      useEditorStore.getState().elements[1].zIndex,
    );
    expect(useEditorStore.getState().elements[2]).toBe(unrelated);
    fireEvent.click(screen.getByRole('button', { name: 'فك التجميع' }));
    expect(history).toHaveBeenCalledTimes(4);
  });

  it('blocks all-locked changes and unsafe group actions without removing individual unlock/visibility', () => {
    seed([{ ...text, locked: true }, shape]);
    panel();
    expect(screen.getByRole('textbox', { name: 'الشفافية' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'تجميع' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('جميع العناصر مقفلة');
    act(() => useEditorStore.getState().setSelectedIds(['shape']));
    const body = screen.getByRole('group', { name: 'خصائص العنصر القابلة للتعديل' });
    expect(body).toHaveAttribute('inert');
    expect(body).toHaveAttribute('aria-disabled', 'true');
    expect(body).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'التنسيق والقياسات' })).toBeDisabled();
    const update = vi.spyOn(useEditorStore.getState(), 'updateElement');
    fireEvent.click(screen.getByRole('tab', { name: 'الألوان والتعبئة' }));
    expect(update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'إخفاء العنصر' }));
    expect(useEditorStore.getState().elements[1]).toMatchObject({ locked: true, visible: false });
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء قفل العنصر' }));
    expect(useEditorStore.getState().elements[1].locked).toBe(false);
    expect(screen.getByRole('group', { name: 'خصائص العنصر القابلة للتعديل' })).not.toHaveAttribute(
      'inert',
    );
  });

  it('resets individual tabs when element identity/type changes, preserving existing individual panels', () => {
    const update = vi.fn();
    const view = render(
      <TooltipProvider>
        <ElementProperties element={text} onUpdate={update} />
      </TooltipProvider>,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'الألوان والتعبئة' }));
    view.rerender(
      <TooltipProvider>
        <ElementProperties element={{ ...shape, locked: false }} onUpdate={update} />
      </TooltipProvider>,
    );
    expect(screen.getByRole('tab', { name: 'التنسيق والقياسات' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('does not rerender either selection panel on unrelated element updates', () => {
    const commits = vi.fn();
    render(
      <TooltipProvider>
        <Profiler id="properties" onRender={commits}>
          <PropertiesPanel />
        </Profiler>
      </TooltipProvider>,
    );
    const before = commits.mock.calls.length;
    act(() => useEditorStore.getState().updateElement('other', { x: 0.9 }));
    expect(commits.mock.calls.length).toBe(before);
    cleanup();
    const multi = vi.fn();
    render(
      <Profiler id="multi" onRender={multi}>
        <MultiSelectionProperties elements={[text, image, shape]} />
      </Profiler>,
    );
    const count = multi.mock.calls.length;
    act(() => useEditorStore.getState().updateElement('other', { y: 0.9 }));
    expect(multi.mock.calls.length).toBe(count);
  });

  it('exposes coarse touch targets, dual focus ring, and iconic alignment bar for multi-selection controls', () => {
    seed([text, image, shape]);
    panel();
    const alignLeft = screen.getByRole('button', { name: 'محاذاة يسار' });
    expect(alignLeft).toHaveClass('coarse-touch-target', 'h-8', 'w-8');
    expect(alignLeft.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('button', { name: 'تجميع' })).toHaveClass('coarse-touch-target', 'h-8');
    expect(screen.getByRole('button', { name: 'إلى المقدمة' })).toHaveClass(
      'coarse-touch-target',
      'h-8',
    );
  });
});
