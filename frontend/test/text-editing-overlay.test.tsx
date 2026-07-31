import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { TextEditingOverlay } from "../src/components/editor/canvas/text-editing-overlay";
import { TextElement } from "../src/lib/store/types";

const textElement: TextElement = {
  id: "text-1",
  type: "text",
  x: 0.1,
  y: 0.2,
  width: 0.3,
  height: 0.1,
  rotation: 0,
  opacity: 1,
  zIndex: 1,
  text: "Hello",
  fontSize: 20,
  fontFamily: "Arial",
  fontWeight: 400,
  color: "#000000",
  textAlign: "center",
  lineHeight: 1.2,
};

const baseProps = {
  printMode: false,
  editingTextId: "text-1",
  elements: [textElement],
  displayW: 1000,
  displayH: 1000,
  canvasWidth: 1000,
  canvasHeight: 1000,
};

describe("TextEditingOverlay Component Tests", () => {
  it("renders a textarea pre-filled with the element text", () => {
    render(
      <TextEditingOverlay
        {...baseProps}
        updateElement={vi.fn()}
        pushHistory={vi.fn()}
        setEditingTextId={vi.fn()}
      />
    );

    expect(screen.getByRole("textbox")).toHaveValue("Hello");
  });

  it.each(["Enter", "Escape"])("commits typed text and exits on %s", (key) => {
    const updateElement = vi.fn();
    const pushHistory = vi.fn();
    const setEditingTextId = vi.fn();

    render(
      <TextEditingOverlay
        {...baseProps}
        updateElement={updateElement}
        pushHistory={pushHistory}
        setEditingTextId={setEditingTextId}
      />
    );

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Edited text" } });
    fireEvent.keyDown(textarea, { key });

    expect(updateElement).toHaveBeenCalledWith("text-1", { text: "Edited text" });
    expect(pushHistory).toHaveBeenCalled();
    expect(setEditingTextId).toHaveBeenCalledWith(null);
  });

  it("renders nothing in print mode", () => {
    const { container } = render(
      <TextEditingOverlay
        {...baseProps}
        printMode={true}
        updateElement={vi.fn()}
        pushHistory={vi.fn()}
        setEditingTextId={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
