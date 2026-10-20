import React from 'react';
import type { ShapeElement } from '@/lib/editor-store';

export interface ShapeGlyphProps {
  kind: ShapeElement['shape'];
  /** مسار SVG — لأشكال kind='path' */
  path?: string;
  sides?: number;
  starPoints?: number;
  /** سهم برأسين — يعكس defaults.pointerAtBeginning في الكتالوج */
  doubleArrow?: boolean;
  className?: string;
}

/** نقاط نجمة/مضلع كسمة SVG — تُشارَك بين معاينة الكتالوج وخصائص الشكل */
function radialPointsAttr(count: number, outer: number, inner?: number, cx = 12, cy = 12): string {
  const points: string[] = [];
  const isStar = inner !== undefined;
  const total = isStar ? count * 2 : count;
  const step = (isStar ? Math.PI : Math.PI * 2) / count;
  for (let i = 0; i < total; i++) {
    const r = isStar ? (i % 2 === 0 ? outer : inner) : outer;
    const a = -Math.PI / 2 + i * step;
    points.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return points.join(' ');
}

function polarPoint(r: number, deg: number, cx = 12, cy = 12): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

/** مسار حلقة مقصوصة (Arc) بين زاويتين — معاينة مصغّرة مطابقة لهندسة Konva.Arc */
function annulusArcPath(startDeg: number, endDeg: number, innerR: number, outerR: number): string {
  const [x1, y1] = polarPoint(outerR, startDeg);
  const [x2, y2] = polarPoint(outerR, endDeg);
  const [x3, y3] = polarPoint(innerR, endDeg);
  const [x4, y4] = polarPoint(innerR, startDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${outerR} ${outerR} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} A ${innerR} ${innerR} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`;
}

/** مسار قطاع دائري (Wedge) — معاينة مصغّرة مطابقة لهندسة Konva.Wedge */
function wedgePath(startDeg: number, endDeg: number, radius: number): string {
  const [x1, y1] = polarPoint(radius, startDeg);
  const [x2, y2] = polarPoint(radius, endDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M 12 12 L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

/**
 * معاينة هندسية حقيقية للشكل داخل إطار SVG 24×24.
 * يستخدمها: قائمة إضافة الأشكال، شبكة الأشكال السريعة، وعنوان بطاقة الخصائص —
 * فأي تعديل على الكتالوج ينعكس في الواجهات الثلاث معاً بلا تكرار أيقونات.
 */
export const ShapeGlyph = React.memo(function ShapeGlyph({
  kind,
  path,
  sides,
  starPoints,
  doubleArrow,
  className,
}: ShapeGlyphProps) {
  let body: React.ReactNode;

  switch (kind) {
    case 'ellipse':
      body = <circle cx="12" cy="12" r="9" fill="currentColor" />;
      break;
    case 'line':
      body = (
        <path
          d="M 3 12 H 21"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
      );
      break;
    case 'arrow':
      body = (
        <>
          <path d="M 3 12 H 15" stroke="currentColor" strokeWidth="2.2" fill="none" />
          <path d="M 14 6.5 L 21.5 12 L 14 17.5 Z" fill="currentColor" />
          {doubleArrow && <path d="M 10 6.5 L 2.5 12 L 10 17.5 Z" fill="currentColor" />}
        </>
      );
      break;
    case 'star':
      body = (
        <polygon
          points={radialPointsAttr(Math.max(3, starPoints ?? 5), 9.5, 4.75)}
          fill="currentColor"
        />
      );
      break;
    case 'polygon':
      body = (
        <polygon points={radialPointsAttr(Math.max(3, sides ?? 6), 9.5)} fill="currentColor" />
      );
      break;
    case 'ring':
      body = (
        <path
          d="M 12 3 a 9 9 0 1 0 0 18 a 9 9 0 1 0 0 -18 M 12 8 a 4 4 0 1 0 0 8 a 4 4 0 1 0 0 -8"
          fillRule="evenodd"
          fill="currentColor"
        />
      );
      break;
    case 'arc':
      body = <path d={annulusArcPath(0, 270, 6.5, 9.5)} fill="currentColor" />;
      break;
    case 'wedge':
      body = <path d={wedgePath(0, 90, 9.5)} fill="currentColor" />;
      break;
    case 'path':
      body = path ? (
        <path d={path} fill="currentColor" />
      ) : (
        <rect x="3" y="5.5" width="18" height="13" rx="1.5" fill="currentColor" />
      );
      break;
    default:
      body = <rect x="3" y="5.5" width="18" height="13" rx="1.5" fill="currentColor" />;
  }

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      {body}
    </svg>
  );
});
