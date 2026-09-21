import { useState, useEffect, useCallback, useRef } from "react";
import { WindowMinimise, WindowToggleMaximise, Quit as WindowClose, WindowIsMaximised, WindowToggleFullscreen, WindowIsFullscreen, EventsOn } from "../../wailsjs/runtime/runtime";

export function useWindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // مؤقتات التحقق اللاحق — تُمسح قبل جدولة جديد لتفادي سباق نسخ متداخلة
  // (نقرات سريعة متتالية كانت تقلب الحالة ذهاباً وإياباً بلا ترتيب)
  const verifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkMaximized = useCallback(async () => {
    try {
      if (typeof window !== "undefined" && window.runtime?.WindowIsMaximised) {
        const max = await WindowIsMaximised();
        setIsMaximized(Boolean(max));
        return;
      }
    } catch {
      // fallback
    }

    if (typeof window !== "undefined") {
      const isMax =
        window.outerWidth >= window.screen.availWidth &&
        window.outerHeight >= window.screen.availHeight;
      setIsMaximized(isMax);
    }
  }, []);

  const checkFullscreen = useCallback(async () => {
    try {
      if (typeof window !== "undefined" && window.runtime?.WindowIsFullscreen) {
        const fs = await WindowIsFullscreen();
        setIsFullscreen(Boolean(fs));
      }
    } catch {
      // fallback: keep last known state
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkMaximized();
    checkFullscreen();

    window.addEventListener("resize", checkMaximized);
    const handleFocus = () => {
      setIsFocused(true);
      checkMaximized();
    };
    const handleBlur = () => setIsFocused(false);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    // 🔄 دفع لحظي من Go لحالة النافذة (تكبير/ملء شاشة عبر النظام) —
    // يسبق polling ويغطي Win+أسهم والسحب للأعلى وF11 من أي مصدر.
    let unbindMax: (() => void) | undefined;
    let unbindFs: (() => void) | undefined;
    try {
      if (typeof EventsOn === "function") {
        unbindMax = EventsOn("window:max-state", (maximised: boolean) => {
          setIsMaximized(Boolean(maximised));
        });
        unbindFs = EventsOn("window:fullscreen-state", (fs: boolean) => {
          setIsFullscreen(Boolean(fs));
        });
      }
    } catch {
      // non-desktop environment
    }

    return () => {
      window.removeEventListener("resize", checkMaximized);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      // ⚠️ إلغاء اشتراك هذا الخطاف فقط عبر الدوال المرجعة من EventsOn —
      // استدعاء EventsOff الشامل هنا كان يحذف اشتراكات نسخ الخطاف الأخرى
      // (App + DesktopMenuBar + شاشة القفل تشترك بنفس أسماء الأحداث)
      // فيتوقف بعضها عن استقبال دفعات Go اللحظية.
      unbindMax?.();
      unbindFs?.();
      if (verifyTimerRef.current) {
        clearTimeout(verifyTimerRef.current);
        verifyTimerRef.current = null;
      }
    };
  }, [checkMaximized, checkFullscreen]);

  // تحقق لاحق واحد مُدار — الدفع اللحظي من Go هو المصدر الأساسي، وهذا
  // مجرد شبكة أمان لحالات لا يصل فيها الحدث (بيئة متصفح/اختبار)
  const scheduleVerify = (check: () => void, delay: number) => {
    if (verifyTimerRef.current) {
      clearTimeout(verifyTimerRef.current);
    }
    verifyTimerRef.current = setTimeout(() => {
      verifyTimerRef.current = null;
      check();
    }, delay);
  };

  const handleMinimize = () => {
    try {
      WindowMinimise();
    } catch {
      // non-desktop environment (متصفح/اختبار): لا شيء لتصغيره
    }
  };
  const handleMaximize = async () => {
    try {
      WindowToggleMaximise();
    } catch {
      return;
    }
    scheduleVerify(checkMaximized, 200);
  };
  const handleClose = () => {
    try {
      WindowClose();
    } catch {
      // non-desktop environment
    }
  };
  const handleToggleFullscreen = async () => {
    try {
      WindowToggleFullscreen();
    } catch {
      return;
    }
    scheduleVerify(checkFullscreen, 200);
  };

  return {
    isMaximized,
    isFocused,
    isFullscreen,
    handleMinimize,
    handleMaximize,
    handleClose,
    handleToggleFullscreen,
  };
}
