import { toast } from 'sonner';

import { createLogger } from '@/lib/logger';
import { formatSolvableError } from '@/lib/ui/ui-compliance';

import {
  ML_INGEST_SIZE,
  buildIngestCanvas,
  captureIngestFrame,
  ingestPointToSource,
  maskQuadOnIngest,
  releaseIngestCanvas,
} from './ml-ingest';
import {
  applyNMS,
  addManualDocumentQuad,
  splitQuadIntoIdCards,
  splitQuadIntoIdCardsWithSeam,
  SPLIT_SEAM_RATIO_DEFAULT,
} from './multi-doc-segmenter';
import {
  computePolygonArea,
  sortCornerPoints,
  rectifyNearAxisAlignedQuad,
  inferSmartDocumentAspect,
  isIdCardAspectRatio,
} from './quad-geometry';
import { STACKED_SPLIT_MIN_RATIO, STACKED_SPLIT_MAX_RATIO } from './types';

import type { Point, DetectedDocument, DetectionMode, DetectionResult } from './types';

const logger = createLogger('ml-orchestrator');

/**
 * 🧭 منسّق الكشف العصبي — المرحلة 3 من خطة ترحيل الماسح
 * (docs/plans/neural-scanner-warp-migration-spec.md §5.1).
 *
 * المسار الوحيد للكشف بعد إزالة OpenCV: ML عابر للتمريرات (multi يعتّم
 * المكتشف ويعيد الاستدلال) → NMS → شطر البطاقات المكدّسة (هندسة دلالة
 * بتوريث aspectType إجبارياً). عند فشل/مهلة ML: defaultInsetCorners +
 * إرشاد يدوي (SCN-DETECT-01) — **لا مسار رؤية كلاسيكي إطلاقاً**.
 *
 * العتبات المهاجرة من detect-fusion (المحذوف) بمسمياتها:
 */

/** ثقة الدخول للمستند الأول (تمريرة 1). */
const ML_STANDALONE_MIN = 0.55;
/** ثقة المستند الإضافي في التمريرات اللاحقة (أصعب — تعتبر أعلى). */
const ML_ADD_MIN_SCORE = 0.6;
/** سقف تمريرات multi. */
const ML_MAX_PASSES = 3;
/** مهلة ساعة العامل الكلية لكل عملية كشف (نمط 1.42 المحمي). */
const ML_WORKER_TIMEOUT_MS = 8_000;

export { addManualDocumentQuad, splitQuadIntoIdCards };
export { ML_INGEST_SIZE };

/**
 * الأركان الافتراضية بإزاحة 5% — مصدر واحد بدل 5 نسخ مكررة
 * (الكاشف، الهوك، الحوار). اسم تاريخي محفوظ.
 */
export function defaultInsetCorners(w: number, h: number, insetRatio = 0.05): Point[] {
  const padX = Math.floor(w * insetRatio);
  const padY = Math.floor(h * insetRatio);
  return [
    { x: padX, y: padY },
    { x: w - padX, y: padY },
    { x: w - padX, y: h - padY },
    { x: padX, y: h - padY },
  ];
}

// ---------------------------------------------------------------------------
// حقن المحرك للاختبارات (بديل setScanicModuleForTesting — jsdom بلا Worker/WASM)
// ---------------------------------------------------------------------------

export interface MlEngineResult {
  corners: Point[];
  score: number | null;
}

export type MlEngine = (
  data: Uint8ClampedArray,
  sw: number,
  sh: number,
  minScore: number | undefined,
) => Promise<MlEngineResult | null>;

let engineOverride: MlEngine | null = null;

/** مخصص للاختبارات: يحل محرك ML بدل عامل الويب الحقيقي. */
export function setMlEngineForTesting(engine: MlEngine | null): void {
  engineOverride = engine;
}

// ---------------------------------------------------------------------------
// عميل العامل العصبي (نمط detector-worker-client مع قواعد دورة الحياة §6)
// ---------------------------------------------------------------------------

interface MlWorkerResponse {
  type: 'success' | 'error';
  requestId: number;
  corners?: Array<{ x: number; y: number }>;
  score?: number | null;
  error?: string;
}

export class MlWorkerClient {
  private worker: Worker | null = null;
  private nextRequestId = 1;
  private pending = new Map<
    number,
    { resolve: (r: MlWorkerResponse) => void; timer: ReturnType<typeof setTimeout> }
  >();

  isAvailable(): boolean {
    return typeof window !== 'undefined' && typeof Worker !== 'undefined';
  }

  private ensureWorker(): Worker | null {
    if (this.worker) return this.worker;
    if (!this.isAvailable()) return null;
    try {
      const worker = new Worker(
        new URL('../../../../workers/scanner-ml.worker.ts', import.meta.url),
        {
          type: 'module',
        },
      );
      worker.onmessage = (event: MessageEvent<MlWorkerResponse>) => {
        const message = event.data;
        if (!message || typeof message.requestId !== 'number') return;
        const pending = this.pending.get(message.requestId);
        if (!pending) return;
        this.pending.delete(message.requestId);
        clearTimeout(pending.timer);
        pending.resolve(message);
      };
      // 🛡️ أي عطل داخلي = قتل فوري وتصفير المرجع — الطلب القادم يبني عاملاً نظيفاً
      worker.onerror = (event: ErrorEvent) => {
        this.terminate(new Error(event.message || 'فشل عامل الكشف العصبي'));
      };
      this.worker = worker;
      return worker;
    } catch (error) {
      logger.warn('Failed to initialize ML worker:', error);
      this.worker = null;
      return null;
    }
  }

  /** يرسل إطار الابتلاع — المخزن منقول (transfer) لا منسوخ. */
  detect(
    buffer: ArrayBuffer,
    sw: number,
    sh: number,
    minScore: number | undefined,
    assetBaseUrl: string,
  ): Promise<MlWorkerResponse> {
    const worker = this.ensureWorker();
    if (!worker) return Promise.reject(new Error('ML worker unavailable'));

    const requestId = this.nextRequestId++;
    return new Promise<MlWorkerResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        // 🛡️ قتل فوري عند المهلة لتحرير كومة WASM (نمط 1.42 المحمي)
        this.terminate(new Error('ML worker timed out'));
        reject(new Error('ML worker timed out'));
      }, ML_WORKER_TIMEOUT_MS);

      this.pending.set(requestId, { resolve, timer });

      try {
        worker.postMessage({ type: 'detect', requestId, buffer, sw, sh, minScore, assetBaseUrl }, [
          buffer,
        ]);
      } catch (error) {
        this.pending.delete(requestId);
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error('تعذّر إرسال طلب الكشف'));
      }
    });
  }

  /** تهيئة النموذج داخل العامل مسبقاً (تسخين عند فتح الحوار). */
  warmup(assetBaseUrl: string): void {
    const worker = this.ensureWorker();
    if (!worker) return;
    try {
      worker.postMessage({ type: 'warmup', requestId: this.nextRequestId++, assetBaseUrl });
    } catch {
      /* ignore */
    }
  }

  /** إنهاء العامل ورفض كل الطلبات المعلقة (لا إعادة استخدام عامل ميت). */
  terminate(error: Error = new Error('تم إنهاء عامل الكشف العصبي')): void {
    const pending = Array.from(this.pending.values());
    this.pending.clear();
    for (const entry of pending) {
      clearTimeout(entry.timer);
      // العامل مات — الطلبات تُرفض وتُعرض رسالة الإرشاد بدل التعليق
      entry.resolve({ type: 'error', requestId: -1, error: error.message });
    }
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {
        /* ignore */
      }
      this.worker = null;
    }
  }
}

const mlWorkerClient = new MlWorkerClient();

/** تسخين النموذج العصبي داخل العامل عند فتح الحوار (نمط requestIdleCallback). */
export function warmupMlDetector(): void {
  mlWorkerClient.warmup(getScanicAssetBaseUrl());
}

/** إنهاء عامل ML وتحرير كومة WASM — يُستدعى عند إغلاق الماسح. */
export function terminateMlWorker(): void {
  mlWorkerClient.terminate();
}

/** مسار أصول نموذج scanic محلياً (يُمرر للعامل لأنه بلا window.location). */
export function getScanicAssetBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    const base = import.meta.env?.BASE_URL || '/';
    const cleanBase = base.endsWith('/') ? base : `${base}/`;
    return `${window.location.origin}${cleanBase}models/scanic/`;
  }
  return '/models/scanic/';
}

// ---------------------------------------------------------------------------
// التحقق الدلالي (منقول من ml-detector: تحدب + مساحة + تسوية + استنتاج نوع)
// ---------------------------------------------------------------------------

function isConvexQuad(sorted: Point[]): boolean {
  let firstSign = 0;
  for (let i = 0; i < 4; i++) {
    const a = sorted[(i + 3) % 4];
    const b = sorted[i];
    const c = sorted[(i + 1) % 4];
    const cross = (a.x - b.x) * (c.y - b.y) - (a.y - b.y) * (c.x - b.x);
    const sign = cross > 0 ? 1 : cross < 0 ? -1 : 0;
    if (sign === 0) return false;
    if (firstSign === 0) firstSign = sign;
    else if (sign !== firstSign) return false;
  }
  return true;
}

interface ValidatedQuad {
  corners: Point[];
  score: number;
}

/** فحص نسبة ID-1 لمضلع (يعتمد isIdCardAspectRatio — مصدر واحد للحقيقة). */
function isIdCardAspectQuad(quad: Point[]): boolean {
  const s = sortCornerPoints(quad);
  const w = Math.hypot(s[1].x - s[0].x, s[1].y - s[0].y);
  const h = Math.hypot(s[3].x - s[0].x, s[3].y - s[0].y);
  if (w <= 0 || h <= 0) return false;
  return isIdCardAspectRatio(Math.max(w / h, h / w));
}

/** يحوّل رد استدلال خاماً إلى مضلع مستند صالح (تُرفض المشوشات مبكراً). */
function validateRawQuad(
  rawCorners: Array<{ x: number; y: number }>,
  score: number | null,
  srcW: number,
  srcH: number,
  minScore: number,
): ValidatedQuad | null {
  if (rawCorners.length !== 4) return null;
  const rawScore = typeof score === 'number' && !Number.isNaN(score) ? score : 0.85;
  if (rawScore < minScore) return null;

  const sorted = sortCornerPoints(rawCorners as Point[]);
  if (!isConvexQuad(sorted)) return null;

  // رفض المضلعات الصغيرة جداً (< 1.5% من الصورة) — تشويش وليس مستنداً
  if (computePolygonArea(sorted) < srcW * srcH * 0.015) return null;

  const rectified = rectifyNearAxisAlignedQuad(sorted);
  return { corners: rectified, score: Math.max(0, Math.min(1, rawScore)) };
}

// ---------------------------------------------------------------------------
// المنسّق: تمريرات متكررة + NMS + شطر دلالي
// ---------------------------------------------------------------------------

async function runOnePass(
  ingest: ReturnType<typeof buildIngestCanvas>,
  srcW: number,
  srcH: number,
  minScore: number | undefined,
): Promise<ValidatedQuad | null> {
  if (engineOverride) {
    const ctx = ingest.canvas.getContext('2d') as CanvasRenderingContext2D | null;
    if (!ctx) return null;
    const data = ctx.getImageData(0, 0, ingest.size, ingest.size).data;
    const result = await engineOverride(data, ingest.size, ingest.size, minScore);
    if (!result) return null;
    return validateRawQuad(result.corners, result.score, srcW, srcH, minScore ?? ML_STANDALONE_MIN);
  }

  const frame = captureIngestFrame(ingest, srcW, srcH);
  if (!frame) return null;
  try {
    const response = await mlWorkerClient.detect(
      frame.buffer,
      frame.width,
      frame.height,
      minScore,
      getScanicAssetBaseUrl(),
    );
    if (response.type !== 'success' || !response.corners || response.corners.length !== 4) {
      return null;
    }
    // الأركان وصلت بفضاء الابتلاع — الرفع لفضاء المصدر المعروض (عكس الـletterbox)
    const sourceCorners = response.corners.map((p) =>
      ingestPointToSource(p.x, p.y, frame, srcW, srcH),
    );
    const rawScore = typeof response.score === 'number' ? response.score : null;
    return validateRawQuad(sourceCorners, rawScore, srcW, srcH, minScore ?? ML_STANDALONE_MIN);
  } catch (error) {
    logger.warn('ML pass failed:', error);
    return null;
  }
}

function buildDoc(idx: number, quad: ValidatedQuad): DetectedDocument {
  const aspectType = inferSmartDocumentAspect(quad.corners);
  return {
    id: `doc-${idx + 1}`,
    corners: quad.corners,
    confidence: quad.score,
    label: aspectType === 'id_card' ? `مستند ${idx + 1} (بطاقة هوية)` : `مستند ${idx + 1}`,
    aspectType,
  };
}

/**
 * نقطة الدخول الشاملة للكشف (الاسم التاريخي المحفوظ): ML حصراً عبر
 * العامل بتمريرات متكررة، ثم NMS والشطر الدلالي — انظر §5.1.
 */
export async function detectDocumentAuto(
  src: HTMLCanvasElement | HTMLImageElement,
  originalWidth: number,
  originalHeight: number,
  mode: DetectionMode = 'single',
): Promise<DetectionResult> {
  const fallbackCorners = defaultInsetCorners(originalWidth, originalHeight);
  const fallbackDoc: DetectedDocument = {
    id: 'doc-1',
    corners: fallbackCorners,
    confidence: 0.5,
    label: 'مستند 1',
    aspectType: 'free',
  };

  try {
    const ingest = buildIngestCanvas(src as HTMLImageElement, ML_INGEST_SIZE);
    try {
      const found: ValidatedQuad[] = [];

      // تمريرة 1: المستند الأول
      const first = await runOnePass(ingest, originalWidth, originalHeight, undefined);
      if (first) found.push(first);

      // mode=multi فقط: تعتيم المكتشف وإعادة الاستدلال حتى السقف
      if (mode === 'multi' && found.length > 0) {
        for (let pass = 1; pass < ML_MAX_PASSES; pass++) {
          const last = found[found.length - 1];
          const scale = Math.min(ML_INGEST_SIZE / originalWidth, ML_INGEST_SIZE / originalHeight);
          const ok = maskQuadOnIngest(
            ingest,
            last.corners.map((p) => ({ x: p.x * scale, y: p.y * scale })),
          );
          if (!ok) break;
          const next = await runOnePass(ingest, originalWidth, originalHeight, ML_ADD_MIN_SCORE);
          if (!next) break;
          found.push(next);
        }
      }

      if (found.length === 0) {
        // فشل ML بلا استثناء — رجوع إرشادي صامت (لا تعليق)
        return {
          corners: fallbackCorners,
          confidence: 0.5,
          method: 'default',
          documents: [fallbackDoc],
        };
      }

      // NMS القائم (عتبات overlap-tuning كما هي)
      const candidates = found.map((q) => ({ quad: q.corners, score: q.score }));
      const selected = applyNMS(candidates);

      // 🌟 شطر البطاقات المكدّسة — هندسة دلالة نقية (بلا تدرجات/كنتورات):
      // نسبة المضلع داخل نافذة البطاقتين + كلا النصفين بنسبة ID-1 ⇒ قسمان
      // بتوريث aspectType='id_card' من المُقسِّط نفسه (مهارة §4 — القاعدة المحكمة)
      const docs: DetectedDocument[] = [];
      for (const cand of selected) {
        const sorted = sortCornerPoints(cand.quad);
        const cw = Math.hypot(sorted[1].x - sorted[0].x, sorted[1].y - sorted[0].y);
        const ch = Math.hypot(sorted[3].x - sorted[0].x, sorted[3].y - sorted[0].y);
        const ratio = ch > 0 ? cw / ch : 0;
        const inStackedWindow =
          ratio >= STACKED_SPLIT_MIN_RATIO && ratio <= STACKED_SPLIT_MAX_RATIO;

        let splitDocs: DetectedDocument[] | null = null;
        if (inStackedWindow) {
          const cards = splitQuadIntoIdCardsWithSeam(
            cand.quad,
            'vertical',
            SPLIT_SEAM_RATIO_DEFAULT,
            (pair) => pair.length === 2 && pair.every((c) => isIdCardAspectQuad(c.corners)),
          );
          if (cards.length === 2 && cards.every((c) => isIdCardAspectQuad(c.corners))) {
            splitDocs = cards;
          }
        }

        if (splitDocs) {
          const baseIdx = docs.length;
          splitDocs.forEach((card, cardIdx) => {
            docs.push(buildDoc(baseIdx + cardIdx, { corners: card.corners, score: cand.score }));
          });
        } else {
          docs.push(buildDoc(docs.length, { corners: cand.quad, score: cand.score }));
        }
      }

      return {
        corners: docs[0].corners,
        confidence: docs[0].confidence,
        method: 'scanic',
        documents: docs,
      };
    } finally {
      releaseIngestCanvas(ingest);
    }
  } catch (error) {
    logger.warn('ML detection failed:', error);
    if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test') {
      toast.error(
        formatSolvableError({
          reason: 'تعذر إتمام الكشف التلقائي',
          fix: 'تأكد من وضوح الصورة ثم اضغط كشف تلقائي مجدداً أو اضبط الأركان يدوياً',
          code: 'SCN-DETECT-01',
        }),
      );
    }
    return {
      corners: fallbackCorners,
      confidence: 0.5,
      method: 'default',
      documents: [fallbackDoc],
    };
  }
}
