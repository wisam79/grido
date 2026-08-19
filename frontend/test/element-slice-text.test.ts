import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "../src/lib/editor-store";

describe("Element Slice Text & Typography Tests", () => {
  beforeEach(() => {
    useEditorStore.setState({
      elements: [],
      selectedId: null,
      selectedIds: [],
      canvasWidth: 1000,
      canvasHeight: 1000,
    });
  });

  it("creates luxury gold preset correctly", () => {
    useEditorStore.getState().addTextPreset("gold-luxury");
    const elements = useEditorStore.getState().elements;
    expect(elements.length).toBe(1);
    const el = elements[0];
    expect(el.type).toBe("text");
    if (el.type === "text") {
      expect(el.fillType).toBe("linear");
      expect(el.fontWeight).toBe(800);
      expect(el.shadowColor).toBeDefined();
    }
  });

  it("creates curved stamp preset correctly", () => {
    useEditorStore.getState().addTextPreset("stamp-circle");
    const elements = useEditorStore.getState().elements;
    expect(elements.length).toBe(1);
    const el = elements[0];
    if (el.type === "text") {
      expect(el.curve).toBe(60);
      expect(el.color).toBe("#dc2626");
    }
  });

  it("centers element horizontally and vertically on canvas", () => {
    useEditorStore.getState().addTextElement("Centered Text");
    const id = useEditorStore.getState().selectedId!;

    useEditorStore.getState().centerElementHorizontally(id);
    let el = useEditorStore.getState().elements.find((x) => x.id === id)!;
    expect(el.x + el.width / 2).toBeCloseTo(0.5, 2);

    useEditorStore.getState().centerElementVertically(id);
    el = useEditorStore.getState().elements.find((x) => x.id === id)!;
    expect(el.y + el.height / 2).toBeCloseTo(0.5, 2);
  });
});
