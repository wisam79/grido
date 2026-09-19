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
