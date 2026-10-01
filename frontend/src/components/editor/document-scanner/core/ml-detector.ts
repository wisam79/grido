import { Point, DetectedDocument, DetectionResult } from './types';
import {
  sortCornerPoints,
  inferSmartDocumentAspect,
  rectifyNearAxisAlignedQuad,
} from './quad-geometry';
import { computePolygonArea } from './contour-tracer';

let scanicModulePromise: Promise<typeof import('scanic')> | null = null;
let isWarmingUp = false;
let isWarmedUp = false;

/**
 * مخصص للاختبارات الأوتوماتيكية لمحاكاة استجابة scanic
 */
export function setScanicModuleForTesting(mock: Partial<typeof import('scanic')> | null): void {
  scanicModulePromise = mock ? Promise.resolve(mock as typeof import('scanic')) : null;
}

/**
 * الحصول على مسار أصول نموذج scanic محلياً من التطبيق
 */
export function getScanicAssetBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    const base = import.meta.env?.BASE_URL || '/';
    const cleanBase = base.endsWith('/') ? base : `${base}/`;
    return `${origin}${cleanBase}models/scanic/`;
  }
  return '/models/scanic/';
}

async function getScanic(): Promise<typeof import('scanic')> {
  if (scanicModulePromise) {
    return scanicModulePromise;
  }
  // الفشل يُصفّر الكاش ليُعاد التحميل في المحاولة التالية — الوعد المرفوض
  // المخزن للأبد سابقاً كان يقتل مسار ML نهائياً بعد أول فشل عابر.
  scanicModulePromise = import('scanic').catch((err: unknown) => {
    if (scanicModulePromise) {
      scanicModulePromise = null;
    }
    throw err;
  });
  return scanicModulePromise;
}

/**
 * تسخين وتهيئة نموذج الذكاء الاصطناعي مسبقاً في الخلفية عبر صنف Scanner الرسمي
 */
export async function warmupMlDetector(): Promise<void> {
  if (isWarmingUp || isWarmedUp) return;
  isWarmingUp = true;
  try {
    const scanic = await getScanic();
    if (typeof (scanic as { Scanner?: unknown }).Scanner === 'function') {
      const baseUrl = getScanicAssetBaseUrl();
      const ScannerCtor = (
        scanic as unknown as {
          Scanner: new (options: unknown) => { initialize: () => Promise<void> };
        }
      ).Scanner;
      const scanner = new ScannerCtor({
        detector: 'ml',
        ml: {
          assetBaseUrl: baseUrl,
          modelUrl: `${baseUrl}doccornernet_lean.ort`,
          wasmPaths: baseUrl,
          modelFetchTimeoutMs: 4000,
        },
      });
      await scanner.initialize();
      isWarmedUp = true;
    }
  } catch {
    // التسخين المسبق غير حرج ولا يعيق تدفق الواجهة
  } finally {
    isWarmingUp = false;
  }
}

/**
 * كشف أركان المستند بالذكاء الاصطناعي عبر نموذج DocCornerNet
 */
export async function detectDocumentWithMl(
  src: HTMLCanvasElement | HTMLImageElement,
  originalWidth: number,
  originalHeight: number,
): Promise<DetectionResult | null> {
  try {
    const scanic = await getScanic();
    if (!scanic || typeof scanic.scanDocument !== 'function') {
      return null;
    }

    const baseUrl = getScanicAssetBaseUrl();
    const scanPromise = scanic.scanDocument(src, {
      detector: 'ml',
      mode: 'detect',
      ml: {
        assetBaseUrl: baseUrl,
        modelUrl: `${baseUrl}doccornernet_lean.ort`,
        wasmPaths: baseUrl,
        modelFetchTimeoutMs: 4000,
      },
    });

    // مهلة إجمالية تمنع تجميد المعالجة وتغطي التحميل البارد على الأجهزة الضعيفة
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4500));

    const result = await Promise.race([scanPromise, timeoutPromise]);

    if (!result || !result.success || !result.corners) {
      return null;
    }

    const rawCorners: Point[] = [
      result.corners.topLeft,
      result.corners.topRight,
      result.corners.bottomRight,
      result.corners.bottomLeft,
    ];

    // التأكد من صحة وسلامة الإحداثيات المستخرجة
    for (const p of rawCorners) {
      if (!p || typeof p.x !== 'number' || isNaN(p.x) || typeof p.y !== 'number' || isNaN(p.y)) {
        return null;
      }
    }

    // ترتيب الأركان باتجاه عقارب الساعة وفق معيار Grido
    const sorted = sortCornerPoints(rawCorners);

    // فحص السلامة الأساسية: المضلع محدب وغير منهار
    // (لا صقل بكسلي — النموذج مدرَّب على الأركان مباشرة،
    // و refineCornersSubPixel يجذب الأركان نحو النصوص/الأختام الداخلية)
    let convex = true;
    let firstSign = 0;
    for (let i = 0; i < 4; i++) {
      const a = sorted[(i + 3) % 4];
      const b = sorted[i];
      const c = sorted[(i + 1) % 4];
      const cross = (a.x - b.x) * (c.y - b.y) - (a.y - b.y) * (c.x - b.x);
      const sign = cross > 0 ? 1 : cross < 0 ? -1 : 0;
      if (sign === 0) {
        convex = false;
        break;
      }
      if (firstSign === 0) firstSign = sign;
      else if (sign !== firstSign) {
        convex = false;
        break;
      }
    }
    if (!convex) {
      return null;
    }

    // رفض المضلعات الصغيرة جداً (أقل من 1.5% من الصورة) — تشويش وليس مستنداً
    const quadArea = computePolygonArea(sorted);
    if (quadArea < originalWidth * originalHeight * 0.015) {
      return null;
    }

    // تقويم وتسوية الأركان إذا كان المستند ممسوحاً أو موضوعاً أفقياً لمنع أي ميلان طفيف
    const rectified = rectifyNearAxisAlignedQuad(sorted);

    // اعتماد الثقة الحقيقية الصادرة من النموذج دون فرض أرضية زائفة
    const rawScore =
      typeof result.score === 'number' && !isNaN(result.score)
        ? result.score
        : typeof result.confidence === 'number' && !isNaN(result.confidence)
          ? result.confidence
          : 0.85;
    const confidence = Math.max(0.0, Math.min(1.0, rawScore));

    const aspectType = inferSmartDocumentAspect(rectified);

    const doc: DetectedDocument = {
      id: 'doc-1',
      corners: rectified,
      confidence,
      label: aspectType === 'id_card' ? 'مستند 1 (بطاقة هوية)' : 'مستند 1',
      aspectType,
    };

    return {
      corners: rectified,
      confidence,
      method: 'scanic',
      documents: [doc],
    };
  } catch (err) {
    if (
      typeof process !== 'undefined' &&
      process.env?.NODE_ENV === 'development' &&
      !process.env?.VITEST
    ) {
      console.debug('[ML-Detector] AI detection fallback triggered:', err);
    }
    return null;
  }
}
