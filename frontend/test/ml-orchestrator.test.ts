import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  detectDocumentAuto,
  defaultInsetCorners,
  setMlEngineForTesting,
  ML_INGEST_SIZE,
} from '../src/components/editor/document-scanner/core/ml-orchestrator';
import { sortCornerPoints } from '../src/components/editor/document-scanner/perspective-transform';

import type { MlEngine } from '../src/components/editor/document-scanner/core/ml-orchestrator';
import type { Point } from '../src/components/editor/document-scanner/perspective-transform';

/**
 * 🧪 اختبارات منسّق الكشف العصبي — المرحلة 3 من ترحيل الماسح
 * (docs/plans/neural-scanner-warp-migration-spec.md §5.1 و§7 م3).
 *
 * جودة الكشف نفسها (دقة النموذج) تُقاس في E2E داخل متصفح حقيقي بالنموذج
 * الحقيقي — هنا نثبّت سلوك المنسّق: التمريرات، رفع الأركان من فضاء الابتلاع
 * إلى فضاء المصدر، NMS، الشطر الدلالي بتوريث aspectType، والرجوع الإرشادي.
 * المحرك يُحقن عبر setMlEngineForTesting (jsdom بلا Worker/WASM).
 */

function box(x: number, y: number, w: number, h: number): Point[] {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}

/** محرك وهمي يرد بقائمة أركان (بفضاء المصدر مباشرة — كأن الابتلاع مطابق 1:1). */
function engineWithQuads(quads: Point[][], scores: number[] = []): MlEngine {
  return async (_data, _sw, _sh, minScore) => {
    const idx = engineWithQuads.nextIndex % quads.length;
    engineWithQuads.nextIndex++;
    const quad = quads[idx];
    const score = scores[idx] ?? 0.9;
    if (score < (minScore ?? 0.55)) return null;
    return { corners: quad, score };
  };
}
engineWithQuads.nextIndex = 0;

describe('منسّق الكشف العصبي (ml-orchestrator)', () => {
  beforeEach(() => {
    engineWithQuads.nextIndex = 0;
  });
  afterEach(() => {
    setMlEngineForTesting(null);
  });

  function fakeImage(w: number, h: number): HTMLImageElement {
    // buildIngestCanvas يقرأ naturalWidth/Height ويرسم عبر محاكي الكانفاس —
    // jsdom بلا رسم فعلي، لكن القياسات تمر عبر drawImage الوهمي بلا أخطاء
    const img = { naturalWidth: w, naturalHeight: h, width: w, height: h } as HTMLImageElement;
    return img;
  }

  it('single: مستند واحد حصراً مهما أعاد المحرك', async () => {
    setMlEngineForTesting(engineWithQuads([box(20, 20, 200, 300), box(300, 20, 150, 150)]));
    const result = await detectDocumentAuto(fakeImage(640, 480), 640, 480, 'single');
    expect(result.documents).toBeDefined();
    expect(result.documents!).toHaveLength(1);
    expect(result.method).toBe('scanic');
  });

  it('multi: تمريرتان على مستندين متجاورين ⇒ مستندان', async () => {
    const left = box(10, 40, 260, 360);
    const right = box(330, 40, 260, 360);
    setMlEngineForTesting(engineWithQuads([left, right]));
    const result = await detectDocumentAuto(fakeImage(640, 480), 640, 480, 'multi');
    expect(result.documents!).toHaveLength(2);
    expect(result.method).toBe('scanic');
  });

  it('رفع الأركان: نتيجة فضاء الابتلاع تعود بفضاء المصدر (عكس الـletterbox)', async () => {
    // صورة 640×480 تُبتلع على 224×224 بletterbox جانبي — استرجاع مصدر 640×480
    // يجب أن يعيد إحداثيات المصدر بدقة معقولة (≤ بكسلان)
    const truth = box(64, 48, 512, 384);
    const scale = Math.min(ML_INGEST_SIZE / 640, ML_INGEST_SIZE / 480); // 224/640? لا: 224/480
    const drawW = Math.round(640 * scale);
    const offX = (ML_INGEST_SIZE - drawW) / 2;
    const ingestQuad = truth.map((p) => ({ x: p.x * scale + offX, y: p.y * scale }));
    setMlEngineForTesting(async () => ({ corners: ingestQuad, score: 0.9 }));

    const result = await detectDocumentAuto(fakeImage(640, 480), 640, 480, 'single');
    const got = sortCornerPoints(result.documents![0].corners);
    const want = sortCornerPoints(truth);
    for (let i = 0; i < 4; i++) {
      expect(Math.abs(got[i].x - want[i].x)).toBeLessThanOrEqual(2.5);
      expect(Math.abs(got[i].y - want[i].y)).toBeLessThanOrEqual(2.5);
    }
  });

  it('فشل المحرك ⇒ رجوع defaultInset بلا استثناء ولا تعليق', async () => {
    setMlEngineForTesting(async () => null);
    const result = await detectDocumentAuto(fakeImage(400, 300), 400, 300, 'single');
    expect(result.method).toBe('default');
    expect(result.documents!).toHaveLength(1);
    expect(result.documents![0].corners).toEqual(defaultInsetCorners(400, 300));
  });

  it('رمي المحرك ⇒ نفس الرجوع الآمن (try/catch المحيط)', async () => {
    setMlEngineForTesting(async () => {
      throw new Error('boom');
    });
    const result = await detectDocumentAuto(fakeImage(400, 300), 400, 300, 'single');
    expect(result.method).toBe('default');
  });

  it('مضلع مائل 15° يبقى id_card بعد rectifyNearAxisAlignedQuad', async () => {
    // بطاقة 200×126 مُدارة 15° حول مركزها — النسبة تظل داخل نافذة ID-1
    const cx = 320;
    const cy = 240;
    const rad = (15 * Math.PI) / 180;
    const base = box(-100, -63, 200, 126);
    const rotated = base.map((p) => ({
      x: p.x * Math.cos(rad) - p.y * Math.sin(rad) + cx,
      y: p.x * Math.sin(rad) + p.y * Math.cos(rad) + cy,
    }));
    setMlEngineForTesting(async () => ({ corners: rotated, score: 0.9 }));
    const result = await detectDocumentAuto(fakeImage(640, 480), 640, 480, 'single');
    expect(result.documents![0].aspectType).toBe('id_card');
  });

  it('بطاقتان مكدستان (نسبة النافذة المكدّسة) ⇒ شطر بتوريث id_card', async () => {
    // مضلع بنسبة ≈ 1.586/2 داخل نافذة STACKED_SPLIT — يُشطر لبطاقتين
    // ببطاقة id_card لكل منهما (توريث aspectType من المُقسِّط — القاعدة المحكمة)
    const stacked = box(120, 60, 320, 404); // 320/404 ≈ 0.79 — ضمن النافذة المقلوبة
    setMlEngineForTesting(async () => ({ corners: stacked, score: 0.9 }));
    const result = await detectDocumentAuto(fakeImage(640, 480), 640, 480, 'multi');
    expect(result.documents!).toHaveLength(2);
    for (const doc of result.documents!) {
      expect(doc.aspectType).toBe('id_card');
    }
  });

  it('NMS يخمد النسخ شبه المتطابقة بين التمريرات', async () => {
    const q = box(50, 50, 300, 380);
    const nearDuplicate = box(52, 51, 300, 380);
    setMlEngineForTesting(engineWithQuads([q, nearDuplicate]));
    const result = await detectDocumentAuto(fakeImage(640, 480), 640, 480, 'multi');
    expect(result.documents!).toHaveLength(1);
  });

  it('عتبة الثقة: التمريرة الأولى ترفض دون ML_STANDALONE_MIN والإضافية دون ML_ADD_MIN_SCORE', async () => {
    // ثقة 0.5 (< 0.55) في التمريرة الأولى ⇒ لا مستندات
    setMlEngineForTesting(engineWithQuads([box(50, 50, 300, 380)], [0.5]));
    const weak = await detectDocumentAuto(fakeImage(640, 480), 640, 480, 'single');
    expect(weak.method).toBe('default');

    // الأولى قوية (0.9) والثانية 0.58 (< 0.6 عتبة الإضافة) ⇒ مستند واحد فقط
    engineWithQuads.nextIndex = 0;
    const left = box(10, 40, 260, 360);
    const right = box(330, 40, 260, 360);
    setMlEngineForTesting(engineWithQuads([left, right], [0.9, 0.58]));
    const partial = await detectDocumentAuto(fakeImage(640, 480), 640, 480, 'multi');
    expect(partial.documents).toHaveLength(1);
  });

  it('مشهد كبير 4000×3000 — ذروة الابتلاع ثابتة 224 بغض النظر عن دقة المصدر', async () => {
    // الضمان المكاني B2/B3: مهما كانت دقة المصدر، الابتلاع 224×224 حصراً
    setMlEngineForTesting(async (data, sw, sh) => {
      expect(sw).toBe(ML_INGEST_SIZE);
      expect(sh).toBe(ML_INGEST_SIZE);
      expect(data.length).toBe(ML_INGEST_SIZE * ML_INGEST_SIZE * 4);
      return { corners: box(400, 300, 3200, 2400), score: 0.9 };
    });
    const result = await detectDocumentAuto(fakeImage(4000, 3000), 4000, 3000, 'single');
    expect(result.method).toBe('scanic');
    expect(result.documents!).toHaveLength(1);
  });
});
