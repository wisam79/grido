import { toast } from 'sonner';

import { classifySaveResult } from '@/lib/io/save-result';
import { fetchLocalApi, isLocalApiAvailable } from '@/lib/local-api';
import { createLogger } from '@/lib/logger';

import { assertValidTiffBlob } from './export-cmyk';
import { exportCanvas } from './export-image';
import { CanvasTooLargeError } from './export-limits';
import { SaveFileDialog } from '../../../wailsjs/go/main/App';

const logger = createLogger('export-project');

function abortError(signal?: AbortSignal): Error {
  if (signal?.reason instanceof Error) return signal.reason;
  return new DOMException('تم إلغاء حفظ الملف', 'AbortError');
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError(signal);
}

function isAbortError(error: unknown, signal?: AbortSignal): boolean {
  return signal?.aborted === true || (error instanceof DOMException && error.name === 'AbortError');
}

function blobToDataURL(blob: Blob, signal?: AbortSignal): Promise<string> {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      callback();
    };
    const onAbort = () => {
      try {
        reader.abort();
      } catch {
        // FileReader قد يكون انتهى بين حدث الإلغاء والتنظيف.
      }
      finish(() => reject(abortError(signal)));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    reader.onload = () => finish(() => resolve(reader.result as string));
    reader.onerror = () => finish(() => reject(reader.error ?? new Error('تعذر قراءة الملف')));
    reader.onabort = () => finish(() => reject(abortError(signal)));
    reader.readAsDataURL(blob);
  });
}

async function fetchSourceBlob(sourceFilename: string, signal?: AbortSignal): Promise<Blob> {
  throwIfAborted(signal);
  if (typeof window === 'undefined' || !window.location?.origin || typeof fetch !== 'function') {
    throw new Error('تعذر قراءة ملف المصدر الحقيقي قبل الحفظ الاحتياطي');
  }
  const response = await fetch(
    `${window.location.origin}/local-image/${encodeURIComponent(sourceFilename)}`,
    { signal },
  );
  if (!response.ok) {
    throw new Error(`تعذر قراءة ملف المصدر الحقيقي (HTTP ${response.status})`);
  }
  const blob = await response.blob();
  if (blob.size === 0) {
    throw new Error('ملف المصدر الحقيقي فارغ؛ أُلغي الحفظ لحماية الناتج');
  }
  return blob;
}

async function ensureFallbackBlob(
  blob: Blob,
  filename: string,
  sourceFilename?: string,
  signal?: AbortSignal,
): Promise<Blob> {
  let actualBlob = blob;
  if (actualBlob.size === 0) {
    if (!sourceFilename) {
      throw new Error('لا يمكن حفظ ملف فارغ');
    }
    actualBlob = await fetchSourceBlob(sourceFilename, signal);
  }
  throwIfAborted(signal);
  if (/\.tiff?$/i.test(filename) || (sourceFilename && /\.tiff?$/i.test(sourceFilename))) {
    await assertValidTiffBlob(actualBlob, signal);
  }
  return actualBlob;
}

/**
 * تنزيل صورة من Blob عبر Wails (تيار ثنائي فائق السرعة مع fallback لـ Base64).
 * عند فشل نسخ ملف مصدر محلي، يُجلب الملف الحقيقي قبل IPC ولا يُمرّر Blob فارغ.
 */
export async function downloadBlob(
  blob: Blob,
  filename: string,
  dir?: string,
  dpi?: number,
  sourceFilename?: string,
  signal?: AbortSignal,
): Promise<string> {
  try {
    throwIfAborted(signal);
    let fallbackBlob = blob;

    if (isLocalApiAvailable()) {
      try {
        const query = new URLSearchParams({ filename });
        if (dir) query.set('dir', dir);
        if (sourceFilename) query.set('source', sourceFilename);
        const dpiParam =
          typeof dpi === 'number' && Number.isFinite(dpi) && dpi > 0 ? Math.round(dpi) : 0;
        if (dpiParam > 0 && /\.(png|jpe?g)$/i.test(filename)) {
          query.set('dpi', String(dpiParam));
        }
        const response = await fetchLocalApi(
          `${window.location.origin}/api/save-file?${query.toString()}`,
          {
            method: 'POST',
            body: sourceFilename ? undefined : blob,
            signal,
          },
        );
        throwIfAborted(signal);
        if (response.status === 204) return '';
        if (response.ok) {
          const result = (await response.json().catch(() => null)) as { status?: string } | null;
          if (result?.status === 'success') return 'success';
        }
        throw new Error(`فشل الحفظ الثنائي المحلي (HTTP ${response.status})`);
      } catch (streamError) {
        if (isAbortError(streamError, signal)) throw abortError(signal);
        logger.warn('Binary stream save failed, falling back to IPC:', streamError);
        // المصدر المحلي كان يُمثّل سابقاً ببلوب فارغ. قبل IPC يجب إحضار البايتات
        // الفعلية والتحقق منها، أو الفشل صراحةً بلا فتح حوار حفظ بمحتوى فارغ.
        fallbackBlob = await ensureFallbackBlob(blob, filename, sourceFilename, signal);
      }
    } else {
      fallbackBlob = await ensureFallbackBlob(blob, filename, sourceFilename, signal);
    }

    throwIfAborted(signal);
    if (fallbackBlob.size === 0) throw new Error('لا يمكن حفظ ملف فارغ');
    const data = await blobToDataURL(fallbackBlob, signal);
    throwIfAborted(signal);

    let displayName = 'Image File';
    let pattern = '*.png;*.jpg;*.jpeg';
    if (/\.png$/i.test(filename)) {
      displayName = 'PNG Image (*.png)';
      pattern = '*.png';
    } else if (/\.jpe?g$/i.test(filename)) {
      displayName = 'JPEG Image (*.jpg;*.jpeg)';
      pattern = '*.jpg;*.jpeg';
    } else if (/\.tiff?$/i.test(filename)) {
      displayName = 'TIFF Image (*.tif;*.tiff)';
      pattern = '*.tif;*.tiff';
    }

    const savePromise = SaveFileDialog(data, filename, displayName, pattern);
    const abortableSave =
      signal && typeof savePromise.cancelOn === 'function'
        ? savePromise.cancelOn(signal)
        : savePromise;
    const result = await abortableSave;
    throwIfAborted(signal);
    return result;
  } catch (error) {
    if (!isAbortError(error, signal)) logger.error('Save failed:', error);
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
