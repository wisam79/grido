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

  it("creates studio date preset with current date string and badge background", () => {
    useEditorStore.getState().addTextPreset("studio-date");
    const elements = useEditorStore.getState().elements;
    expect(elements.length).toBe(1);
    const el = elements[0];
    if (el.type === "text") {
      expect(el.text).toBeDefined();
      expect(el.textBgColor).toBe("rgba(241, 245, 249, 0.95)");
      expect(el.fontSize).toBe(16);
    }
  });

  it("creates photographer tag with appropriate opacity and styling", () => {
    useEditorStore.getState().addTextPreset("photographer-tag");
    const elements = useEditorStore.getState().elements;
    expect(elements.length).toBe(1);
    const el = elements[0];
    if (el.type === "text") {
      expect(el.text).toContain("تصوير");
      expect(el.opacity).toBe(0.9);
      expect(el.fontSize).toBe(22);
    }
  });

  it("creates badge preset with rounded background pill", () => {
    useEditorStore.getState().addTextPreset("badge");
    const elements = useEditorStore.getState().elements;
    expect(elements.length).toBe(1);
    const el = elements[0];
    if (el.type === "text") {
      expect(el.textBgColor).toBe("#2563eb");
      expect(el.textBgRadius).toBe(999);
      expect(el.color).toBe("#ffffff");
    }
  });

  it("creates watermark preset with rotation and semi-transparency", () => {
    useEditorStore.getState().addTextPreset("watermark");
    const elements = useEditorStore.getState().elements;
    expect(elements.length).toBe(1);
    const el = elements[0];
    if (el.type === "text") {
      expect(el.rotation).toBe(-35);
      expect(el.opacity).toBe(0.25);
      expect(el.text).toContain("GRIDO STUDIO");
    }
  });

  it("creates neon glow preset with glow shadow and stroke", () => {
    useEditorStore.getState().addTextPreset("neon-glow");
    const elements = useEditorStore.getState().elements;
    expect(elements.length).toBe(1);
    const el = elements[0];
    if (el.type === "text") {
      expect(el.shadowGlow).toBe(true);
      expect(el.shadowBlur).toBe(20);
      expect(el.stroke).toBe("#0284c7");
    }
  });

  it("creates 3D title preset with strong offset shadow", () => {
    useEditorStore.getState().addTextPreset("3d-title");
    const elements = useEditorStore.getState().elements;
    expect(elements.length).toBe(1);
    const el = elements[0];
    if (el.type === "text") {
      expect(el.shadowOffsetX).toBe(4);
      expect(el.shadowOffsetY).toBe(4);
      expect(el.fontWeight).toBe(900);
    }
  });

  it("creates modern outline preset with transparent fill and stroke", () => {
    useEditorStore.getState().addTextPreset("outline-modern");
    const elements = useEditorStore.getState().elements;
    expect(elements.length).toBe(1);
    const el = elements[0];
    if (el.type === "text") {
      expect(el.color).toBe("transparent");
      expect(el.stroke).toBe("#0f172a");
      expect(el.strokeWidth).toBe(2.5);
    }
  });

  it("creates caption card preset with framed background", () => {
    useEditorStore.getState().addTextPreset("caption-card");
    const elements = useEditorStore.getState().elements;
    expect(elements.length).toBe(1);
    const el = elements[0];
    if (el.type === "text") {
      expect(el.textBgColor).toBe("#f8fafc");
      expect(el.textBgBorderColor).toBe("#cbd5e1");
      expect(el.textBgBorderWidth).toBe(1.5);
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
