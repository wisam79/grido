/// <reference lib="webworker" />

/**
 * cv-worker-probe.worker.ts — مسبار جدوى: هل يعمل OpenCV.js داخل Web Worker؟
 *
 * الغرض: المرحلة 3 من خطة الأداء (نقل كشف OpenCV/scanic خارج الخيط الرئيسي)
 * مشروطة بإثبات أنّ محرك OpenCV (WASM) يعمل داخل عامل. حزمة
 * `@techstark/opencv-js` مغلّفة UMD فرعها الخاص بالـWeb Worker، لكنّ التهيئة
 * (تحليل 13MB WASM) ورمز `document` داخل بعض المسارات قد يُفشل التشغيل.
 *
 * هذا المسبار لا يُستدعى من كود التطبيق ولا يدخل في حزمة الإنتاج — هو فحص
 * مُؤتمت (Playwright) يحسم صلاحية المرحلة 3 قبل بنائها.
 *
 * إن أعاد `ok: true` مع عدّادات كفاف غير صفرية فالمرحلة 3 ممكنة تقنياً.
 */

import type { CvRuntimeLike } from '../components/editor/document-scanner/core/cv-types';

export interface CvWorkerProbeResult {
  ok: boolean;
  hasMat: boolean;
  contours: number;
  error?: string;
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

function hasMatConstructor(value: unknown): boolean {
  return (
    !!value && typeof value === 'object' && typeof (value as { Mat?: unknown }).Mat === 'function'
  );
}

/** يحلّ كائن cv، سواء من استيراد الحزمة أو من العامل العالمي. */
async function resolveCvRuntime(): Promise<CvRuntimeLike | null> {
  const candidates: unknown[] = [];

  try {
    const mod = (await import('@techstark/opencv-js')) as unknown as { default?: unknown };
    candidates.push(mod?.default ?? mod);
  } catch {
    // الاستيراد قد يفشل (الحزمة UMD) — نكمل بالاعتماد على العامل العالمي.
  }

  candidates.push((globalThis as { cv?: unknown }).cv);

  for (const candidate of candidates) {
    if (!candidate) continue;

    // المصنع يعيد وعداً يُحلّ عند جاهزية WASM (وليس الكائن نفسه).
    let resolved: unknown = candidate;
    if (typeof (resolved as { then?: unknown }).then === 'function') {
      try {
        resolved = await (resolved as Promise<unknown>);
      } catch {
        continue;
      }
    }

    if (hasMatConstructor(resolved)) {
      return resolved as unknown as CvRuntimeLike;
    }
  }

  return null;
}

async function runProbe(): Promise<CvWorkerProbeResult> {
  const result: CvWorkerProbeResult = { ok: false, hasMat: false, contours: 0 };

  try {
    const cv = await resolveCvRuntime();
    if (!cv) {
      result.error = 'OpenCV runtime unavailable in worker';
      return result;
    }
    result.hasMat = true;

    // صورة اختبار: مربع أبيض على خلفية رمادية داخل OffscreenCanvas.
    const canvas = new OffscreenCanvas(64, 64);
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) {
      result.error = 'OffscreenCanvas 2d context unavailable';
      return result;
    }
    ctx2d.fillStyle = '#888888';
    ctx2d.fillRect(0, 0, 64, 64);
    ctx2d.fillStyle = '#ffffff';
    ctx2d.fillRect(16, 16, 32, 32);

    const imgData = ctx2d.getImageData(0, 0, 64, 64);
    const srcMat = cv.matFromImageData(imgData);
    const grayMat = new cv.Mat();
    const edgesMat = new cv.Mat();
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();

    try {
      cv.cvtColor(srcMat, grayMat, cv.COLOR_RGBA2GRAY);
      cv.Canny(grayMat, edgesMat, 50, 150);
      cv.findContours(edgesMat, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
      result.contours = contours.size();
    } finally {
      srcMat.delete();
      grayMat.delete();
      edgesMat.delete();
      contours.delete();
      hierarchy.delete();
    }

    result.ok = true;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

ctx.onmessage = () => {
  void runProbe().then((result) => {
    ctx.postMessage(result);
  });
};
