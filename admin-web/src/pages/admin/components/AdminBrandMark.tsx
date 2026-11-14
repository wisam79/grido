import { useId } from 'react';

interface AdminBrandMarkProps {
  size?: number;
  className?: string;
}

/** علامة Grido Studio الرسمية المستمدة من شاشة إقلاع التطبيق الأساسي. */
export function AdminBrandMark({ size = 28, className = '' }: AdminBrandMarkProps) {
  const uid = useId().replace(/:/g, '');
  const clipId = `grido-clip-${uid}`;
  const foldGradId = `grido-fold-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1000 1000"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="40" y="30" width="920" height="925" rx="175" />
        </clipPath>
        <linearGradient
          id={foldGradId}
          x1="504"
          y1="460"
          x2="960"
          y2="910"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#0055e8" />
          <stop offset="100%" stopColor="#0037a6" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <path
          d="M40 30H960V315H415A80 80 0 0 0 335 395V480L40 775Z"
          fill="#0068ff"
        />
        <path
          d="M40 775L335 480L800 945A8 8 0 0 1 794 955H40Z"
          fill="#0068ff"
        />
        <path
          d="M512 460H960V910L928 910L504 476A10 10 0 0 1 512 460Z"
          fill={`url(#${foldGradId})`}
        />
      </g>
    </svg>
  );
}
