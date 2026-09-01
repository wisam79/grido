import React from "react";

export interface ImageIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * أيقونة "إضافة صورة" الاحترافية
 * بطاقة صورة فوتوغرافية مع شارة علامة (+) مصممة بدقة هندسية عالية
 */
export function AddPhotoIcon({ className = "w-5 h-5", ...props }: ImageIconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* إطار بطاقة الصورة الزجاجي بنعومة Fluent 2 */}
      <rect
        x="2"
        y="2.5"
        width="13"
        height="13"
        rx="2.75"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.08"
      />
      {/* نقطة الشمس */}
      <circle cx="5.75" cy="6.25" r="1.25" fill="currentColor" />
      {/* تضاريس المشهد المتناسقة */}
      <path
        d="M2.5 13.25L5.75 9.75C6.25 9.2 7 9.2 7.5 9.75L10.5 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* شارة الإضافة الدائرية البارزة في الزاوية السفلية اليمين */}
      <circle
        cx="14.5"
        cy="14.5"
        r="4.25"
        fill="currentColor"
      />
      {/* خطوط علامة (+) واضحة ونقية بلون خلفية الواجهة */}
      <path
        d="M14.5 12V17M12 14.5H17"
        stroke="var(--color-card, #ffffff)"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * أيقونة "دفعة صور" الاحترافية
 * بطاقتان فوتوغرافيتان متراكبتان بعمق بصري نظيف
 */
export function BatchPhotosIcon({ className = "w-5 h-5", ...props }: ImageIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* البطاقة الخلفية */}
      <rect
        x="7"
        y="3"
        width="14"
        height="13"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
      {/* البطاقة الأمامية */}
      <rect
        x="3"
        y="7"
        width="14"
        height="13"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        fill="var(--color-card, #1e1e1e)"
        fillOpacity="0.4"
      />
      {/* نقطة الشمس */}
      <circle cx="7" cy="11" r="1.2" fill="currentColor" />
      {/* تضاريس المشهد */}
      <path
        d="M3.5 17.5L7 14C7.6 13.4 8.6 13.4 9.2 14L13.5 18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * أيقونة "الأشكال الهندسية" المصممة بمعايير Figma & Fluent 2
 * مربع منحني مع دائرة خلفية بتأثير عمق أنيق
 */
export function GeometricShapesIcon({ className = "w-5 h-5", ...props }: ImageIconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* الدائرة الخلفية */}
      <circle
        cx="12.5"
        cy="7.5"
        r="4.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="currentColor"
        fillOpacity="0.15"
      />
      {/* المستطيل / المربع الأمامي */}
      <rect
        x="2.75"
        y="6.75"
        width="9.5"
        height="9.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="var(--color-card, #1e1e1e)"
      />
    </svg>
  );
}

export interface PageOrientationIconProps extends React.SVGProps<SVGSVGElement> {
  isLandscape?: boolean;
  className?: string;
}

/**
 * أيقونة تبديل اتجاه الورقة المخصصة
 * تعرض شكلاً ديناميكياً يمثل الورقة الأفقية أو الرأسية بدقة متناهية
 */
export function PageOrientationIcon({
  isLandscape = false,
  className = "w-4 h-4",
  ...props
}: PageOrientationIconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {isLandscape ? (
        <g>
          {/* ورقة أفقية (Landscape) */}
          <rect
            x="1.75"
            y="3.75"
            width="12.5"
            height="8.5"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="currentColor"
            fillOpacity="0.12"
          />
          {/* خطوط نصية توضيحية خفيفة */}
          <path
            d="M4 6.5H9.5M4 9H7.5"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.65"
          />
          {/* نقطة زاوية طي الورقة أو مؤشر التدوير */}
          <path
            d="M11 6.5V9"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.4"
          />
        </g>
      ) : (
        <g>
          {/* ورقة رأسية (Portrait) */}
          <rect
            x="3.75"
            y="1.75"
            width="8.5"
            height="12.5"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="currentColor"
            fillOpacity="0.12"
          />
          {/* خطوط نصية توضيحية خفيفة */}
          <path
            d="M6 4.75H10M6 7.25H10M6 9.75H8.5"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.65"
          />
        </g>
      )}
    </svg>
  );
}

/**
 * أيقونة Google الرسمية الملونة (4 ألوان قياسية)
 */
export function GoogleIcon({ className = "w-4 h-4 shrink-0", ...props }: ImageIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

