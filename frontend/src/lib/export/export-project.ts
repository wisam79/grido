import { toast } from 'sonner';

import { classifySaveResult } from '@/lib/io/save-result';
import { fetchLocalApi } from '@/lib/local-api';
import { createLogger } from '@/lib/logger';

import { exportCanvas } from './export-image';
import { CanvasTooLargeError } from './export-limits';
import { SaveFileDialog } from '../../../wailsjs/go/main/App';

const logger = createLogger('export-project');

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * تنزيل صورة من Blob عبر Wails (تيار ثنائي فائق السرعة مع fallback لـ Base64).
 *
 * 🖨️ `dpi` اختياري: كثافة الطباعة التي يعرضها حوار التصدير. تُرسل كمعامل
 * `dpi` لمسار `/api/save-file` فيحقنها الخلفية في بايتات الملف (pHYs لـ PNG /
 * JFIF لـ JPEG) بلا أي إعادة ترميز — دونها كانت أدوات الطباعة الخارجية تفترض
 * 72/96 DPI فتحسب مقاساً فيزيائياً خاطئاً لنفس الصورة. تُهمل بصمت لأي صيغة لا
 * تحمل بيانات كثافة (TIFF/CMYK مثلاً) ولأي قيمة غير موجبة.
 */
export async function downloadBlob(
  blob: Blob,
  filename: string,
  dir?: string,
  dpi?: number,
  sourceFilename?: string,
): Promise<string> {
  try {
    // 🚀 مسار البث الثنائي المباشر: تجنب تحويل الـ Blob إلى Base64 DataURL في V8
    if (
      typeof window !== 'undefined' &&
      window.location?.origin &&
      !window.location.origin.startsWith('file:') &&
      typeof fetch === 'function'
    ) {
      try {
        const query = new URLSearchParams({ filename });
        if (dir) query.set('dir', dir);
        if (sourceFilename) query.set('source', sourceFilename);
        // الحقن يعتمد امتداد الملف المُرسل (الخلفية تقرأ filepath.Ext) — فنطابقه
        // هنا حصراً على صيغ الصور التي تحمل بيانات كثافة فعلاً.
        const dpiParam =
          typeof dpi === 'number' && Number.isFinite(dpi) && dpi > 0 ? Math.round(dpi) : 0;
        if (dpiParam > 0 && /\.(png|jpe?g)$/i.test(filename)) {
          query.set('dpi', String(dpiParam));
        }
        // 🔑 fetchLocalApi يضيف ترويسة توكن الجلسة المفروضة على مسارات /api
        const resp = await fetchLocalApi(
          `${window.location.origin}/api/save-file?${query.toString()}`,
          {
            method: 'POST',
            body: sourceFilename ? undefined : blob,
          },
        );
        if (resp.status === 204) {
          return ''; // إلغاء الحفظ من المستخدم
        }
        if (resp.ok) {
          const resJson = (await resp.json().catch(() => null)) as { status?: string } | null;
          if (resJson?.status === 'success') {
            return 'success';
          }
        }
      } catch (streamErr) {
        // Fallback إلى SaveFileDialog عبر JSON-RPC
        logger.warn('Binary stream save failed, falling back to IPC:', streamErr);
      }
    }

    const data = await blobToDataURL(blob);
    let displayName = 'Image File';
    let pattern = '*.png;*.jpg;*.jpeg';

    if (filename.endsWith('.png')) {
      displayName = 'PNG Image (*.png)';
      pattern = '*.png';
    } else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
      displayName = 'JPEG Image (*.jpg;*.jpeg)';
      pattern = '*.jpg;*.jpeg';
    }

    return await SaveFileDialog(data, filename, displayName, pattern);
  } catch (err) {
    logger.error('Save failed:', err);
    return 'error';
  }
}

// تصدير سريع بصيغة PNG
export async function quickExportPNG() {
  let blob: Blob | null;
  try {
    blob = await exportCanvas('png');
  } catch (err) {
    if (err instanceof CanvasTooLargeError) {
      toast.error(
        `الأبعاد كبيرة جداً للتصدير (${err.width}×${err.height} بكسل ≈ ${(err.pixelCount / 1e6).toFixed(1)} ميجابكسل) — الحد الأقصى 50 ميجابكسل. قلّل مقاس الكانفاس أو DPI.`,
      );
    } else {
      logger.error('Export failed:', err);
      toast.error('تعذر تصدير الصورة');
    }
    return;
  }

  if (blob) {
    const res = await downloadBlob(blob, `photo-${Date.now()}.png`);
    const outcome = classifySaveResult(res);
    if (outcome === 'success') {
      toast.success('تم تصدير الصورة بنجاح');
    } else if (outcome === 'cancel') {
      toast.info('تم إلغاء تصدير الصورة');
    } else {
      toast.error('فشل تصدير الصورة');
    }
  } else {
    toast.error('تعذر تصدير الصورة');
  }
}
