import { describe, it, expect } from 'vitest';
import {
  extractSvgViewBox,
  generateDieCutContour,
  DEFAULT_BLEED_PERCENT,
  DEFAULT_CORNER_RADIUS_PERCENT,
} from '../src/features/stickers/lib/die-cut-offset';

describe('die-cut-offset library', () => {
  const sampleSquareSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
    <circle cx="250" cy="250" r="200" fill="#f59e0b" />
    <text x="250" y="260" text-anchor="middle">Quality</text>
  </svg>`;

  const sampleRectSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
    <rect x="20" y="20" width="560" height="260" rx="10" fill="#3b82f6" />
    <text x="300" y="160" text-anchor="middle">Shipment</text>
  </svg>`;

  it('extracts viewBox correctly', () => {
    expect(extractSvgViewBox(sampleSquareSvg)).toEqual({ x: 0, y: 0, width: 500, height: 500 });
    expect(extractSvgViewBox(sampleRectSvg)).toEqual({ x: 0, y: 0, width: 600, height: 300 });
  });

  it('falls back to width/height when viewBox is absent', () => {
    const vb = extractSvgViewBox(
      `<svg width="240" height="120"><rect width="240" height="120"/></svg>`,
    );
    expect(vb).toEqual({ x: 0, y: 0, width: 240, height: 120 });
  });

  it('derives bleed from the smaller viewBox dimension', () => {
    const res = generateDieCutContour(sampleSquareSvg);
    // 4% من أصغر بُعد (500) = 20 وحدة
    expect(res.bleedPx).toBe(20);
    expect(DEFAULT_BLEED_PERCENT).toBe(4);
  });

  it('keeps the bleed proportional on non-square artwork', () => {
    // أصغر بُعد هنا 300 ⇒ 4% منه = 12، وليس 4% من العرض 600
    const res = generateDieCutContour(sampleRectSvg);
    expect(res.bleedPx).toBe(12);
  });

  it('honours an explicit bleedPercent override', () => {
    const res = generateDieCutContour(sampleSquareSvg, { bleedPercent: 10 });
    expect(res.bleedPx).toBe(50);
  });

  it('generates a rounded rect contour enclosing the whole artwork', () => {
    const res = generateDieCutContour(sampleSquareSvg);
    const r = (DEFAULT_CORNER_RADIUS_PERCENT / 100) * 500; // 30

    // الحدود: -20 .. 520 على المحورين (workspace موسّع بمقدار النزف)
    expect(res.pathData).toContain('M 10.00 -20.00');
    expect(res.pathData).toContain('H 490.00');
    expect(res.pathData).toContain('A 30.00 30.00 0 0 1 520.00 10.00');
    expect(res.pathData).toContain('V 490.00');
    expect(res.pathData).toContain('A 30.00 30.00 0 0 1 -20.00 490.00');
    expect(res.pathData.trimEnd().endsWith('Z')).toBe(true);
  });

  it('adds the standard CutContour spot-colour layer', () => {
    const res = generateDieCutContour(sampleSquareSvg);

    expect(res.fullSvgWithContour).toContain('id="CutContour"');
    expect(res.fullSvgWithContour).toContain('inkscape:label="CutContour"');
    expect(res.fullSvgWithContour).toContain('stroke="#FF00FF"');
    expect(res.fullSvgWithContour).toContain('data-cut-contour="true"');
    // خط القص خالٍ من التعبئة
    expect(res.fullSvgWithContour).toContain('fill="none"');
    // الـ viewBox اتّسع ليحتوي مسار القص: هامش = ceil(نزف 20 + سماكة 1.5*2) = 23
    expect(res.fullSvgWithContour).toMatch(/viewBox="-23\.0 -23\.0 546\.0 546\.0"/);
  });

  it('emits a standalone plotter file without a baked-in physical size', () => {
    const res = generateDieCutContour(sampleSquareSvg);

    expect(res.standaloneContourSvg).toContain('<?xml version="1.0"');
    expect(res.standaloneContourSvg).toContain('id="CutContour"');
    expect(res.standaloneContourSvg).toContain('data-cut-contour="true"');
    // الحجم الفيزيائي يحدّده المشغّل — لا بكسل ولا مليمتر مثبّتة
    expect(res.standaloneContourSvg).not.toMatch(/\swidth="/);
    expect(res.standaloneContourSvg).not.toMatch(/\sheight="/);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // اختبار انحدار: القالب الحقيقي الذي كان يُنتج مسار قصّ في مكان فارغ.
  // فيه حدّ الملصق الحقيقي دائرة r=210، وداخلها زخرفة مضلعية داخل
  // <g transform="translate(250,180) scale(1.1)"> بإحداثيات خام حول (18,-6).
  // الكود القديم كان يلتقط تلك المضلعة (10 رؤوس ≥ 8) ويولّد المسار حول (20,1).
  // ─────────────────────────────────────────────────────────────────────────
  it('cuts around the artwork, never around a transformed decorative shape', () => {
    const realTemplateSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
      <path d="M 80,250 A 170,170 0 0,1 420,250" fill="none"/>
      <circle cx="250" cy="250" r="210" fill="#0f172a"/>
      <g transform="translate(250, 180) scale(1.1)">
        <path d="M 12,-32 A 28,28 0 1,0 24,24 A 22,22 0 1,1 12,-32 Z" fill="#F59E0B"/>
        <polygon points="18,-6 22,-1 27,-2 23,2 24,7 20,4 16,7 17,2 13,-2 18,-1" fill="#F59E0B"/>
      </g>
    </svg>`;

    const res = generateDieCutContour(realTemplateSvg);

    // المسار متمركز على مركز الملصق (250,250) لا على الزخرفة.
    const bleed = res.bleedPx;
    expect(bleed).toBe(20);
    const left = 0 - bleed;
    const right = 500 + bleed;
    expect(res.pathData).toContain(right.toFixed(2)); // أقصى يمين = 520
    expect(res.pathData).toContain(left.toFixed(2)); // أقصى يسار/أعلى = -20

    // الحدّOuter يجب أن يحيط بدائرة الملصق (250±210 = 40..460) بالكامل.
    expect(left).toBeLessThan(40);
    expect(right).toBeGreaterThan(460);

    // الإحداثيات الخام للزخرفة لا تتسرّب أبداً إلى مسار القص.
    expect(res.pathData).not.toContain('18.00');
    expect(res.pathData).not.toContain('27.00');
  });
});
