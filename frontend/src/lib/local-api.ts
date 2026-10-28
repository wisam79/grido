import { GetLocalApiToken } from '@bindings/grido/app';

/**
 * عميل مسارات /api المحلية (Local API Client).
 *
 * لماذا توكن أصلاً؟ هذه المسارات تُنفّذ كتابة ملفات داخل مجلدات التطبيق
 * (Media/Exports) وقد تُظهر حوارات نظام، أي أنها تعمل بامتيازات التطبيق.
 * الخلفية تفرض عليها شرطين: أن يكون الأصل مطابقاً لمضيف الخادم، وأن تحمل
 * ترويسة `X-Grido-Session` بتوكن الجلسة العشوائي لهذه العملية.
 *
 * التوكن يُسلَّم للواجهة عبر ربط Wails وحده (IPC داخل العملية)، فلا تستطيع
 * صفحة ويب ولا عملية محلية الحصول عليه — وهذا ما يجعل فحص الأصل وحده غير كافٍ
 * وغيرَ قابل للاستغلال من أي عملية خارجية.
 *
 * ملاحظة تنفيذية: الجلب يُخزَّن مؤقتاً كوعد واحد (promise) لأن كل مسارات
 * الاستدعاء تعمل داخل نفس نافذة الويب — فلا نستدعي الربط لكل طلب ثنائي.
 * وفشل الجلب لا يُبتلع: الطلب يُرسل بترويسة فارغة فترفضه الخلفية بـ403،
 * وهذا سلوك مقصود (فشل مغلق) لا يُخفى على المستدعي.
 */

let tokenPromise: Promise<string> | null = null;

/** يعيد توكن جلسة مسارات /api (مع تخزين مؤقت للوعد الواحد). */
export function getLocalApiToken(): Promise<string> {
  if (!tokenPromise) {
    tokenPromise = Promise.resolve()
      .then(() => GetLocalApiToken())
      .then((token) => (typeof token === 'string' ? token : ''))
      .catch(() => '');
  }
  return tokenPromise;
}

/** يصفّر التوكن المخزّن — للاختبارات ولأي إعادة تهيئة مستقبلية. */
export function resetLocalApiTokenCache(): void {
  tokenPromise = null;
}

/**
 * يتحقق من توفر مسارات /api المحلية (بيئة تطوير/تطبيق، وليس file://).
 * يوحّد 4 شروط كانت مكررة في 4 ملفات (use-image-drop, clipboard-utils,
 * media-upload, export-project) — مصدر وحيد لـ "هل يمكننا استخدام fetchLocalApi؟".
 */
export function isLocalApiAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.location?.origin &&
    !window.location.origin.startsWith('file:') &&
    typeof fetch === 'function'
  );
}

/**
 * بديل `fetch` لمسارات /api المحلية: يضيف ترويسة توكن الجلسة ويمرّر الباقي
 * كما هو. لا يغيّر أي سلوك آخر (الطريقة، الجسم، الإلغاء، المهلة).
 */
export async function fetchLocalApi(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getLocalApiToken();
  const headers = new Headers(init.headers);
  headers.set('X-Grido-Session', token);
  return fetch(path, { ...init, headers });
}
