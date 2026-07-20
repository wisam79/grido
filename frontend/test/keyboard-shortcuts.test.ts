import { describe, it, expect, vi, beforeEach } from "vitest";
import { useKeyboardShortcuts } from "../src/hooks/use-keyboard-shortcuts";
import { useEditorStore } from "../src/lib/editor-store";
import { saveProjectAsJSON } from "../src/components/editor/export-utils";
import { renderHook } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock saveProjectAsJSON
vi.mock("../src/components/editor/export-utils", () => ({
  saveProjectAsJSON: vi.fn(),
}));

describe("useKeyboardShortcuts - Keyboard Shortcuts Hook Tests", () => {
  let user: ReturnType<typeof userEvent.setup>;
  
  beforeEach(() => {
    useEditorStore.getState().reset();
    vi.clearAllMocks();
    user = userEvent.setup();
  });

  it("should trigger undo on Ctrl+Z and redo on Ctrl+Shift+Z / Ctrl+Y", async () => {
    const undoSpy = vi.spyOn(useEditorStore.getState(), "undo");
    const redoSpy = vi.spyOn(useEditorStore.getState(), "redo");

    renderHook(() => useKeyboardShortcuts());

    // 1. Ctrl+Z
    await user.keyboard("{Control>}z{/Control}");
    expect(undoSpy).toHaveBeenCalled();

    // 2. Ctrl+Shift+Z
    await user.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");
    expect(redoSpy).toHaveBeenCalled();

    // 3. Ctrl+Y
    await user.keyboard("{Control>}y{/Control}");
    expect(redoSpy).toHaveBeenCalledTimes(2);

    undoSpy.mockRestore();
    redoSpy.mockRestore();
  });

  it("should delete selected element on Delete/Backspace key", async () => {
    const removeElementSpy = vi.spyOn(useEditorStore.getState(), "removeElement");
    
    // Add text element first
    useEditorStore.getState().addTextElement("Test to delete");
    const elementId = useEditorStore.getState().elements[0].id;
    useEditorStore.getState().selectElement(elementId);

    renderHook(() => useKeyboardShortcuts());

    // Backspace
    await user.keyboard("{Backspace}");
    expect(removeElementSpy).toHaveBeenCalledWith(elementId);

    removeElementSpy.mockRestore();
  });

  it("should duplicate selected element on Ctrl+D", async () => {
    const duplicateElementSpy = vi.spyOn(useEditorStore.getState(), "duplicateElement");
    
    useEditorStore.getState().addTextElement("Duplicate me");
    const elementId = useEditorStore.getState().elements[0].id;
    useEditorStore.getState().selectElement(elementId);

    renderHook(() => useKeyboardShortcuts());

    await user.keyboard("{Control>}d{/Control}");
    expect(duplicateElementSpy).toHaveBeenCalledWith(elementId);

    duplicateElementSpy.mockRestore();
  });

  it("should save project as JSON on Ctrl+S", async () => {
    renderHook(() => useKeyboardShortcuts());

    await user.keyboard("{Control>}s{/Control}");
    expect(saveProjectAsJSON).toHaveBeenCalled();
  });

  it("should nudge selected element on Arrow Keys", async () => {
    const updateElementSpy = vi.spyOn(useEditorStore.getState(), "updateElement");

    useEditorStore.getState().addTextElement("Nudge me");
    const element = useEditorStore.getState().elements[0];
    useEditorStore.getState().selectElement(element.id);

    renderHook(() => useKeyboardShortcuts());

    // ArrowRight -> increments x
    await user.keyboard("{ArrowRight}");
    expect(updateElementSpy).toHaveBeenCalledWith(element.id, {
      x: element.x + 0.002,
      y: element.y,
    });

    // ArrowRight with Shift -> larger increments
    await user.keyboard("{Shift>}{ArrowRight}{/Shift}");
    expect(updateElementSpy).toHaveBeenLastCalledWith(element.id, {
      x: element.x + 0.002 + 0.015,
      y: element.y,
    });

    updateElementSpy.mockRestore();
  });

  it("should ignore shortcuts when typing inside inputs or contentEditable", async () => {
    const undoSpy = vi.spyOn(useEditorStore.getState(), "undo");
    renderHook(() => useKeyboardShortcuts());

    // Create an input element
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    // Trigger Ctrl+Z while input is focused
    await user.keyboard("{Control>}z{/Control}");

    expect(undoSpy).not.toHaveBeenCalled();

    // Clean up
    document.body.removeChild(input);
    undoSpy.mockRestore();
  });
});
