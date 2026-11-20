import { act, render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LayersList } from '../src/components/editor/properties/layers-list';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { useEditorStore } from '../src/lib/editor-store';
import type { DragEndEvent } from '@dnd-kit/core';

const dnd = vi.hoisted(() => ({
  onDragEnd: undefined as ((event: DragEndEvent) => void) | undefined,
}));
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>();
  return {
    ...actual,
    DndContext: (props: React.ComponentProps<typeof actual.DndContext>) => {
      dnd.onDragEnd = props.onDragEnd;
      return <actual.DndContext {...props} />;
    },
  };
});

describe('LayersList Component Tests', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<TooltipProvider>{ui}</TooltipProvider>);
  };

  it('renders the accessible empty state when canvas has no elements', () => {
    useEditorStore.setState({ elements: [] });
    renderWithProviders(<LayersList />);

    expect(
      screen.getByRole('img', {
        name: 'لا توجد طبقات بعد — أضف من الملصقات أو الأشكال أو النصوص',
      }),
    ).toBeInTheDocument();
  });

  it('renders element list with correct labels and icons', () => {
    useEditorStore.setState({
      elements: [
        {
          id: 'el-1',
          type: 'image',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          opacity: 1,
          imageSrc: 'test.jpg',
          visible: true,
          locked: false,
          zIndex: 1,
        },
        {
          id: 'el-2',
          type: 'text',
          x: 10,
          y: 10,
          width: 50,
          height: 20,
          rotation: 0,
          opacity: 1,
          fontSize: 16,
          text: 'عنوان التصميم',
          visible: true,
          locked: false,
          zIndex: 2,
        },
        {
          id: 'el-3',
          type: 'shape',
          shape: 'rect',
          x: 20,
          y: 20,
          width: 80,
          height: 80,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          zIndex: 3,
        } as any,
      ],
    });

    renderWithProviders(<LayersList />);

    expect(screen.getByText('عنوان التصميم')).toBeInTheDocument();
    expect(screen.getByText('مستطيل 03')).toBeInTheDocument();
    expect(screen.getByText('صورة 01')).toBeInTheDocument();
  });

  it('selects an element on click', () => {
    useEditorStore.setState({
      elements: [
        {
          id: 'el-img',
          type: 'image',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          opacity: 1,
          imageSrc: 'test.jpg',
          visible: true,
          locked: false,
          zIndex: 1,
        },
      ],
      selectedId: null,
    });

    renderWithProviders(<LayersList />);

    const item = screen.getByText('صورة 01');
    fireEvent.click(item);

    expect(useEditorStore.getState().selectedId).toBe('el-img');
  });

  it('toggles layer visibility', () => {
    useEditorStore.setState({
      elements: [
        {
          id: 'el-img',
          type: 'image',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          opacity: 1,
          imageSrc: 'test.jpg',
          visible: true,
          locked: false,
          zIndex: 1,
        },
      ],
    });

    renderWithProviders(<LayersList />);
    fireEvent.click(screen.getByRole('button', { name: 'إخفاء الطبقة' }));
    expect(useEditorStore.getState().elements[0].visible).toBe(false);
  });

  it('toggles layer lock', () => {
    useEditorStore.setState({
      elements: [
        {
          id: 'el-img',
          type: 'image',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          opacity: 1,
          imageSrc: 'test.jpg',
          visible: true,
          locked: false,
          zIndex: 1,
        },
      ],
    });

    renderWithProviders(<LayersList />);
    fireEvent.click(screen.getByRole('button', { name: 'قفل الطبقة' }));
    expect(useEditorStore.getState().elements[0].locked).toBe(true);
  });

  it('duplicates an element from the overflow menu', async () => {
    const user = userEvent.setup();
    useEditorStore.setState({
      elements: [
        {
          id: 'el-img',
          type: 'image',
          x: 10,
          y: 10,
          width: 100,
          height: 100,
          rotation: 0,
          opacity: 1,
          imageSrc: 'test.jpg',
          visible: true,
          locked: false,
          zIndex: 1,
        },
      ],
    });

    renderWithProviders(<LayersList />);
    await user.click(screen.getByRole('button', { name: 'المزيد' }));
    await user.click(await screen.findByRole('menuitem', { name: /تكرار/ }));
    expect(useEditorStore.getState().elements.length).toBe(2);
  });

  it('deletes an element from the overflow menu', async () => {
    const user = userEvent.setup();
    useEditorStore.setState({
      elements: [
        {
          id: 'el-img',
          type: 'image',
          x: 10,
          y: 10,
          width: 100,
          height: 100,
          rotation: 0,
          opacity: 1,
          imageSrc: 'test.jpg',
          visible: true,
          locked: false,
          zIndex: 1,
        },
      ],
    });

    renderWithProviders(<LayersList />);
    await user.click(screen.getByRole('button', { name: 'المزيد' }));
    await user.click(await screen.findByRole('menuitem', { name: /حذف/ }));
    expect(useEditorStore.getState().elements.length).toBe(0);
  });

  it('commits a front/back layer menu action only once in the store', async () => {
    useEditorStore.getState().addTextElement('First');
    useEditorStore.getState().addTextElement('Second');
    renderWithProviders(<LayersList />);
    const history = vi.spyOn(useEditorStore.getState(), 'pushHistory');
    const user = userEvent.setup();
    try {
      await user.click(screen.getAllByRole('button', { name: 'المزيد' })[0]);
      await user.click(await screen.findByRole('menuitem', { name: /إرسال للخلف/ }));
      expect(history).toHaveBeenCalledTimes(1);
    } finally {
      history.mockRestore();
    }
  });

  it('does not offer direct reorder or rename actions for a locked layer', async () => {
    const id = useEditorStore.getState().addTextElement('Locked');
    useEditorStore.getState().updateElement(id, { locked: true });
    renderWithProviders(<LayersList />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'المزيد' }));
    for (const name of [
      /إعادة تسمية/,
      /إحضار للأمام/,
      /تقديم طبقة/,
      /تأخير طبقة/,
      /إرسال للخلف/,
      /حذف/,
    ]) {
      expect(await screen.findByRole('menuitem', { name })).toHaveAttribute('data-disabled');
    }
  });

  it.each([false, true])(
    'DnD moves whole groups without renumbering unrelated or locked layers (blocked=%s)',
    (blocked) => {
      for (const text of ['A', 'B', 'Neighbour', 'Other'])
        useEditorStore.getState().addTextElement(text);
      const [a, b, neighbour, other] = useEditorStore.getState().elements;
      useEditorStore.getState().updateElements([
        { id: a.id, patch: { groupId: 'g', zIndex: 11 } },
        { id: b.id, patch: { groupId: 'g', zIndex: 23 } },
        { id: neighbour.id, patch: { zIndex: 47, locked: blocked } },
        { id: other.id, patch: { zIndex: 999, locked: true } },
      ]);
      useEditorStore.getState().pushHistory();
      renderWithProviders(<LayersList standalone />);
      const before = useEditorStore.getState();
      act(() =>
        dnd.onDragEnd?.({ active: { id: a.id }, over: { id: neighbour.id } } as DragEndEvent),
      );
      const after = useEditorStore.getState();
      if (blocked) {
        expect(after.elements).toBe(before.elements);
        expect(after.history).toBe(before.history);
      } else {
        expect(after.elements.map((el) => el.zIndex)).toEqual([23, 47, 11, 999]);
        expect(after.elements[3]).toBe(before.elements[3]);
        expect(after.historyIndex).toBe(before.historyIndex + 1);
      }
    },
  );

  it('DnD refuses an interleaved group without mutating history', () => {
    for (const text of ['A', 'Between', 'B', 'Target'])
      useEditorStore.getState().addTextElement(text);
    const [a, between, b, target] = useEditorStore.getState().elements;
    useEditorStore.getState().updateElements([
      { id: a.id, patch: { groupId: 'g', zIndex: 11 } },
      { id: between.id, patch: { zIndex: 23 } },
      { id: b.id, patch: { groupId: 'g', zIndex: 47 } },
      { id: target.id, patch: { zIndex: 99 } },
    ]);
    renderWithProviders(<LayersList standalone />);
    const before = useEditorStore.getState();
    act(() => dnd.onDragEnd?.({ active: { id: a.id }, over: { id: target.id } } as DragEndEvent));
    expect(useEditorStore.getState().elements).toBe(before.elements);
    expect(useEditorStore.getState().history).toBe(before.history);
  });

  it('disables reorder on every member of a group when any member is locked', () => {
    useEditorStore.getState().addTextElement('A');
    useEditorStore.getState().addTextElement('B');
    const [a, b] = useEditorStore.getState().elements;
    useEditorStore.getState().updateElements([
      { id: a.id, patch: { groupId: 'g', locked: true } },
      { id: b.id, patch: { groupId: 'g' } },
    ]);
    renderWithProviders(<LayersList standalone />);
    for (const handle of screen.getAllByRole('button', { name: 'اسحب لإعادة الترتيب' })) {
      expect(handle).toHaveAttribute('aria-disabled', 'true');
      expect(handle).toHaveAttribute('tabindex', '-1');
    }
  });

  it('displays localized Arabic filter label when filtered layers list is empty', () => {
    useEditorStore.setState({
      elements: [
        {
          id: 'el-img',
          type: 'image',
          x: 10,
          y: 10,
          width: 100,
          height: 100,
          rotation: 0,
          opacity: 1,
          imageSrc: 'test.jpg',
          visible: true,
          locked: false,
          zIndex: 1,
        },
      ],
    });
    renderWithProviders(<LayersList typeFilter="text" />);
    expect(screen.getByText('الفلتر الحالي: نصوص')).toBeInTheDocument();
  });
});
