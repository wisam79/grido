import React from "react";

export interface PrintIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * أيقونة الطباعة الاحترافية المصممة بمعايير Microsoft Fluent 2 & Apple Design
 * شبكة 20x20 متطابقة مع أشرطة الأدوات
 */
export function PrintIcon({ className = "w-4.5 h-4.5", ...props }: PrintIconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* الورقة العلوية في درج التغذية */}
      <path
        d="M5.5 2.5C5.5 2.22386 5.72386 2 6 2H14C14.2761 2 14.5 2.22386 14.5 2.5V6H5.5V2.5Z"
        fill="currentColor"
        opacity="0.6"
      />
      {/* جسم الطابعة الأنيق مع فتحة الإخراج */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3 6.5C2.17157 6.5 1.5 7.17157 1.5 8V13.5C1.5 14.3284 2.17157 15 3 15H4.5V17C4.5 17.5523 4.94772 18 5.5 18H14.5C15.0523 18 15.5 17.5523 15.5 17V15H17C17.8284 15 18.5 14.3284 18.5 13.5V8C18.5 7.17157 17.8284 6.5 17 6.5H3ZM14 14V16.5H6V14H14ZM15.5 9.25C15.5 9.66421 15.1642 10 14.75 10C14.3358 10 14 9.66421 14 9.25C14 8.83579 14.3358 8.5 14.75 8.5C15.1642 8.5 15.5 8.83579 15.5 9.25Z"
      />
      {/* خطوط نصية خافتة على الورقة الخارجة */}
      <rect x="7.5" y="14.75" width="5" height="1" rx="0.5" fill="var(--color-background, #fff)" opacity="0.9" />
    </svg>
  );
}
