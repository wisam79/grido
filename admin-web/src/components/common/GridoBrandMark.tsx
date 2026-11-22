import { useId } from "react";

interface GridoBrandMarkProps {
  size?: number;
  className?: string;
}

/** علامة Grido Studio الرسمية المستمدة من أيقونة التطبيق الأساسية. */
export function GridoBrandMark({
  size = 28,
  className = "",
}: GridoBrandMarkProps) {
  const uid = useId().replace(/:/g, "");
  const clipId = `grido-brand-clip-${uid}`;
  const foldGradId = `grido-brand-fold-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1000 1000"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="40" y="30" width="920" height="925" rx="175" />
        </clipPath>
        <linearGradient
          id={foldGradId}
          x1="15%"
          y1="85%"
          x2="65%"
          y2="35%"
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
          fill={`url(#${foldGradId})`}
        />
        <path
          d="M40 775L335 480L800 945"
          fill="none"
          stroke="#3388ff"
          strokeWidth="3"
          opacity="0.7"
        />
        <path
          d="M512 460H960V910L928 910L504 476A10 10 0 0 1 512 460Z"
          fill="#0068ff"
        />
      </g>
    </svg>
  );
}
