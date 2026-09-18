// كشف بيئة Wails — مصدر واحد للحقيقة بدل تكرار (window as any).go في كل ملف
declare global {
  interface Window {
    go?: {
      main?: {
        App?: Record<string, unknown>;
      };
      handlers?: Record<string, Record<string, unknown>>;
    };
  }
}

/**
 * هل يعمل التطبيق داخل سطح مكتب Wails؟
 * Wails يحقن كائن window.go عند تشغيل الواجهة داخل WebView2.
 */
export function wailsIsDesktop(): boolean {
  if (typeof window === "undefined") return false;
  // 1) واجهة Wails v2 القديمة (window.go) — تبقى مقبولة لأن اختبارات الوحدة
  //    ومحاكي وضع التطوير يعرّفانها (frontend/test/setup.ts).
  if (typeof window.go?.main?.App !== "undefined") return true;
  // 2) إشارات Wails v3 الفعلية: ربطات v3 تستخدم @wailsio/runtime و$Call.ByID
  //    ولا تحقن window.go إطلاقاً — الكشف يعتمد على كائن زمن التشغيل أو ناقل WebView.
  const w = window as Window & {
    wails?: unknown;
    chrome?: { webview?: { postMessage?: unknown } };
    webkit?: { messageHandlers?: Record<string, unknown> };
  };
  return !!w.wails || !!w.chrome?.webview?.postMessage || !!w.webkit?.messageHandlers;
}
