import { fetchLocalApi } from '@/lib/local-api';

import { resolveTargetDims } from '../core/target-dims';

import type { DocumentAspectType, Point, ScannerFilterMode } from '../core/types';

/**
 * 🧭 عميل استعدال الماسح عبر Go — المرحلة 2 من خطة الترحيل
 * (docs/plans/neural-scanner-warp-migration-spec.md §4.3).
 *
 * الواجهة لا ترسل بايتات صور إطلاقاً: ترسل مسار الوسائط المحلي القائم +
 * الأركان في فضاء العرض (بعد EXIF) والأهداف، وGo يفكّ ويطبّع EXIF ويستعدل
 * ويصفّي ويدوّر ويرمّز PNG ويكتب ذرياً ويعيد رابط /local-image/ جاهزاً
 * للعرض والإدراج مباشرة (bitmap خارج V8 حصراً).
 */

export const SCANNER_WARP_ENDPOINT = '/api/scanner-warp';

export type ScannerWarpErrorCode =
  | 'SCN-WARP-01' // أركان تالفة/خارج الحدود/منحلّة
  | 'SCN-WARP-02' // تجاوز 50MP
  | 'SCN-WARP-03' // مصدر غير صالح/غير موجود
  | 'SCN-WARP-04' // فلتر/تدوير غير صالح
  | 'SCN-WARP-NET'; // شبكة/JSON/رد غير متوقع

export class ScannerWarpClientError extends Error {
  readonly code: ScannerWarpErrorCode;
  /** هل يُحاول المستدعى المسار الاحتياطي (JS) أم يعرض الرسالة مباشرة؟ */
  readonly solvable: boolean;

  constructor(code: ScannerWarpErrorCode, message: string, solvable = true) {
    super(message);
    this.name = 'ScannerWarpClientError';
    this.code = code;
    this.solvable = solvable;
  }
}

/** يعيد تصنيف أخطاء العميل إلى رسائل عربية قابلة للحل (formatSolvableError). */
export function formatScannerWarpError(error: unknown): string {
  if (error instanceof ScannerWarpClientError) return error.message;
  return 'تعذّر استعدال المستند — أعد المحاولة';
}

interface WarpResponse {
  status: string;
  url: string;
  width: number;
  height: number;
}

/**
 * يحسب أبعاد الإخراج (معاينة/تصدير) من أركان المستند ونوعه — نفس
 * resolveDocTargetDims السابق في use-scanner-processor، وبهذا يبقى
 * resolveTargetDims مصدر الحقيقة الوحيد بالسقف 50MP قبل أي نداء Go.
 */
export function resolveDocTargetDims(
  docCorners: Point[],
  docAspect: DocumentAspectType,
  isPreview: boolean,
): { targetW: number; targetH: number } {
  const topW = Math.hypot(docCorners[1].x - docCorners[0].x, docCorners[1].y - docCorners[0].y);
  const botW = Math.hypot(docCorners[2].x - docCorners[3].x, docCorners[2].y - docCorners[3].y);
  const leftH = Math.hypot(docCorners[3].x - docCorners[0].x, docCorners[3].y - docCorners[0].y);
  const rightH = Math.hypot(docCorners[2].x - docCorners[1].x, docCorners[2].y - docCorners[1].y);

  const maxEdgeW = Math.round(Math.max(topW, botW));
  const maxEdgeH = Math.round(Math.max(leftH, rightH));

  return resolveTargetDims(docAspect, isPreview, maxEdgeW, maxEdgeH);
}

/** ينفّذ الاستعدال عبر Go ويعيد رابط الوسائط المحلي للنتيجة وأبعادها. */
export async function warpDocumentViaGo(
  img: HTMLImageElement,
  docCorners: Point[],
  docAspect: DocumentAspectType,
  isPreview: boolean,
  filter: ScannerFilterMode,
  rotation: number,
): Promise<{ url: string; width: number; height: number }> {
  if (!img || docCorners.length !== 4) {
    throw new ScannerWarpClientError('SCN-WARP-01', 'أركان المستند غير مكتملة');
  }

  const sourceUrl = img.currentSrc || img.src;
  if (!sourceUrl || !sourceUrl.startsWith('/local-image/')) {
    throw new ScannerWarpClientError(
      'SCN-WARP-03',
      'مصدر الصورة ليس مسار وسائط محلياً — أعد فتح الماسح',
    );
  }

  const { targetW, targetH } = resolveDocTargetDims(docCorners, docAspect, isPreview);

  let response: Response;
  try {
    response = await fetchLocalApi(SCANNER_WARP_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceUrl,
        corners: docCorners,
        targetW,
        targetH,
        filter,
        rotation,
      }),
    });
  } catch {
    throw new ScannerWarpClientError(
      'SCN-WARP-NET',
      'تعذّر الاتصال بمحرك الاستعدال المحلي — أعد المحاولة',
    );
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || typeof payload !== 'object') {
    const err = (payload ?? {}) as { error?: string; code?: string };
    const knownCode = ['SCN-WARP-01', 'SCN-WARP-02', 'SCN-WARP-03', 'SCN-WARP-04'].includes(
      err.code ?? '',
    )
      ? (err.code as ScannerWarpErrorCode)
      : 'SCN-WARP-NET';
    throw new ScannerWarpClientError(
      knownCode,
      err.error && typeof err.error === 'string'
        ? err.error
        : 'تعذّر استعدال المستند — أعد المحاولة',
    );
  }

  const data = payload as Partial<WarpResponse>;
  if (data.status !== 'success' || typeof data.url !== 'string' || !data.url) {
    throw new ScannerWarpClientError('SCN-WARP-NET', 'رد غير متوقع من محرك الاستعدال');
  }
  return {
    url: data.url,
    width: typeof data.width === 'number' ? data.width : 0,
    height: typeof data.height === 'number' ? data.height : 0,
  };
}
