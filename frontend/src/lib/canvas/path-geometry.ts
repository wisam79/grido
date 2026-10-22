/**
 * هندسة المسارات المتجهة — تمثيل موحّد بقِطَع مطلقة (خط أو Bézier مكعّبي)
 * تعمل في فضاء بكسلات الورقة.
 *
 * كل أشكال المحرر تُحوَّل إلى هذا التمثيل قبل إجراء العمليات المنطقية في
 * path-boolean.ts، فتُدمج عدة طبقات في مسار واحد يُخزَّن كعنصر shape='path'
 * ويرسمه محرّك الرسم والتصدير القائم بلا أي تعديل عليهما.
 *
 * الأقواس (A) والتربيعيات (Q) تُحوَّل إلى مكعّبات هنا لأن المكعّبات هي النوع
 * الوحيد الثابت تحت أي تحويل affine — وهو ما نحتاجه لتطبيق الدوران والقلب
 * المخزَّنين على العنصر دون فقدان الدقة.
 */
import { arcSegmentToCubics, pathSegmentBoundingBox } from 'path-bool';

import type { Path } from 'path-bool';

export type Vec = [number, number];

/** قِطعة مسار مطلقة — التمثيل الوحيد الذي ننتجه ونستهلكه */
export type CubicSeg = ['L', Vec, Vec] | ['C', Vec, Vec, Vec, Vec];

type AnySegment = Path[number];

/** مصفوفة تحويل affine 2×3 بالصيغة [a c e / b d f] */
export interface Mat {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export const IDENTITY_MAT: Mat = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** m ∘ n — تُطبَّق n أولاً ثم m */
export function multiplyMat(m: Mat, n: Mat): Mat {
  return {
    a: m.a * n.a + m.c * n.b,
    b: m.b * n.a + m.d * n.b,
    c: m.a * n.c + m.c * n.d,
    d: m.b * n.c + m.d * n.d,
    e: m.a * n.e + m.c * n.f + m.e,
    f: m.b * n.e + m.d * n.f + m.f,
  };
}

export function translateMat(x: number, y: number): Mat {
  return { a: 1, b: 0, c: 0, d: 1, e: x, f: y };
}

export function scaleMat(sx: number, sy: number): Mat {
  return { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
}

export function rotateMat(deg: number): Mat {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
}

export function applyMat(m: Mat, p: Vec): Vec {
  return [m.a * p[0] + m.c * p[1] + m.e, m.b * p[0] + m.d * p[1] + m.f];
}

const vec = (p: Vec): Vec => [p[0], p[1]];

/** أكبر زاوية قوس يقرّبها مكعّب واحد دون انحراف بصري ملحوظ عند 300DPI */
const MAX_ARC_STEP = Math.PI / 2;

/**
 * مُنشئ مسار يبني قِطَعاً مطلقة بإحداثيات محلية.
 * الأقواس تُجزَّأ إلى خطوات ≤90° ويقرَّب كل منها بمكعّب واحد (kappa).
 */
export class PathBuilder {
  private segs: CubicSeg[] = [];
  private start: Vec | null = null;
  private cur: Vec | null = null;

  moveTo(p: Vec): this {
    this.start = vec(p);
    this.cur = this.start;
    return this;
  }

  lineTo(p: Vec): this {
    if (!this.cur) return this.moveTo(p);
    const end = vec(p);
    this.segs.push(['L', this.cur, end]);
    this.cur = end;
    return this;
  }

  cubicTo(c1: Vec, c2: Vec, p: Vec): this {
    if (!this.cur) return this.moveTo(p);
    const end = vec(p);
    this.segs.push(['C', this.cur, vec(c1), vec(c2), end]);
    this.cur = end;
    return this;
  }

  /**
   * قوس إهليلجي من startRad إلى endRad حول المركز (cx, cy).
   * يفترض أن القلم عند نقطة بداية القوس؛ إن لم يكن كذلك يوصل إليها بخط.
   */
  arcTo(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    startRad: number,
    endRad: number,
    ccw = false,
  ): this {
    const pointAt = (t: number): Vec => [cx + rx * Math.cos(t), cy + ry * Math.sin(t)];
    if (rx <= 0 || ry <= 0) return this.lineTo(pointAt(endRad));

    let sweep = endRad - startRad;
    if (ccw) {
      while (sweep > 0) sweep -= Math.PI * 2;
      if (sweep === 0) sweep = -Math.PI * 2;
    } else {
      while (sweep < 0) sweep += Math.PI * 2;
      if (sweep === 0) sweep = Math.PI * 2;
    }

    const first = pointAt(startRad);
    if (!this.cur) this.moveTo(first);
    else if (Math.abs(this.cur[0] - first[0]) > 1e-9 || Math.abs(this.cur[1] - first[1]) > 1e-9)
      this.lineTo(first);

    const steps = Math.max(1, Math.ceil(Math.abs(sweep) / MAX_ARC_STEP));
    const delta = sweep / steps;
    const k = (4 / 3) * Math.tan(delta / 4);
    const tangentAt = (t: number): Vec => [-rx * Math.sin(t), ry * Math.cos(t)];

    let angle = startRad;
    for (let i = 0; i < steps; i += 1) {
      const p0 = pointAt(angle);
      const next = angle + delta;
      const p3 = pointAt(next);
      const t0 = tangentAt(angle);
      const t3 = tangentAt(next);
      this.cubicTo(
        [p0[0] + k * t0[0], p0[1] + k * t0[1]],
        [p3[0] - k * t3[0], p3[1] - k * t3[1]],
        p3,
      );
      angle = next;
    }
    return this;
  }

  /** يغلق المسار الفرعي الحالي بخط إلى نقطته الأولى إن لم يكن مقفلاً */
  close(): this {
    if (this.start && this.cur) {
      if (
        Math.abs(this.cur[0] - this.start[0]) > 1e-9 ||
        Math.abs(this.cur[1] - this.start[1]) > 1e-9
      )
        this.lineTo(this.start);
      this.cur = this.start;
    }
    return this;
  }

  segments(): CubicSeg[] {
    return this.segs;
  }
}

/** يحوِّل أي مسار (بأقواس وتربيعيات) إلى قِطَع خطية ومكعّبية فقط */
export function normalizeSegments(path: Path): CubicSeg[] {
  const out: CubicSeg[] = [];
  for (const seg of path as AnySegment[]) {
    switch (seg[0]) {
      case 'L':
        out.push(['L', vec(seg[1]), vec(seg[2])]);
        break;
      case 'C':
        out.push(['C', vec(seg[1]), vec(seg[2]), vec(seg[3]), vec(seg[4])]);
        break;
      case 'Q': {
        const [, p0, c, p1] = seg;
        out.push([
          'C',
          vec(p0),
          [p0[0] + (2 / 3) * (c[0] - p0[0]), p0[1] + (2 / 3) * (c[1] - p0[1])],
          [p1[0] + (2 / 3) * (c[0] - p1[0]), p1[1] + (2 / 3) * (c[1] - p1[1])],
          vec(p1),
        ]);
        break;
      }
      case 'A':
        for (const cubic of arcSegmentToCubics(seg)) {
          for (const inner of normalizeSegments([cubic] as Path)) out.push(inner);
        }
        break;
    }
  }
  return out;
}

export function transformSegments(segs: CubicSeg[], m: Mat): CubicSeg[] {
  return segs.map((seg) =>
    seg[0] === 'L'
      ? ['L', applyMat(m, seg[1]), applyMat(m, seg[2])]
      : ['C', applyMat(m, seg[1]), applyMat(m, seg[2]), applyMat(m, seg[3]), applyMat(m, seg[4])],
  );
}

export function translateSegments(segs: CubicSeg[], dx: number, dy: number): CubicSeg[] {
  return transformSegments(segs, translateMat(dx, dy));
}

export interface SegmentsBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  w: number;
  h: number;
}

/**
 * الصندوق المحيط المحكم (tight) — يحسب نقاط التطرف الحقيقية للمنحنيات لا
 * نقاط التحكم، فالأخيرة قد تخرج عن المنحنى فتُصغّر الشكل عند قياسه إليها.
 */
export function segmentsBounds(segs: CubicSeg[]): SegmentsBounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const seg of segs as AnySegment[]) {
    const box = pathSegmentBoundingBox(seg);
    minX = Math.min(minX, box.left);
    minY = Math.min(minY, box.top);
    maxX = Math.max(maxX, box.right);
    maxY = Math.max(maxY, box.bottom);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
  if (maxX <= minX || maxY <= minY) return null;
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

const round = (n: number, precision: number): string => {
  const fixed = n.toFixed(precision);
  return fixed === '-0.00' || fixed === '-0' ? (0).toFixed(precision) : fixed;
};

/**
 * تسلسل القِطَع إلى بيانات مسار SVG.
 * يبدأ مساراً فرعياً جديداً عند كل انقطاع، ويقفله بـ Z عندما تعود نهايته إلى
 * بدايته — الإغلاق الصريح لازم للعمليات المنطقية وللحدود المغلوحة.
 */
export function segmentsToPathData(segs: CubicSeg[], precision = 2): string {
  if (segs.length === 0) return '';
  const parts: string[] = [];
  let subpathStart: Vec | null = null;
  let cur: Vec | null = null;

  const flushClose = () => {
    if (subpathStart && cur) {
      const closed =
        Math.abs(cur[0] - subpathStart[0]) < 1e-6 && Math.abs(cur[1] - subpathStart[1]) < 1e-6;
      if (closed) parts.push('Z');
    }
  };

  for (const seg of segs) {
    const start = seg[1];
    if (!cur || Math.abs(cur[0] - start[0]) > 1e-6 || Math.abs(cur[1] - start[1]) > 1e-6) {
      flushClose();
      parts.push(`M${round(start[0], precision)},${round(start[1], precision)}`);
      subpathStart = start;
    }
    if (seg[0] === 'L') {
      parts.push(`L${round(seg[2][0], precision)},${round(seg[2][1], precision)}`);
      cur = seg[2];
    } else {
      parts.push(
        `C${round(seg[2][0], precision)},${round(seg[2][1], precision)} ` +
          `${round(seg[3][0], precision)},${round(seg[3][1], precision)} ` +
          `${round(seg[4][0], precision)},${round(seg[4][1], precision)}`,
      );
      cur = seg[4];
    }
  }
  flushClose();
  return parts.join('');
}
