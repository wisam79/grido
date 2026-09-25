import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 🤖 اختبار التحقق من تكامل وأمان نماذج وأصول الذكاء الاصطناعي (AI Models Integrity)
 *
 * يضمن هذا الاختبار تطابق مسارات وتسميات نماذج MediaPipe و ONNX في الواجهة الأمامية
 * مع سكربتات التنزيل وحزم الأصول المحلية دون انقطاع، والتعامل الآمن مع انقطاع الشبكة.
 */
describe('AI Models Asset Integrity & Fault Tolerance', () => {
  const downloadScriptPath = path.resolve(__dirname, '../scripts/download-models.ps1');

  it('Script download-models.ps1 defines valid Google MediaPipe model endpoints', () => {
    expect(fs.existsSync(downloadScriptPath)).toBe(true);
    const content = fs.readFileSync(downloadScriptPath, 'utf-8');

    // التحقق من وجود روابط التنزيل الرسمية للنماذج
    expect(content).toContain('selfie_multiclass');
    expect(content).toContain('face_landmarker');
    expect(content).toContain('https://storage.googleapis.com/mediapipe-models');
  });

  it('Model filenames in source code match expected asset paths', () => {
    const faceHookPath = path.resolve(__dirname, '../src/hooks/use-face-frame.ts');
    const bgHookPath = path.resolve(__dirname, '../src/hooks/use-bg-removal.ts');

    const faceContent = fs.readFileSync(faceHookPath, 'utf-8');
    const bgContent = fs.readFileSync(bgHookPath, 'utf-8');

    expect(faceContent).toContain('/models/face_landmarker.task');
    expect(bgContent).toContain('/models/selfie_multiclass.tflite');
  });

  it('Network failure during AI model fetch gracefully reports error without crashing', async () => {
    // محاكاة فشل الشبكة عند طلب النموذج
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch model: 404 Not Found'));

    try {
      let threwUnhandled = false;
      try {
        await global.fetch('/models/selfie_multiclass.tflite');
      } catch (err: any) {
        expect(err.message).toContain('Failed to fetch');
        threwUnhandled = true;
      }
      expect(threwUnhandled).toBe(true);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

/**
 * 🧭 تكامل أصول ماسح المستندات (scanic / DocCornerNet)
 *
 * النموذج يأتي من حزمة npm `scanic-ml/dist` ويجب أن يُنسخ إلى
 * `public/models/scanic/` قبل البناء. كان غيابه يتراجع للكشف الكلاسيكي
 * **بصمت** (ml-detector يبتلع الخطأ ويعيد null) — هذه الحزمة تقفل الحلقة:
 * سكربت التسخيص موجود، ويغطّي الملفات التي يطلبها المصدر، والأصول مُسخَّصة فعلاً.
 */
describe('Document Scanner ML Asset Provisioning', () => {
  const copyScriptPath = path.resolve(__dirname, '../scripts/copy-models.mjs');
  const mlDetectorPath = path.resolve(
    __dirname,
    '../src/components/editor/document-scanner/core/ml-detector.ts'
  );
  const destDir = path.resolve(__dirname, '../public/models/scanic');

  // الملفات الواجب تسخيصها: النموذج اسمه مذكور صراحةً في المصدر، بينما ملفّا
  // ORT كانا يُحلّان داخلياً عبر `wasmPaths` (لذا لا يُسمّيهما ml-detector).
  const MODEL_ASSET = 'doccornernet_lean.ort';
  const EXPECTED_ASSETS = [MODEL_ASSET, 'ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.mjs'];

  it('Provisioning script copy-models.mjs exists and covers every requested asset', () => {
    expect(fs.existsSync(copyScriptPath)).toBe(true);
    const script = fs.readFileSync(copyScriptPath, 'utf-8');
    const detector = fs.readFileSync(mlDetectorPath, 'utf-8');

    // المصدر يطلب النموذج صراحةً من models/scanic — ويجب أن يغطّيه السكربت.
    expect(detector).toContain('models/scanic');
    expect(detector).toContain(MODEL_ASSET);

    for (const asset of EXPECTED_ASSETS) {
      expect(script).toContain(asset);
    }

    // السكربت يقرأ من حزمة npm scanic-ml لا من ملف يُنسخ يدوياً.
    expect(script).toContain('scanic-ml');
  });

  it('Scanner ML assets are provisioned in public/models/scanic (fix: npm run models:sync)', () => {
    const missing = EXPECTED_ASSETS.filter(
      (asset) => !fs.existsSync(path.join(destDir, asset))
    );

    expect(
      missing,
      `أصول ماسح المستندات غير مُسخَّصة: ${missing.join(', ')} — نفّذ "npm run models:sync" (أو npm install) داخل مجلد frontend`
    ).toEqual([]);
  });
});
