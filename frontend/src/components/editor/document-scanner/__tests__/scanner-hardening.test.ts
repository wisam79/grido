import { describe, it, expect } from 'vitest';
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
} from '../core';

/**
 * اختبارات تثبيت (Hardening) لإصلاحات مراجعة الماسح الشاملة:
 * تحقق هندسي صريح، حراس الأنواع، IDs مستقرة، وصمود الدقة الكبيرة.
 */
describe('Document Scanner - Hardening', () => {
  it('computePerspectiveTransform throws on invalid or degenerate input instead of silent zeros', async () => {
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

  it('isQuad guards non-quad arrays used by overlap/NMS call sites', () => {
    expect(isQuad([])).toBe(false);
    expect(isQuad([{ x: 0, y: 0 }])).toBe(false);
    expect(
      isQuad([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ]),
    ).toBe(true);

    const bad = computeQuadOverlapStats([{ x: 0, y: 0 }], []);
    expect(bad.iou).toBe(0);
    expect(bad.maxOverlapRatio).toBe(0);
  });

  it('isIdCardAspectRatio is the single source of truth for ID proportions', () => {
    expect(isIdCardAspectRatio(1.586)).toBe(true);
    expect(isIdCardAspectRatio(1.44)).toBe(true);
    expect(isIdCardAspectRatio(1.84)).toBe(true);
    expect(isIdCardAspectRatio(1.0)).toBe(false);
    expect(isIdCardAspectRatio(1.2)).toBe(false);
    expect(isIdCardAspectRatio(2.5)).toBe(false);
  });

  it('aspect labels are unified from one helper', () => {
    expect(getAspectKindLabel('id_card')).toBe('بطاقة هوية');
    expect(getAspectKindLabel('a4_p')).toBe('ورقة A4');
    expect(getAspectKindLabel('a4_l')).toBe('ورقة A4');
    expect(getAspectKindLabel('square')).toBe('مستند مربع');
    expect(getAspectKindLabel('free')).toBe('مستند');
    expect(getAspectKindLabel(undefined)).toBe('مستند');
    expect(getDocumentAspectLabel('id_card', 2)).toBe('مستند 2 (بطاقة هوية)');
  });

  it('defaultInsetCorners returns a 5% inset quad', () => {
    const corners = defaultInsetCorners(1000, 800);
    expect(corners).toHaveLength(4);
    expect(corners[0]).toEqual({ x: 50, y: 40 });
    expect(corners[2]).toEqual({ x: 950, y: 760 });
  });

  it('newDocumentId generates unique stable ids', () => {
    const a = newDocumentId();
    const b = newDocumentId();
    expect(a).not.toBe(b);
    expect(a.startsWith('doc-')).toBe(true);
    expect(newDocumentId('card').startsWith('card-')).toBe(true);
  });

  it('applyNMS keeps 4 disjoint documents (multi-doc beyond 3)', async () => {
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

  it('15-degree rotated ID card keeps id_card aspect via rotating-calipers path', () => {
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
      expect(inferSmartDocumentAspect(quad)).toBe('id_card');
    }
  });

  it('detects a document on a large 1280x960 scene without hanging', () => {
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
describe('locateSplitSeamRatio — موضع فاصل البطاقات من التدرّج', () => {
  function magField(sw: number, sh: number, rows: Record<number, number>): Float32Array {
    const mag = new Float32Array(sw * sh);
    for (const [row, value] of Object.entries(rows)) {
      const y = Number(row);
      for (let x = 0; x < sw; x++) mag[y * sw + x] = value;
    }
    return mag;
  }

  it('finds an off-center seam instead of assuming the midpoint', () => {
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
    expect(locateSplitSeamRatio({ x: 5, y: 0 }, { x: 5, y: 99 }, mag, 10, 100, 100)).toBeNull();
  });

  it('returns null for degenerate lines, empty gradients, and band inversion', () => {
    const mag = magField(10, 100, { 40: 100 });
    // خط بطول صفر (نقطتان متطابقتان)
    expect(locateSplitSeamRatio({ x: 5, y: 50 }, { x: 5, y: 50 }, mag, 10, 100, 100)).toBeNull();
    // لا تدرّج في الصورة إطلاقاً
    expect(locateSplitSeamRatio({ x: 5, y: 0 }, { x: 5, y: 99 }, mag, 10, 100, 0)).toBeNull();
    const flat = new Float32Array(10 * 100);
    expect(locateSplitSeamRatio({ x: 5, y: 0 }, { x: 5, y: 99 }, flat, 10, 100, 100)).toBeNull();
    // نطاق مقلوب
    expect(
      locateSplitSeamRatio({ x: 5, y: 0 }, { x: 5, y: 99 }, mag, 10, 100, 100, 0.7, 0.3),
    ).toBeNull();
  });

  it('composes with splitQuadIntoIdCards so the cut follows the located seam', () => {
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

    const legacy = splitQuadIntoIdCards(quad, 'vertical');
    const tuned = splitQuadIntoIdCards(quad, 'vertical', seam!);

    // الافتراضي يقطع عند المنتصف تماماً كما قبل التحسين
    expect(legacy[0].corners[2].y).toBe(Math.round(200 * 0.49));
    // والمخصّص يتبع الفاصل المكتشف بدل المنتصف
    expect(tuned[0].corners[2].y).toBeLessThan(legacy[0].corners[2].y);
    expect(tuned[0].corners[2].y).toBeCloseTo(200 * (seam! - 0.01), 0);
    expect(tuned[1].corners[0].y).toBeCloseTo(200 * (seam! + 0.01), 0);
  });
});

/**
 * F-01 — تقاطع المضلعات الحقيقي بدل المستطيل المحيط (AABB).
 *
 * سبب وجود هذا القسم: مقياس التداخل يغذّي `applyNMS` (في المحرّكات الثلاثة)
 * وكل قرارات الدمج العصبي (تأكيد/احتواء/استرداد). تقدير المستطيل المحيط كان
 * يبالغ في التداخل عند ميل المستند، فكان قرار الإخماد يتغير بمجرد تغير الزاوية
 * (قياس مستقل: 0.417 مقابل 0.052 = 8×). الاختبارات أدناه تثبّت الحدود الثلاثة:
 * (أ) دقة التقاطع هندسياً · (ب) بقاء عتبات المحاذاة كما هي بلا تغيير ·
 * (ج) عدم إخماد مستندين مائلين متباعدين (الحالة المفروضة).
 */
describe('تقاطع المضلعات الحقيقي (F-01)', () => {
  function exactRect(x: number, y: number, w: number, h: number): Point[] {
    return [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ];
  }

  /** تدوير مضلع حول مركزه — لبناء مشاهد الميل الحقيقية */
  function rotateQuad(quad: Point[], degrees: number, cx: number, cy: number): Point[] {
    const rad = (degrees * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return quad.map((p) => {
      const dx = p.x - cx;
      const dy = p.y - cy;
      return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
    });
  }

  /**
   * تقدير المستطيل المحيط الذي كان مستعملاً سابقاً — يُحفظ في الاختبار وحده
   * كمرجع قياس: به نُظهر أن الحالات المكسورة كانت فعلاً تُخمَد قبل الإصلاح.
   */
  function legacyBboxOverlapRatio(q: Point[], other: Point[]): number {
    const bounds = (poly: Point[]) => ({
      minX: Math.min(...poly.map((p) => p.x)),
      maxX: Math.max(...poly.map((p) => p.x)),
      minY: Math.min(...poly.map((p) => p.y)),
      maxY: Math.max(...poly.map((p) => p.y)),
    });
    const a = bounds(q);
    const b = bounds(other);
    const w = Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX));
    const h = Math.max(0, Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY));
    const area = (poly: Point[]) => {
      let sum = 0;
      for (let i = 0; i < poly.length; i++) {
        const j = (i + 1) % poly.length;
        sum += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
      }
      return Math.abs(sum) / 2;
    };
    return Math.min(w * h, Math.min(area(q), area(other))) / Math.max(1, area(q));
  }

  it('يطابق الحساب الهندسي الدقيق للمستطيلات المتداخلة', () => {
    const q1 = exactRect(0, 0, 100, 100);
    const q2 = exactRect(50, 0, 100, 100);

    const stats = computeQuadOverlapStats(q1, q2);

    // تقاطع 50×100 = 5000 · اتحاد 15000 · نسبة كل مضلع 0.5
    expect(stats.overlapRatio1).toBeCloseTo(0.5, 6);
    expect(stats.overlapRatio2).toBeCloseTo(0.5, 6);
    expect(stats.iou).toBeCloseTo(1 / 3, 6);
    expect(stats.maxOverlapRatio).toBeCloseTo(0.5, 6);
  });

  it('يُميّز الاحتواء الكامل من مجاور الحدود المحيطة', () => {
    const container = exactRect(0, 0, 200, 200);
    const inside = exactRect(50, 50, 50, 50);
    const insideStats = computeQuadOverlapStats(inside, container);
    expect(insideStats.overlapRatio1).toBeCloseTo(1, 6); // الأصغر محتوى كلياً
    expect(insideStats.overlapRatio2).toBeCloseTo(2500 / 40000, 6);

    // مربع داخل الحدود المحيطة لمضلع مائل 45° لكنه **خارج** المضلع نفسه
    const diamond = [
      { x: 141, y: 0 },
      { x: 0, y: 141 },
      { x: -141, y: 0 },
      { x: 0, y: -141 },
    ];
    const nearBboxCorner = exactRect(90, 90, 80, 80);
    const bboxEstimate = legacyBboxOverlapRatio(nearBboxCorner, diamond);
    const exactStats = computeQuadOverlapStats(nearBboxCorner, diamond);

    expect(bboxEstimate).toBeGreaterThan(0.38); // كان يُخمَد بفعل تضخّم AABB
    expect(exactStats.overlapRatio1).toBe(0);
    expect(exactStats.overlapRatio2).toBe(0);
    expect(exactStats.iou).toBe(0);
  });

  it('مستندان مائلان متباعدان لا يُدمجان في NMS (الحالة المفروضة)', () => {
    // بطاقتان بمقاس ID-1 (200×126) مائلتان 25° ومركزاهما متباعدان قطرياً
    const first = rotateQuad(exactRect(100, 137, 200, 126), 25, 200, 200);
    const second = rotateQuad(exactRect(210, 247, 200, 126), 25, 310, 310);

    const stats = computeQuadOverlapStats(first, second);
    expect(stats.maxOverlapRatio).toBeLessThan(0.3);
    expect(stats.iou).toBeLessThan(0.25);

    // نفس الزوج كان يُخمَد قبل الإصلاح لأن حدودهما المحيطة تتداخل كثيراً
    expect(legacyBboxOverlapRatio(first, second)).toBeGreaterThan(0.38);

    const selected = applyNMS([
      { quad: first, score: 1.5 },
      { quad: second, score: 1.4 },
    ]);
    expect(selected).toHaveLength(2);
  });

  it('حماية عتبة 0.38 محفوظة كما كانت للمستندات المحاذية', () => {
    const reference = exactRect(0, 0, 200, 126);
    // تداخل 80px من أصل 200 ⇒ 40% من مساحة كل مستند (فوق 0.38)
    const overlapping = exactRect(120, 0, 200, 126);
    expect(computeQuadOverlapStats(overlapping, reference).overlapRatio1).toBeCloseTo(0.4, 6);
    expect(
      applyNMS([
        { quad: reference, score: 1.5 },
        { quad: overlapping, score: 1.4 },
      ]),
    ).toHaveLength(1);

    // تداخل 70px ⇒ 35% (تحت 0.38) ⇒ يُبقيان معاً
    const barely = exactRect(130, 0, 200, 126);
    expect(computeQuadOverlapStats(barely, reference).overlapRatio1).toBeCloseTo(0.35, 6);
    expect(
      applyNMS([
        { quad: reference, score: 1.5 },
        { quad: barely, score: 1.4 },
      ]),
    ).toHaveLength(2);
  });

  it('النسخ المتقاربة (زاوية 3° وإزاحة بكسلين) تُخمَد كنسخة واحدة', () => {
    const base = exactRect(0, 0, 200, 126);
    const nearDuplicate = rotateQuad(base, 3, 100, 63).map((p) => ({
      x: p.x + 2,
      y: p.y + 2,
    }));

    const stats = computeQuadOverlapStats(nearDuplicate, base);
    expect(stats.iou).toBeGreaterThan(0.85);
    expect(
      applyNMS([
        { quad: base, score: 1.5 },
        { quad: nearDuplicate, score: 1.45 },
      ]),
    ).toHaveLength(1);
  });

  it('المضلعات المشوّهة/المتقاطعة ذاتياً لا تُنتج NaN ولا قيماً سالبة', () => {
    const bowTie: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
    ];
    const stats = computeQuadOverlapStats(bowTie, exactRect(0, 0, 100, 100));

    for (const value of [
      stats.iou,
      stats.overlapRatio1,
      stats.overlapRatio2,
      stats.maxOverlapRatio,
    ]) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

/**
 * حارس انحدار: القصّ يجب ألّا يتحوّل من ناجح إلى فاشل بسبب حافة منافسة بعيدة
 * عن المنتصف. نجرّب الفاصل المكتشف، وإن رفضته بوابة القبول نرجع إلى المنتصف.
 */
describe('splitQuadIntoIdCardsWithSeam — الفاصل المكتشف مع حارس الانحدار', () => {
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

  it('uses the located seam when the acceptance gate passes', () => {
    const cards = splitQuadIntoIdCardsWithSeam(parentQuad, 'vertical', 0.52, acceptIfBothIdCards);
    // الحدّ عند 0.51 لا عند منتصف 0.49 — أي أن الفاصل المكتشف فعّال
    expect(cards[0].corners[2].y).toBe(Math.round(280 * 0.51));
  });

  it('falls back to the midpoint split when the gate rejects the located seam', () => {
    // فاصل عند 0.40 يجعل النصف العلوي بنسبة 1.92 (خارج نطاق الهوية) ⇒ مرفوض
    const cards = splitQuadIntoIdCardsWithSeam(parentQuad, 'vertical', 0.4, acceptIfBothIdCards);
    expect(cards[0].corners[2].y).toBe(Math.round(280 * 0.49));
    expect(cards[1].corners[0].y).toBe(Math.round(280 * 0.51));
  });

  it('documents that the strict dual ID gate pins the seam within ±3% of center', () => {
    // لماذا لا يُحرّك الفاصل المكتشف القصّ كثيراً مع بطاقات متساوية العرض:
    // بوابة نسبة الهوية على كل نصف لا تقبل إلا فاصلاً قريباً جداً من المنتصف.
    const accepted: number[] = [];
    for (let s = 0.4; s <= 0.6001; s += 0.01) {
      if (acceptIfBothIdCards(splitQuadIntoIdCards(parentQuad, 'vertical', s))) {
        accepted.push(Number(s.toFixed(2)));
      }
    }
    expect(accepted).toContain(0.5);
    expect(accepted[0]).toBeGreaterThanOrEqual(0.47);
    expect(accepted[accepted.length - 1]).toBeLessThanOrEqual(0.53);
  });
});

/**
 * F-01 (تكملة) — اختبار تفاضلي عشوائي حتمي لمقياس التقاطع مقابل مرجع مستقل.
 *
 * المرجع يُبنى بمنهج مختلف تماماً: نجمع رؤوس كل مضلع الواقعة داخل الآخر،
 * وتقاطعات كل زوج أضلاع (تقاطع قطعتين)، ثم نرتّب الناتج زاويّاً حول مركزه
 * ونحسب مساحته بـShoelace. هذا ليس انعكاساً لقصّ Sutherland–Hodgman بل طريق
 * ثانٍ للحقيقة، فالتطابق على مئات الحالات دليل قوي على صحة التنفيذ.
 * البذرة ثابتة (20261001) فالنمط حتمي ولا يسبب تقلّباً في CI.
 */
describe('تقاطع المضلعات — تفاضلي عشوائي حتمي (F-01)', () => {
  function signedArea(poly: Point[]): number {
    let sum = 0;
    for (let i = 0; i < poly.length; i++) {
      const j = (i + 1) % poly.length;
      sum += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
    }
    return sum / 2;
  }

  function isConvexPoly(poly: Point[]): boolean {
    let sign = 0;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const c = poly[(i + 2) % poly.length];
      const cr = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      if (Math.abs(cr) < 1e-9) return false;
      const s = cr > 0 ? 1 : -1;
      if (sign === 0) sign = s;
      else if (s !== sign) return false;
    }
    return true;
  }

  function pointInConvex(p: Point, poly: Point[]): boolean {
    const sign = signedArea(poly) >= 0 ? 1 : -1;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      if (sign * ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) < -1e-9) {
        return false;
      }
    }
    return true;
  }

  function segmentIntersection(a: Point, b: Point, c: Point, d: Point): Point | null {
    const rx = b.x - a.x;
    const ry = b.y - a.y;
    const sx = d.x - c.x;
    const sy = d.y - c.y;
    const den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-12) return null;
    const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den;
    const u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den;
    if (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9) return null;
    return { x: a.x + t * rx, y: a.y + t * ry };
  }

  /** مساحة تقاطع مضلعين محدّبين بمنهج مستقل عن Sutherland–Hodgman */
  function referenceIntersectionArea(A: Point[], B: Point[]): number {
    const pts: Point[] = [];
    for (const p of A) if (pointInConvex(p, B)) pts.push(p);
    for (const p of B) if (pointInConvex(p, A)) pts.push(p);
    for (let i = 0; i < A.length; i++) {
      for (let j = 0; j < B.length; j++) {
        const x = segmentIntersection(A[i], A[(i + 1) % A.length], B[j], B[(j + 1) % B.length]);
        if (x) pts.push(x);
      }
    }
    const unique: Point[] = [];
    for (const p of pts) {
      if (!unique.some((q) => Math.abs(q.x - p.x) < 1e-6 && Math.abs(q.y - p.y) < 1e-6)) {
        unique.push(p);
      }
    }
    if (unique.length < 3) return 0;
    const cx = unique.reduce((s, p) => s + p.x, 0) / unique.length;
    const cy = unique.reduce((s, p) => s + p.y, 0) / unique.length;
    unique.sort((p, q) => Math.atan2(p.y - cy, p.x - cx) - Math.atan2(q.y - cy, q.x - cx));
    return Math.abs(signedArea(unique));
  }

  let seed = 20261001;
  function rnd(): number {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  }

  function monotoneHull(pts: Point[]): Point[] {
    const sorted = pts.slice().sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
    const cross = (o: Point, a: Point, b: Point) =>
      (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower: Point[] = [];
    for (const p of sorted) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
        lower.pop();
      }
      lower.push(p);
    }
    const upper: Point[] = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
      const p = sorted[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
        upper.pop();
      }
      upper.push(p);
    }
    lower.pop();
    upper.pop();
    return lower.concat(upper);
  }

  function randomConvexQuad(): Point[] {
    for (let attempt = 0; attempt < 100; attempt++) {
      const cx = rnd() * 600;
      const cy = rnd() * 600;
      const raw: Point[] = [];
      for (let i = 0; i < 4; i++) {
        const ang = rnd() * Math.PI * 2;
        const r = 20 + rnd() * 120;
        raw.push({ x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) });
      }
      const hull = monotoneHull(raw);
      if (hull.length === 4 && isConvexPoly(hull)) return hull;
    }
    // احتياط حتمي: مربّع دوّار صغير (لا يُتوقّع الوصول إليه، لكن لا تعليق أبداً)
    return [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
  }

  it('يطابق المرجع المستقل على 200 رباعية محدّبة (وزن تناظري صحيح)', () => {
    for (let iter = 0; iter < 200; iter++) {
      const A = randomConvexQuad();
      const B = randomConvexQuad();
      const aA = Math.abs(signedArea(A));
      const aB = Math.abs(signedArea(B));
      const expected = Math.min(referenceIntersectionArea(A, B), Math.min(aA, aB));

      const stats = computeQuadOverlapStats(A, B);
      expect(stats.overlapRatio1 * aA).toBeCloseTo(expected, 3);
      expect(stats.overlapRatio2 * aB).toBeCloseTo(expected, 3);

      // التقاطع متماثل والاتحاد لا يتغير عند تبديل الوسطين
      const swapped = computeQuadOverlapStats(B, A);
      expect(swapped.iou).toBeCloseTo(stats.iou, 8);
    }
  });

  it('حالات حدودية صريحة: مستطيلان، احتواء، انفصال، تلامس، وانحطاط', () => {
    const rectA: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    const half: Point[] = [
      { x: 50, y: 0 },
      { x: 150, y: 0 },
      { x: 150, y: 100 },
      { x: 50, y: 100 },
    ];
    const halfStats = computeQuadOverlapStats(rectA, half);
    expect(halfStats.overlapRatio1).toBeCloseTo(0.5, 9);
    expect(halfStats.iou).toBeCloseTo(1 / 3, 9);

    // احتواء كامل: الأصغر نسبة 1، والأكبر نسبة 0.25
    const contained = computeQuadOverlapStats(
      [
        { x: 25, y: 25 },
        { x: 75, y: 25 },
        { x: 75, y: 75 },
        { x: 25, y: 75 },
      ],
      rectA,
    );
    expect(contained.overlapRatio1).toBeCloseTo(1, 9);
    expect(contained.overlapRatio2).toBeCloseTo(0.25, 9);

    // تلامس حدّي فقط (بلا مساحة مشتركة) والانفصال ⇒ صفر
    const touching = half.map((p) => ({ x: p.x + 50, y: p.y }));
    expect(computeQuadOverlapStats(rectA, touching).iou).toBe(0);
    const far = half.map((p) => ({ x: p.x + 500, y: p.y }));
    expect(computeQuadOverlapStats(rectA, far).maxOverlapRatio).toBe(0);

    // انحطاط: كل الرؤوس متطابقة ⇒ صفر بلا NaN
    const degenerate: Point[] = Array.from({ length: 4 }, () => ({ x: 7, y: 7 }));
    const degenStats = computeQuadOverlapStats(degenerate, rectA);
    for (const v of [degenStats.iou, degenStats.overlapRatio1, degenStats.overlapRatio2]) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});
