import { fetchLocalApi } from '@/lib/local-api';

/**
 * 🧹 triggerMemoryTrim — يستدعي خدمة تفريغ الذاكرة الأصلية في Go (MemoryService)
 * لتحرير صفحات الرام فوراً (EmptyWorkingSet) عبر خيط Go وعمليات WebView2 التابعة.
 */
export function triggerMemoryTrim(): void {
  if (typeof window === 'undefined') return;
  try {
    void fetchLocalApi('/api/trim-memory', { method: 'POST' }).catch(() => {});
  } catch {
    // Ignore any network/bridge errors in test/offline environments
  }
}
