import { describe, it, expect } from "vitest";
import {
  Point,
  isQuad,
  autoDetectAllDocumentCorners,
  defaultInsetCorners,
  computePerspectiveTransform,
  isIdCardAspectRatio,
  getAspectKindLabel,
  getDocumentAspectLabel,
  inferSmartDocumentAspect,
  findRotatedQuadCorners,
  convexHull,
  computeQuadOverlapStats,
  applyNMS,
  newDocumentId,
} from "../core";

/**
 * اختبارات تثبيت (Hardening) لإصلاحات مراجعة الماسح الشاملة:
 * تحقق هندسي صريح، حراس الأنواع، IDs مستقرة، وصمود الدقة الكبيرة.
 */
describe("Document Scanner - Hardening", () => {
  it("computePerspectiveTransform throws on invalid or degenerate input instead of silent zeros", async () => {
    const ok: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    expect(() => computePerspectiveTransform(ok, ok)).not.toThrow();

    const short: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    expect(() => computePerspectiveTransform(short, ok)).toThrow();
    expect(() => computePerspectiveTransform(ok, short)).toThrow();

    // نقاط مستقلة على خط واحد (مفردة) — كانت تُنتج أصفاراً صامتة = صورة سوداء
    const collinear: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 20 },
      { x: 30, y: 30 },
    ];
    expect(() => computePerspectiveTransform(collinear, ok)).toThrow();
  });

  it("isQuad guards non-quad arrays used by overlap/NMS call sites", () => {
    expect(isQuad([])).toBe(false);
    expect(isQuad([{ x: 0, y: 0 }])).toBe(false);
    expect(
      isQuad([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ])
    ).toBe(true);

    const bad = computeQuadOverlapStats([{ x: 0, y: 0 }], []);
    expect(bad.iou).toBe(0);
    expect(bad.maxOverlapRatio).toBe(0);
  });

  it("isIdCardAspectRatio is the single source of truth for ID proportions", () => {
    expect(isIdCardAspectRatio(1.586)).toBe(true);
    expect(isIdCardAspectRatio(1.44)).toBe(true);
    expect(isIdCardAspectRatio(1.84)).toBe(true);
    expect(isIdCardAspectRatio(1.0)).toBe(false);
    expect(isIdCardAspectRatio(1.2)).toBe(false);
    expect(isIdCardAspectRatio(2.5)).toBe(false);
  });

  it("aspect labels are unified from one helper", () => {
    expect(getAspectKindLabel("id_card")).toBe("بطاقة هوية");
    expect(getAspectKindLabel("a4_p")).toBe("ورقة A4");
    expect(getAspectKindLabel("a4_l")).toBe("ورقة A4");
    expect(getAspectKindLabel("square")).toBe("مستند مربع");
    expect(getAspectKindLabel("free")).toBe("مستند");
    expect(getAspectKindLabel(undefined)).toBe("مستند");
    expect(getDocumentAspectLabel("id_card", 2)).toBe("مستند 2 (بطاقة هوية)");
  });

  it("defaultInsetCorners returns a 5% inset quad", () => {
    const corners = defaultInsetCorners(1000, 800);
    expect(corners).toHaveLength(4);
    expect(corners[0]).toEqual({ x: 50, y: 40 });
    expect(corners[2]).toEqual({ x: 950, y: 760 });
  });

  it("newDocumentId generates unique stable ids", () => {
    const a = newDocumentId();
    const b = newDocumentId();
    expect(a).not.toBe(b);
    expect(a.startsWith("doc-")).toBe(true);
    expect(newDocumentId("card").startsWith("card-")).toBe(true);
  });

  it("applyNMS keeps 4 disjoint documents (multi-doc beyond 3)", async () => {
    const quads: Point[][] = [
      [
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 40, y: 60 },
        { x: 0, y: 60 },
      ],
      [
        { x: 60, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 60 },
        { x: 60, y: 60 },
      ],
      [
        { x: 0, y: 80 },
        { x: 40, y: 80 },
        { x: 40, y: 140 },
        { x: 0, y: 140 },
      ],
      [
        { x: 60, y: 80 },
        { x: 100, y: 80 },
        { x: 100, y: 140 },
        { x: 60, y: 140 },
      ],
    ];
    const selected = applyNMS(quads.map((quad, i) => ({ quad, score: 0.9 - i * 0.05 })));
    expect(selected).toHaveLength(4);
  });

  it("15-degree rotated ID card keeps id_card aspect via rotating-calipers path", () => {
    // بطاقة 158×100 مائلة 15° حول مركزها
    const angle = (15 * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const cx = 200;
    const cy = 150;
    const hw = 79;
    const hh = 50;
    const base = [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh },
    ];
    const rotated = base.map((p) => ({
      x: cx + p.x * cos - p.y * sin,
      y: cy + p.x * sin + p.y * cos,
    }));
    // عينة نقاط على المحيط ثم hull ثم أصغر مستطيل دوار
    const ring: Point[] = [];
    for (let i = 0; i < 4; i++) {
      const p1 = rotated[i];
      const p2 = rotated[(i + 1) % 4];
      for (let s = 0; s <= 20; s++) {
        const t = s / 20;
        ring.push({ x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t });
      }
    }
    const hull = convexHull(ring);
    const quad = findRotatedQuadCorners(hull);
    expect(quad).not.toBeNull();
    if (quad) {
      expect(inferSmartDocumentAspect(quad)).toBe("id_card");
    }
  });

  it("detects a document on a large 1280x960 scene without hanging", () => {
    const w = 1280;
    const h = 960;
    const data = new Uint8ClampedArray(w * h * 4);
    // خلفية داكنة
    for (let i = 0; i < w * h; i++) {
      data[i * 4] = 30;
      data[i * 4 + 1] = 30;
      data[i * 4 + 2] = 30;
      data[i * 4 + 3] = 255;
    }
    // ورقة بيضاء 840×600 في المنتصف
    for (let y = 180; y < 780; y++) {
      for (let x = 220; x < 1060; x++) {
        const idx = (y * w + x) * 4;
        data[idx] = 245;
        data[idx + 1] = 245;
        data[idx + 2] = 245;
        data[idx + 3] = 255;
      }
    }
    const imgData = { data, width: w, height: h } as unknown as ImageData;
    const docs = autoDetectAllDocumentCorners(imgData, w, h, w, h);
    expect(docs.length).toBeGreaterThanOrEqual(1);
    expect(docs[0].corners).toHaveLength(4);
    for (const p of docs[0].corners) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(w);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(h);
    }
  });
});
