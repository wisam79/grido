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
  return typeof window !== "undefined" && typeof window.go?.main?.App !== "undefined";
}
