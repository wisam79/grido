import React from "react";

export interface AlignmentIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * أيقونة المحاذاة لليسار - بمعايير Figma & Fluent 2 الاحترافية
 */
export function AlignLeftIcon({ className = "w-4.5 h-4.5", ...props }: AlignmentIconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* خط المحاذاة العمودي المرجعي */}
      <line x1="2.75" y1="2.5" x2="2.75" y2="17.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      {/* المستطيل العلوي */}
      <rect x="5.5" y="4" width="11.5" height="4.5" rx="1.25" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" />
      {/* المستطيل السفلي */}
      <rect x="5.5" y="11.5" width="7.5" height="4.5" rx="1.25" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * أيقونة المحاذاة للوسط أفقياً
 */
export function AlignCenterHorizontalIcon({ className = "w-4.5 h-4.5", ...props }: AlignmentIconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* خط المحور المركزي */}
      <line x1="10" y1="2" x2="10" y2="18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" opacity="0.85" />
      {/* المستطيل العلوي الممركز */}
      <rect x="3" y="4" width="14" height="4.5" rx="1.25" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" />
      {/* المستطيل السفلي الممركز */}
      <rect x="6" y="11.5" width="8" height="4.5" rx="1.25" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * أيقونة المحاذاة لليمين
 */
export function AlignRightIcon({ className = "w-4.5 h-4.5", ...props }: AlignmentIconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* خط المحاذاة العمودي المرجعي */}
      <line x1="17.25" y1="2.5" x2="17.25" y2="17.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      {/* المستطيل العلوي */}
      <rect x="3" y="4" width="11.5" height="4.5" rx="1.25" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" />
      {/* المستطيل السفلي */}
      <rect x="7" y="11.5" width="7.5" height="4.5" rx="1.25" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * أيقونة المحاذاة للأعلى
 */
export function AlignTopIcon({ className = "w-4.5 h-4.5", ...props }: AlignmentIconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* خط المحاذاة الأفقي المرجعي */}
      <line x1="2.5" y1="2.75" x2="17.5" y2="2.75" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      {/* المستطيل الأيمن */}
      <rect x="4" y="5.5" width="4.5" height="11.5" rx="1.25" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" />
      {/* المستطيل الأيسر */}
      <rect x="11.5" y="5.5" width="4.5" height="7.5" rx="1.25" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * أيقونة المحاذاة للمنتصف عمودياً
 */
export function AlignCenterVerticalIcon({ className = "w-4.5 h-4.5", ...props }: AlignmentIconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* خط المحور الأفقي */}
      <line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" opacity="0.85" />
      {/* المستطيل الأيمن الممركز */}
      <rect x="4" y="3" width="4.5" height="14" rx="1.25" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" />
      {/* المستطيل الأيسر الممركز */}
      <rect x="11.5" y="6" width="4.5" height="8" rx="1.25" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * أيقونة المحاذاة للأسفل
 */
export function AlignBottomIcon({ className = "w-4.5 h-4.5", ...props }: AlignmentIconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* خط المحاذاة الأفقي المرجعي */}
      <line x1="2.5" y1="17.25" x2="17.5" y2="17.25" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      {/* المستطيل الأيمن */}
      <rect x="4" y="3" width="4.5" height="11.5" rx="1.25" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" />
      {/* المستطيل الأيسر */}
      <rect x="11.5" y="7" width="4.5" height="7.5" rx="1.25" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

