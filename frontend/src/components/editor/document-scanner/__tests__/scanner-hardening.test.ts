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
  locateSplitSeamRatio,
  splitQuadIntoIdCards,
  splitQuadIntoIdCardsWithSeam,
  sortCornerPoints,
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

/**
 * موضع الفاصل الحقيقي بين بطاقتين — كان القص ثابتاً عند 0.5 فيقطع
 * البطاقات غير المتساوية الارتفاع في المكان الخطأ.
 */
describe("locateSplitSeamRatio — موضع فاصل البطاقات من التدرّج", () => {
  function magField(sw: number, sh: number, rows: Record<number, number>): Float32Array {
    const mag = new Float32Array(sw * sh);
    for (const [row, value] of Object.entries(rows)) {
      const y = Number(row);
      for (let x = 0; x < sw; x++) mag[y * sw + x] = value;
    }
    return mag;
  }

  it("finds an off-center seam instead of assuming the midpoint", () => {
    // حافة قوية عند الصف ~40 من خط طوله 100 (≈40%) — وليست عند المنتصف
    const mag = magField(10, 100, { 39: 100, 40: 100, 41: 100 });
    const ratio = locateSplitSeamRatio({ x: 5, y: 0 }, { x: 5, y: 99 }, mag, 10, 100, 100);
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeGreaterThan(0.36);
    expect(ratio!).toBeLessThan(0.44);
  });

  it("returns null when the only strong edge is the quad's own outer border", () => {
    // حافة قوية عند الصف 5 (خارج نطاق البحث) وأخرى واهنة داخل النطاق
    const mag = magField(10, 100, { 5: 100, 50: 5 });
    expect(
      locateSplitSeamRatio({ x: 5, y: 0 }, { x: 5, y: 99 }, mag, 10, 100, 100)
    ).toBeNull();
  });

  it("returns null for degenerate lines, empty gradients, and band inversion", () => {
    const mag = magField(10, 100, { 40: 100 });
    // خط بطول صفر (نقطتان متطابقتان)
    expect(locateSplitSeamRatio({ x: 5, y: 50 }, { x: 5, y: 50 }, mag, 10, 100, 100)).toBeNull();
    // لا تدرّج في الصورة إطلاقاً
    expect(locateSplitSeamRatio({ x: 5, y: 0 }, { x: 5, y: 99 }, mag, 10, 100, 0)).toBeNull();
    const flat = new Float32Array(10 * 100);
    expect(locateSplitSeamRatio({ x: 5, y: 0 }, { x: 5, y: 99 }, flat, 10, 100, 100)).toBeNull();
    // نطاق مقلوب
    expect(locateSplitSeamRatio({ x: 5, y: 0 }, { x: 5, y: 99 }, mag, 10, 100, 100, 0.7, 0.3)).toBeNull();
  });

  it("composes with splitQuadIntoIdCards so the cut follows the located seam", () => {
    const quad: Point[] = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 200 },
      { x: 0, y: 200 },
    ];
    // فاصل حقيقي عند ≈40% من ارتفاع المضلع
    const mag = magField(20, 200, { 79: 100, 80: 100, 81: 100 });
    const seam = locateSplitSeamRatio({ x: 100, y: 0 }, { x: 100, y: 199 }, mag, 20, 200, 100);
    expect(seam).not.toBeNull();

    const legacy = splitQuadIntoIdCards(quad, "vertical");
    const tuned = splitQuadIntoIdCards(quad, "vertical", seam!);

    // الافتراضي يقطع عند المنتصف تماماً كما قبل التحسين
    expect(legacy[0].corners[2].y).toBe(Math.round(200 * 0.49));
    // والمخصّص يتبع الفاصل المكتشف بدل المنتصف
    expect(tuned[0].corners[2].y).toBeLessThan(legacy[0].corners[2].y);
    expect(tuned[0].corners[2].y).toBeCloseTo(200 * (seam! - 0.01), 0);
    expect(tuned[1].corners[0].y).toBeCloseTo(200 * (seam! + 0.01), 0);
  });
});

/**
 * حارس انحدار: القصّ يجب ألّا يتحوّل من ناجح إلى فاشل بسبب حافة منافسة بعيدة
 * عن المنتصف. نجرّب الفاصل المكتشف، وإن رفضته بوابة القبول نرجع إلى المنتصف.
 */
describe("splitQuadIntoIdCardsWithSeam — الفاصل المكتشف مع حارس الانحدار", () => {
  const parentQuad: Point[] = [
    { x: 0, y: 0 },
    { x: 210, y: 0 },
    { x: 210, y: 280 },
    { x: 0, y: 280 },
  ];

  function aspectOf(corners: Point[]): number {
    const s = sortCornerPoints(corners);
    const w = Math.hypot(s[1].x - s[0].x, s[1].y - s[0].y);
    const h = Math.hypot(s[3].x - s[0].x, s[3].y - s[0].y);
    return Math.max(w / Math.max(1, h), h / Math.max(1, w));
  }

  /** نفس بوابة المحرّك: كلتا البطاقتين بنسبة هوية قياسية */
  const acceptIfBothIdCards = (cards: { corners: Point[] }[]) =>
    cards.length === 2 && cards.every((c) => isIdCardAspectRatio(aspectOf(c.corners)));

  it("uses the located seam when the acceptance gate passes", () => {
    const cards = splitQuadIntoIdCardsWithSeam(parentQuad, "vertical", 0.52, acceptIfBothIdCards);
    // الحدّ عند 0.51 لا عند منتصف 0.49 — أي أن الفاصل المكتشف فعّال
    expect(cards[0].corners[2].y).toBe(Math.round(280 * 0.51));
  });

  it("falls back to the midpoint split when the gate rejects the located seam", () => {
    // فاصل عند 0.40 يجعل النصف العلوي بنسبة 1.92 (خارج نطاق الهوية) ⇒ مرفوض
    const cards = splitQuadIntoIdCardsWithSeam(parentQuad, "vertical", 0.40, acceptIfBothIdCards);
    expect(cards[0].corners[2].y).toBe(Math.round(280 * 0.49));
    expect(cards[1].corners[0].y).toBe(Math.round(280 * 0.51));
  });

  it("documents that the strict dual ID gate pins the seam within ±3% of center", () => {
    // لماذا لا يُحرّك الفاصل المكتشف القصّ كثيراً مع بطاقات متساوية العرض:
    // بوابة نسبة الهوية على كل نصف لا تقبل إلا فاصلاً قريباً جداً من المنتصف.
    const accepted: number[] = [];
    for (let s = 0.4; s <= 0.6001; s += 0.01) {
      if (acceptIfBothIdCards(splitQuadIntoIdCards(parentQuad, "vertical", s))) {
        accepted.push(Number(s.toFixed(2)));
      }
    }
    expect(accepted).toContain(0.5);
    expect(accepted[0]).toBeGreaterThanOrEqual(0.47);
    expect(accepted[accepted.length - 1]).toBeLessThanOrEqual(0.53);
  });
});
