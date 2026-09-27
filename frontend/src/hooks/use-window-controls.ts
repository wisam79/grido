import { useState, useEffect, useCallback } from 'react';
import {
  WindowMinimise,
  WindowToggleMaximise,
  Quit as WindowClose,
  WindowIsMaximised,
} from '../../wailsjs/runtime/runtime';

/**
 * useWindowControls — يدير حالة نافذة التطبيق (تكبير/تصغير/إغلاق/تركيز)
 * مع تتبع دقيق وفوري لحالة التكبير عبر أحداث Wails v3 الأصلية.
 *
 * ### لماذا أحداث أصلية بدل `resize` + polling؟
 * 1. `resize` لا يُطلَق دائماً عند التكبير عبر Win+Up أو Snap Assist
 * 2. مقارنة `outerWidth >= screen.availWidth` تعطي نتائج خاطئة مع DPI > 100%
 * 3. `setTimeout(100ms)` يتسبب في تأخير بصري لتبديل أيقونة التكبير/الاستعادة
 *
 * ### الأحداث المُشترك فيها:
 * - `windows:WindowMaximise`   → isMaximized = true
 * - `windows:WindowUnMaximise` → isMaximized = false
 * - `windows:WindowRestore`    → isMaximized = false (Snap restore أو Win+Down)
 */
export function useWindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFocused, setIsFocused] = useState(true);

  // قراءة الحالة الابتدائية مرة واحدة عند التحميل — ضرورية لأن النافذة قد تكون
  // مفتوحة بالفعل في وضع التكبير (StartState = Maximised) قبل اشتراك الأحداث
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

    // ── أحداث Wails v3 الأصلية لتتبع حالة التكبير فورياً ──────────────
    // هذه الأحداث تُطلَق من محرك Wails في كل حالة:
    // نقر زر التكبير، Win+Up/Down، سحب شريط العنوان، Snap Assist، API مباشر.
    const handleMaximise = () => setIsMaximized(true);
    const handleUnMaximise = () => setIsMaximized(false);
    const handleRestore = () => setIsMaximized(false);

    // Wails v3 يبث أحداث النافذة كـ CustomEvent على window بالاسم الكامل
    window.addEventListener('windows:WindowMaximise', handleMaximise);
    window.addEventListener('windows:WindowUnMaximise', handleUnMaximise);
    window.addEventListener('windows:WindowRestore', handleRestore);

    // ── أحداث التركيز (Focus/Blur) ─────────────────────────────────────
    // تُستخدم لتبهيت شريط العنوان عند فقدان التركيز (سلوك Windows 11 الأصلي)
    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('windows:WindowMaximise', handleMaximise);
      window.removeEventListener('windows:WindowUnMaximise', handleUnMaximise);
      window.removeEventListener('windows:WindowRestore', handleRestore);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [syncInitialState]);

  const handleMinimize = useCallback(() => WindowMinimise(), []);

  const handleMaximize = useCallback(() => {
    WindowToggleMaximise();
    // لا حاجة لـ setTimeout — الحدث الأصلي سيصل فورياً ويحدّث isMaximized
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
