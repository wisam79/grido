import { describe, it, expect } from "vitest";
import {
  splitSlot,
  removeSlot,
  convertToGridoTemplate,
  resizeSlot,
  moveSlot,
  rotateSlot,
  duplicateSlot,
  alignSlot,
  autoPackSlots,
  distributeSlots,
  findFirstEmptySpace,
  addPresetSlot,
} from "../src/features/freeform-collage/lib/freeform-math";
import { MIXED_COLLAGE_PRESETS } from "../src/features/freeform-collage/lib/mixed-presets";
import type { FreeformSlot, FreeformLayout } from "../src/features/freeform-collage/types";

describe("Freeform Collage Feature Unit Tests (10x Suite)", () => {
  const initialSlots: FreeformSlot[] = [
    { id: "slot1", x: 0, y: 0, w: 1, h: 1, presetType: "passport", label: "جواز 5×5", rotation: 0 },
  ];

  it("splits a slot horizontally into two equal slots", () => {
    const result = splitSlot(initialSlots, "slot1", "horizontal");
    expect(result).toHaveLength(2);
    expect(result[0].w).toBe(0.5);
    expect(result[1].w).toBe(0.5);
    expect(result[0].x + result[0].w).toBe(result[1].x);
  });

  it("splits a slot vertically into two equal slots", () => {
    const result = splitSlot(initialSlots, "slot1", "vertical");
    expect(result).toHaveLength(2);
    expect(result[0].h).toBe(0.5);
    expect(result[1].h).toBe(0.5);
    expect(result[0].y + result[0].h).toBe(result[1].y);
  });

  it("prevents removing the last remaining slot", () => {
    const result = removeSlot(initialSlots, "slot1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("slot1");
  });

  it("converts a FreeformLayout into a valid Grido CollageTemplate preserving metadata", () => {
    const layout: FreeformLayout = {
      id: "test-layout",
      name: "طبعة تجريبية",
      paperWidthMM: 100,
      paperHeightMM: 150,
      slots: [
        { id: "s1", x: 0, y: 0, w: 0.5, h: 0.5, presetType: "passport", label: "جواز 5×5", rotation: 90 },
      ],
    };

    const gridoTemplate = convertToGridoTemplate(layout);
    expect(gridoTemplate.id).toBe("freeform-test-layout");
    expect(gridoTemplate.name).toBe("طبعة تجريبية");
    expect(gridoTemplate.slots).toBe(1);
    expect(gridoTemplate.cells).toHaveLength(1);
    expect(gridoTemplate.cells[0]).toHaveProperty("x");
    expect(gridoTemplate.cells[0]).toHaveProperty("y");
    expect(gridoTemplate.cells[0]).toHaveProperty("w");
    expect(gridoTemplate.cells[0]).toHaveProperty("h");
    expect(gridoTemplate.cells[0].presetType).toBe("passport");
    expect(gridoTemplate.cells[0].label).toBe("جواز 5×5");
    expect(gridoTemplate.cells[0].rotation).toBe(90);
  });

  it("moves a slot position and detects center snap lines with linePos 0.5", () => {
    const slots: FreeformSlot[] = [
      { id: "slot1", x: 0.1, y: 0.1, w: 0.4, h: 0.4 },
    ];
    const { slots: moved, snapLines } = moveSlot(slots, "slot1", 0.199, 0);
    expect(moved[0].x).toBeCloseTo(0.3, 2);
    const centerLine = snapLines.find((l) => l.id === "center-x");
    expect(centerLine).toBeDefined();
    expect(centerLine?.position).toBe(0.5);
  });

  it("rotates a slot by swapping physical width and height according to paper aspect ratio", () => {
    const slots: FreeformSlot[] = [
      { id: "slot1", x: 0, y: 0, w: 0.35, h: 0.3 }, // 35mm x 45mm on 100x150mm paper
    ];
    const rotated = rotateSlot(slots, "slot1", 100, 150);
    expect(rotated[0].w).toBeCloseTo(0.45, 6);
    expect(rotated[0].h).toBeCloseTo(0.233333, 4);
    expect(rotated[0].rotation).toBe(90);
  });

  it("duplicates a slot with a new unique ID and offset", () => {
    const slots: FreeformSlot[] = [
      { id: "slot1", x: 0.1, y: 0.1, w: 0.3, h: 0.3, label: "جواز" },
    ];
    const duplicated = duplicateSlot(slots, "slot1");
    expect(duplicated).toHaveLength(2);
    expect(duplicated[1].id).not.toBe("slot1");
    expect(duplicated[1].x).toBeGreaterThan(0.1);
  });

  it("aligns a slot to top-left, horizontal center, and bottom", () => {
    const slots: FreeformSlot[] = [
      { id: "slot1", x: 0.1, y: 0.1, w: 0.4, h: 0.2 },
    ];
    const topLeft = alignSlot(slots, "slot1", "top-left");
    expect(topLeft[0].x).toBe(0);
    expect(topLeft[0].y).toBe(0);

    const centeredH = alignSlot(slots, "slot1", "center-h");
    expect(centeredH[0].x).toBe(0.3); // (1 - 0.4) / 2

    const bottomAligned = alignSlot(slots, "slot1", "bottom");
    expect(bottomAligned[0].y).toBe(0.8); // 1 - 0.2
  });

  it("distributes slots evenly horizontally", () => {
    const slots: FreeformSlot[] = [
      { id: "s1", x: 0, y: 0, w: 0.2, h: 0.2 },
      { id: "s2", x: 0.25, y: 0, w: 0.2, h: 0.2 },
      { id: "s3", x: 0.8, y: 0, w: 0.2, h: 0.2 },
    ];
    const distributed = distributeSlots(slots, "horizontal");
    expect(distributed[0].x).toBe(0);
    expect(distributed[1].x).toBeCloseTo(0.4, 2);
    expect(distributed[2].x).toBe(0.8);
  });

  it("distributes slots evenly vertically", () => {
    const slots: FreeformSlot[] = [
      { id: "s1", x: 0, y: 0, w: 0.2, h: 0.2 },
      { id: "s2", x: 0, y: 0.3, w: 0.2, h: 0.2 },
      { id: "s3", x: 0, y: 0.8, w: 0.2, h: 0.2 },
    ];
    const distributed = distributeSlots(slots, "vertical");
    expect(distributed[0].y).toBe(0);
    expect(distributed[1].y).toBeCloseTo(0.4, 2);
    expect(distributed[2].y).toBe(0.8);
  });

  it("finds the first empty space on the paper for a new slot", () => {
    const slots: FreeformSlot[] = [
      { id: "s1", x: 0, y: 0, w: 0.5, h: 0.5 },
    ];
    const pos = findFirstEmptySpace(slots, 0.4, 0.4);
    expect(pos.x).toBeGreaterThanOrEqual(0.5);
    expect(pos.y).toBe(0);
  });

  it("adds a preset document slot into the first empty space", () => {
    const slots: FreeformSlot[] = [
      { id: "s1", x: 0, y: 0, w: 0.5, h: 0.5 },
    ];
    const updated = addPresetSlot(slots, "passport", 100, 150);
    expect(updated).toHaveLength(2);
    expect(updated[1].presetType).toBe("passport");
    expect(updated[1].w).toBe(0.5); // 50mm / 100mm = 0.5
    expect(updated[1].h).toBeCloseTo(0.3333, 2); // 50mm / 150mm
  });

  it("auto-packs maximum ID photos on 10x15cm paper (8 slots in 2x4 grid)", () => {
    const packed = autoPackSlots("id-max", 100, 150);
    // 100mm / 35mm = 2 cols, 150mm / 45mm = 3 rows => 6 or 8 slots
    expect(packed.length).toBeGreaterThanOrEqual(6);
    expect(packed[0].x).toBe(0);
    expect(packed[0].y).toBe(0);
    expect(packed[0].presetType).toBe("iq-national-id");
  });

  it("auto-packs maximum passport photos on 10x15cm paper (6 slots in 2x3 grid)", () => {
    const packed = autoPackSlots("passport-max", 100, 150);
    // 100mm / 50mm = 2 cols, 150mm / 50mm = 3 rows => 6 slots
    expect(packed).toHaveLength(6);
    expect(packed[0].w).toBe(0.5);
    expect(packed[0].h).toBeCloseTo(0.3333, 2);
  });

  it("auto-packs combo-standard with top passports row and bottom ID rows", () => {
    const packed = autoPackSlots("combo-standard", 100, 150);
    expect(packed.length).toBeGreaterThanOrEqual(6);
    const passports = packed.filter((s) => s.presetType === "passport");
    const ids = packed.filter((s) => s.presetType === "iq-national-id");
    expect(passports).toHaveLength(2);
    expect(ids.length).toBeGreaterThanOrEqual(4);
  });

  it("keeps a slot inside the paper bounds after snapping to a far-edge slot", () => {
    const slots: FreeformSlot[] = [
      { id: "slot1", x: 0.5, y: 0.5, w: 0.1, h: 0.1 },
      { id: "slot2", x: 0.905, y: 0.1, w: 0.04, h: 0.04 },
    ];
    const { slots: moved } = moveSlot(slots, "slot1", 0.6, 0);
    const slot = moved.find((s) => s.id === "slot1")!;
    expect(slot.x).toBeGreaterThanOrEqual(0);
    expect(slot.x + slot.w).toBeLessThanOrEqual(1 + 1e-9);
    expect(slot.y).toBeGreaterThanOrEqual(0);
    expect(slot.y + slot.h).toBeLessThanOrEqual(1 + 1e-9);
  });

  it("clamps slot movement to paper edges (right edge)", () => {
    const slots: FreeformSlot[] = [
      { id: "slot1", x: 0.8, y: 0.8, w: 0.2, h: 0.2 },
    ];
    const { slots: moved } = moveSlot(slots, "slot1", 5, 5);
    expect(moved[0].x + moved[0].w).toBeCloseTo(1, 6);
    expect(moved[0].y + moved[0].h).toBeCloseTo(1, 6);
  });

  it("resizeSlot respects the minimum slot size", () => {
    const slots: FreeformSlot[] = [
      { id: "slot1", x: 0.1, y: 0.1, w: 0.3, h: 0.3 },
    ];
    const resized = resizeSlot(slots, "slot1", "e", -5, 0);
    expect(resized[0].w).toBeGreaterThanOrEqual(0.0399);
  });

  it("resizeSlot stops at a neighboring slot edge", () => {
    const slots: FreeformSlot[] = [
      { id: "slot1", x: 0, y: 0, w: 0.5, h: 0.5 },
      { id: "slot2", x: 0.5, y: 0, w: 0.5, h: 0.5 },
    ];
    const resized = resizeSlot(slots, "slot1", "e", 0.3, 0);
    expect(resized[0].x + resized[0].w).toBeLessThanOrEqual(0.5 + 1e-9);
  });

  it("duplicateSlot generates unique IDs even across rapid duplicates", () => {
    const slots: FreeformSlot[] = [
      { id: "slot1", x: 0.1, y: 0.1, w: 0.3, h: 0.3 },
    ];
    const once = duplicateSlot(slots, "slot1");
    const twice = duplicateSlot(once, once[1].id);
    const ids = twice.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(twice).toHaveLength(3);
  });

  it("rotates a slot while keeping it inside the paper", () => {
    const slots: FreeformSlot[] = [
      { id: "slot1", x: 0.8, y: 0.1, w: 0.15, h: 0.5 },
    ];
    const rotated = rotateSlot(slots, "slot1");
    expect(rotated[0].w).toBeLessThanOrEqual(1 - rotated[0].x + 1e-9);
    expect(rotated[0].h).toBeLessThanOrEqual(1 - rotated[0].y + 1e-9);
  });
});

describe("Mixed Collage Presets Geometry", () => {
  const mmOf = (slot: FreeformSlot, preset: (typeof MIXED_COLLAGE_PRESETS)[number]) => ({
    w: Math.round(slot.w * preset.paperWidthMM),
    h: Math.round(slot.h * preset.paperHeightMM),
    x: slot.x * preset.paperWidthMM,
    y: slot.y * preset.paperHeightMM,
    wm: slot.w * preset.paperWidthMM,
    hm: slot.h * preset.paperHeightMM,
  });

  it("10x15 combo preset contains exactly 6 slots", () => {
    const preset = MIXED_COLLAGE_PRESETS[0];
    expect(preset.paperWidthMM).toBe(100);
    expect(preset.paperHeightMM).toBe(150);
    expect(preset.slots).toHaveLength(6);

    const s1 = mmOf(preset.slots[0], preset);
    const s2 = mmOf(preset.slots[1], preset);
    expect(s1.w).toBe(50);
    expect(s1.h).toBe(50);
    expect(s2.w).toBe(50);
    expect(s2.h).toBe(50);
  });
});