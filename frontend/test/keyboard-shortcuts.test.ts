import { renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useKeyboardShortcuts } from '../src/hooks/use-keyboard-shortcuts';
import { useEditorStore } from '../src/lib/editor-store';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useKeyboardShortcuts - Keyboard Shortcuts Hook Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    useEditorStore.getState().reset();
    vi.clearAllMocks();
    user = userEvent.setup();
  });

  it('should trigger undo on Ctrl+Z and redo on Ctrl+Shift+Z / Ctrl+Y', async () => {
    const undoSpy = vi.spyOn(useEditorStore.getState(), 'undo');
    const redoSpy = vi.spyOn(useEditorStore.getState(), 'redo');

    renderHook(() => useKeyboardShortcuts());

    // 1. Ctrl+Z
    await user.keyboard('{Control>}z{/Control}');
    expect(undoSpy).toHaveBeenCalled();

    // 2. Ctrl+Shift+Z
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
    expect(redoSpy).toHaveBeenCalled();

    // 3. Ctrl+Y
    await user.keyboard('{Control>}y{/Control}');
    expect(redoSpy).toHaveBeenCalledTimes(2);

    undoSpy.mockRestore();
    redoSpy.mockRestore();
  });

  it('should delete selected element on Delete/Backspace key', async () => {
    const removeElementSpy = vi.spyOn(useEditorStore.getState(), 'removeElement');

    // Add text element first
    useEditorStore.getState().addTextElement('Test to delete');
    const elementId = useEditorStore.getState().elements[0].id;
    useEditorStore.getState().selectElement(elementId);

    renderHook(() => useKeyboardShortcuts());

    // Backspace
    await user.keyboard('{Backspace}');
    expect(removeElementSpy).toHaveBeenCalledWith(elementId);

    removeElementSpy.mockRestore();
  });

  it('should not delete locked elements and informs the user instead', async () => {
    const removeElementSpy = vi.spyOn(useEditorStore.getState(), 'removeElement');
    const toastInfoSpy = vi.spyOn(toast, 'info');

    useEditorStore.getState().addTextElement('Locked element');
    const elementId = useEditorStore.getState().elements[0].id;
    useEditorStore.getState().updateElement(elementId, { locked: true });
    useEditorStore.getState().selectElement(elementId);

    renderHook(() => useKeyboardShortcuts());

    await user.keyboard('{Backspace}');
    expect(removeElementSpy).not.toHaveBeenCalled();
    expect(toastInfoSpy).toHaveBeenCalledWith('العناصر المحددة مقفلة — ألغِ قفلها أولاً للحذف');

    removeElementSpy.mockRestore();
    toastInfoSpy.mockRestore();
  });

  it('should ignore delete shortcut when focus is on a button or menu item', async () => {
    const removeElementSpy = vi.spyOn(useEditorStore.getState(), 'removeElement');

    useEditorStore.getState().addTextElement('Element');
    const elementId = useEditorStore.getState().elements[0].id;
    useEditorStore.getState().selectElement(elementId);

    renderHook(() => useKeyboardShortcuts());

    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();

    await user.keyboard('{Backspace}');
    expect(removeElementSpy).not.toHaveBeenCalled();

    document.body.removeChild(button);
    removeElementSpy.mockRestore();
  });

  it('should duplicate selected element on Ctrl+D', async () => {
    const duplicateElementSpy = vi.spyOn(useEditorStore.getState(), 'duplicateElement');

    useEditorStore.getState().addTextElement('Duplicate me');
    const elementId = useEditorStore.getState().elements[0].id;
    useEditorStore.getState().selectElement(elementId);

    renderHook(() => useKeyboardShortcuts());

    await user.keyboard('{Control>}d{/Control}');
    expect(duplicateElementSpy).toHaveBeenCalledWith(elementId);

    duplicateElementSpy.mockRestore();
  });

  it('should not route collage slots to free-element duplication on Ctrl+D', async () => {
    const duplicateElementSpy = vi.spyOn(useEditorStore.getState(), 'duplicateElement');
    const duplicateElementsSpy = vi.spyOn(useEditorStore.getState(), 'duplicateElements');
    useEditorStore.setState({
      mode: 'collage',
      selectedId: 'slot-1',
      selectedIds: ['slot-1'],
      slots: [{ id: 'slot-1', cellIndex: 0, x: 0, y: 0, w: 1, h: 1, imageSrc: 'test.jpg' }],
    });

    renderHook(() => useKeyboardShortcuts());
    await user.keyboard('{Control>}d{/Control}');

    expect(duplicateElementSpy).not.toHaveBeenCalled();
    expect(duplicateElementsSpy).not.toHaveBeenCalled();
    duplicateElementSpy.mockRestore();
    duplicateElementsSpy.mockRestore();
  });

  it('should open projects dialog on Ctrl+S', async () => {
    const listener = vi.fn();
    window.addEventListener('grido:open-projects-dialog', listener);

    renderHook(() => useKeyboardShortcuts());

    await user.keyboard('{Control>}s{/Control}');
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener('grido:open-projects-dialog', listener);
  });

  it('should nudge selected element on Arrow Keys', async () => {
    const updateElementSpy = vi.spyOn(useEditorStore.getState(), 'updateElement');

    useEditorStore.getState().addTextElement('Nudge me');
    const element = useEditorStore.getState().elements[0];
    useEditorStore.getState().selectElement(element.id);

    renderHook(() => useKeyboardShortcuts());

    // ArrowRight -> increments x
    await user.keyboard('{ArrowRight}');
    expect(updateElementSpy).toHaveBeenCalledWith(element.id, {
      x: element.x + 0.002,
      y: element.y,
    });

    // ArrowRight with Shift -> larger increments
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
    expect(updateElementSpy).toHaveBeenLastCalledWith(element.id, {
      x: element.x + 0.002 + 0.015,
      y: element.y,
    });

    updateElementSpy.mockRestore();
  });

  it.each([
    { rotation: 90, flipX: false, flipY: false, expectedX: 0, expectedY: -2 },
    { rotation: 0, flipX: true, flipY: false, expectedX: -2, expectedY: 0 },
    { rotation: 90, flipX: false, flipY: true, expectedX: 0, expectedY: 2 },
  ])(
    'should nudge a collage crop window in screen space with rotation=$rotation flipX=$flipX flipY=$flipY',
    async ({ rotation, flipX, flipY, expectedX, expectedY }) => {
      useEditorStore.setState({
        mode: 'collage',
        selectedId: 'slot-1',
        selectedIds: ['slot-1'],
        slots: [
          {
            id: 'slot-1',
            cellIndex: 0,
            x: 0,
            y: 0,
            w: 1,
            h: 1,
            imageSrc: 'test.jpg',
            rotation,
            flipX,
            flipY,
          },
        ],
      });

      renderHook(() => useKeyboardShortcuts());
      await user.keyboard('{ArrowRight}');

      const slot = useEditorStore.getState().slots[0];
      expect(slot.dragX).toBeCloseTo(expectedX);
      expect(slot.dragY).toBeCloseTo(expectedY);
    },
  );

  it('should ignore shortcuts when typing inside inputs or contentEditable', async () => {
    const undoSpy = vi.spyOn(useEditorStore.getState(), 'undo');
    renderHook(() => useKeyboardShortcuts());

    // Create an input element
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    // Trigger Ctrl+Z while input is focused
    await user.keyboard('{Control>}z{/Control}');

    expect(undoSpy).not.toHaveBeenCalled();

    // Clean up
    document.body.removeChild(input);
    undoSpy.mockRestore();
  });

  it('should smoothly scale selected element on Alt+ArrowUp and Alt+ArrowDown', async () => {
    const updateElementSpy = vi.spyOn(useEditorStore.getState(), 'updateElement');

    useEditorStore.getState().addTextElement('Scale me');
    const element = useEditorStore.getState().elements[0];
    useEditorStore.getState().selectElement(element.id);

    renderHook(() => useKeyboardShortcuts());

    // Alt+ArrowUp -> enlarges element width & height smoothly by 1.5%
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}');
    expect(updateElementSpy).toHaveBeenCalled();
    const calledPatch = updateElementSpy.mock.calls[0][1];
    expect(calledPatch.width).toBeGreaterThan(element.width);
    expect(calledPatch.height).toBeGreaterThan(element.height);

    updateElementSpy.mockRestore();
  });
});
