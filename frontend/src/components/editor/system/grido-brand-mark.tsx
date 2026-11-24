import { useId } from 'react';

interface GridoBrandMarkProps {
  size?: number;
  className?: string;
}

// eslint-disable-next-line react-refresh/only-export-components
export const GRIDO_BRAND_GEOMETRY = {
  viewBox: '0 0 1000 1000',
  clipRect: { x: 40, y: 30, width: 920, height: 925, rx: 175 },
  bodyPath: 'M40 30H960V315H415A80 80 0 0 0 335 395V480L40 775Z',
  foldPath: 'M40 775L335 480L800 945A8 8 0 0 1 794 955H40Z',
  foldEdgePath: 'M40 775L335 480L800 945',
  armPath: 'M512 460H960V910L928 910L504 476A10 10 0 0 1 512 460Z',
  colors: {
    primaryFace: '#3b82f6',
    foldStart: '#2563eb',
    foldEnd: '#1d4ed8',
    foldEdge: '#60a5fa',
  },
} as const;

/** علامة Grido Studio الرسمية المستمدة من أيقونة التطبيق. */
export function GridoBrandMark({ size = 52, className = '' }: GridoBrandMarkProps) {
  const uid = useId().replace(/:/g, '');
  const clipId = `grido-mark-clip-${uid}`;
  const foldGradId = `grido-mark-fold-${uid}`;
  const { clipRect, colors } = GRIDO_BRAND_GEOMETRY;

  return (
    <svg
      width={size}
      height={size}
      viewBox={GRIDO_BRAND_GEOMETRY.viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`.trim()}
    >
      <defs>
        <clipPath id={clipId}>
          <rect
            x={clipRect.x}
            y={clipRect.y}
            width={clipRect.width}
            height={clipRect.height}
            rx={clipRect.rx}
          />
        </clipPath>
        <linearGradient id={foldGradId} x1="15%" y1="85%" x2="65%" y2="35%">
          <stop offset="0%" stopColor={colors.foldStart} />
          <stop offset="100%" stopColor={colors.foldEnd} />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <path d={GRIDO_BRAND_GEOMETRY.bodyPath} fill={colors.primaryFace} />
        <path d={GRIDO_BRAND_GEOMETRY.foldPath} fill={`url(#${foldGradId})`} />
        <path
          d={GRIDO_BRAND_GEOMETRY.foldEdgePath}
          fill="none"
          stroke={colors.foldEdge}
          strokeWidth="3"
          opacity="0.7"
        />
        <path d={GRIDO_BRAND_GEOMETRY.armPath} fill={colors.primaryFace} />
      </g>
    </svg>
  );
}
