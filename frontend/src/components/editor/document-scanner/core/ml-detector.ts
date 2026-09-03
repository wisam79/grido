import { Point, DetectedDocument, DetectionResult } from "./types";
import {
  sortCornerPoints,
  inferSmartDocumentAspect,
  computeQuadOrthogonality,
  evaluateVanishingPointPhysics,
  rectifyNearAxisAlignedQuad,
} from "./quad-geometry";
import { refineCornersSubPixel } from "./perspective-warper";

let scanicModulePromise: Promise<typeof import("scanic")> | null = null;
let isWarmingUp = false;
let isWarmedUp = false;

/**
 * مخصص للاختبارات الأوتوماتيكية لمحاكاة استجابة scanic
 */
export function setScanicModuleForTesting(mock: any): void {
  scanicModulePromise = mock ? Promise.resolve(mock) : null;
}

/**
 * الحصول على مسار أصول نموذج scanic محلياً من التطبيق
 */
export function getScanicAssetBaseUrl(): string {
  if (typeof window !== "undefined" && window.location) {
    const origin = window.location.origin;
    const base = (import.meta as any)?.env?.BASE_URL || "/";
    const cleanBase = base.endsWith("/") ? base : `${base}/`;
    return `${origin}${cleanBase}models/scanic/`;
  }
  return "/models/scanic/";
}

async function getScanic(): Promise<typeof import("scanic")> {
  if (scanicModulePromise) {
    return scanicModulePromise;
  }
  scanicModulePromise = import("scanic");
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
    if (typeof (scanic as any)?.Scanner === "function") {
      const baseUrl = getScanicAssetBaseUrl();
      const scanner = new (scanic as any).Scanner({
        detector: "ml",
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
  originalHeight: number
): Promise<DetectionResult | null> {
  try {
    const scanic = await getScanic();
    if (!scanic || typeof scanic.scanDocument !== "function") {
      return null;
    }

    const baseUrl = getScanicAssetBaseUrl();
    const scanPromise = scanic.scanDocument(src, {
      detector: "ml",
      mode: "detect",
      ml: {
        assetBaseUrl: baseUrl,
        modelUrl: `${baseUrl}doccornernet_lean.ort`,
        wasmPaths: baseUrl,
        modelFetchTimeoutMs: 4000,
      },
    });

    // مهلة إجمالية تمنع تجميد المعالجة وتغطي التحميل البارد على الأجهزة الضعيفة
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 4500)
    );

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
      if (!p || typeof p.x !== "number" || isNaN(p.x) || typeof p.y !== "number" || isNaN(p.y)) {
        return null;
      }
    }

    // ترتيب الأركان باتجاه عقارب الساعة وفق معيار Grido
    const sorted = sortCornerPoints(rawCorners);

    // صقل الأركان بالبكسل الفرعي بناءً على تباين موتر الهيكل
    const refineRadius = Math.max(
      6,
      Math.min(22, Math.round(Math.max(originalWidth, originalHeight) / 280))
    );
    const refined = refineCornersSubPixel(
      sorted,
      src,
      originalWidth,
      originalHeight,
      refineRadius
    );

    // فحص السلامة الهندسية والفيزيائية لمخرجات الذكاء الاصطناعي
    const ortho = computeQuadOrthogonality(refined);
    const physics = evaluateVanishingPointPhysics(refined);
    if (ortho < 0.35 || physics < 0.30) {
      // المضلع مشوه أو به انحراف شاذ، نمرر المعالجة لمحركات OpenCV / JS الهندسية
      return null;
    }

    // تقويم وتسوية الأركان إذا كان المستند ممسوحاً أو موضوعاً أفقياً لمنع أي ميلان طفيف
    const rectified = rectifyNearAxisAlignedQuad(refined);

    // اعتماد الثقة الحقيقية الصادرة من النموذج دون فرض أرضية زائفة
    const rawScore =
      typeof result.score === "number" && !isNaN(result.score)
        ? result.score
        : typeof result.confidence === "number" && !isNaN(result.confidence)
        ? result.confidence
        : 0.85;
    const confidence = Math.max(0.0, Math.min(1.0, rawScore));

    const aspectType = inferSmartDocumentAspect(rectified);

    const doc: DetectedDocument = {
      id: "doc-1",
      corners: rectified,
      confidence,
      label: aspectType === "id_card" ? "مستند 1 (بطاقة هوية)" : "مستند 1",
      aspectType,
    };

    return {
      corners: rectified,
      confidence,
      method: "scanic",
      documents: [doc],
    };
  } catch (err) {
    if (typeof process !== "undefined" && process.env?.NODE_ENV === "development" && !process.env?.VITEST) {
      console.debug("[ML-Detector] AI detection fallback triggered:", err);
    }
    return null;
  }
}
