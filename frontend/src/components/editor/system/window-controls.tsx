import { useRef, useCallback, useEffect } from "react";
import { WindowSnapAssist } from "../../../../wailsjs/runtime/runtime";

/**
 * WindowControls — أزرار التحكم القياسية ثلاثية الأبعاد لنظام Windows 11 Fluent
 * (تصغير / تكبير واستعادة مع Snap Assist / إغلاق)
 * مطابقة لمقاسات ويندوز 11 الرسمية (46px × 32px) وألوان التحويم والـ Segoe Icons.
 */
interface WindowControlsProps {
  isMaximized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

export function WindowControls({ isMaximized, onMinimize, onMaximize, onClose }: WindowControlsProps) {
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMaximizeMouseEnter = useCallback(() => {
    // تفعيل Snap Assist بعد تحويم مستمر 400ms كما في ويندوز 11 الأصلي
    snapTimerRef.current = setTimeout(() => {
      try {
        WindowSnapAssist();
      } catch {
        // Safe fallback in non-desktop environments
      }
    }, 400);
  }, []);

  const handleMaximizeMouseLeave = useCallback(() => {
    if (snapTimerRef.current) {
      clearTimeout(snapTimerRef.current);
      snapTimerRef.current = null;
    }
  }, []);

  // تنظيف مؤقت Snap Assist عند إلغاء التركيب — بدونه قد ينبثق تخطيط
  // التقسيم بعد اختفاء الزر (تنقل سريع بين الشاشات)
  useEffect(() => {
    return () => {
      if (snapTimerRef.current) {
        clearTimeout(snapTimerRef.current);
        snapTimerRef.current = null;
      }
    };
  }, []);

  // النقر يلغي Snap Assist المجدول — التحويم الطويل ثم النقر كان
  // يفتح قائمة التقسيم ويقلب التكبير معاً في إجراءين متضاربين
  const handleMaximizeClick = useCallback(() => {
    if (snapTimerRef.current) {
      clearTimeout(snapTimerRef.current);
      snapTimerRef.current = null;
    }
    onMaximize();
  }, [onMaximize]);

  return (
    // إيقاف الدبل-كليك هنا — وإلا تسرّب للهيدر الأب فيقلب التكبير مرتين
    // (رجوع للحالة الأصلية) عند النقر المزدوج السريع على زر التكبير
    <div
      className="inline-flex items-stretch h-full select-none title-bar-controls z-50"
      dir="ltr"
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {/* زر التصغير Minimize */}
      <button
        type="button"
        onClick={onMinimize}
        className="w-[46px] h-full flex items-center justify-center text-foreground/80 hover:text-foreground hover:bg-foreground/10 active:bg-foreground/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/70"
        title="تصغير"
        aria-label="تصغير"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 5H10" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>

      {/* زر التكبير / الاستعادة مع دعم Snap Assist */}
      <button
        type="button"
        onClick={handleMaximizeClick}
        onMouseEnter={handleMaximizeMouseEnter}
        onMouseLeave={handleMaximizeMouseLeave}
        onContextMenu={(e) => {
          e.preventDefault();
          try {
            WindowSnapAssist();
          } catch {
            // fallback
          }
        }}
        className="w-[46px] h-full flex items-center justify-center text-foreground/80 hover:text-foreground hover:bg-foreground/10 active:bg-foreground/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/70"
        title={isMaximized ? "استعادة (انقر باليمين لتقسيم الشاشة)" : "تكبير (انقر باليمين لتقسيم الشاشة)"}
        aria-label={isMaximized ? "استعادة" : "تكبير"}
      >
        {isMaximized ? (
          // أيقونة الاستعادة (Restore - مربعان متراكبان)
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.5 0.5H9.5V7.5" stroke="currentColor" strokeWidth="1" />
            <rect x="0.5" y="2.5" width="7" height="7" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
        ) : (
          // أيقونة التكبير (Maximize - مربع واحد)
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth="1" />
          </svg>
        )}
      </button>

      {/* زر الإغلاق Close - أحمر ويندوز 11 الأصلي #c42b1c */}
      <button
        type="button"
        onClick={onClose}
        className="w-[46px] h-full flex items-center justify-center text-foreground/80 hover:text-white hover:bg-[#c42b1c] active:bg-[#b22517] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/70"
        title="إغلاق"
        aria-label="إغلاق"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0.5 0.5L9.5 9.5M9.5 0.5L0.5 9.5" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>
    </div>
  );
}
