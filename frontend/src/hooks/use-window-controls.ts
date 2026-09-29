import { useState, useEffect, useCallback, useRef } from 'react';
import {
  WindowMinimise,
  WindowToggleMaximise,
  Quit as WindowClose,
  WindowIsMaximised,
  EventsOn,
} from '../../wailsjs/runtime/runtime';

/**
 * useWindowControls — يدير حالة نافذة التطبيق (تكبير/استعادة/تصغير/إغلاق/تركيز)
 * مع تتبع فوري ومزدوج لحالة التكبير عبر:
 * 1. التحديث التفاؤلي الفوري عند النقر (0ms latency).
 * 2. أحداث Wails v3 الأصلية عبر EventsOn ('windows:WindowMaximise', 'windows:WindowUnMaximise', 'window-maximized-changed').
 * 3. حدث resize على النافذة (مؤخَّر 120ms) كمزامنة احتياطية لما لا يلتقطه حدث Wails.
 */
export function useWindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  // مؤقّت التحقق التأكيدي بعد النقر — يُنظَّف عند كل نقرة وعند إلغاء التركيب
  const verifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // قراءة الحالة الابتدائية مرة واحدة عند التحميل
  const syncInitialState = useCallback(async () => {
    try {
      const max = await WindowIsMaximised();
      setIsMaximized(Boolean(max));
    } catch {
      // بيئة غير Wails (متصفح تطوير) — نترك false
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    syncInitialState();

    // ── 1. مزامنة احتياطية مؤخَّرة عند تغيير حجم النافذة (Double click, Snap, Win+Up/Down) ──
    // كانت كل دورة resize تستدعي IPC فورياً (عشرات الاستدعاءات أثناء سحبٍ واحد)،
    // والتأخير يجعلها استدعاءً واحداً بعد استقرار الحجم — ومسار Wails الأصلي
    // (window-maximized-changed) يظل المصدر الفوري من main.go.
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        WindowIsMaximised()
          .then((max) => setIsMaximized(Boolean(max)))
          .catch(() => {
            // بيئة بلا جسر Wails — لا حالة تكبير لتتبّعها
          });
      }, 120);
    };
    window.addEventListener('resize', handleResize);

    // ── 2. أحداث Wails v3 الأصلية لتتبع حالة التكبير والاستعادة ─────────
    const handleMaximise = () => setIsMaximized(true);
    const handleUnMaximise = () => setIsMaximized(false);
    const handleRestore = () => setIsMaximized(false);

    // الاشتراك عبر نظام أحداث Wails v3 الرسمي
    const unsubs: (() => void)[] = [];
    try {
      unsubs.push(EventsOn('windows:WindowMaximise', handleMaximise));
      unsubs.push(EventsOn('windows:WindowUnMaximise', handleUnMaximise));
      unsubs.push(EventsOn('windows:WindowRestore', handleRestore));
      unsubs.push(
        EventsOn('window-maximized-changed', (data: unknown) => {
          setIsMaximized(Boolean(data));
        }),
      );
    } catch {
      // بيئة المتصفح بدون Wails
    }

    // ── 3. أحداث التركيز (Focus/Blur) ──────────────────────────────────
    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      if (verifyTimerRef.current) clearTimeout(verifyTimerRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      unsubs.forEach((unsub) => {
        try {
          unsub();
        } catch {
          // مستمع Wails مُفرَّغ مسبقاً — التفريغ لا يفشل
        }
      });
    };
  }, [syncInitialState]);

  const handleMinimize = useCallback(() => WindowMinimise(), []);

  const handleMaximize = useCallback(() => {
    try {
      WindowToggleMaximise();
    } catch {
      // Safe fallback
    }
    // تبديل تفاؤلي فوري في الـ React state (0ms) حتى تتغير الأيقونة في لحظة النقر
    setIsMaximized((prev) => !prev);
    // التحقق التأكيدي من محرك Wails بعد 60ms لضمان مطابقة الـ OS الفعلي بدقة 100%
    if (verifyTimerRef.current) clearTimeout(verifyTimerRef.current);
    verifyTimerRef.current = setTimeout(async () => {
      try {
        const actual = await WindowIsMaximised();
        setIsMaximized(Boolean(actual));
      } catch {
        // بيئة بلا جسر Wails — التحديث التفاؤلي يكفي
      }
    }, 60);
  }, []);

  const handleClose = useCallback(() => WindowClose(), []);

  return {
    isMaximized,
    isFocused,
    handleMinimize,
    handleMaximize,
    handleClose,
  };
}
