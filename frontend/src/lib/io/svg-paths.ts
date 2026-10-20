/**
 * svg-paths.ts
 * مسارات رسومية (SVG paths) للأشكال الجاهزة — ثوابت خام فقط.
 *
 * مصدر الحقيقة للكتالوج (التسميات، الفئات، viewBox، الخصائص الافتراضية) هو
 * `shape-catalog.ts` الذي يستهلك هذه الثوابت — لا تُعرَّف قوائم أشكال هنا.
 * جميع المسارات مرسومة داخل إطار مرجعي 24×24 مطابق لبقية مسارات التطبيق.
 */

export const SHAPE_PATH_TRIANGLE = 'M 12 3 L 22 21 L 2 21 Z';
export const SHAPE_PATH_HEART =
  'M 12 21.35 l -1.45 -1.32 C 5.4 15.36 2 12.28 2 8.5 C 2 5.42 4.42 3 7.5 3 c 1.74 0 3.41 0.81 4.5 2.09 C 13.09 3.81 14.76 3 16.5 3 c 3.08 0 5.5 2.42 5.5 5.5 c 0 3.78 -3.4 6.86 -8.55 11.54 L 12 21.35 z';
export const SHAPE_PATH_DIAMOND = 'M 12 2 L 22 12 L 12 22 L 2 12 Z';
export const SHAPE_PATH_HEXAGON = 'M 12 2 L 21 7.2 L 21 17.6 L 12 22.8 L 3 17.6 L 3 7.2 Z';
export const SHAPE_PATH_SHIELD =
  'M 12 2 L 4 5.5 L 4 11.5 C 4 16.5 7.5 20.8 12 22 C 16.5 20.8 20 16.5 20 11.5 L 20 5.5 Z';
export const SHAPE_PATH_ARROW = 'M 2 9 L 13 9 L 13 4 L 22 12 L 13 20 L 13 15 L 2 15 Z';
export const SHAPE_PATH_ARROW_LEFT = 'M 22 9 L 11 9 L 11 4 L 2 12 L 11 20 L 11 15 L 22 15 Z';
export const SHAPE_PATH_ARROW_UP = 'M 9 22 L 9 11 L 4 11 L 12 2 L 20 11 L 15 11 L 15 22 Z';
export const SHAPE_PATH_ARROW_DOUBLE =
  'M 2 12 L 8 7 L 8 10 L 16 10 L 16 7 L 22 12 L 16 17 L 16 14 L 8 14 L 8 17 Z';
export const SHAPE_PATH_ARROW_CURVED =
  'M 5 20 C 5 11 11 6 19 6 L 19 3 L 23 7.5 L 19 12 L 19 9 C 12 9 8 12.5 8 20 Z';
export const SHAPE_PATH_PENTAGON = 'M 12 2 L 21.51 8.91 L 17.88 20.09 L 6.12 20.09 L 2.49 8.91 Z';
export const SHAPE_PATH_OCTAGON =
  'M 21.24 15.83 L 15.83 21.24 L 8.17 21.24 L 2.76 15.83 L 2.76 8.17 L 8.17 2.76 L 15.83 2.76 L 21.24 8.17 Z';
export const SHAPE_PATH_CROSS =
  'M 9 3 L 15 3 L 15 9 L 21 9 L 21 15 L 15 15 L 15 21 L 9 21 L 9 15 L 3 15 L 3 9 L 9 9 Z';
export const SHAPE_PATH_PARALLELOGRAM = 'M 7 6 L 22 6 L 17 18 L 2 18 Z';
export const SHAPE_PATH_TRAPEZOID = 'M 7 6 L 17 6 L 21 18 L 3 18 Z';
export const SHAPE_PATH_SEMICIRCLE = 'M 1 22 A 11 11 0 0 1 23 22 Z';
export const SHAPE_PATH_SPEECH =
  'M 4 4 L 20 4 Q 22 4 22 6 L 22 14 Q 22 16 20 16 L 12 16 L 7 21 L 7 16 L 4 16 Q 2 16 2 14 L 2 6 Q 2 4 4 4 Z';
export const SHAPE_PATH_CLOUD =
  'M 7 19 Q 2 19 2 14.5 Q 2 10.6 6.4 10.2 Q 7 5 12 5 Q 16.4 5 17.6 8.8 Q 22 8.8 22 13.5 Q 22 19 17 19 Z';
export const SHAPE_PATH_BOLT = 'M 13 2 L 4 14 L 11 14 L 9 22 L 20 9 L 13 9 Z';
export const SHAPE_PATH_SPARKLE =
  'M 12 2 L 14.2 9.8 L 22 12 L 14.2 14.2 L 12 22 L 9.8 14.2 L 2 12 L 9.8 9.8 Z';
export const SHAPE_PATH_CROWN = 'M 3 8 L 7.5 12 L 12 5 L 16.5 12 L 21 8 L 19 19 L 5 19 Z';
export const SHAPE_PATH_BOOKMARK = 'M 6 3 L 18 3 L 18 21 L 12 16.5 L 6 21 Z';

/**
 * توليد مسار شارة شمسية (Burst/Seal) — نقاط متبادلة نصف قطر خارجي/داخلي.
 * التوليد هنا يمنع كتابة مسار ثابت طويل هش عند أي تعديل مستقبلي.
 */
function burstPath(cx: number, cy: number, spikes: number, outer: number, inner: number): string {
  const step = Math.PI / spikes;
  const parts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + i * step;
    const x = (cx + radius * Math.cos(angle)).toFixed(2);
    const y = (cy + radius * Math.sin(angle)).toFixed(2);
    parts.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
  }
  return `${parts.join(' ')} Z`;
}

export const SHAPE_PATH_BURST = burstPath(12, 12, 12, 11.5, 8.4);
